import { useState, useEffect } from "react";
import { db, DEFAULT_INSTRUCTIONS } from "../db";
import { InstructionTemplate } from "../types";
import { Save, RotateCcw, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [instructions, setInstructions] = useState<InstructionTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    loadInstructions();
  }, []);

  const loadInstructions = async () => {
    const data = await db.instructions.toArray();
    setInstructions(data);
  };

  const handleEdit = (inst: InstructionTemplate) => {
    setEditingId(inst.id);
    setEditContent(inst.content);
  };

  const handleSave = async () => {
    if (!editingId) return;
    await db.instructions.update(editingId, {
      content: editContent,
      isDefault: editContent === DEFAULT_INSTRUCTIONS[editingId]
    });
    setEditingId(null);
    setSavedMessage("Pengaturan berhasil disimpan!");
    setTimeout(() => setSavedMessage(""), 3000);
    loadInstructions();
  };

  const handleReset = async (id: string) => {
    if (confirm("Atur ulang instruksi ini ke default?")) {
      await db.instructions.update(id, {
        content: DEFAULT_INSTRUCTIONS[id],
        isDefault: true
      });
      loadInstructions();
    }
  };

  const getTitle = (id: string) => {
    switch(id) {
      case "stage1": return "Tahap 1: Bagi ke 6 Babak";
      case "stage2": return "Tahap 2: Babak ke Narasi";
      case "stage3": return "Tahap 3: Kalimat ke Prompt Inggris";
      default: return id;
    }
  };

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Pengaturan Instruksi AI</h1>
        <p className="text-neutral-500 mt-1">Sesuaikan prompt yang dikirim ke AI untuk setiap tahap.</p>
      </div>

      {savedMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 text-sm font-medium border border-green-200">
          <CheckCircle2 className="w-5 h-5" />
          {savedMessage}
        </div>
      )}

      <div className="space-y-6">
        {instructions.map((inst) => (
          <div key={inst.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-neutral-900">{getTitle(inst.id)}</h3>
              <div className="flex gap-2">
                {!inst.isDefault && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md">Kustom</span>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {editingId === inst.id ? (
                <div className="space-y-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all font-mono text-sm leading-relaxed"
                  />
                  <div className="flex gap-3 justify-end">
                    <button 
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleSave}
                      className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-md hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                    >
                      <Save className="w-4 h-4" /> Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-700 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                    {inst.content}
                  </pre>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleEdit(inst)}
                      className="px-4 py-2 text-sm font-medium bg-white border border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50 transition-colors"
                    >
                      Edit Instruksi
                    </button>
                    {!inst.isDefault && (
                      <button 
                        onClick={() => handleReset(inst.id)}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" /> Atur Ulang ke Default
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
