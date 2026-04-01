import { parseArgs } from "util";
import youtubedl from "youtube-dl-exec";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import crypto from "crypto";

// Load environment variables if needed (assuming they are in process.env)
import "dotenv/config";

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      url: { type: "string" },
      mode: { type: "string", default: "summary" },
      question: { type: "string" },
    },
    strict: false,
  });

  if (!values.url) {
    console.error("Error: --url is required");
    console.error("Usage: npx tsx main.ts --url <URL> [--mode <summary|steps|guide|transcript|qa>] [--question <text>]");
    process.exit(1);
  }

  const url = values.url;
  const mode = values.mode;
  const question = values.question;

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "MY_OPENAI_API_KEY") {
    console.error("Error: Invalid or missing OPENAI_API_KEY. Please configure it in the AI Studio settings.");
    process.exit(1);
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
    } else if (question) {
      prompt = `Answer the following question using the transcript as source context: ${question}`;
    } else {
      prompt = "Provide a short summary of what the video says.";
    }

    console.log(`\nGenerating ${mode}...\n`);

    let result = "";
    if (mode === "transcript") {
      result = transcriptText;
    } else {
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that processes video transcripts." },
          { role: "user", content: `Transcript:\n${transcriptText}\n\nTask: ${prompt}` }
        ]
      });
      result = response.choices[0].message?.content || "";
    }

    console.log("================ RESULT ================\n");
    console.log(result);
    console.log("\n========================================\n");

    // Cleanup
    fs.unlinkSync(outputPath);
  } catch (error: any) {
    let errorMessage = error.message || error;
    if (typeof errorMessage === "string" && (errorMessage.includes("login required") || errorMessage.includes("rate-limit reached"))) {
      errorMessage = "Instagram blocked the download (login required or rate-limited).\n\nTo fix this:\n1. Log into Instagram in your browser.\n2. Use a browser extension like 'Get cookies.txt LOCALLY' to export your cookies.\n3. Save the file as 'cookies.txt' in the root directory of this project.\n4. Run the command again.";
    }
    
    console.error("\nError processing reel:\n", errorMessage);
    if (outputPath && fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    process.exit(1);
  }
}

main();
