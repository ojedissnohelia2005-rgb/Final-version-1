import React, { useState, useEffect } from "react";
import { UserProfile, Empresa } from "../types";
import { ShieldAlert, Gavel, Calendar, MapPin, MessageSquare, ShieldCheck, LogOut, ChevronDown, ListFilter, Users, Sun, Moon, Bell, Check, FileText } from "lucide-react";
import ScaleWithN from "./ScaleWithN";

interface AppShellProps {
  currentProfile: UserProfile;
  empresas: Empresa[];
  selectedEmpresa: Empresa | null;
  onEmpresaChange: (empresa: Empresa) => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  children: React.ReactNode;
}

export default function AppShell({
  currentProfile,
  empresas,
  selectedEmpresa,
  onEmpresaChange,
  onLogout,
  activeTab,
  setActiveTab,
  theme,
  onThemeToggle,
  children
 }: AppShellProps) {
  const [showCompanySelect, setShowCompanySelect] = useState(false);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Filter tabs by active role access
  const isGuest = currentProfile?.rol === "invitado";
  const isUser = currentProfile?.rol === "user";
  const isAdmin = currentProfile?.rol === "admin";
  const isSuper = currentProfile?.rol === "super_admin";

  const canSeeNotifCenter = currentProfile?.rol !== "invitado";

  useEffect(() => {
    if (selectedEmpresa) {
      fetchNotifications();
      // Polling for live notification updates
      const interval = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchNotifications();
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedEmpresa]);

  const fetchNotifications = async () => {
    if (!selectedEmpresa || !selectedEmpresa.id) return;
    try {
      const res = await fetch(`/api/notificaciones?negocio_id=${selectedEmpresa.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotificaciones(data);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes("Failed to fetch") || errMsg.includes("NetworkError") || err?.name === "AbortError") {
        console.warn("La sincronización de notificaciones está temporalmente desconectada o el servidor está reiniciando.");
      } else {
        console.error("Error loading notifications", err);
      }
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/notificaciones/marcar-leida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notificaciones/limpiar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negocio_id: selectedEmpresa?.id })
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notificaciones.filter(n => !n.leida).length;

  const allTabs = [
    { id: "compliance", name: "Matriz Compliance", icon: ShieldCheck, roles: ["super_admin", "admin", "user", "invitado"] },
    { id: "procesos", name: "Procesos Judiciales", icon: Gavel, roles: ["super_admin", "admin", "user", "invitado"] },
    { id: "gabinete", name: "Gabinete & SATJE", icon: FileText, roles: ["super_admin", "admin", "user", "invitado"] },
    { id: "vigilancia", name: "Normativa & Alertas", icon: ShieldAlert, roles: ["super_admin", "admin", "user", "invitado"] },
    { id: "calendario", name: "Calendario & Planner", icon: Calendar, roles: ["super_admin", "admin", "user", "invitado"] },
    { id: "notarias", name: "Mapa de Notarías", icon: MapPin, roles: ["super_admin", "admin", "user", "invitado"] },
    { id: "chat", name: "Chat Legal", icon: MessageSquare, roles: ["super_admin", "admin", "user", "invitado"] },
    { id: "transparencia", name: "Transparencia & Accesos", icon: ListFilter, roles: ["super_admin", "admin", "user"] }
  ];

  let visibleTabs = allTabs.filter(tab => tab.roles.includes(currentProfile.rol));

  if (currentProfile.rol === "invitado") {
    visibleTabs = visibleTabs.filter(tab => {
      const isComplianceTab = ["compliance", "vigilancia"].includes(tab.id);
      const isJudicialTab = ["procesos", "calendario", "notarias", "chat"].includes(tab.id);

      if (isComplianceTab) {
        return !!currentProfile.permitir_compliance;
      }
      if (isJudicialTab) {
        return !!currentProfile.permitir_judicial;
      }
      return true; // other basic items
    });
  }

  const handleSelectCompany = (emp: Empresa) => {
    onEmpresaChange(emp);
    setShowCompanySelect(false);
  };

  // If a role change takes away access to the active tab, fall back to "procesos" which is universally visible
  React.useEffect(() => {
    if (!visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab("procesos");
    }
  }, [currentProfile, activeTab]);
  return (
    <div className="min-h-screen bg-cream flex flex-col text-charcoal font-sans">
      
      {/* TOPBAR HEADER BANNER IN BENTO GRID STYLE */}
      <header className="h-16 px-4 md:px-8 border-b border-borderSoft flex items-center justify-between bg-white shrink-0 sticky top-0 z-40 shadow-sm">
        
        {/* Brand Name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-charcoal rounded-lg flex items-center justify-center shadow-sm relative group overflow-hidden">
            <ScaleWithN className="text-cream" size={24} />
          </div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-coffeeNav flex items-center gap-2">
            LexControl AI 
            <span className="text-[9px] uppercase tracking-widest opacity-60 font-mono font-bold bg-cream px-1.5 py-0.5 rounded border border-borderSoft hidden sm:inline-block">Ecuador v2026</span>
          </h1>
        </div>

        {/* Dynamic Status Capsule and Workspace Switcher */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-[rgba(142,107,107,0.08)] px-3 py-1.5 rounded-full select-none border border-sidebarRose/10">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[11px] font-medium text-sidebarRose">Vigilancia en Tiempo Real Activa</span>
          </div>

          <div className="h-6 w-px bg-borderSoft hidden lg:block"></div>

          {/* Corporate Tenant Switcher Selector */}
          <div className="relative">
            {isSuper ? (
              <button
                onClick={() => setShowCompanySelect(!showCompanySelect)}
                type="button"
                className="inline-flex items-center gap-2 bg-cream hover:bg-paperDark border border-borderSoft rounded-xl px-3 py-1.5 text-xs font-semibold tracking-wide cursor-pointer transition-colors shadow-sm select-none"
              >
                🏢 {selectedEmpresa ? selectedEmpresa.nombre : "Seleccionar Empresa"}
                <ChevronDown className="w-3.5 h-3.5 text-charcoalMuted" />
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 bg-cream border border-borderSoft rounded-xl px-3 py-1.5 text-xs font-semibold">
                🏢 {selectedEmpresa ? selectedEmpresa.nombre : "Empresa activa"}
              </div>
            )}

            {/* Dropdown menu */}
            {showCompanySelect && isSuper && (
              <div className="absolute top-full right-0 mt-1.5 w-64 bg-white border border-borderSoft rounded-xl shadow-lg z-50 p-2 space-y-1">
                <div className="text-[9px] font-bold text-charcoalMuted uppercase tracking-wider px-2 py-1 border-b border-borderSoft/50 mb-1">
                  Elegir Workspace de Empresa
                </div>
                {empresas.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectCompany(emp)}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      selectedEmpresa?.id === emp.id
                        ? "bg-roseSoft text-sidebarRose font-semibold"
                        : "hover:bg-cream text-charcoalSoft"
                    }`}
                  >
                    <span>{emp.nombre}</span>
                    {selectedEmpresa?.id === emp.id && <span className="w-1.5 h-1.5 rounded-full bg-sidebarRose"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-borderSoft"></div>

          {/* User profile capsule */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-charcoal">{currentProfile?.nombre.split(" ")[0]}</p>
              <p className="text-[10px] uppercase font-mono font-bold text-sidebarRose tracking-wide leading-none mt-0.5">{currentProfile?.rol}</p>
            </div>
            
            {/* Avatar block */}
            <div className="w-8 h-8 rounded-full bg-roseOld border border-white flex items-center justify-center font-bold text-xs text-white shadow-sm select-none uppercase">
              {currentProfile?.nombre ? currentProfile.nombre.substring(0, 2) : "NO"}
            </div>

            {/* Notification center for users with fuller access */}
            {canSeeNotifCenter && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  type="button"
                  className="p-1.5 bg-cream hover:bg-paperDark border border-borderSoft rounded-lg cursor-pointer transition-colors text-charcoalSoft relative"
                  title="Notificaciones de Abogados Externos"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger rounded-full animate-bounce"></span>
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute top-full right-0 mt-2.5 w-80 bg-white border border-borderSoft rounded-2xl shadow-xl z-50 p-3 space-y-2 max-h-[380px] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-borderSoft/60 pb-2 mb-1">
                      <div>
                        <h4 className="font-serif font-bold text-xs text-charcoal">Control de Alertas Externas</h4>
                        <p className="text-[9px] text-charcoalMuted">Acción litigante (Montblanc Estudio)</p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[9px] font-bold text-sidebarRose hover:underline"
                        >
                          Marcar todo leído
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 flex flex-col">
                      {notificaciones.length === 0 ? (
                        <p className="text-[10px] text-charcoalMuted text-center py-6 italic font-sans animate-pulse">
                          No hay notificaciones de co-gestión registradas.
                        </p>
                      ) : (
                        notificaciones.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              notif.leida
                                ? "bg-cream/40 border-borderSoft/40 opacity-70"
                                : "bg-roseSoft/30 border-sidebarRose/20 hover:bg-roseSoft/50 cursor-pointer"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-[9px] font-mono font-bold uppercase text-sidebarRose">
                                {notif.tipo_accion === "carga_etapa"
                                  ? "📂 NUEVA ACTUACIÓN"
                                  : notif.tipo_accion === "calculo_plazo"
                                  ? "⏳ TÉRMINO PLANIFICADO"
                                  : "📅 PLANNER COMPARTIDO"}
                              </span>
                              {!notif.leida && (
                                <button
                                  onClick={(e) => handleMarkAsRead(notif.id, e)}
                                  className="p-1 text-success hover:bg-successSoft rounded cursor-pointer"
                                  title="Marcar leída"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <h5 className="font-serif text-xs font-bold text-charcoal mt-1 leading-snug">
                              {notif.titulo}
                            </h5>
                            <p className="text-[10px] text-charcoalSoft font-sans mt-0.5 leading-relaxed">
                              {notif.descripcion}
                            </p>
                            <div className="flex justify-between items-center text-[8px] text-charcoalMuted mt-1.5 font-mono">
                              <span>Por: {notif.remitente_nombre}</span>
                              <span>{notif.fecha ? notif.fecha.substring(11, 16) : "12:00"} ECT</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Theme switcher */}
            <button
              onClick={onThemeToggle}
              type="button"
              className="p-1.5 bg-cream hover:bg-paperDark border border-borderSoft rounded-lg cursor-pointer transition-colors text-charcoalSoft"
              title={theme === "light" ? "Cambiar a Versión Oscura" : "Cambiar a Versión Visual Crema"}
            >
              {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            {/* LogOut */}
            <button
              onClick={onLogout}
              type="button"
              className="p-1.5 bg-cream hover:bg-dangerSoft hover:text-danger border border-borderSoft rounded-lg cursor-pointer transition-colors shadow-none"
              title="Cerrar sesión segura"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </header>

      {/* INNER VIEW CONTENT */}
      <main className="flex-1 container max-w-7xl mx-auto px-4 md:px-8 py-6 mb-20">
        {children}
      </main>

      {/* FOOTER BAR NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-coffeeNav px-4 md:px-8 flex items-center justify-between shadow-2xl z-40">
        <div className="flex gap-4 md:gap-8 overflow-x-auto py-1 scrollbar-hide max-w-[80%] pr-4 font-sans">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-150 ${
                  isActive ? "text-[#D4A5A5] scale-105" : "text-[#ffffff]/60 hover:text-[#ffffff]"
                }`}
                type="button"
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#D4A5A5]" : "text-[#ffffff]/60"}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                  {tab.name.replace("Matriz ", "").replace("Procesos ", "").replace("Mapa de ", "").replace("Chat ", "").replace(" & Alertas", "").replace(" & Planner", "").split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Quick info or CTA */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase font-mono bg-[#ffffff]/10 text-[#ffffff]/80 px-2 py-1 rounded hidden md:inline-block border border-[#ffffff]/5 font-semibold">
            SECURE CLIENT
          </span>
          <button 
            onClick={() => setActiveTab("procesos")}
            className="bg-roseOld text-[#151312] hover:opacity-90 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Gavel className="w-3.5 h-3.5" />
            NUEVO PROCESO
          </button>
        </div>
      </nav>

      {/* Subtle OjedisTECH Watermark */}
      <div className="fixed bottom-2 right-2 text-[8px] font-mono tracking-widest uppercase opacity-20 pointer-events-none select-none z-50 text-charcoalSoft">
        Powered by OJEDISTECH
      </div>

    </div>
  );
}
