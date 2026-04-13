import { useState } from "react";
import { Loader2, Link as LinkIcon, FileText, ListOrdered, BookOpen, HelpCircle, FileAudio } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Analytics } from "@vercel/analytics/react";

type Mode = "summary" | "steps" | "guide" | "transcript" | "qa";

export default function App() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("summary");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError("");
    setResult("");

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, mode, question: mode === "qa" ? question : undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process reel");
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Analytics />
      <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans text-neutral-900">
        <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Local Reel Processor</h1>
          <p className="text-neutral-500">
            Paste an Instagram Reel or YouTube Shorts link to extract insights, summaries, and transcripts.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 space-y-6">
          <div className="space-y-2">
            <label htmlFor="url" className="block text-sm font-medium">
              Reel Link
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="url"
                id="url"
                required
                placeholder="https://www.instagram.com/reel/..."
                className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">Output Mode</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { id: "summary", label: "Summary", icon: FileText },
                { id: "steps", label: "Steps", icon: ListOrdered },
                { id: "guide", label: "Guide", icon: BookOpen },
                { id: "transcript", label: "Transcript", icon: FileAudio },
                { id: "qa", label: "Q&A", icon: HelpCircle },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id as Mode)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-sm transition-colors ${
                    mode === m.id
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <m.icon className="h-5 w-5 mb-1" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "qa" && (
            <div className="space-y-2">
              <label htmlFor="question" className="block text-sm font-medium">
                Your Question
              </label>
              <input
                type="text"
                id="question"
                required
                placeholder="What is the main lesson here?"
                className="block w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !url || (mode === "qa" && !question)}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Processing...
              </>
            ) : (
              "Process Reel"
            )}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm space-y-2">
            <p className="font-medium text-base">Error Processing Reel</p>
            <p>{error}</p>
            {error.includes("cookies.txt") && (
              <div className="mt-4 pt-4 border-t border-red-200">
                <p className="font-medium mb-2">How to fix this:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Log into Instagram in your browser.</li>
                  <li>Use a browser extension like <strong>Get cookies.txt LOCALLY</strong> to export your cookies.</li>
                  <li>Save the file as <code>cookies.txt</code> in the root directory of this project.</li>
                  <li>Try processing the reel again.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Result</h2>
            <div className="prose prose-neutral max-w-none text-sm md:text-base">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
