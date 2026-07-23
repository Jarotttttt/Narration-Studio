import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { Act, PromptSentence, ActAudio, PromptImage, VideoSyncConfig } from "../types";
import {
  Video,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Music,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Maximize2,
  Sliders,
  Sparkles,
  Layers,
  Clock,
  Film,
  Zap,
  ChevronRight,
  Filter,
  Eye
} from "lucide-react";

interface VideoStudioProps {
  projectId: string;
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function VideoStudio({ projectId, onShowToast }: VideoStudioProps) {

  const project = useLiveQuery(() => db.projects.get(projectId));
  const acts = useLiveQuery(() => db.acts.where("projectId").equals(projectId).sortBy("actNumber"));
  const prompts = useLiveQuery(() => db.prompts.where("projectId").equals(projectId).sortBy("sequenceNumber"));
  const dbAudio = useLiveQuery(() => db.actAudio.where("projectId").equals(projectId).toArray());
  const dbImages = useLiveQuery(() => db.promptImages.where("projectId").equals(projectId).toArray());
  const config = useLiveQuery(() => db.videoSyncConfig.get(projectId));


  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});


  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");


  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedActFilter, setSelectedActFilter] = useState<number | "all">("all");
  const [missingImagesOnly, setMissingImagesOnly] = useState(false);
  const [copiedActId, setCopiedActId] = useState<string | null>(null);


  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState({ current: 0, total: 100, statusText: "" });
  const [imagesLoadedCounter, setImagesLoadedCounter] = useState(0);


  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cancelRenderRef = useRef(false);
  const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});


  useEffect(() => {
    if (config) {
      setAspectRatio(config.aspectRatio || "16:9");
    } else {
      db.videoSyncConfig.put({
        projectId,
        subtitlesEnabled: false,
        subtitleStyle: "bottom",
        aspectRatio: "16:9",
        transitions: "none",
        updatedAt: Date.now()
      });
    }
  }, [config, projectId]);


  useEffect(() => {
    const urls: Record<string, string> = {};
    if (dbAudio) {
      dbAudio.forEach((item) => {
        urls[item.actId] = URL.createObjectURL(item.audioBlob);
      });
    }
    setAudioUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [dbAudio]);


  useEffect(() => {
    const urls: Record<string, string> = {};
    if (dbImages) {
      dbImages.forEach((item) => {
        urls[item.promptId] = URL.createObjectURL(item.imageBlob);
        

        if (!loadedImagesRef.current[item.promptId]) {
          const img = new Image();
          img.onload = () => setImagesLoadedCounter(c => c + 1);
          img.src = urls[item.promptId];
          loadedImagesRef.current[item.promptId] = img;
        } else if (loadedImagesRef.current[item.promptId].src !== urls[item.promptId]) {

          loadedImagesRef.current[item.promptId].onload = () => setImagesLoadedCounter(c => c + 1);
          loadedImagesRef.current[item.promptId].src = urls[item.promptId];
        }
      });
    }
    setImageUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [dbImages]);


  const promptTimings = useMemo(() => {
    if (!acts || !prompts) return [];

    let overallStartTime = 0;
    const result: {
      prompt: PromptSentence;
      actNumber: number;
      actId: string;
      startTime: number;
      duration: number;
      actAudioDuration: number;
    }[] = [];

    acts.forEach((act) => {
      const actPrompts = prompts.filter((p) => p.actId === act.id);
      if (actPrompts.length === 0) return;

      const actAudio = dbAudio?.find((a) => a.actId === act.id);
      const audioDuration = actAudio?.duration || 0;


      const totalChars = actPrompts.reduce((sum, p) => sum + (p.originalSentence?.length || 1), 0);

      let actStartTime = overallStartTime;

      actPrompts.forEach((prompt) => {
        let sentenceDuration = prompt.customDuration;

        if (!sentenceDuration) {
          if (audioDuration > 0 && totalChars > 0) {
            const ratio = (prompt.originalSentence?.length || 1) / totalChars;
            sentenceDuration = Math.max(1.5, ratio * audioDuration);
          } else {

            sentenceDuration = 3.5;
          }
        }

        result.push({
          prompt,
          actNumber: act.actNumber,
          actId: act.id,
          startTime: actStartTime,
          duration: sentenceDuration,
          actAudioDuration: audioDuration
        });

        actStartTime += sentenceDuration;
      });

      overallStartTime = actStartTime;
    });

    return result;
  }, [acts, prompts, dbAudio]);


  const totalVideoDuration = useMemo(() => {
    if (promptTimings.length === 0) return 0;
    const last = promptTimings[promptTimings.length - 1];
    return last.startTime + last.duration;
  }, [promptTimings]);


  const currentActiveTiming = useMemo(() => {
    if (promptTimings.length === 0) return null;
    return (
      promptTimings.find(
        (t) => currentTime >= t.startTime && currentTime < t.startTime + t.duration
      ) || promptTimings[promptTimings.length - 1]
    );
  }, [promptTimings, currentTime]);


  const handleAudioUploadForAct = async (act: Act, file: File) => {
    if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      onShowToast("Mohon pilih file audio (.mp3, .wav, .m4a)", "error");
      return;
    }

    try {

      const audioObj = new Audio();
      const tempUrl = URL.createObjectURL(file);
      audioObj.src = tempUrl;

      await new Promise<void>((resolve, reject) => {
        audioObj.onloadedmetadata = () => {
          resolve();
        };
        audioObj.onerror = () => reject(new Error("Gagal membaca file audio"));
      });

      const duration = audioObj.duration || 0;
      URL.revokeObjectURL(tempUrl);

      const recordId = `${projectId}_act_${act.actNumber}`;
      await db.actAudio.put({
        id: recordId,
        projectId,
        actId: act.id,
        actNumber: act.actNumber,
        audioBlob: file,
        duration,
        fileName: file.name,
        updatedAt: Date.now()
      });

      onShowToast(`Audio Babak ${act.actNumber} berhasil diunggah (${Math.round(duration)}s)`, "success");
    } catch (err: any) {
      onShowToast(`Gagal memproses audio: ${err.message}`, "error");
    }
  };


  const handleBulkAudioUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !acts) return;

    const fileArray = Array.from(files);
    let count = 0;

    for (let i = 0; i < acts.length; i++) {
      const act = acts[i];

      const matchedFile = fileArray.find((f) => {
        const lower = f.name.toLowerCase();
        return (
          lower.includes(`babak_${act.actNumber}`) ||
          lower.includes(`babak${act.actNumber}`) ||
          lower.includes(`act_${act.actNumber}`) ||
          lower.includes(`act${act.actNumber}`) ||
          lower.includes(`narasi_${act.actNumber}`) ||
          lower.includes(`narasi${act.actNumber}`) ||
          lower.startsWith(`${act.actNumber}.`) ||
          lower.startsWith(`0${act.actNumber}.`)
        );
      }) || fileArray[i];

      if (matchedFile) {
        await handleAudioUploadForAct(act, matchedFile);
        count++;
      }
    }

    onShowToast(`Berhasil memproses ${count} file audio babak!`, "success");
  };


  const handleImageUploadForPrompt = async (promptId: string, actId: string, sequenceNumber: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      onShowToast("Mohon pilih file gambar (.png, .jpg, .webp)", "error");
      return;
    }

    try {
      await db.promptImages.put({
        id: promptId,
        projectId,
        actId,
        promptId,
        sequenceNumber,
        imageBlob: file,
        fileName: file.name,
        updatedAt: Date.now()
      });

      onShowToast(`Gambar untuk Prompt #${sequenceNumber} berhasil diunggah!`, "success");
    } catch (err: any) {
      onShowToast(`Gagal menyimpan gambar: ${err.message}`, "error");
    }
  };


  const handleBulkImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !prompts || prompts.length === 0) return;

    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArray.length === 0) {
      onShowToast("Tidak ada file gambar valid yang dipilih", "error");
      return;
    }


    fileArray.sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.name.replace(/\D/g, "")) || 0;
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });

    let uploadedCount = 0;

    for (let i = 0; i < prompts.length; i++) {
      const promptItem = prompts[i];

      const matchedFile = fileArray.find((f) => {
        const numbersInName = f.name.match(/\d+/g);
        if (numbersInName) {
          const matchedNum = parseInt(numbersInName[numbersInName.length - 1]);
          return matchedNum === promptItem.sequenceNumber;
        }
        return false;
      }) || fileArray[i];

      if (matchedFile) {
        await db.promptImages.put({
          id: promptItem.id,
          projectId,
          actId: promptItem.actId,
          promptId: promptItem.id,
          sequenceNumber: promptItem.sequenceNumber,
          imageBlob: matchedFile,
          fileName: matchedFile.name,
          updatedAt: Date.now()
        });
        uploadedCount++;
      }
    }

    onShowToast(`Berhasil mengunggah ${uploadedCount} gambar ke daftar prompt!`, "success");
  };


  const handleDeleteAudio = async (actId: string, actNumber: number) => {
    const recordId = `${projectId}_act_${actNumber}`;
    await db.actAudio.delete(recordId);
    onShowToast(`Audio Babak ${actNumber} telah dihapus`, "info");
  };


  const handleDeleteImage = async (promptId: string) => {
    await db.promptImages.delete(promptId);
    onShowToast("Gambar prompt berhasil dihapus", "info");
  };


  const handleCopyNarrative = (act: Act) => {
    if (!act.narrativeText) return;
    navigator.clipboard.writeText(act.narrativeText);
    setCopiedActId(act.id);
    onShowToast(`Teks Babak ${act.actNumber} tersalin ke clipboard!`, "success");
    setTimeout(() => setCopiedActId(null), 2000);
  };


  const drawCanvasFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    activeTiming: typeof currentActiveTiming
  ) => {

    ctx.fillStyle = "#0f0f11";
    ctx.fillRect(0, 0, width, height);

    if (activeTiming && loadedImagesRef.current[activeTiming.prompt.id]) {
      const img = loadedImagesRef.current[activeTiming.prompt.id];
      if (img.complete && img.naturalWidth > 0) {

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const canvasRatio = width / height;
        let drawWidth = width;
        let drawHeight = height;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > canvasRatio) {
          drawWidth = height * imgRatio;
          offsetX = (width - drawWidth) / 2;
        } else {
          drawHeight = width / imgRatio;
          offsetY = (height - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      } else {

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Prompt #${activeTiming.prompt.sequenceNumber}`, width / 2, height / 2);
      }
    } else if (activeTiming) {

      ctx.fillStyle = "#1e1e24";
      ctx.fillRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Gambar belum diunggah untuk Prompt #${activeTiming.prompt.sequenceNumber}`, width / 2, height / 2 - 10);
      ctx.font = "12px sans-serif";
      ctx.fillText(`"${activeTiming.prompt.originalSentence.slice(0, 50)}..."`, width / 2, height / 2 + 15);
    }
  };


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 1280;
    let height = 720;
    if (aspectRatio === "9:16") {
      width = 720;
      height = 1280;
    } else if (aspectRatio === "1:1") {
      width = 1080;
      height = 1080;
    }

    canvas.width = width;
    canvas.height = height;

    drawCanvasFrame(ctx, width, height, currentActiveTiming);
  }, [aspectRatio, currentActiveTiming, imageUrls, imagesLoadedCounter]);


  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalVideoDuration) {
            setIsPlaying(false);
            if (audioRef.current) audioRef.current.pause();
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => clearInterval(timer);
  }, [isPlaying, totalVideoDuration]);


  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    if (!isPlaying || !currentActiveTiming) {
      audioElement.pause();
      return;
    }

    const activeActId = currentActiveTiming.actId;
    const actAudioUrl = audioUrls[activeActId];

    if (!actAudioUrl) {
      audioElement.pause();
      return;
    }


    const firstPromptInAct = promptTimings.find((t) => t.actId === activeActId);
    const actStartTime = firstPromptInAct ? firstPromptInAct.startTime : 0;
    const offsetInActAudio = Math.max(0, currentTime - actStartTime);


    if (audioElement.getAttribute("data-act-id") !== activeActId) {
      audioElement.src = actAudioUrl;
      audioElement.setAttribute("data-act-id", activeActId);
      audioElement.currentTime = offsetInActAudio;
    } else {

      if (Math.abs(audioElement.currentTime - offsetInActAudio) > 0.3) {
        audioElement.currentTime = offsetInActAudio;
      }
    }

    if (audioElement.paused) {
      audioElement.play().catch(() => {

      });
    }
  }, [isPlaying, currentTime, currentActiveTiming, audioUrls, promptTimings]);


  const handleRenderVideo = async () => {
    if (!promptTimings || promptTimings.length === 0) {
      onShowToast("Tidak ada data video untuk dirender", "error");
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
    }

    setIsRendering(true);
    cancelRenderRef.current = false;
    setRenderProgress({ current: 0, total: 100, statusText: "Mempersiapkan audio & kanvas video..." });

    let audioCtx: AudioContext | null = null;
    let renderInterval: NodeJS.Timeout | null = null;

    try {

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioContextClass();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const audioDest = audioCtx.createMediaStreamDestination();


      const actAudioBuffers: Record<string, AudioBuffer> = {};
      if (dbAudio && dbAudio.length > 0) {
        for (const item of dbAudio) {
          try {
            const arrayBuffer = await item.audioBlob.arrayBuffer();
            const decoded = await audioCtx.decodeAudioData(arrayBuffer);
            actAudioBuffers[item.actId] = decoded;
          } catch (e) {
            console.error("Gagal men-decode audio babak:", item.actId, e);
          }
        }
      }


      const renderCanvas = document.createElement("canvas");
      let width = 1280;
      let height = 720;
      if (aspectRatio === "9:16") {
        width = 720;
        height = 1280;
      } else if (aspectRatio === "1:1") {
        width = 1080;
        height = 1080;
      }

      renderCanvas.width = width;
      renderCanvas.height = height;
      const ctx = renderCanvas.getContext("2d");
      if (!ctx) throw new Error("Gagal menginisialisasi canvas context");


      const canvasStream = renderCanvas.captureStream(30);
      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

      const audioTrack = audioDest.stream.getAudioTracks()[0];
      if (audioTrack) {
        tracks.push(audioTrack);
      }

      const combinedStream = new MediaStream(tracks);


      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5000000
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recorderStopped = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });


      if (acts) {
        acts.forEach((act) => {
          const buffer = actAudioBuffers[act.id];
          if (!buffer) return;


          const firstPromptInAct = promptTimings.find((t) => t.actId === act.id);
          const actStartTime = firstPromptInAct ? firstPromptInAct.startTime : 0;

          const source = audioCtx!.createBufferSource();
          source.buffer = buffer;
          source.connect(audioDest);
          source.start(audioCtx!.currentTime + actStartTime);
        });
      }


      recorder.start(500);

      const startTimeMs = performance.now();
      const totalSec = totalVideoDuration || 1;


      drawCanvasFrame(ctx, width, height, promptTimings[0]);


      await new Promise<void>((resolve, reject) => {
        renderInterval = setInterval(() => {
          if (cancelRenderRef.current) {
            if (renderInterval) clearInterval(renderInterval);
            recorder.stop();
            reject(new Error("Render dibatalkan pengguna"));
            return;
          }

          const elapsedSec = (performance.now() - startTimeMs) / 1000;


          const activeT =
            promptTimings.find((t) => elapsedSec >= t.startTime && elapsedSec < t.startTime + t.duration) ||
            promptTimings[promptTimings.length - 1];

          drawCanvasFrame(ctx, width, height, activeT);

          const pct = Math.min(100, Math.round((elapsedSec / totalSec) * 100));
          const currentFormatted = formatTime(Math.min(elapsedSec, totalSec));
          const totalFormatted = formatTime(totalSec);

          setRenderProgress({
            current: Math.round(elapsedSec),
            total: Math.round(totalSec),
            statusText: `Merender Video & Audio Sync: ${currentFormatted} / ${totalFormatted} (${pct}%)`
          });

          if (elapsedSec >= totalSec + 0.3) {
            if (renderInterval) clearInterval(renderInterval);
            recorder.stop();
            resolve();
          }
        }, 1000 / 30);
      });

      const videoBlob = await recorderStopped;

      if (!cancelRenderRef.current) {
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Video_Render_${project?.name || "Narasi"}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        onShowToast("Render video WebM + Audio berhasil diunduh!", "success");
      }
    } catch (err: any) {
      if (err.message !== "Render dibatalkan pengguna") {
        onShowToast(`Gagal merender video: ${err.message}`, "error");
      }
    } finally {
      if (renderInterval) clearInterval(renderInterval);
      if (audioCtx) audioCtx.close();
      setIsRendering(false);
    }
  };


  const filteredPrompts = useMemo(() => {
    if (!promptTimings) return [];

    return promptTimings.filter((t) => {
      if (selectedActFilter !== "all" && t.actNumber !== selectedActFilter) {
        return false;
      }
      if (missingImagesOnly && imageUrls[t.prompt.id]) {
        return false;
      }
      return true;
    });
  }, [promptTimings, selectedActFilter, missingImagesOnly, imageUrls]);


  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
  };

  const [activeAssetTab, setActiveAssetTab] = useState<"audio" | "images">("audio");

  return (
    <div className="animate-in fade-in duration-300 grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
      {/* Left Column: Player & Core Controls */}
      <div className="xl:col-span-7 flex flex-col h-full bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              Stage 5
            </span>
            <h2 className="text-sm font-bold text-neutral-900">Studio Video</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as any)}
              className="text-xs font-semibold bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="16:9">16:9 (YouTube)</option>
              <option value="9:16">9:16 (Shorts)</option>
              <option value="1:1">1:1 (Feed)</option>
            </select>
          </div>
        </div>

        {/* Player Area */}
        <div className="flex-1 bg-neutral-950 flex flex-col relative overflow-hidden">
          {/* Render Progress Overlay */}
          {isRendering && (
            <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
              <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mb-4" />
              <h4 className="font-bold text-white text-base">{renderProgress.statusText}</h4>
              <p className="text-xs text-neutral-400 mt-2 max-w-xs mb-6">
                Proses rendering video & audio. Harap tunggu hingga selesai.
              </p>
              
              <div className="w-full max-w-md bg-neutral-800 h-3 rounded-full overflow-hidden mb-6">
                <div
                  className="bg-amber-500 h-full transition-all duration-200"
                  style={{ width: `${Math.round((renderProgress.current / (renderProgress.total || 1)) * 100)}%` }}
                />
              </div>
              
              <button
                onClick={() => { cancelRenderRef.current = true; }}
                className="px-5 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batalkan Render
              </button>
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-4">
            <audio ref={audioRef} className="hidden" />
            <canvas
              ref={canvasRef}
              className={`max-w-full h-full object-contain ${
                aspectRatio === "9:16" ? "aspect-[9/16]" : aspectRatio === "1:1" ? "aspect-square" : "aspect-video"
              }`}
            />
          </div>
        </div>

        {/* Timeline Controls */}
        <div className="p-4 bg-white border-t border-neutral-100 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 shrink-0 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs font-mono text-neutral-500 w-10 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={totalVideoDuration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                className="flex-1 accent-amber-500 h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
              />
              <span className="text-xs font-mono text-neutral-500 w-10">{formatTime(totalVideoDuration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Asset Manager & Render */}
      <div className="xl:col-span-5 flex flex-col h-full bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
        {/* Top Render Action */}
        <div className="p-4 border-b border-neutral-100 bg-neutral-50 shrink-0">
          <button
            onClick={handleRenderVideo}
            disabled={isRendering || !promptTimings || promptTimings.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {isRendering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
            <span>{isRendering ? "Merender..." : "Render & Unduh Video"}</span>
          </button>
        </div>

        {/* Asset Tabs */}
        <div className="flex px-4 pt-4 border-b border-neutral-100 shrink-0">
          <button
            onClick={() => setActiveAssetTab("audio")}
            className={`flex-1 pb-3 text-xs font-bold transition-colors border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              activeAssetTab === "audio" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <Music className="w-4 h-4" /> Audio Babak ({dbAudio?.length || 0}/6)
          </button>
          <button
            onClick={() => setActiveAssetTab("images")}
            className={`flex-1 pb-3 text-xs font-bold transition-colors border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              activeAssetTab === "images" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Gambar ({dbImages?.length || 0}/{prompts?.length || 0})
          </button>
        </div>

        {/* Asset Lists (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-4 bg-neutral-50/50">
          {activeAssetTab === "audio" && (
            <div className="space-y-3">
              <label className="flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 border border-neutral-200 border-dashed w-full py-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-neutral-600">
                <Upload className="w-4 h-4" />
                <span>Bulk Upload Audio</span>
                <input type="file" multiple accept="audio/*" onChange={(e) => handleBulkAudioUpload(e.target.files)} className="hidden" />
              </label>

              {acts?.map((act) => {
                const audioData = dbAudio?.find((a) => a.actId === act.id);
                const isUploaded = !!audioData;
                return (
                  <div key={act.id} className={`p-3 rounded-xl border transition-all ${isUploaded ? "bg-white border-emerald-200" : "bg-white border-neutral-200"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-neutral-700">Babak {act.actNumber}</span>
                      {isUploaded ? (
                        <button onClick={() => handleDeleteAudio(act.id, act.actNumber)} className="text-[10px] text-rose-500 hover:text-rose-700 font-medium cursor-pointer">
                          Hapus
                        </button>
                      ) : (
                        <label className="text-[10px] bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded-md text-neutral-600 cursor-pointer font-medium">
                          Unggah
                          <input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleAudioUploadForAct(act, f); }} className="hidden" />
                        </label>
                      )}
                    </div>
                    {isUploaded ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-neutral-500 truncate">{audioData.fileName}</span>
                        <audio controls src={audioUrls[act.id]} className="w-full h-7 rounded-md" />
                      </div>
                    ) : (
                      <p className="text-[10px] text-neutral-400 line-clamp-1 italic">"{act.narrativeText}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeAssetTab === "images" && (
            <div className="space-y-3">
              <label className="flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 border border-neutral-200 border-dashed w-full py-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-neutral-600">
                <Upload className="w-4 h-4" />
                <span>Bulk Upload Gambar</span>
                <input type="file" multiple accept="image/*" onChange={(e) => handleBulkImageUpload(e.target.files)} className="hidden" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                {filteredPrompts.map((timing) => {
                  const promptItem = timing.prompt;
                  const hasImage = !!imageUrls[promptItem.id];
                  return (
                    <div key={promptItem.id} className="relative group aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                      {hasImage ? (
                        <>
                          <img src={imageUrls[promptItem.id]} alt={`Seq ${promptItem.sequenceNumber}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => handleDeleteImage(promptItem.id)} className="p-1.5 bg-rose-600 text-white rounded-md cursor-pointer hover:bg-rose-700">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-200 transition-colors p-2 text-center">
                          <ImageIcon className="w-5 h-5 text-neutral-400 mb-1" />
                          <span className="text-[10px] font-medium text-neutral-500">Img #{promptItem.sequenceNumber}</span>
                          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleImageUploadForPrompt(promptItem.id, promptItem.actId, promptItem.sequenceNumber, f); }} className="hidden" />
                        </label>
                      )}
                      <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                        #{promptItem.sequenceNumber}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
