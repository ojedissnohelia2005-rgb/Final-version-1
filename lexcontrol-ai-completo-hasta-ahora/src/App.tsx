import React, { useState, useEffect } from "react";
import { UserProfile, Empresa } from "./types";
import Login from "./components/Login";
import AppShell from "./components/AppShell";
import ComplianceMatrix from "./components/ComplianceMatrix";
import JudicialProcesses from "./components/JudicialProcesses";
import VigilanciaNormativa from "./components/VigilanciaNormativa";
import CalendarPlanner from "./components/CalendarPlanner";
import NotaryMap from "./components/NotaryMap";
import QuickChat from "./components/QuickChat";
import TransparenciaAudit from "./components/TransparenciaAudit";
import GabineteLegal from "./components/GabineteLegal";

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [activeTab, setActiveTab] = useState("compliance");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("lex_theme");
    return (saved as "light" | "dark") || "light";
  });

  // Manage theme setting on document element
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("lex_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  // Fetch initial configuration of companies
  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        setEmpresas(data);
        if (data.length > 0) {
          setSelectedEmpresa(data[0]);
        }
      })
      .catch((err) => console.error("Error loading companies", err));
  }, []);

  // Sync selected company workspace for non-superadmin users.
  useEffect(() => {
    if (profile && profile.rol !== "super_admin" && empresas.length > 0) {
      const matched = empresas.find(e => e.id === profile.empresa_id);
      if (matched) {
        setSelectedEmpresa(matched);
      }
    }
  }, [profile, empresas]);

  const handleLogout = () => {
    setProfile(null);
    setActiveTab("compliance");
  };

  // Render authentic screen
  if (!profile) {
    return <Login onLoginSuccess={(prof) => setProfile(prof)} />;
  }

  // Fallback loading check
  if (!selectedEmpresa) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-charcoal font-sans text-xs">
        Sincronizando casillero legal de LexControl...
      </div>
    );
  }

  return (
    <AppShell
      currentProfile={profile}
      empresas={empresas}
      selectedEmpresa={selectedEmpresa}
      onEmpresaChange={(emp) => setSelectedEmpresa(emp)}
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      theme={theme}
      onThemeToggle={toggleTheme}
    >
      <div className="fade-in">
        {activeTab === "compliance" && (
          <ComplianceMatrix selectedEmpresa={selectedEmpresa} currentProfile={profile} />
        )}
        {activeTab === "procesos" && (
          <JudicialProcesses selectedEmpresa={selectedEmpresa} currentProfile={profile} />
        )}
        {activeTab === "gabinete" && (
          <GabineteLegal selectedEmpresa={selectedEmpresa} currentProfile={profile} />
        )}
        {activeTab === "vigilancia" && (
          <VigilanciaNormativa selectedEmpresa={selectedEmpresa} currentProfile={profile} />
        )}
        {activeTab === "calendario" && (
          <CalendarPlanner selectedEmpresa={selectedEmpresa} currentProfile={profile} />
        )}
        {activeTab === "notarias" && (
          <NotaryMap 
            currentNegocioId={selectedEmpresa.id} 
            selectedEmpresa={selectedEmpresa}
            currentProfile={profile}
            onEmpresaUpdate={(updatedEmp) => {
              setEmpresas(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
              setSelectedEmpresa(updatedEmp);
            }}
          />
        )}
        {activeTab === "chat" && (
          <QuickChat selectedEmpresa={selectedEmpresa} currentProfile={profile} />
        )}
        {activeTab === "transparencia" && (
          <TransparenciaAudit selectedEmpresa={selectedEmpresa} currentProfile={profile} />
        )}
      </div>
    </AppShell>
  );
}
