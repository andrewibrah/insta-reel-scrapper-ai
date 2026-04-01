import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import youtubedl from "youtube-dl-exec";
import fs from "fs";
import OpenAI from "openai";
import crypto from "crypto";
import "dotenv/config";

const app = express();
const PORT = 3000;

app.use(express.json());

const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

app.post("/api/process", async (req, res) => {
  const { url, mode, question } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "MY_OPENAI_API_KEY") {
    return res.status(500).json({ error: "Invalid or missing OPENAI_API_KEY. Please configure it in the AI Studio settings." });
  }

  const openai = new OpenAI({ apiKey });

  const id = crypto.randomBytes(8).toString("hex");
  const outputTemplate = path.join(tempDir, `${id}.%(ext)s`);
  let outputPath = "";

  try {
    console.log(`Downloading media from ${url}...`);
    
    const dlOptions: any = {
      format: "bestaudio/best",
      output: outputTemplate,
      noWarnings: true,
      noCheckCertificates: true,
    };

    const cookiesPath = path.join(process.cwd(), "cookies.txt");
    if (fs.existsSync(cookiesPath)) {
      console.log("Found cookies.txt, using it for authentication...");
      dlOptions.cookies = cookiesPath;
    }

    await youtubedl(url, dlOptions);

    // Find the downloaded file
    const files = fs.readdirSync(tempDir);
    const downloadedFile = files.find((f) => f.startsWith(id));
    
    if (!downloadedFile) {
      throw new Error("Downloaded file not found");
    }

    outputPath = path.join(tempDir, downloadedFile);
    console.log(`Media downloaded to ${outputPath}`);

    console.log(`Transcribing media...`);
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(outputPath),
      model: "whisper-1",
    });
    const transcriptText = transcription.text;

    let prompt = "";
    if (mode === "summary") {
      prompt = "Provide a short summary of what the video says.";
    } else if (mode === "steps") {
      prompt = "Return only the actionable sequence taught in the Reel as a clean numbered list.";
    } else if (mode === "guide") {
      prompt = "Turn the Reel into a more detailed how-to document.";
    } else if (mode === "transcript") {
      prompt = "Return the full spoken content in plain text.";
    } else if (mode === "qa" && question) {
      prompt = `Answer the following question using the transcript as source context: ${question}`;
    } else {
      prompt = "Provide a short summary of what the video says.";
    }

    let result = "";
    if (mode === "transcript") {
      result = transcriptText;
    } else {
      console.log(`Sending to OpenAI with prompt: ${prompt}`);
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that processes video transcripts." },
          { role: "user", content: `Transcript:\n${transcriptText}\n\nTask: ${prompt}` }
        ]
      });
      result = response.choices[0].message?.content || "";
    }

    // Cleanup
    fs.unlinkSync(outputPath);

    res.json({ result });
  } catch (error: any) {
    console.error("Error processing reel:", error);
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    
    let errorMessage = error.message || "Failed to process reel";
    if (errorMessage.includes("login required") || errorMessage.includes("rate-limit reached")) {
      errorMessage = "Instagram blocked the download (login required or rate-limited). To fix this, export your Instagram cookies to a 'cookies.txt' file and place it in the root directory of this project.";
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
