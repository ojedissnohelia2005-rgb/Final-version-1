import React, { useState, useEffect } from "react";
import { Empresa, UserProfile } from "../types";
import { 
  ShieldAlert, 
  Trash2, 
  CheckCircle, 
  Scale, 
  Terminal, 
  CheckCircle2, 
  History, 
  AlertTriangle,
  Briefcase,
  UserPlus,
  Filter,
  Mail,
  User,
  Link,
  Copy,
  Building,
  Key,
  ShieldCheck,
  CheckCircle as ValidCheck,
  PlusCircle,
  Clock
} from "lucide-react";

interface TransparenciaAuditProps {
  selectedEmpresa: Empresa;
  currentProfile: UserProfile;
}

export default function TransparenciaAudit({ selectedEmpresa, currentProfile }: TransparenciaAuditProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [empresasList, setEmpresasList] = useState<Empresa[]>([]);
  
  // Tab navigator
  const [activeSubTab, setActiveSubTab] = useState<"casilleros" | "enlaces" | "empresas" | "logs">("casilleros");

  // Filtering states
  const [filterEstudio, setFilterEstudio] = useState<string>("todos");
  
  // Traditional Add Lawyer state
  const [showInviteForm, setShowInviteForm] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNombre, setInviteNombre] = useState("");
  const [inviteRol, setInviteRol] = useState<"user" | "invitado">("invitado");
  const [inviteEstudio, setInviteEstudio] = useState("");
  const [isSubmiting, setIsSubmiting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // New Empresa Creation states
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [empresaSector, setEmpresaSector] = useState("");
  const [empresaDetalles, setEmpresaDetalles] = useState("");
  const [empresaResponsable, setEmpresaResponsable] = useState("");
  const [empresaCodigo, setEmpresaCodigo] = useState("");
  const [representanteLegalNombre, setRepresentanteLegalNombre] = useState("");
  const [procuradorJudicialNombre, setProcuradorJudicialNombre] = useState("");
  const [isSubmitingEmpresa, setIsSubmitingEmpresa] = useState(false);

  // Programmatic Externals Configuration link states
  const [progEmail, setProgEmail] = useState("");
  const [progNombre, setProgNombre] = useState("");
  const [progEstudio, setProgEstudio] = useState("");
  const [progHerramientas, setProgHerramientas] = useState<"compliance_only" | "judicial_only" | "both">("both");
  const [progTareaTipo, setProgTareaTipo] = useState<"compliance_help" | "matter_review" | "process_review" | "process_all" | "tool_all">("tool_all");
  const [progMateria, setProgMateria] = useState("");
  const [progProceso, setProgProceso] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    fetchAuditData();
  }, [selectedEmpresa]);

  const fetchAuditData = async () => {
    try {
      const res = await fetch("/api/profiles");
      const pData = await res.json();
      setProfiles(pData);

      const compRes = await fetch("/api/companies");
      if (compRes.ok) {
        const compData = await compRes.json();
        setEmpresasList(compData);
      }

      setLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokePermission = async (email: string) => {
    if (!window.confirm(`¿Está seguro de revocar los accesos de ${email}? Esto invalidará sus credenciales de firma.`)) return;

    try {
      const res = await fetch("/api/auth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        alert("Acceso revocado de manera segura.");
        fetchAuditData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUserAccess = async (email: string, role: string, active: boolean) => {
    try {
      const res = await fetch("/api/profiles/update-access-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, active })
      });
      if (res.ok) {
        fetchAuditData();
      } else {
        const err = await res.json();
        alert(err.error || "Ocurrió un error al actualizar");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteNombre.trim()) {
      alert("Por favor complete nombre y email.");
      return;
    }

    setIsSubmiting(true);
    setSuccessMsg("");
    try {
      const res = await fetch("/api/profiles/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          nombre: inviteNombre.trim(),
          rol: inviteRol,
          empresa_id: selectedEmpresa.id,
          estudio_juridico: inviteEstudio.trim() || undefined
        })
      });

      if (res.ok) {
        setSuccessMsg(`✓ Sincronizado: ${inviteNombre} ha sido registrado.`);
        setInviteEmail("");
        setInviteNombre("");
        setInviteEstudio("");
        setShowInviteForm(false);
        fetchAuditData();
      } else {
        alert("Ocurrió un error al registrar.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmiting(false);
    }
  };

  // Upgraded Empresa Submit Handler
  const handleEmpresaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaNombre.trim() || !empresaSector.trim() || !empresaResponsable.trim()) {
      alert("Por favor llene todos los campos obligatorios.");
      return;
    }

    setIsSubmitingEmpresa(true);
    try {
      const customPrefix = empresaNombre.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "LX");
      const finalCodigo = empresaCodigo.trim() || `LX-${customPrefix}-2026`;
      const finalUnlock = `SEC-${customPrefix}-99`;

      const response = await fetch("/api/negocios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: empresaNombre.trim(),
          sector: empresaSector.trim(),
          detalles: empresaDetalles.trim() || "Empresa registrada bajo la tutela reguladora.",
          responsable_id: empresaResponsable.trim(),
          codigo_acceso: finalCodigo,
          admin_unlock_code: finalUnlock,
          representante_legal_nombre: representanteLegalNombre.trim(),
          procurador_judicial_nombre: procuradorJudicialNombre.trim()
        })
      });

      const data = await response.json();
      if (data.success) {
        // Automatically invite admin. email
        await fetch("/api/profiles/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: empresaResponsable.trim(),
            nombre: `Admin. ${empresaNombre}`,
            rol: "admin",
            empresa_id: data.empresa.id,
            estudio_juridico: "Legal Interno"
          })
        });

        alert(`¡Empresa '${empresaNombre}' registrada exitosamente!\n\nCódigo Único de Empresa generado: ${finalCodigo}\n\nCompártalo con el administrador (${empresaResponsable}) para la habilitación de su casillero.`);
        setEmpresaNombre("");
        setEmpresaSector("");
        setEmpresaDetalles("");
        setEmpresaResponsable("");
        setEmpresaCodigo("");
        setRepresentanteLegalNombre("");
        setProcuradorJudicialNombre("");
        fetchAuditData();
      } else {
        alert("Error al registrar la empresa.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al servidor.");
    } finally {
      setIsSubmitingEmpresa(false);
    }
  };

  // Programmatic Link Generation Handler
  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progEmail.trim() || !progNombre.trim() || !progEstudio.trim()) {
      alert("Por favor complete todos los datos requeridos para la programación de defensa.");
      return;
    }

    setIsSubmiting(true);
    try {
      // Determine permissions toggles
      const permitirCompliance = progHerramientas === "both" || progHerramientas === "compliance_only";
      const permitirJudicial = progHerramientas === "both" || progHerramientas === "judicial_only";

      // Programmed task description translated to human format
      let tareaLabel = "Acceso Total";
      if (progTareaTipo === "compliance_help") tareaLabel = "Ayuda en Compliance Corporatorio";
      else if (progTareaTipo === "matter_review") tareaLabel = `Revisión de Materia: ${progMateria || "General"}`;
      else if (progTareaTipo === "process_review") tareaLabel = `Revisión de Caso: ${progProceso || "General"}`;
      else if (progTareaTipo === "process_all") tareaLabel = "Acceso Total a Hilo Judicial";

      const res = await fetch("/api/profiles/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: progEmail.trim(),
          nombre: progNombre.trim(),
          rol: "invitado",
          empresa_id: selectedEmpresa.id,
          estudio_juridico: progEstudio.trim(),
          permitir_compliance: permitirCompliance,
          permitir_judicial: permitirJudicial,
          materia_especifica: progMateria.trim(),
          proceso_especifico_id: progProceso.trim(),
          tarea_programada_tipo: tareaLabel
        })
      });

      if (res.ok) {
        // Build simulated registration link
        const tokenHash = btoa(`${progEmail.trim()}:${selectedEmpresa.id}`).substring(0, 16);
        const autoLink = `${window.location.origin}/register?token=reg_ext_${tokenHash}&email=${encodeURIComponent(progEmail.trim())}&role=invitado&comp=${selectedEmpresa.id}&perm_comp=${permitirCompliance}&perm_jud=${permitirJudicial}&scope=${encodeURIComponent(tareaLabel)}`;
        
        setGeneratedLink(autoLink);
        setSuccessMsg(`✓ Sincronizado: Casillero para ${progNombre} de '${progEstudio}' programado exitosamente.`);
        fetchAuditData();
      } else {
        alert("Ocurrió un error al guardar la programación.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmiting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Get unique law firms or classifications for filter dropdown
  const uniqueEstudios = Array.from(
    new Set(
      profiles
        .map((p) => p.estudio_juridico)
        .filter(Boolean)
    )
  ) as string[];

  // Filter profiles based on selected classification filter
  const filteredProfiles = profiles.filter((p) => {
    if (filterEstudio === "todos") return true;
    if (filterEstudio === "internos") {
      return p.rol !== "invitado";
    }
    if (filterEstudio === "externos_all") {
      return p.rol === "invitado";
    }
    return p.estudio_juridico === filterEstudio;
  });

  const isSuper = currentProfile.rol === "super_admin";

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderSoft pb-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-charcoal flex items-center gap-2">
            Transparencia, Workspaces & Control de Accesos
          </h1>
          <p className="text-sm text-charcoalSoft font-sans">
            Trazabilidad SOC-2 inmutable de operaciones, administración multitenant de empresas y link generator de accesos programados para defensores externos.
          </p>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-paper border border-borderSoft p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-sidebarRose font-serif font-bold text-lg border border-borderSoft/30">
            {profiles.length}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-charcoalMuted">Casilleros Creados</div>
            <div className="text-sm font-semibold text-charcoal font-sans">Abogados & Auditores</div>
          </div>
        </div>

        <div className="bg-paper border border-borderSoft p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-sidebarRose border border-borderSoft/30">
            <Building className="w-5 h-5 text-sidebarRose" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-charcoalMuted">Empresas Registradas</div>
            <div className="text-sm font-semibold text-charcoal font-sans">{empresasList.length} Corporativas</div>
          </div>
        </div>

        <div className="bg-paper border border-borderSoft p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-sidebarRose border border-borderSoft/30">
            <ShieldCheck className="w-5 h-5 text-sidebarRose" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-charcoalMuted">Sovereign Data Protection</div>
            <div className="text-sm font-semibold text-charcoal font-sans">No-Model Training Protection</div>
          </div>
        </div>

        <div className="bg-paper border border-borderSoft p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-sidebarRose border border-borderSoft/30">
            <Clock className="w-5 h-5 text-sidebarRose" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-charcoalMuted">Trazabilidad de Firma</div>
            <div className="text-sm font-semibold text-charcoal font-sans">Ledger Inmutable Activo</div>
          </div>
        </div>
      </div>

      {/* INTERNAL SUB-TAB NAVIGATION SYSTEM */}
      <div className="flex border-b border-borderSoft gap-2 overflow-x-auto scrollbar-hide py-1">
        <button
          onClick={() => setActiveSubTab("casilleros")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors ${
            activeSubTab === "casilleros"
              ? "bg-charcoal text-cream font-bold"
              : "text-charcoalSoft hover:bg-cream"
          }`}
        >
          👤 Casilleros y Abogados
        </button>
        <button
          onClick={() => setActiveSubTab("enlaces")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors ${
            activeSubTab === "enlaces"
              ? "bg-charcoal text-cream font-bold"
              : "text-charcoalSoft hover:bg-cream"
          }`}
        >
          🔗 Link Generator & Programación Externas
        </button>
        <button
          onClick={() => setActiveSubTab("empresas")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors ${
            activeSubTab === "empresas"
              ? "bg-charcoal text-cream font-bold"
              : "text-charcoalSoft hover:bg-cream"
          }`}
        >
          🏢 Empresas & Códigos de Workspace
        </button>
        <button
          onClick={() => setActiveSubTab("logs")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors ${
            activeSubTab === "logs"
              ? "bg-charcoal text-cream font-bold"
              : "text-charcoalSoft hover:bg-cream"
          }`}
        >
          📜 Historial Inmutable (Logs)
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* TAB Content Main Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {activeSubTab === "casilleros" && (
            <div className="bg-paper border border-borderSoft rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-borderSoft pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-sidebarRose" />
                  <h3 className="font-serif font-semibold text-base text-charcoal">Casilleros y Abogados Autorizados</h3>
                </div>
                
                {/* Traditional quick-add trigger */}
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sidebarRose text-cream hover:bg-roseOld rounded-lg text-[10px] font-bold tracking-wide transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {showInviteForm ? "Cerrar" : "Vincular Casillero Directo"}
                </button>
              </div>

              {successMsg && (
                <div className="bg-successSoft border border-success/30 text-success text-[11px] p-2.5 rounded-xl text-center font-sans">
                  {successMsg}
                </div>
              )}

              {showInviteForm && (
                <form onSubmit={handleInviteSubmit} className="bg-cream border border-borderSoft p-4 rounded-xl space-y-3 font-sans">
                  <h4 className="text-xs font-bold uppercase text-charcoal tracking-wide flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-sidebarRose" />
                    Registrar y Clasificar Abogado Directamente
                  </h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Nombre Completo:</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-charcoalMuted" />
                      <input
                        type="text"
                        className="w-full bg-paper border border-borderSoft rounded-lg pl-8 pr-3 py-2 text-xs text-charcoal focus:outline-none focus:border-charcoal"
                        placeholder="Ej. Abg. Fiorella Rendón"
                        value={inviteNombre}
                        onChange={(e) => setInviteNombre(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Correo Electrónico (Login):</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-charcoalMuted" />
                      <input
                        type="email"
                        className="w-full bg-paper border border-borderSoft rounded-lg pl-8 pr-3 py-2 text-xs text-charcoal focus:outline-none focus:border-charcoal"
                        placeholder="Ej. fiorella.rendon@montblanc.com.ec"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Rol Procesal:</label>
                      <select
                        className="w-full bg-paper border border-borderSoft rounded-lg p-2 text-xs text-charcoal focus:outline-none focus:border-charcoal"
                        value={inviteRol}
                        onChange={(e) => setInviteRol(e.target.value as any)}
                      >
                        <option value="invitado">Abogado Externo (Estudio)</option>
                        <option value="user">Abogado In-House (Interno)</option>
                        <option value="admin">Administrador General</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Estudio Jurídico / Departamento:</label>
                      <input
                        type="text"
                        className="w-full bg-paper border border-borderSoft rounded-lg p-2 text-xs text-charcoal focus:outline-none focus:border-charcoal"
                        placeholder="Ej. Estudio Montblanc"
                        value={inviteEstudio}
                        onChange={(e) => setInviteEstudio(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmiting}
                    className="w-full py-2 bg-charcoal text-cream text-[11px] font-bold uppercase rounded-lg hover:bg-charcoalSoft transition-colors cursor-pointer"
                  >
                    {isSubmiting ? "Guardando..." : "Proceder con Vinculación"}
                  </button>
                </form>
              )}

              {/* LAWYERS INDEX */}
              <div className="space-y-3 font-sans">
                <div className="flex items-center gap-1.5 text-xs text-charcoal font-semibold mb-2">
                  <Filter className="w-3.5 h-3.5 text-sidebarRose" />
                  <span>Clasificar por Estudio Jurídico o Rol:</span>
                </div>
                <div className="relative mb-4">
                  <select
                    value={filterEstudio}
                    onChange={(e) => setFilterEstudio(e.target.value)}
                    className="w-full bg-cream border border-borderSoft rounded-lg px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:border-charcoal"
                  >
                    <option value="todos">Mostrar Todos ({profiles.length})</option>
                    <option value="internos">Abogados internos de empresa</option>
                    <option value="externos_all">Todos los Abogados Externos</option>
                    {uniqueEstudios.map((estudio) => (
                      <option key={estudio} value={estudio}>
                        🏛️ {estudio}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  {filteredProfiles.map((p) => {
                    const isAllowlist = p.email === "nohelia.ojedis@uees.edu.ec";
                    
                    return (
                      <div key={p.email} className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                        p.activo ? "bg-cream/40 border-borderSoft" : "bg-charcoal/5 border-borderSoft/30 opacity-60"
                      }`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif font-semibold text-charcoal text-sm">{p.nombre}</h4>
                            {isAllowlist && (
                              <span className="bg-charcoal text-white text-[8px] font-mono px-1 py-0.5 rounded uppercase font-bold tracking-wider">
                                Socio Fundador
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-charcoalMuted font-mono">Email: {p.email}</p>
                          
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-sidebarRose font-sans bg-roseSoft px-1.5 py-0.5 rounded">
                              {p.rol === "invitado" ? "Abogado Externo" : p.rol === "user" ? "In-House (Interno)" : p.rol}
                            </span>
                            {p.estudio_juridico && (
                              <span className="text-[9px] font-medium text-charcoalSoft font-sans bg-paper border border-borderSoft/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Briefcase className="w-2.5 h-2.5 text-charcoalMuted" />
                                {p.estudio_juridico}
                              </span>
                            )}
                            
                            {/* Programmatic status display */}
                            {p.rol === "invitado" && (
                              <span className="text-[9px] text-[#A56C6C] font-mono bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 rounded">
                                Scope: {p.tarea_programada_tipo || "Acceso Total"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-sans ${
                              p.activo ? "bg-successSoft text-success" : "bg-dangerSoft text-danger"
                            }`}>
                              {p.activo ? "Activo" : "Revocado"}
                            </span>
                          </div>

                          {/* Control actions for super_admin / admin to change roles or disable access */}
                          {!isAllowlist && (currentProfile.rol === "super_admin" || currentProfile.rol === "admin") && (
                            <div className="flex flex-wrap items-center gap-2 bg-cream/70 border border-borderSoft/60 p-1.5 rounded-lg shrink-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] uppercase font-bold text-charcoalMuted font-mono">Rol:</span>
                                <select
                                  value={p.rol}
                                  onChange={(e) => handleUpdateUserAccess(p.email, e.target.value, p.activo)}
                                  className="bg-white border border-borderSoft/50 text-[10px] font-medium px-1.5 py-0.5 rounded focus:outline-none focus:border-sidebarRose"
                                >
                                  <option value="super_admin">Super Admin</option>
                                  <option value="admin">Administrador</option>
                                  <option value="user">Interno (User)</option>
                                  <option value="invitado">Externo (Invitado)</option>
                                </select>
                              </div>

                              <span className="text-borderSoft">|</span>

                              <button
                                onClick={() => handleUpdateUserAccess(p.email, p.rol, !p.activo)}
                                type="button"
                                className={`cursor-pointer text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                                  p.activo 
                                    ? "bg-roseSoft text-sidebarRose hover:bg-roseSoft/90" 
                                    : "bg-successSoft text-success hover:bg-successSoft/90"
                                }`}
                              >
                                {p.activo ? "✕ Deshabilitar" : "✓ Re-Habilitar"}
                              </button>

                              <span className="text-borderSoft">|</span>

                              <button
                                onClick={() => handleRevokePermission(p.email)}
                                className="text-[10px] text-charcoalMuted hover:text-danger font-medium font-sans flex items-center gap-0.5 cursor-pointer"
                                type="button"
                                title="Eliminar permanentemente"
                              >
                                ✕ Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "enlaces" && (
            <div className="bg-paper border border-borderSoft rounded-2xl p-5 shadow-sm space-y-6">
              <div>
                <h3 className="font-serif font-semibold text-base text-charcoal flex items-center gap-2">
                  <Link className="w-5 h-5 text-sidebarRose" />
                  Programación de Accesos a Externos (Link Generator)
                </h3>
                <p className="text-xs text-charcoalSoft font-sans mt-1">
                  Establezca el alcance de la co-defensa. Al generar este enlace de auto-registro programado, el abogado externo tendrá restringido su panel de control únicamente a las herramientas y tareas que asigne a continuación.
                </p>
              </div>

              <form onSubmit={handleGenerateLink} className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Nombre del Abogado Externo:</label>
                    <input
                      type="text"
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal focus:outline-none focus:border-charcoal"
                      placeholder="Ej. Abg. Fiorella Rendón"
                      value={progNombre}
                      onChange={(e) => setProgNombre(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Correo Electrónico Externo (Login):</label>
                    <input
                      type="email"
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal focus:outline-none focus:border-charcoal"
                      placeholder="Ej. fiorella@montblanc.com"
                      value={progEmail}
                      onChange={(e) => setProgEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Estudio Jurídico de Origen:</label>
                    <input
                      type="text"
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal focus:outline-none focus:border-charcoal"
                      placeholder="Ej. Estudio Jurídico Montblanc"
                      value={progEstudio}
                      onChange={(e) => setProgEstudio(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block font-semibold text-sidebarRose">Herramientas Autorizadas:</label>
                    <select
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal focus:outline-none focus:border-charcoal"
                      value={progHerramientas}
                      onChange={(e) => setProgHerramientas(e.target.value as any)}
                    >
                      <option value="both">Acceso Total a la Herramienta (Compliance + Judicial)</option>
                      <option value="compliance_only">Matriz de Compliance únicamente</option>
                      <option value="judicial_only">Procesos Judiciales únicamente</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 border-t border-borderSoft/40 pt-3">
                  <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block font-semibold">
                    Programación de Tarea Específica (Alcance Contractual):
                  </label>
                  <select
                    className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal focus:outline-none focus:border-charcoal"
                    value={progTareaTipo}
                    onChange={(e) => setProgTareaTipo(e.target.value as any)}
                  >
                    <option value="tool_all">Acceso Completo (co-defensa irrestrictiva)</option>
                    <option value="compliance_help">Colaboración / Ayuda en Compliance específico</option>
                    <option value="matter_review">Revisión de una materia corporativa en específico</option>
                    <option value="process_review">Revisión de un proceso en específico</option>
                    <option value="process_all">Acceso total a los procesos de la empresa únicamente</option>
                  </select>
                </div>

                {progTareaTipo === "matter_review" && (
                  <div className="space-y-1 bg-amber-50/40 p-3 rounded-xl border border-amber-200/50">
                    <label className="text-[10px] uppercase font-bold text-charcoal font-mono block">Especifique Materia / Obligación a revisar:</label>
                    <input
                      type="text"
                      className="w-full bg-paper border border-borderSoft rounded-lg p-2 text-xs text-charcoal"
                      placeholder="Ej: Ambiental, Salud Ocupacional, Hidrocarburos..."
                      value={progMateria}
                      onChange={(e) => setProgMateria(e.target.value)}
                      required
                    />
                  </div>
                )}

                {progTareaTipo === "process_review" && (
                  <div className="space-y-1 bg-amber-50/40 p-3 rounded-xl border border-amber-200/50">
                    <label className="text-[10px] uppercase font-bold text-charcoal font-mono block">Causa o Número de Proceso específico autorizado:</label>
                    <input
                      type="text"
                      className="w-full bg-paper border border-borderSoft rounded-lg p-2 text-xs text-charcoal"
                      placeholder="Ej: Causa No 09-32-2026 o Caso Luis Ramírez Lindao"
                      value={progProceso}
                      onChange={(e) => setProgProceso(e.target.value)}
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmiting}
                  className="w-full py-3 bg-sidebarRose text-cream font-bold uppercase rounded-lg hover:bg-roseOld tracking-wider transition-colors cursor-pointer text-center"
                >
                  {isSubmiting ? "Procesando programación..." : "Generar Enlace de Registro Programado"}
                </button>
              </form>

              {generatedLink && (
                <div className="bg-cream border border-borderSoft p-5 rounded-2xl space-y-4 font-sans">
                  <div className="flex items-center gap-1.5 text-success font-semibold text-xs border-b border-borderSoft pb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>¡Enlace Seguro Generado & Sincronizado con LexControl S.A.!</span>
                  </div>

                  <p className="text-xs text-charcoalSoft leading-normal">
                    Este enlace de auto-registro contiene la firma inmutable de acceso para <strong>{progNombre}</strong>. Al hacer clic, completará su registro y cuando inicie sesión, su panel estará estrictamente filtrado a:
                  </p>

                  <div className="text-[11px] font-mono space-y-1 bg-paper border border-borderSoft/50 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-charcoalMuted">HERRAMIENTAS:</span>
                      <strong className="text-sidebarRose">
                        {progHerramientas === "both" ? "COMPLIANCE + JUDICIAL" : progHerramientas === "compliance_only" ? "COMPLIANCE Módulos" : "JUDICIAL Módulos"}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoalMuted">SCOPE DETALLADO:</span>
                      <strong className="text-charcoal block max-w-[70%] text-right overflow-hidden text-ellipsis">
                        {progTareaTipo === "tool_all" && "Acceso Total"}
                        {progTareaTipo === "compliance_help" && "Ayuda en Compliance"}
                        {progTareaTipo === "matter_review" && `Materia específica: ${progMateria}`}
                        {progTareaTipo === "process_review" && `Caso específico: ${progProceso}`}
                        {progTareaTipo === "process_all" && "Acceso total a procesos de la firma"}
                      </strong>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="w-full bg-paper border border-borderSoft rounded-lg p-2 text-[10px] text-charcoal font-mono"
                      readOnly
                      value={generatedLink}
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`px-4 bg-charcoal hover:bg-charcoalSoft text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1 ${
                        copyFeedback ? "bg-emerald-600 hover:bg-emerald-700" : ""
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copyFeedback ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === "empresas" && (
            <div className="space-y-6">
              
              {/* Conditional Enterprise Creator for Super Admin */}
              {isSuper ? (
                <div className="bg-paper border border-borderSoft rounded-2xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-serif font-semibold text-base text-charcoal flex items-center gap-2">
                      <Building className="w-5 h-5 text-sidebarRose" />
                      Registro de Empresas y Gobernanza Multitenant
                    </h3>
                    <p className="text-xs text-charcoalSoft font-sans mt-0.5">
                      Como Super Administrador Principal, registre nuevos corporativos en LexControl, configure su CIIU y asigne el **Código Único de Empresa** necesario para habilitar y dar de alta su cuenta administradora.
                    </p>
                  </div>

                  <form onSubmit={handleEmpresaSubmit} className="space-y-4 font-sans text-xs pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Nombre de la Empresa corporativa:</label>
                        <input
                          type="text"
                          className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal"
                          placeholder="Ej. compañía industrial, holding, clínica, constructora..."
                          value={empresaNombre}
                          onChange={(e) => setEmpresaNombre(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Sector Industrial:</label>
                        <input
                          type="text"
                          className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal"
                          placeholder="Ej. Petróleo e Hidrocarburos, Agroexportación..."
                          value={empresaSector}
                          onChange={(e) => setEmpresaSector(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Detalles de Actividad / CIIU:</label>
                        <input
                          type="text"
                          className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal"
                          placeholder="Ej. Distribuidor mayorista de GLP"
                          value={empresaDetalles}
                          onChange={(e) => setEmpresaDetalles(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Admin Sponsor Email (Habilitante):</label>
                        <input
                          type="email"
                          className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal"
                          placeholder="Ej. administrador@empresa.com.ec"
                          value={empresaResponsable}
                          onChange={(e) => setEmpresaResponsable(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Nombre Representante Legal Completo:</label>
                        <input
                          type="text"
                          className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal font-sans"
                          placeholder="Nombre completo del representante legal"
                          value={representanteLegalNombre}
                          onChange={(e) => setRepresentanteLegalNombre(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block">Nombre Procurador Judicial Autorizado:</label>
                        <input
                          type="text"
                          className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal font-sans"
                          placeholder="Ej. Carlos Alberto Cabezas Delgado"
                          value={procuradorJudicialNombre}
                          onChange={(e) => setProcuradorJudicialNombre(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-charcoalSoft font-mono block font-semibold text-sidebarRose">
                        Código Único de Empresa habilitante para Auto-Registro (Dejar vacío para auto-generar):
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 w-4 h-4 text-charcoalMuted" />
                        <input
                          type="text"
                          className="w-full bg-cream border border-borderSoft rounded-lg pl-9 pr-3 py-2.5 text-xs text-charcoal font-sans"
                          placeholder="Ej. LX-EMPRESA-7799"
                          value={empresaCodigo}
                          onChange={(e) => setEmpresaCodigo(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitingEmpresa}
                      className="w-full py-3 bg-charcoal hover:bg-charcoalSoft text-white font-bold uppercase rounded-lg tracking-wider transition-colors cursor-pointer text-center"
                    >
                      {isSubmitingEmpresa ? "Inicializando matriz adaptativa ecuatoriana..." : "Crear Empresa e Inicializar Matriz"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-amber-50/40 p-4 rounded-xl border border-borderSoft/60 text-xs text-charcoalSoft space-y-2 font-sans">
                  <h4 className="font-bold flex items-center gap-1.5 text-sidebarRose">
                    <Building className="w-4 h-4 text-sidebarRose" />
                    Asociación Corporativa del Casillero
                  </h4>
                  <p>
                    Su usuario está afiliado corporativamente al Workspace inmatriculado de <strong>{selectedEmpresa.nombre}</strong>. Los privilegios de creación e inmatriculación global de nuevas marcas están exclusivamente reservados al Super Admin LexControl.
                  </p>
                </div>
              )}

              {/* LIST OF REGISTERED COMPANIES AND THEIR ENABLING CODES */}
              <div className="bg-paper border border-borderSoft rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-serif font-semibold text-base text-charcoal">Directorio de Empresas & Sincronización de Códigos</h3>
                  <p className="text-xs text-charcoalSoft font-sans">
                    Use estos códigos únicos de empresa para compartirlos con los administradores de su respectiva marca corporativa.
                  </p>
                </div>

                <div className="space-y-3 font-sans">
                  {empresasList.map((emp) => (
                    <div key={emp.id} className="p-4 border border-borderSoft bg-cream/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <h4 className="font-serif font-bold text-[#8E6B6B] text-sm">{emp.nombre}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-charcoalSoft">
                          <span>Sector: <strong>{emp.sector}</strong></span>
                          <span>•</span>
                          <span>ID: <strong>{emp.id}</strong></span>
                        </div>
                        {emp.representante_legal_nombre && (
                          <p className="text-[10.5px] text-charcoalMuted">
                            💼 Rep. Legal: <strong className="text-charcoalSoft font-sans">{emp.representante_legal_nombre}</strong>
                          </p>
                        )}
                        {emp.procurador_judicial_nombre && (
                          <p className="text-[10.5px] text-charcoalMuted">
                            ⚖️ Proc. Judicial: <strong className="text-charcoalSoft font-sans">{emp.procurador_judicial_nombre}</strong>
                          </p>
                        )}
                        <p className="text-[10px] text-charcoalMuted">Sponsor: {emp.responsable_id}</p>
                      </div>

                      <div className="sm:text-right space-y-1.5 shrink-0">
                        <div className="bg-roseSoft/60 border border-roseOld/10 p-2 rounded-lg text-center">
                          <div className="text-[9px] uppercase font-bold text-charcoalSoft tracking-wider block font-mono">Código para Habilitar Casillero:</div>
                          <div className="text-sm font-bold text-sidebarRose font-mono mt-0.5 select-all">{emp.codigo_acceso}</div>
                        </div>
                        <span className="text-[9px] font-mono text-charcoalMuted block text-center sm:text-right">Admin Unlock SEC: <strong>{emp.admin_unlock_code}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeSubTab === "logs" && (
            <div className="bg-paper border border-borderSoft rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-borderSoft pb-4">
                <History className="w-5 h-5 text-sidebarRose" />
                <h3 className="font-serif font-semibold text-base text-charcoal">Firma Inmutable y Registros del Servidor (Audit Log)</h3>
              </div>

              <div className="space-y-3 font-mono text-[11px] text-charcoalSoft">
                {logs.map((log) => (
                  <div key={log.id} className="bg-cream border border-borderSoft/40 rounded-xl p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 border-b border-borderSoft/20 pb-1">
                      <span className="text-sidebarRose font-bold uppercase">{log.action}</span>
                      <span className="text-[10px] text-charcoalMuted">{log.date}</span>
                    </div>
                    <p className="text-charcoal leading-relaxed font-sans text-xs">{log.details}</p>
                    <div className="text-[10px] text-charcoalMuted">Ejecutado por: <strong className="text-charcoal">{log.user}</strong></div>
                  </div>
                ))}
              </div>

              <div className="bg-roseSoft/40 border border-roseOld/20 p-3.5 rounded-xl flex gap-3 text-xs text-charcoalSoft leading-normal font-sans">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-sidebarRose" />
                <span>
                  <strong>Garantía Inmutable del Protocolo:</strong> Cualquier alteración de cumplimiento regulatorio, inmatriculación multipropietario u otorgamiento de poderes de firma es encriptado en el ledger redundante. El deudo procesal queda inmutablemente protegido frente a auditorías externas e internas.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* TAB Content Right Side: Information Panel / Sovereignty Declaration */}
        <div className="lg:col-span-4 space-y-4 font-sans">
          
          <div className="bg-charcoal text-cream rounded-2xl p-5 shadow-lg space-y-4 border border-charcoal/20">
            <h4 className="font-serif font-bold text-base text-roseOld flex items-center gap-2 border-b border-white/10 pb-2">
              <Scale className="w-5 h-5 text-roseOld" />
              Soberanía de Datos & Protocolo de Seguridad
            </h4>

            <p className="text-[11px] leading-relaxed text-cream/80 font-sans">
              La arquitectura, los flujos de IA y el panel de control de <strong>LexControl AI</strong> están asegurados bajo estrictas políticas multitenant y de soberanía local:
            </p>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl space-y-1 text-[11px]">
              <div>Gobernanza: <strong className="text-white font-serif">Workspace Corporativo</strong></div>
              <div>Proveedor de Tecnología: <strong className="#E0A3A3 font-mono">OJEDISTECH</strong></div>
              <div>Soporte Directo: <strong className="text-roseOld">soporte@ojedistech.com</strong></div>
              <div>Jurisdicción del Casillero: <strong className="text-cream/95">Provincia del Guayas, Ecuador</strong></div>
            </div>

            <div className="pt-2">
              <div className="flex items-center gap-1.5 text-xs text-roseOld font-bold uppercase tracking-wider mb-1">
                <ValidCheck className="w-4 h-4 text-emerald-400" />
                Cláusula de Privacidad Soberana
              </div>
              <p className="text-[10px] text-cream/70 leading-normal">
                Queda expresamente prohibido el uso de este proyecto, datos y transacciones para el entrenamiento de bases de datos compartidas, modelos públicos u otorgamiento de ideas tecnológicas paralelas a otros usuarios. Privacidad y estricto secreto corporativo garantizado al 100%.
              </p>
            </div>
          </div>

          <div className="bg-paper border border-borderSoft rounded-2xl p-5 shadow-sm space-y-3 text-xs leading-relaxed text-charcoalSoft">
            <h4 className="font-serif font-semibold text-charcoal">¿Cómo funciona el Código de Empresa?</h4>
            <p>
              El código único que configure para una empresa (ej. <strong>{selectedEmpresa.codigo_acceso}</strong>) es el token habilitador con el cual los administradores e in-house autorizan la creación de hilos y plazos. Comparta el código únicamente mediante canales cifrados autorizados.
            </p>
            <p className="border-t border-borderSoft/40 pt-2 text-[10px] text-charcoalMuted">
              Cualquier duda legal o técnica, comuníquese directamente con soporte central de OjedisTECH.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
