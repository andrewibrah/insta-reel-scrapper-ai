import type { VercelRequest, VercelResponse } from "@vercel/node";
import youtubedl from "youtube-dl-exec";
import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, mode, question } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY. Configure it in Vercel Environment Variables." });
  }

  const openai = new OpenAI({ apiKey });

  const id = crypto.randomBytes(8).toString("hex");
  const tempDir = os.tmpdir();
  const outputTemplate = path.join(tempDir, `${id}.%(ext)s`);
  let outputPath = "";

  try {
    const dlOptions: any = {
      format: "bestaudio/best",
      output: outputTemplate,
      noWarnings: true,
      noCheckCertificates: true,
    };

    await youtubedl(url, dlOptions);

    const files = fs.readdirSync(tempDir);
    const downloadedFile = files.find((f) => f.startsWith(id));

    if (!downloadedFile) {
      throw new Error("Downloaded file not found");
    }

    outputPath = path.join(tempDir, downloadedFile);

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
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that processes video transcripts." },
          { role: "user", content: `Transcript:\n${transcriptText}\n\nTask: ${prompt}` },
        ],
      });
      result = response.choices[0].message?.content || "";
    }

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    res.json({ result });
  } catch (error: any) {
    if (outputPath && fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    let errorMessage = error.message || "Failed to process reel";
    if (errorMessage.includes("login required") || errorMessage.includes("rate-limit reached")) {
      errorMessage = "Instagram blocked the download (login required or rate-limited). Try a YouTube Shorts link instead, or try again later.";
    }

    res.status(500).json({ error: errorMessage });
  }
}
