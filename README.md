# Reel-Insights AI (Insta-Reel-Scraper-AI)

An intelligent full-stack application that transforms short-form video content (Instagram Reels, YouTube Shorts) into structured, actionable insights using OpenAI's Whisper and GPT generative language models.

## 📌 Overview

Short-form video platforms distribute massive amounts of educational and informative content, but capturing, searching, and saving this textual knowledge conventionally is tedious. ReelInsights AI automates this workflow by downloading the media, extracting the audio, transcribing it with high accuracy, and using a Large Language Model (LLM) to parse the transcription into various useful formats (Summaries, Step-by-Step Guides, or Q&A).

This project was built to demonstrate end-to-end full-stack development, seamless third-party API integrations, and practical real-world applications of Generative AI.

## ✨ Features

- **Multi-Platform Support**: Ingests video content organically from Instagram Reels and YouTube Shorts.
- **AI-Powered Transcription**: Converts video audio to text using OpenAI's `whisper-1` model.
- **Intelligent Processing Modes**:
  - **📝 Summary**: Get a concise overview of the video's core message.
  - **🔢 Steps**: Extract actionable sequences as a clean numbered list.
  - **📖 Guide**: Transform the video into a detailed how-to document.
  - **🗣️ Transcript**: Retrieve the raw spoken content.
  - **💬 Q&A**: Ask specific questions regarding the video's content using the transcript as context.
- **Dual Interface**: Operate the analyzer via a responsive, markdown-supported Web UI or directly from the CLI.
- **Authentication Resilience**: Supports `cookies.txt` integration to bypass rate limits and login walls on highly-restricted platforms like Instagram.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, React Markdown
- **Backend**: Node.js, Express.js
- **AI / Machine Learning**: OpenAI API (`whisper-1` for ASR, `gpt-5-mini` for NLP)
- **Media Processing**: `youtube-dl-exec` (yt-dlp)
- **Language**: TypeScript (End-to-End)

## 🏗 Architecture

1. **Client Layer**: A responsive React SPA (Single Page Application) built with Vite and Tailwind that captures user input (URLs, processing modes, and prompts) and renders markdown results.
2. **API Layer**: An Express server that securely handles API keys, mitigating client-side exposure and CORS restrictions.
3. **Ingestion Engine**: Downloads the best available audio stream into a temporary directory pipeline using `yt-dlp`.
4. **AI Pipeline**:
   - Audio is streamed to the OpenAI Whisper API for transcription.
   - The transcribed text is packed into a dynamic context prompt tailored to the user's selected mode.
   - The prompt is evaluated by OpenAI's `gpt-5-mini` model, and the result is returned to the client.
5. **Cleanup**: Temporary media files are violently purged post-processing to prevent storage bloat.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- An OpenAI API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/andrewibrah/insta-reel-scrapper-ai.git
   cd insta-reel-scrapper-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy the `.env.example` file to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Add your OpenAI API Key to the `.env` file:
     ```env
     OPENAI_API_KEY=your_openai_api_key_here
     ```

### Running the Web Interface

Start the local development server (runs both the Vite frontend and Express backend concurrently):

```bash
npm run dev
```

Navigate to `http://localhost:3000` to interact with the UI.

### Running via CLI

For headless operations, automation scripts, or terminal use, you can execute the raw processing script:

```bash
npx tsx main.ts --url "<VIDEO_URL>" --mode "<summary|steps|guide|transcript|qa>" [--question "<YOUR_QUESTION>"]
```

**Example:**
```bash
npx tsx main.ts --url "https://www.instagram.com/reel/EXAMPLE" --mode "steps"
```

## 🔐 Handling Instagram Rate Limits

If you experience download failures due to Instagram's strict login requirements or rate-limiting:
1. Log into Instagram in your web browser.
2. Use an extension like **Get cookies.txt LOCALLY** to export your current session cookies.
3. Save the exported file as `cookies.txt` exactly in the root of this project.
4. The backend ingestion engine will automatically detect the file and authenticate your future requests.

## 📄 License

This project is licensed under the MIT License.
