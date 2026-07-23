import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

 
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const AI_API_KEY = process.env.AI_API_KEY || "sk-68f518095b8a7d37-ivwfdh-8653e493";
      const AI_BASE_URL = process.env.AI_BASE_URL || "https://rsewfdn.abc-tunnel.us/v1";

      let response: Response | null = null;
      let lastError: Error | null = null;
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 85000);

          const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify({
              model: "jumbo",
              messages: [
                { role: "system", content: systemInstruction || "" },
                { role: "user", content: prompt }
              ],
              temperature: 0.7,
              stream: true
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            response = res;
            break;
          }

          const errData = await res.text();
          if ((res.status === 524 || res.status === 502 || res.status === 504) && attempt < maxAttempts) {
            console.warn(`[API] Attempt ${attempt} returned status ${res.status}. Retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          const cleanErrData = errData.includes("<!DOCTYPE") || errData.includes("<html")
            ? `Server AI Timeout (Status ${res.status}). Mengontak ulang...`
            : errData;
          throw new Error(`API Error: ${res.status} - ${cleanErrData}`);
        } catch (err: any) {
          lastError = err;
          if (err.name === "AbortError") {
            if (attempt < maxAttempts) {
              console.warn(`[API] Attempt ${attempt} timed out after 85s. Retrying...`);
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            throw new Error("Proses AI membutuhkan waktu terlalu lama (Timeout 85s). Mengingat respon terlalu panjang, permintaan dibatalkan.");
          }
          if (attempt >= maxAttempts) throw err;
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (!response) {
        throw lastError || new Error("Gagal menghubungkan ke server AI.");
      }

      const rawText = await response.text();
      let text = "";

      try {
       
        const data = JSON.parse(rawText);
        if (data.error) {
          throw new Error(data.error.message || "Custom API Error");
        }
        if (data.choices && data.choices.length > 0) {
          text = data.choices[0].message?.content || "";
        }
      } catch (e: any) {
        if (e.message && e.message.includes("Custom API Error")) throw e;
        
       
        const lines = rawText.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                text += parsed.choices[0].delta.content;
              }
            } catch (err) {
             
            }
          }
        }
      }

      res.json({ text });
    } catch (error: any) {
      console.error("AI API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content." });
    }
  });

 
  app.get("/api/transcript", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "YouTube URL is required." });
      }

      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      const videoId = match ? match[1] : null;

      if (!videoId) {
        return res.status(400).json({ error: "Invalid YouTube URL." });
      }

      const transcriptBaseUrl = process.env.YOUTUBE_TRANSCRIPT_API_URL || "https://youtube-transcript.ai/transcript";
      const response = await fetch(`${transcriptBaseUrl}/${videoId}.txt`);
      if (!response.ok) {
         throw new Error(`Failed to fetch from youtube-transcript.ai: ${response.statusText}`);
      }

      let fullText = await response.text();
      
     
      fullText = fullText
        .replace(/\[\d+:\d+(:\d+)?\]/g, " ")
        .replace(/[#*_{}\[\]]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      res.json({ transcript: fullText });
    } catch (error: any) {
      console.error("YouTube Transcript Error:", error);
      res.status(500).json({ error: "Failed to fetch transcript. The video might not have captions enabled or is private." });
    }
  });


 
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
