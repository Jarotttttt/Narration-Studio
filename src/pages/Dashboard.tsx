import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Clock, Trash2, ChevronRight, X, Check } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray());

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await db.projects.delete(id);
    await db.transcripts.where("projectId").equals(id).delete();
    await db.acts.where("projectId").equals(id).delete();
    await db.prompts.where("projectId").equals(id).delete();
    setConfirmDeleteId(null);
  };

  if (!projects) return <div className="text-center py-12 text-neutral-500">Memuat...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Proyek Anda</h1>
          <p className="text-neutral-500 mt-1">Kelola dan tinjau alur kerja narasi Anda.</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24 bg-white border border-neutral-200 border-dashed rounded-xl">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900">Belum ada proyek</h3>
          <p className="text-neutral-500 mt-1 mb-6">Buat proyek baru untuk mulai mengubah transkrip Anda.</p>
          <Link to="/project/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-neutral-900 text-white hover:bg-neutral-800 h-10 px-4 py-2">
            Buat Proyek Pertama
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projects.map((project) => (
            <div key={project.id} onClick={() => navigate(`/project/${project.id}`)} className="block group cursor-pointer">
              <div className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <h3 className="font-semibold text-lg text-neutral-900 group-hover:text-blue-600 transition-colors truncate">
                    {project.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1.5 font-medium text-neutral-600 bg-neutral-50 px-2.5 py-1 rounded-md border border-neutral-100 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      {new Date(project.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="capitalize px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-md font-medium whitespace-nowrap">
                      Mode: <span className="font-semibold">{project.mode === 'auto' ? 'Otomatis' : 'Manual'}</span>
                    </span>
                    <span className="capitalize px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-medium whitespace-nowrap border border-blue-100">
                      Status: <span className="font-semibold">{project.status.replace("stage", "Tahap ")}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                  {confirmDeleteId === project.id ? (
                    <div className="flex items-center gap-1.5 bg-red-50 rounded-lg p-1 border border-red-200">
                      <span className="text-xs text-red-700 font-medium px-2 whitespace-nowrap">Hapus proyek?</span>
                      <button 
                        onClick={(e) => deleteProject(project.id, e)}
                        className="p-1.5 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
                        title="Ya, hapus"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(null); }}
                        className="p-1.5 text-neutral-600 hover:bg-neutral-200 rounded-md transition-colors"
                        title="Batal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(project.id); }}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Proyek"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
