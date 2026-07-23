import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { Youtube, FileText, Loader2 } from "lucide-react";
import { cleanTranscript } from "../lib/utils";

export default function NewProject() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"auto" | "manual">("manual");
  const [source, setSource] = useState<"paste" | "youtube">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [refYoutubeUrl, setRefYoutubeUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!name.trim()) {
      setError("Nama proyek harus diisi.");
      return;
    }

    setIsSubmitting(true);
    let originalText = "";

    try {
      if (source === "youtube") {
        if (!youtubeUrl.trim()) {
          throw new Error("URL YouTube harus diisi.");
        }
        

        const res = await fetch(`/api/transcript?url=${encodeURIComponent(youtubeUrl)}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mengambil transkrip.");
        }
        
        const data = await res.json();
        originalText = data.transcript;
        
        if (!originalText || originalText.trim().length < 50) {
          throw new Error("Transkrip yang diambil terlalu pendek atau kosong.");
        }
      } else {
        if (!manualText.trim()) {
          throw new Error("Teks transkrip harus diisi.");
        }
        if (manualText.trim().length < 50) {
          setError("Peringatan: Teks tampaknya terlalu pendek untuk dibagi menjadi 6 babak secara bermakna, tetapi kami akan melanjutkannya.");
        }
        originalText = manualText;
      }

      originalText = cleanTranscript(originalText);

      const projectId = uuidv4();
      const finalYoutubeUrl = source === "youtube" ? youtubeUrl.trim() : refYoutubeUrl.trim();
      
      await db.projects.add({
        id: projectId,
        name,
        createdAt: Date.now(),
        mode,
        status: "draft"
      });

      await db.transcripts.add({
        projectId,
        source,
        youtubeUrl: finalYoutubeUrl || undefined,
        originalText
      });


      navigate(`/project/${projectId}`);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan yang tidak terduga.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Proyek Baru</h1>
        <p className="text-neutral-500 mt-1">Mulai transformasi transkrip ke prompt baru.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 border border-neutral-200 rounded-2xl shadow-sm">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-medium border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm font-medium text-neutral-700">Nama Proyek</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="misal: Rekap Cerita The Matrix"
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-neutral-700">Mode Proses</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode("manual")}
              disabled={isSubmitting}
              className={`flex flex-col items-start p-4 rounded-xl border transition-all ${
                mode === "manual" 
                  ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900" 
                  : "border-neutral-200 hover:border-neutral-300 bg-white"
              }`}
            >
              <span className="font-semibold text-neutral-900">Mode Manual</span>
              <span className="text-sm text-neutral-500 text-left mt-1">Jeda dan tinjau setelah setiap tahap. Terbaik untuk penyesuaian.</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("auto")}
              disabled={isSubmitting}
              className={`flex flex-col items-start p-4 rounded-xl border transition-all ${
                mode === "auto" 
                  ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900" 
                  : "border-neutral-200 hover:border-neutral-300 bg-white"
              }`}
            >
              <span className="font-semibold text-neutral-900">Mode Otomatis</span>
              <span className="text-sm text-neutral-500 text-left mt-1">Proses langsung ke prompt tanpa jeda. Terbaik untuk kecepatan.</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-neutral-700">Sumber Input</label>
          <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSource("youtube")}
              disabled={isSubmitting}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                source === "youtube" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <Youtube className="w-4 h-4" /> Tautan YouTube
            </button>
            <button
              type="button"
              onClick={() => setSource("paste")}
              disabled={isSubmitting}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                source === "paste" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <FileText className="w-4 h-4" /> Tempel Teks
            </button>
          </div>

          <div className="pt-2">
            {source === "youtube" ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-700">Tautan YouTube Cerita / Referensi</label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all text-sm"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-neutral-500">
                  Tautan ini digunakan untuk mengambil transkrip cerita sekaligus sebagai referensi metadata & tags asli pada Tahap 4 (SEO).
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-700">Teks Cerita / Transkrip</label>
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Tempel cerita atau transkrip Anda di sini..."
                    rows={8}
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all resize-y font-serif text-sm leading-relaxed"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2 pt-3 border-t border-neutral-100">
                  <label className="block text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-600" />
                    Link YouTube Referensi (Opsional - untuk Tahap 4 SEO)
                  </label>
                  <input
                    type="url"
                    value={refYoutubeUrl}
                    onChange={(e) => setRefYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... (opsional)"
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all text-sm"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-neutral-500">
                    Masukkan URL video YouTube pembanding/asli untuk mengambil tags asli & judul pembanding yang akan diolah AI pada Tahap 4.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-neutral-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyiapkan Proyek...
              </>
            ) : (
              "Mulai Proyek"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
