import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { LayoutDashboard, Settings, PlusCircle, Sparkles } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject";
import ProjectView from "./pages/ProjectView";
import SettingsPage from "./pages/SettingsPage";
import { initializeInstructions } from "./db";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-40 transition-all">
        <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-neutral-800 flex items-center gap-2.5">
            <div className="bg-neutral-900 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <span>NarasiFlow</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-neutral-600">
            <Link to="/" className="flex items-center gap-2 hover:text-neutral-900 transition-colors">
              <LayoutDashboard className="w-4 h-4" />
              Proyek
            </Link>
            <Link to="/settings" className="flex items-center gap-2 hover:text-neutral-900 transition-colors">
              <Settings className="w-4 h-4" />
              Pengaturan
            </Link>
            <Link to="/project/new" className="bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-sm">
              <PlusCircle className="w-4 h-4" />
              Proyek Baru
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full px-6 lg:px-10 py-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    initializeInstructions().catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/new" element={<NewProject />} />
          <Route path="/project/:id" element={<ProjectView />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
