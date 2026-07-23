import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from "uuid";
import { db, DEFAULT_INSTRUCTIONS } from "../db";
import { generateContent, splitIntoSentences, parseBatchPrompts, cleanEmDashes, cleanTranscript } from "../lib/utils";
import VideoStudio from "../components/VideoStudio";
import { Loader2, ArrowRight, Play, Copy, Check, FileDown, Youtube, Tag, Hash, RefreshCw, Sparkles, ChevronDown, ChevronUp, Search, Filter, Layers, List, LayoutGrid, AlertTriangle, X, ChevronLeft, ChevronRight, CheckCircle, Info, Film, Music } from "lucide-react";

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  
  const project = useLiveQuery(() => db.projects.get(id!));
  const transcript = useLiveQuery(() => db.transcripts.where("projectId").equals(id!).first());
  const acts = useLiveQuery(() => db.acts.where("projectId").equals(id!).sortBy("actNumber"));
  const prompts = useLiveQuery(() => db.prompts.where("projectId").equals(id!).sortBy("sequenceNumber"));
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activeStageTab, setActiveStageTab] = useState<number>(1);
  const [copiedAllNarratives, setCopiedAllNarratives] = useState(false);


  useEffect(() => {
    if (project?.status === "stage3") setActiveStageTab(3);
    else if (project?.status === "stage2") setActiveStageTab(2);
    else if (project?.status === "stage1") setActiveStageTab(1);
  }, [project?.status]);


  const [processingState, setProcessingState] = useState<{
    isProcessing: boolean;
    stage: number;
    progress: string;
    error: string | null;
  }>({ isProcessing: false, stage: 0, progress: "", error: null });

  const isRunningRef = useRef(false);

  const runStage1 = async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setProcessingState({ isProcessing: true, stage: 1, progress: "Membagi menjadi 6 babak...", error: null });

    try {
      const currentProject = await db.projects.get(id!);
      const currentTranscript = await db.transcripts.where("projectId").equals(id!).first();
      if (!currentProject || !currentTranscript) {
        setProcessingState({ isProcessing: false, stage: 0, progress: "", error: null });
        isRunningRef.current = false;
        return;
      }
      
      const instruction = await db.instructions.get("stage1");
      const systemPrompt = instruction?.content || "";
      
      const cleanedText = cleanTranscript(currentTranscript.originalText);
      if (cleanedText !== currentTranscript.originalText) {
        await db.transcripts.update(currentTranscript.projectId, { originalText: cleanedText });
      }
      
      const prompt = `Transcript:\n\n${cleanedText}\n\nPlease divide into 6 acts. Respond with JSON format only: {"babak_1": "...", "babak_2": "...", "babak_3": "...", "babak_4": "...", "babak_5": "...", "babak_6": "..."}`;
      
      const result = await generateContent(prompt, systemPrompt);
      

      const cleanedResult = result.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsedActs;
      try {
        parsedActs = JSON.parse(cleanedResult);
      } catch (e) {
        throw new Error("Gagal mem-parsing respons AI. Diharapkan JSON.");
      }

      const actsToAdd = [];
      for (let i = 1; i <= 6; i++) {
        const actText = parsedActs[`babak_${i}`];
        if (actText) {
          actsToAdd.push({
            id: uuidv4(),
            projectId: currentProject.id,
            actNumber: i,
            rawText: actText
          });
        }
      }

      if (actsToAdd.length !== 6) {
        console.warn("AI tidak mengembalikan tepat 6 babak.");
      }

      await db.acts.where("projectId").equals(currentProject.id).delete();
      await db.prompts.where("projectId").equals(currentProject.id).delete();
      await db.acts.bulkAdd(actsToAdd);
      await db.projects.update(currentProject.id, { status: "stage1" });
      
      setProcessingState({ isProcessing: false, stage: 0, progress: "", error: null });
    } catch (err: any) {
      setProcessingState({ isProcessing: false, stage: 1, progress: "", error: err.message });
    } finally {
      isRunningRef.current = false;
    }
  };

  const runStage2 = async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setProcessingState({ isProcessing: true, stage: 2, progress: "Mengubah babak menjadi narasi...", error: null });

    try {
      const currentProject = await db.projects.get(id!);
      const currentActs = await db.acts.where("projectId").equals(id!).sortBy("actNumber");
      if (!currentProject || !currentActs || currentActs.length === 0) {
        setProcessingState({ isProcessing: false, stage: 0, progress: "", error: null });
        isRunningRef.current = false;
        return;
      }
      
      const instruction = await db.instructions.get("stage2");
      const systemPrompt = instruction?.content || "";

      for (let i = 0; i < currentActs.length; i++) {
        const act = await db.acts.get(currentActs[i].id);
        if (!act) continue;

        if (act.narrativeText && act.narrativeText.trim() !== "") {
          continue;
        }

        setProcessingState(prev => ({ ...prev, progress: `Menulis narasi babak ${i + 1} dari ${currentActs.length}...` }));
        
        const prompt = `Raw Act:\n\n${act.rawText}`;
        const result = await generateContent(prompt, systemPrompt);
        
        await db.acts.update(act.id, { narrativeText: result.trim() });
        

        await new Promise(r => setTimeout(r, 800));
      }

      await db.projects.update(currentProject.id, { status: "stage2" });
      setProcessingState({ isProcessing: false, stage: 0, progress: "", error: null });
    } catch (err: any) {
      setProcessingState({ isProcessing: false, stage: 2, progress: "", error: err.message });
    } finally {
      isRunningRef.current = false;
    }
  };

  const runStage3 = async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setProcessingState({ isProcessing: true, stage: 3, progress: "Membuat prompt bahasa Inggris...", error: null });

    try {
      const currentProject = await db.projects.get(id!);
      const currentActs = await db.acts.where("projectId").equals(id!).sortBy("actNumber");
      if (!currentProject || !currentActs || currentActs.length === 0) {
        setProcessingState({ isProcessing: false, stage: 0, progress: "", error: null });
        isRunningRef.current = false;
        return;
      }
      
      const instruction = await db.instructions.get("stage3");
      const systemPrompt = instruction?.content || DEFAULT_INSTRUCTIONS.stage3;


      await db.prompts.where("projectId").equals(currentProject.id).delete();

      const allPromptsToAdd: any[] = [];
      let promptCounter = 1;

      for (let i = 0; i < currentActs.length; i++) {
        const act = await db.acts.get(currentActs[i].id);
        if (!act || !act.narrativeText) continue;

        const sentences = splitIntoSentences(act.narrativeText);
        if (sentences.length === 0) continue;


        const BATCH_SIZE = 5;

        for (let b = 0; b < sentences.length; b += BATCH_SIZE) {
          const batchSentences = sentences.slice(b, b + BATCH_SIZE);
          const endNum = Math.min(b + BATCH_SIZE, sentences.length);
          
          setProcessingState(prev => ({ 
            ...prev, 
            progress: `Membuat prompt babak ${i + 1} (kalimat ${b + 1}-${endNum} dari ${sentences.length})...` 
          }));

          const numberedSentences = batchSentences.map((s, idx) => `${idx + 1}. ${s}`).join("\n");
          const prompt = `Translate each numbered sentence below into a detailed, unique English visual prompt for AI image generation (Midjourney/Stable Diffusion).\n\nReturn JSON in this EXACT format:\n{\n  "prompts": [\n    { "index": 1, "prompt": "<detailed english visual description for sentence 1>" },\n    { "index": 2, "prompt": "<detailed english visual description for sentence 2>" }\n  ]\n}\n\nSentences:\n${numberedSentences}`;
          
          let result = "";
          try {
            result = await generateContent(prompt, systemPrompt);
          } catch (e: any) {
            console.warn("Batch prompt generation error:", e);
          }
          
          const batchPrompts = parseBatchPrompts(result, batchSentences.length);

          for (let idx = 0; idx < batchSentences.length; idx++) {
            const sentence = batchSentences[idx];
            let engPrompt = batchPrompts[idx] ? batchPrompts[idx].trim() : "";

            allPromptsToAdd.push({
              id: uuidv4(),
              projectId: currentProject.id,
              actId: act.id,
              sequenceNumber: promptCounter++,
              originalSentence: sentence,
              englishPrompt: engPrompt
            });
          }

          await new Promise(r => setTimeout(r, 300));
        }
      }

      if (allPromptsToAdd.length > 0) {
        await db.prompts.bulkAdd(allPromptsToAdd);
      }
      
      await db.projects.update(currentProject.id, { status: "stage3" });
      setProcessingState({ isProcessing: false, stage: 0, progress: "", error: null });
    } catch (err: any) {
      setProcessingState({ isProcessing: false, stage: 3, progress: "", error: err.message });
    } finally {
      isRunningRef.current = false;
    }
  };

  const [regeneratingActId, setRegeneratingActId] = useState<string | null>(null);
  const [regeneratingSinglePromptId, setRegeneratingSinglePromptId] = useState<string | null>(null);
  const [isFixingFailedPrompts, setIsFixingFailedPrompts] = useState(false);
  const [copiedActId, setCopiedActId] = useState<string | null>(null);
  const [isAllPromptsCopied, setIsAllPromptsCopied] = useState(false);
  const [copiedSinglePromptId, setCopiedSinglePromptId] = useState<string | null>(null);


  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };


  const [isActsCollapsed, setIsActsCollapsed] = useState<boolean>(false);
  const [selectedActTabId, setSelectedActTabId] = useState<string>("all");


  const [promptActFilter, setPromptActFilter] = useState<string>("all");
  const [promptStatusFilter, setPromptStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [promptSearch, setPromptSearch] = useState<string>("");
  const [promptViewMode, setPromptViewMode] = useState<"compact" | "cards">("compact");
  const [promptPage, setPromptPage] = useState<number>(1);
  const [promptsPerPage, setPromptsPerPage] = useState<number>(10);


  useEffect(() => {
    if (processingState.isProcessing) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [processingState.isProcessing]);

  const handleCopyAct = (act: any) => {
    const textToCopy = act.narrativeText || act.rawText || "";
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedActId(act.id);
    showToast(`Isi Babak ${act.actNumber} berhasil disalin!`, "success");
    setTimeout(() => setCopiedActId(null), 2000);
  };

  const handleCopySinglePrompt = (promptId: string, englishPrompt: string, seqNum?: number) => {
    navigator.clipboard.writeText(englishPrompt);
    setCopiedSinglePromptId(promptId);
    showToast(`Prompt ${seqNum ? `#${seqNum} ` : ''}tersalin ke clipboard!`, "success");
    setTimeout(() => setCopiedSinglePromptId(null), 2000);
  };

  const handleCopyAll = () => {
    if (!prompts || prompts.length === 0) return;
    const text = prompts.map(p => p.englishPrompt).filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setIsAllPromptsCopied(true);
    showToast(`Seluruh (${prompts.length}) prompt berhasil disalin!`, "success");
    setTimeout(() => setIsAllPromptsCopied(false), 2000);
  };

  const handleRegenerateSinglePrompt = async (promptItem: any) => {
    try {
      setRegeneratingSinglePromptId(promptItem.id);
      const instruction = await db.instructions.get("stage3");
      const systemPrompt = instruction?.content || DEFAULT_INSTRUCTIONS.stage3;
      const userPrompt = `Create a detailed English visual prompt for AI image generation (Midjourney/Stable Diffusion) based on this sentence from a story:\n\n"${promptItem.originalSentence}"\n\nOnly return the English visual prompt text.`;
      const result = await generateContent(userPrompt, systemPrompt);
      let cleanPrompt = result.replace(/^["']|["']$/g, "").trim();
      await db.prompts.update(promptItem.id, { englishPrompt: cleanPrompt });
      showToast(`Prompt #${promptItem.sequenceNumber} berhasil dibuat ulang oleh AI!`, "success");
    } catch (err: any) {
      showToast(`Gagal regenerasi prompt #${promptItem.sequenceNumber}: ${err.message}`, "error");
    } finally {
      setRegeneratingSinglePromptId(null);
    }
  };

  const handleFixAllFailedPrompts = async () => {
    if (!prompts || prompts.length === 0) return;
    setIsFixingFailedPrompts(true);
    let fixedCount = 0;
    try {
      const instruction = await db.instructions.get("stage3");
      const systemPrompt = instruction?.content || DEFAULT_INSTRUCTIONS.stage3;

      const failedOrEmpty = prompts.filter(p => !p.englishPrompt || p.englishPrompt.toLowerCase().includes("gagal membuat prompt") || p.englishPrompt.toLowerCase().includes("cinematic visual representation of:"));
      
      for (let i = 0; i < failedOrEmpty.length; i++) {
        const item = failedOrEmpty[i];
        try {
          const userPrompt = `Create a detailed English visual prompt for AI image generation (Midjourney/Stable Diffusion) based on this sentence from a story:\n\n"${item.originalSentence}"\n\nOnly return the English visual prompt text.`;
          const result = await generateContent(userPrompt, systemPrompt);
          let cleanPrompt = result.replace(/^["']|["']$/g, "").trim();
          await db.prompts.update(item.id, { englishPrompt: cleanPrompt });
          fixedCount++;
        } catch (err) {
          console.warn(`Failed fixing prompt for item ${item.id}:`, err);
        }
        await new Promise(r => setTimeout(r, 200));
      }
      showToast(`Berhasil memperbaiki ${fixedCount} prompt yang gagal!`, "success");
    } catch (err: any) {
      showToast(`Gagal memperbaiki prompt: ${err.message}`, "error");
    } finally {
      setIsFixingFailedPrompts(false);
    }
  };

  const handleRegenerateActNarrative = async (act: any) => {
    try {
      setRegeneratingActId(act.id);
      const instruction = await db.instructions.get("stage2");
      const systemPrompt = instruction?.content || "";
      const prompt = `Raw Act:\n\n${act.rawText}`;
      const result = await generateContent(prompt, systemPrompt);
      await db.acts.update(act.id, { narrativeText: result.trim() });
      showToast(`Narasi Babak ${act.actNumber} berhasil diperbarui!`, "success");
    } catch (err: any) {
      showToast(`Gagal regenerasi narasi babak ${act.actNumber}: ${err.message}`, "error");
    } finally {
      setRegeneratingActId(null);
    }
  };



  useEffect(() => {
    if (!project || !transcript) return;
    if (processingState.isProcessing || processingState.error) return;

    if (project.mode === "auto") {
      if (project.status === "draft") runStage1();
      else if (project.status === "stage1" && acts && acts.length > 0) runStage2();
      else if (project.status === "stage2" && acts && acts.length > 0) runStage3();
    }
  }, [project?.status, project?.mode, processingState.isProcessing, processingState.error, acts?.length, prompts?.length]);

  if (!project || !transcript) {
    return <div className="text-center py-12 text-neutral-500">Memuat proyek...</div>;
  }

  const handleExportTxt = () => {
    if (!prompts) return;
    const text = prompts.map(p => p.englishPrompt).filter(Boolean).join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name.replace(/\s+/g, "_")}_Prompts.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAllNarratives = () => {
    if (!acts || acts.length === 0) return;
    const allNarratives = acts.map(a => a.narrativeText).filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(allNarratives);
    setCopiedAllNarratives(true);
    setTimeout(() => setCopiedAllNarratives(false), 2000);
  };


  const renderProcessingOverlay = () => {
    if (!processingState.isProcessing) return null;
    return (
      <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen min-h-screen bg-neutral-950/75 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-hidden">
        <div className="bg-white p-8 rounded-2xl shadow-2xl border border-neutral-100 max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in-95 duration-200 relative z-[101]">
          <Loader2 className="w-10 h-10 animate-spin text-neutral-900 mx-auto" />
          <div>
            <h3 className="font-bold text-lg text-neutral-900">Memproses Tahap {processingState.stage}</h3>
            <p className="text-neutral-500 text-sm mt-1 leading-relaxed">{processingState.progress}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {renderProcessingOverlay()}
      
      {processingState.error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm flex items-center justify-between border border-red-200">
          <div className="font-medium">Error: {processingState.error}</div>
          <button 
            onClick={() => setProcessingState(prev => ({ ...prev, error: null }))}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-md font-medium transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-neutral-500">
            <span className="capitalize px-2.5 py-1 bg-neutral-100 rounded-md font-medium text-neutral-700">Mode: {project.mode === 'auto' ? 'Otomatis' : 'Manual'}</span>
            <span className="capitalize px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">Status: {project.status.replace("stage", "Tahap ")}</span>
          </div>
        </div>
        <button 
          onClick={() => setShowResetConfirm(true)}
          className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors border border-red-200 self-start md:self-auto cursor-pointer"
        >
          Reset Ulang
        </button>
      </div>

      {/* Stage Navigation Stepper Bar */}
      {project.status !== "draft" && (
        <div className="flex items-center gap-2 overflow-x-auto bg-white p-2 rounded-2xl border border-neutral-200/80 shadow-xs">
          {[
            { stage: 2, name: "1. Narasi 6 Babak", icon: Sparkles, enabled: true },
            { stage: 3, name: "2. Prompt Visual", icon: Tag, enabled: !!(prompts && prompts.length > 0) },
            { stage: 4, name: "3. Studio Video Sync", icon: Film, enabled: !!(prompts && prompts.length > 0) }
          ].map((st) => (
            <button
              key={st.stage}
              disabled={!st.enabled}
              onClick={() => setActiveStageTab(st.stage)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                (st.stage === 2 && (activeStageTab === 1 || activeStageTab === 2)) || activeStageTab === st.stage
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/60"
              }`}
            >
              <st.icon className="w-4 h-4" />
              <span>{st.name}</span>
            </button>
          ))}
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Reset Proyek?</h3>
            <p className="text-neutral-500 mb-6">
              Anda yakin ingin mengulangi proyek ini dari awal? Semua hasil (babak, narasi, prompt) akan dihapus secara permanen.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-neutral-600 font-medium hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  setShowResetConfirm(false);
                  setProcessingState({ isProcessing: false, stage: 0, progress: "", error: null });
                  await db.acts.where("projectId").equals(project.id).delete();
                  await db.prompts.where("projectId").equals(project.id).delete();
                  await db.projects.update(project.id, { status: "draft" });
                }}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Ya, Reset Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft State */}
      {project.status === "draft" && (
        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm text-center space-y-6">
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-lg font-semibold">Siap memproses transkrip</h2>
            <p className="text-neutral-500 text-sm">Transkrip berhasil dimuat. Panjang: {transcript.originalText.length} karakter.</p>
          </div>
          {project.mode === "manual" && (
            <button onClick={runStage1} className="inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-neutral-800 transition-all">
              <Play className="w-4 h-4" /> Mulai Tahap 1 (Bagi Babak)
            </button>
          )}
        </div>
      )}

      {/* Stage 1 & 2 Completed (Review Acts & Narratives) */}
      {(activeStageTab === 1 || activeStageTab === 2) && acts && acts.length > 0 && (() => {
        const filteredActs = acts.filter(act => selectedActTabId === "all" || act.id === selectedActTabId);

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-neutral-700" />
                  Rincian Babak ({acts.length} Babak)
                </h2>
                
                {acts.some(a => a.narrativeText) && (
                  <button
                    onClick={handleCopyAllNarratives}
                    className="text-xs font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedAllNarratives ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Salin Semua Narasi
                      </>
                    )}
                  </button>
                )}

                {/* Tab Filter for Acts */}
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setSelectedActTabId("all")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${selectedActTabId === "all" ? "bg-white text-neutral-900 shadow-xs font-semibold" : "text-neutral-600 hover:text-neutral-900"}`}
                  >
                    Semua ({acts.length})
                  </button>
                  {acts.map(act => (
                    <button
                      key={act.id}
                      onClick={() => setSelectedActTabId(act.id)}
                      className={`px-2.5 py-1 rounded-md transition-colors ${selectedActTabId === act.id ? "bg-white text-neutral-900 shadow-xs font-semibold" : "text-neutral-600 hover:text-neutral-900"}`}
                    >
                      Babak {act.actNumber}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsActsCollapsed(!isActsCollapsed)}
                  className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {isActsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  <span>{isActsCollapsed ? "Tampilkan Detail Babak" : "Sembunyikan Detail Babak"}</span>
                </button>

                {project.status === "stage1" && project.mode === "manual" && (
                  <button onClick={runStage2} className="inline-flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-all">
                    Lanjut ke Tahap 2 <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {!isActsCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredActs.map(act => (
                  <div key={act.id} className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-neutral-900 flex items-center gap-2">
                        <span className="bg-neutral-100 text-neutral-600 w-6 h-6 rounded flex items-center justify-center text-xs font-semibold">
                          {act.actNumber}
                        </span>
                        Babak {act.actNumber}
                      </h3>
                      <button
                        onClick={() => handleCopyAct(act)}
                        title="Salin isi babak"
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors flex items-center gap-1 text-xs cursor-pointer"
                      >
                        {copiedActId === act.id ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Tersalin</span>
                          </>
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    {project.status === "stage1" ? (
                      <textarea 
                        defaultValue={act.rawText}
                        onBlur={(e) => db.acts.update(act.id, { rawText: e.target.value })}
                        className="w-full text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none resize-y h-32"
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="text-sm text-neutral-500 italic line-clamp-2">{act.rawText}</div>
                        
                        {act.narrativeText ? (
                          <div className="pt-3 border-t border-neutral-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Narasi</h4>
                              <button
                                onClick={() => handleRegenerateActNarrative(act)}
                                disabled={regeneratingActId === act.id}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 transition-colors cursor-pointer"
                              >
                                {regeneratingActId === act.id ? "Memproses..." : "Regenerasi Narasi"}
                              </button>
                            </div>
                            {project.status === "stage2" ? (
                              <textarea 
                                defaultValue={act.narrativeText}
                                onBlur={(e) => db.acts.update(act.id, { narrativeText: e.target.value })}
                                className="w-full text-sm text-neutral-800 bg-blue-50/50 p-3 rounded-lg border border-blue-100 focus:border-blue-300 focus:ring-1 focus:ring-blue-300 outline-none resize-y h-32"
                              />
                            ) : (
                              <p className="text-sm text-neutral-800 leading-relaxed max-h-36 overflow-y-auto pr-1">{act.narrativeText}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-neutral-400">Menunggu narasi...</span>
                            <button
                              onClick={() => handleRegenerateActNarrative(act)}
                              disabled={regeneratingActId === act.id}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              {regeneratingActId === act.id ? "Memproses..." : "Buat Narasi"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {project.status === "stage2" && project.mode === "manual" && (
              <div className="flex justify-end pt-4">
                <button onClick={runStage3} className="inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-neutral-800 transition-all">
                  Lanjut ke Tahap 3 (Buat Prompt) <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Stage 3 Display: Prompts Review */}
      {activeStageTab === 3 && prompts && prompts.length > 0 && (() => {
        const failedPromptsCount = prompts.filter(p => !p.englishPrompt || p.englishPrompt.toLowerCase().includes("gagal membuat prompt") || p.englishPrompt.toLowerCase().includes("cinematic visual representation of:")).length;
        const successPromptsCount = prompts.length - failedPromptsCount;


        const filteredPrompts = prompts.filter(item => {
          if (promptActFilter !== "all" && item.actId !== promptActFilter) return false;
          
          const isFailed = !item.englishPrompt || item.englishPrompt.toLowerCase().includes("gagal membuat prompt") || item.englishPrompt.toLowerCase().includes("cinematic visual representation of:");
          if (promptStatusFilter === "success" && isFailed) return false;
          if (promptStatusFilter === "failed" && !isFailed) return false;

          if (promptSearch.trim()) {
            const q = promptSearch.toLowerCase();
            const matchSentence = item.originalSentence?.toLowerCase().includes(q);
            const matchPrompt = item.englishPrompt?.toLowerCase().includes(q);
            const matchSeq = item.sequenceNumber?.toString() === q;
            if (!matchSentence && !matchPrompt && !matchSeq) return false;
          }

          return true;
        });


        const totalFiltered = filteredPrompts.length;
        const totalPages = promptsPerPage === 999 ? 1 : Math.ceil(totalFiltered / promptsPerPage) || 1;
        const validPage = Math.min(promptPage, totalPages);
        const startIndex = promptsPerPage === 999 ? 0 : (validPage - 1) * promptsPerPage;
        const currentPagePrompts = promptsPerPage === 999 ? filteredPrompts : filteredPrompts.slice(startIndex, startIndex + promptsPerPage);

        return (
          <div className="pt-8 border-t border-neutral-200 space-y-6">
            {/* Summary Info Cards (Success & Error Overview) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button 
                onClick={() => { setPromptStatusFilter("all"); setPromptPage(1); }}
                className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${promptStatusFilter === "all" ? "bg-white border-neutral-900 ring-2 ring-neutral-900/10 shadow-xs" : "bg-white border-neutral-200 hover:border-neutral-300"}`}
              >
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Prompt</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">{prompts.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 font-semibold">
                  {prompts.length}
                </div>
              </button>

              <button 
                onClick={() => { setPromptStatusFilter("success"); setPromptPage(1); }}
                className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${promptStatusFilter === "success" ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs" : "bg-white border-neutral-200 hover:border-emerald-200"}`}
              >
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Berhasil
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">{successPromptsCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  ✓
                </div>
              </button>

              <button 
                onClick={() => { setPromptStatusFilter("failed"); setPromptPage(1); }}
                className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${promptStatusFilter === "failed" ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs" : failedPromptsCount > 0 ? "bg-amber-50/50 border-amber-200 hover:border-amber-400" : "bg-white border-neutral-200"}`}
              >
                <div>
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Perlu Perbaikan
                  </p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{failedPromptsCount}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${failedPromptsCount > 0 ? "bg-amber-200 text-amber-900" : "bg-neutral-100 text-neutral-400"}`}>
                  {failedPromptsCount > 0 ? "!" : "0"}
                </div>
              </button>
            </div>

            {/* Header & Main Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-neutral-800" />
                  Prompt Visual Akhir
                </h2>
                <p className="text-neutral-500 text-sm mt-0.5">Tinjau, edit, dan ekspor prompt gambar AI Anda.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {failedPromptsCount > 0 && (
                  <button 
                    onClick={handleFixAllFailedPrompts}
                    disabled={isFixingFailedPrompts}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isFixingFailedPrompts ? "animate-spin" : ""}`} />
                    <span>{isFixingFailedPrompts ? "Memperbaiki..." : `Perbaiki ${failedPromptsCount} Prompt Gagal`}</span>
                  </button>
                )}
                <button 
                  onClick={handleCopyAll} 
                  className="flex items-center gap-2 bg-white border border-neutral-200 text-neutral-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-all shadow-xs cursor-pointer"
                >
                  {isAllPromptsCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">Tersalin Semua</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Salin Semua
                    </>
                  )}
                </button>
                <button onClick={handleExportTxt} className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-800 transition-all shadow-xs cursor-pointer">
                  <FileDown className="w-4 h-4" /> Ekspor TXT
                </button>
              </div>
            </div>

            {/* Controls & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Cari kata kunci di kalimat atau prompt..."
                    value={promptSearch}
                    onChange={(e) => { setPromptSearch(e.target.value); setPromptPage(1); }}
                    className="w-full pl-10 pr-9 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
                  />
                  {promptSearch && (
                    <button onClick={() => { setPromptSearch(""); setPromptPage(1); }} className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Options & View Switcher */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {/* Status Filter Pill */}
                  <div className="flex items-center bg-neutral-100 p-1 rounded-xl font-medium">
                    <button
                      onClick={() => { setPromptStatusFilter("all"); setPromptPage(1); }}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${promptStatusFilter === "all" ? "bg-white text-neutral-900 font-semibold shadow-xs" : "text-neutral-600 hover:text-neutral-900"}`}
                    >
                      Semua ({prompts.length})
                    </button>
                    <button
                      onClick={() => { setPromptStatusFilter("success"); setPromptPage(1); }}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${promptStatusFilter === "success" ? "bg-emerald-600 text-white font-semibold shadow-xs" : "text-neutral-600 hover:text-neutral-900"}`}
                    >
                      ✓ Berhasil ({successPromptsCount})
                    </button>
                    <button
                      onClick={() => { setPromptStatusFilter("failed"); setPromptPage(1); }}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${promptStatusFilter === "failed" ? "bg-amber-500 text-white font-semibold shadow-xs" : "text-neutral-600 hover:text-neutral-900"}`}
                    >
                      ⚠️ Perlu Perbaikan ({failedPromptsCount})
                    </button>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-neutral-100 p-1 rounded-xl font-medium">
                    <button
                      onClick={() => setPromptViewMode("compact")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${promptViewMode === "compact" ? "bg-white text-neutral-900 font-semibold shadow-xs" : "text-neutral-600 hover:text-neutral-900"}`}
                      title="Tampilan Tabel Ringkas (Hemat Scroll)"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Ringkas</span>
                    </button>
                    <button
                      onClick={() => setPromptViewMode("cards")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${promptViewMode === "cards" ? "bg-white text-neutral-900 font-semibold shadow-xs" : "text-neutral-600 hover:text-neutral-900"}`}
                      title="Tampilan Kartu Detail"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Kartu</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Babak Tabs Filter & Page size selector */}
              {acts && acts.length > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium">
                    <span className="text-neutral-400 mr-1 flex items-center gap-1"><Filter className="w-3 h-3" /> Babak:</span>
                    <button
                      onClick={() => { setPromptActFilter("all"); setPromptPage(1); }}
                      className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer ${promptActFilter === "all" ? "bg-neutral-900 text-white font-semibold" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
                    >
                      Semua Babak
                    </button>
                    {acts.map(act => (
                      <button
                        key={act.id}
                        onClick={() => { setPromptActFilter(act.id); setPromptPage(1); }}
                        className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer ${promptActFilter === act.id ? "bg-neutral-900 text-white font-semibold" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
                      >
                        Babak {act.actNumber}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>Tampilkan:</span>
                    <select
                      value={promptsPerPage}
                      onChange={(e) => { setPromptsPerPage(Number(e.target.value)); setPromptPage(1); }}
                      className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-neutral-800 font-medium focus:outline-none focus:border-neutral-900"
                    >
                      <option value={10}>10 per halaman</option>
                      <option value={25}>25 per halaman</option>
                      <option value={50}>50 per halaman</option>
                      <option value={999}>Tampilkan Semua</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt List Rendering */}
            {filteredPrompts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-neutral-500 space-y-2">
                <p className="font-medium text-neutral-800">Tidak ada prompt yang cocok dengan filter Anda.</p>
                <button
                  onClick={() => { setPromptActFilter("all"); setPromptStatusFilter("all"); setPromptSearch(""); }}
                  className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Reset Filter & Pencarian
                </button>
              </div>
            ) : promptViewMode === "compact" ? (
              /* COMPACT TABLE VIEW */
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4 w-20">Babak</th>
                        <th className="py-3 px-4 w-2/5">Kalimat Cerita (ID)</th>
                        <th className="py-3 px-4 w-2/5">Prompt Visual AI (EN)</th>
                        <th className="py-3 px-4 w-28 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                      {currentPagePrompts.map((item) => {
                        const isFailed = !item.englishPrompt || item.englishPrompt.toLowerCase().includes("gagal membuat prompt") || item.englishPrompt.toLowerCase().includes("cinematic visual representation of:");
                        const actObj = acts?.find(a => a.id === item.actId);

                        return (
                          <tr key={item.id} className={`hover:bg-neutral-50/80 transition-colors ${isFailed ? "bg-amber-50/30" : ""}`}>
                            <td className="py-3 px-4 text-center text-xs font-semibold text-neutral-500 align-top pt-4">
                              {item.sequenceNumber}
                            </td>
                            <td className="py-3 px-4 align-top pt-3.5">
                              <span className="inline-block bg-neutral-100 text-neutral-700 text-xs font-medium px-2 py-0.5 rounded">
                                B{actObj?.actNumber || "?"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-neutral-700 text-xs leading-relaxed align-top pt-3.5">
                              {item.originalSentence}
                            </td>
                            <td className="py-3 px-4 align-top pt-2.5">
                              <div className="space-y-1">
                                <textarea
                                  key={item.englishPrompt}
                                  defaultValue={item.englishPrompt}
                                  onBlur={(e) => db.prompts.update(item.id, { englishPrompt: e.target.value })}
                                  rows={2}
                                  className={`w-full text-xs font-mono text-neutral-900 p-2.5 rounded-lg border outline-none resize-y transition-colors ${
                                    isFailed 
                                      ? "bg-amber-50 border-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                                      : "bg-neutral-50/60 border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                                  }`}
                                />
                                {isFailed && (
                                  <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                    Prompt gagal terbuat, klik Regenerasi
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 align-top pt-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleRegenerateSinglePrompt(item)}
                                  disabled={regeneratingSinglePromptId === item.id}
                                  title="Regenerasi Prompt AI"
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  <RefreshCw className={`w-4 h-4 ${regeneratingSinglePromptId === item.id ? "animate-spin" : ""}`} />
                                </button>
                                <button
                                  onClick={() => handleCopySinglePrompt(item.id, item.englishPrompt, item.sequenceNumber)}
                                  title="Salin Prompt"
                                  className="p-1.5 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  {copiedSinglePromptId === item.id ? (
                                    <Check className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* CARD DETAILED VIEW */
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
                <div className="divide-y divide-neutral-100 max-h-[600px] overflow-y-auto pr-1">
                  {currentPagePrompts.map((promptItem) => {
                    const isFailed = !promptItem.englishPrompt || promptItem.englishPrompt.toLowerCase().includes("gagal membuat prompt") || promptItem.englishPrompt.toLowerCase().includes("cinematic visual representation of:");

                    return (
                      <div key={promptItem.id} className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center bg-neutral-100 text-neutral-700 text-xs font-semibold px-2.5 py-1 rounded-md">
                              Prompt #{promptItem.sequenceNumber}
                            </span>
                            {isFailed && (
                              <span className="inline-flex items-center justify-center bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-md">
                                Perlu Perbaikan
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 leading-relaxed">{promptItem.originalSentence}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-neutral-400">Prompt Visual (EN)</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleRegenerateSinglePrompt(promptItem)}
                                disabled={regeneratingSinglePromptId === promptItem.id}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                title="Regenerasi prompt kalimat ini saja dengan AI"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSinglePromptId === promptItem.id ? "animate-spin" : ""}`} />
                                <span>{regeneratingSinglePromptId === promptItem.id ? "Memproses..." : "Regenerasi"}</span>
                              </button>
                              <button
                                onClick={() => handleCopySinglePrompt(promptItem.id, promptItem.englishPrompt, promptItem.sequenceNumber)}
                                className="text-xs text-neutral-400 hover:text-neutral-700 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Salin prompt ini saja"
                              >
                                {copiedSinglePromptId === promptItem.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-600 font-medium">Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                          <textarea
                            key={promptItem.englishPrompt}
                            defaultValue={promptItem.englishPrompt}
                            onBlur={(e) => db.prompts.update(promptItem.id, { englishPrompt: e.target.value })}
                            className={`w-full text-sm font-mono text-neutral-900 p-3.5 rounded-xl border outline-none resize-y min-h-[85px] transition-colors ${
                              isFailed 
                                ? "bg-amber-50/40 border-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                                : "bg-neutral-50/50 border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-neutral-200 text-xs text-neutral-600">
                <div>
                  Menampilkan <span className="font-semibold text-neutral-900">{startIndex + 1}</span> - <span className="font-semibold text-neutral-900">{Math.min(startIndex + (promptsPerPage === 999 ? totalFiltered : promptsPerPage), totalFiltered)}</span> dari <span className="font-semibold text-neutral-900">{totalFiltered}</span> Prompt
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPromptPage(p => Math.max(1, p - 1))}
                    disabled={validPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white font-medium transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                  </button>
                  <span className="px-2 font-medium">Halaman {validPage} dari {totalPages}</span>
                  <button
                    onClick={() => setPromptPage(p => Math.min(totalPages, p + 1))}
                    disabled={validPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white font-medium transition-colors cursor-pointer"
                  >
                    Berikutnya <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Stage 4 Display: Studio Video & Audio Sync */}
      {activeStageTab === 4 && (
        <VideoStudio projectId={project.id} onShowToast={showToast} />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-5 duration-200 ${
          toast.type === "success" ? "bg-emerald-950 text-emerald-100 border-emerald-800" :
          toast.type === "error" ? "bg-rose-950 text-rose-100 border-rose-800" :
          "bg-neutral-900 text-neutral-100 border-neutral-700"
        }`}>
          {toast.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === "info" && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-md transition-colors ml-2 cursor-pointer">
            <X className="w-4 h-4 text-neutral-400 hover:text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
