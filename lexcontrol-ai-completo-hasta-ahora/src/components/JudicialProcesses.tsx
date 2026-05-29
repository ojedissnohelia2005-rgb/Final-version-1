import React, { useState, useEffect } from "react";
import { Empresa, ProcesoJudicial, UserProfile, EtapaProcesal, PlazoProcesal } from "../types";
import { PlusCircle, Search, Sparkles, Scale, AlertOctagon, Calendar, CheckCircle2, ChevronRight, FileText, ArrowLeft, MessageSquare, Plus, Clock, HelpCircle, Gavel } from "lucide-react";

interface JudicialProcessesProps {
  selectedEmpresa: Empresa;
  currentProfile: UserProfile;
}

export default function JudicialProcesses({ selectedEmpresa, currentProfile }: JudicialProcessesProps) {
  const [procesos, setProcesos] = useState<ProcesoJudicial[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<ProcesoJudicial | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"ficha" | "etapas" | "plazos" | "precedentes" | "chat" | "demanda">("ficha");
  
  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [materia, setMateria] = useState("laboral");
  const [numProceso, setNumProceso] = useState("");
  const [demandante, setDemandante] = useState("");
  const [demandado, setDemandado] = useState("");
  const [representanteCitado, setRepresentanteCitado] = useState("");
  const [externoEmail, setExternoEmail] = useState("fiorella.rendon@montblanc.com.ec");

  // Chat/Facts gathering state
  const [conversation, setConversation] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isGeneratingFicha, setIsGeneratingFicha] = useState(false);
  const [demandaForm, setDemandaForm] = useState({
    materia: "civil",
    actor: "",
    demandado: "",
    pretension: "",
    hechos: "",
    pruebas: "",
    cuantia: "",
    jurisdiccion: "Guayaquil",
    observaciones: ""
  });
  const [generatedDemanda, setGeneratedDemanda] = useState("");
  const [demandaStatus, setDemandaStatus] = useState("");
  const [isGeneratingDemanda, setIsGeneratingDemanda] = useState(false);

  // Deadlines state
  const [plazoTitulo, setPlazoTitulo] = useState("Contestación a la Demanda");
  const [plazoRegla, setPlazoRegla] = useState("Art. 291 COGEP");
  const [plazoDias, setPlazoDias] = useState("30");
  const [plazoHoras, setPlazoHoras] = useState("0");
  const [plazoTipo, setPlazoTipo] = useState<"termino" | "plazo">("termino");
  const [plazoStart, setPlazoStart] = useState("");
  const [plazoObservaciones, setPlazoObservaciones] = useState("");
  const [plazoVerificadoManual, setPlazoVerificadoManual] = useState(false);

  // Similar precedents
  const [precedents, setPrecedents] = useState<any[]>([]);

  useEffect(() => {
    fetchProcesses();
  }, [selectedEmpresa]);

  const fetchProcesses = async () => {
    try {
      const res = await fetch(`/api/procesos?negocio_id=${selectedEmpresa.id}`);
      const data = await res.json();
      setProcesos(data);
      if (data.length > 0 && !selectedProcess) {
        setSelectedProcess(data[0]);
      } else if (selectedProcess) {
        // Refresh selected process from newly loaded data
        const updated = data.find((p: any) => p.id === selectedProcess.id);
        if (updated) setSelectedProcess(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const coDefenders = [selectedEmpresa.nombre];
      if (representanteCitado) {
        coDefenders.push(representanteCitado);
      }
      if (demandado.trim()) {
        coDefenders.push(demandado.trim());
      }

      const res = await fetch("/api/procesos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negocio_id: selectedEmpresa.id,
          numero_proceso: numProceso,
          materia,
          demandante,
          demandados: coDefenders,
          abogado_a_cargo_email: currentProfile.rol === "user" ? currentProfile.email : "",
          abogado_externo_email: externoEmail
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchProcesses();
        setSelectedProcess(data.proceso);
        setShowCreate(false);
        setActiveSubTab("chat"); // Directly engage in conversation to configure factual details!
        // Start conversation thread
        setConversation([
          { role: "ia", text: `Bienvenido al Expediente del caso ${demandante} vs. ${selectedEmpresa.nombre}. Por favor, detallame los hechos en lenguaje libre para que pueda estructurar el análisis y evaluar si poseemos los justificativos necesarios.` }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setConversation(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");

    setTimeout(() => {
      setConversation(prev => [...prev, {
        role: "ia",
        text: "Entendido perfectamente. Poseo los antecedentes base respecto a la geolocalización de las descargas e ingreso de camiones. ¿Deseas que compilemos de forma inmediata la Ficha Técnica de análisis sobre excepciones previas y Dignidad Humana?"
      }]);
    }, 1000);
  };

  const handleGenerateFicha = async () => {
    if (!selectedProcess) return;
    setIsGeneratingFicha(true);
    try {
      const latestFacts = conversation.filter(c => c.role === "user").map(c => c.text).join(". ");
      const res = await fetch(`/api/gemini/generate-ficha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedProcess.id, facts: latestFacts })
      });
      if (res.ok) {
        await fetchProcesses();
        setActiveSubTab("ficha");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingFicha(false);
    }
  };

  const handleApproveFicha = async () => {
    if (!selectedProcess || !selectedProcess.ficha_caso) return;
    try {
      const res = await fetch(`/api/procesos/${selectedProcess.id}/update-ficha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ficha_caso: selectedProcess.ficha_caso,
          autor_rol: currentProfile.rol,
          autor_nombre: currentProfile.nombre
        })
      });
      if (res.ok) {
        fetchProcesses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const hasHierarchyPermission = (authorRol: string | undefined): boolean => {
    if (!authorRol) return true; // default actions can be moderated
    const rank: Record<string, number> = {
      "invitado": 1,
      "user": 2,
      "admin": 3,
      "super_admin": 4
    };
    const authorRank = rank[authorRol] || 1;
    const userRank = rank[currentProfile.rol] || 1;
    return userRank > authorRank;
  };

  const handleReviewAction = async (type: "etapa" | "plazo", itemId: string, action: "approve" | "revoke" | "second_review") => {
    if (!selectedProcess) return;
    try {
      const res = await fetch("/api/acciones/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          parentId: selectedProcess.id,
          itemId,
          action,
          revisado_por_nombre: currentProfile.nombre,
          revisado_por_rol: currentProfile.rol
        })
      });
      if (res.ok) {
        fetchProcesses();
      }
    } catch (err) {
      console.error("Failed to perform review action", err);
    }
  };

  const handleAddMilestone = async () => {
    if (!selectedProcess) return;
    const title = window.prompt("Ingrese el título de la Actuación Judicial (ej: Notificación de providencia):");
    if (!title) return;
    const desc = window.prompt("Escriba un fragmento o texto de la actuación legal para que la IA extraiga su resumen y configure anomalías:");
    if (!desc) return;

    try {
      await fetch(`/api/procesos/${selectedProcess.id}/etapa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: title,
          tipo: "providencia",
          fecha: new Date().toISOString().split("T")[0],
          ejecutado_por: currentProfile.nombre,
          text_extracted: desc,
          de_externo: currentProfile.rol === "invitado",
          creado_por_rol: currentProfile.rol,
          creado_por_nombre: currentProfile.nombre
        })
      });
      fetchProcesses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCalculateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !plazoStart) return;

    try {
      await fetch(`/api/procesos/${selectedProcess.id}/plazo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: plazoTitulo,
          regla_origen: plazoRegla,
          dias: plazoDias,
          horas: plazoHoras,
          tipo: plazoTipo,
          startDate: plazoStart,
          observaciones: plazoObservaciones,
          verificado_manual: plazoVerificadoManual,
          canton: "Guayaquil",
          ejecutado_por: currentProfile.nombre,
          de_externo: currentProfile.rol === "invitado",
          creado_por_rol: currentProfile.rol,
          creado_por_nombre: currentProfile.nombre
        })
      });
      fetchProcesses();
      setPlazoStart("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateDemanda = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingDemanda(true);
    setDemandaStatus("");
    try {
      const res = await fetch("/api/demandas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negocio_id: selectedEmpresa.id,
          intake: demandaForm,
          autor_nombre: currentProfile.nombre,
          autor_rol: currentProfile.rol
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedDemanda(data.demanda.texto);
        setDemandaStatus(data.demanda.estado_revision);
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo generar la demanda.");
    } finally {
      setIsGeneratingDemanda(false);
    }
  };

  const handleSaveDemanda = async (target: "revision" | "final" | "pdf") => {
    if (!generatedDemanda.trim()) return;
    try {
      const res = await fetch("/api/demandas/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negocio_id: selectedEmpresa.id,
          texto: generatedDemanda,
          intake: demandaForm,
          target,
          autor_nombre: currentProfile.nombre,
          autor_rol: currentProfile.rol
        })
      });
      const data = await res.json();
      if (data.success) {
        setDemandaStatus(data.demanda.estado_revision);
        if (target === "pdf" && data.download_url) {
          window.open(data.download_url, "_blank");
        }
        alert(target === "revision" ? "Demanda enviada a revisión jerárquica." : "Demanda guardada en gabinete.");
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar la demanda.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER ACTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderSoft pb-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-charcoal">
            Expedientes y Procesos Judiciales
          </h1>
          <p className="text-sm text-charcoalSoft font-sans">
            Controle expedientes activos, cargue actuaciones judicializadas, calcule términos de COGEP de Ecuador y simule precedentes de la CNJ/SATJE.
          </p>
        </div>
        
        {/* Create process button visible to users, admins and supers */}
        {currentProfile.rol !== "invitado" && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-charcoal text-cream text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-charcoalSoft transition-transform font-sans cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Ingresar Nuevo Expediente / Proceso
          </button>
        )}
      </div>

      {/* PERSPECTIVA DE ABOGADOS EXTERNOS DISCLAIMER BANNER */}
      {currentProfile.rol === "invitado" && (
        <div className="bg-roseSoft/30 border border-roseOld/20 rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-sm font-serif font-bold text-charcoal flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sidebarRose animate-pulse"></span>
              Escritorio de Interacción Litigante Externa (Abogado Colaborador)
            </h3>
            <p className="text-[11px] text-charcoalSoft font-sans leading-relaxed">
              Usted tiene acceso como <strong>Abogado Externo (Estudio Jurídico Montblanc)</strong> para co-gestionar causas de <strong>{selectedEmpresa.nombre}</strong>. Sus cargas de actuaciones procesales ("+ Cargar Actuación / Proveído") o cálculos de términos judiciales en la pestaña de "Plazos" notificarán de forma inmediata y de mutuo acuerdo a los In-House de mayor acceso en el sistema.
            </p>
          </div>
          <div className="shrink-0 font-mono text-[9px] uppercase tracking-wider font-bold text-sidebarRose border border-sidebarRose/25 bg-cream/50 px-3 py-1.5 rounded-xl">
            📡 Enlace con In-House Sincronizado
          </div>
        </div>
      )}

      {/* CREATE EXPEDIENTE PANEL POPUP MODAL */}
      {showCreate && (
        <div className="bg-paper border border-borderSoft p-6 rounded-2xl max-w-xl mx-auto space-y-4">
          <h3 className="text-xl font-serif font-semibold">Registrar Jurisprudencia / Causa Inicial</h3>
          <form onSubmit={handleCreateProcess} className="space-y-3 font-sans text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-charcoalMuted uppercase font-bold mb-1">Cuerpo Legal / Materia</label>
                <select value={materia} onChange={(e) => setMateria(e.target.value)} className="w-full bg-cream border border-borderSoft p-2.5 rounded-lg text-xs">
                  <option value="laboral">Laboral (Código del Trabajo)</option>
                  <option value="civil">Civil (Código Civil)</option>
                  <option value="coip">Penal (COIP)</option>
                  <option value="coa">Contencioso Administrativo (COA)</option>
                  <option value="constitucional">Constitucional (LOGJCC)</option>
                </select>
              </div>
              <div>
                <label className="block text-charcoalMuted uppercase font-bold mb-1">Número de Proceso (SATJE)</label>
                <input
                  type="text"
                  placeholder="Ej: 09359-2025-01394 o deje en blanco"
                  value={numProceso}
                  onChange={(e) => setNumProceso(e.target.value)}
                  className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-charcoalMuted uppercase font-bold mb-1 text-[10px]">Actor (Demandante)</label>
                <input
                  type="text"
                  required
                  value={demandante}
                  onChange={(e) => setDemandante(e.target.value)}
                  className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs text-charcoal"
                />
              </div>
              <div>
                <label className="block text-charcoalMuted uppercase font-bold mb-1 text-[10px]">Representante Citado (Demandas/Citaciones)</label>
                <select
                  value={representanteCitado}
                  onChange={(e) => setRepresentanteCitado(e.target.value)}
                  className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs text-charcoal font-sans"
                >
                  <option value={selectedEmpresa.representante_legal_nombre || ""}>
                    {selectedEmpresa.representante_legal_nombre || "Sin representante registrado"} (Representante Legal)
                  </option>
                  <option value={selectedEmpresa.procurador_judicial_nombre || ""}>
                    {selectedEmpresa.procurador_judicial_nombre || "Sin procurador registrado"} (Procurador Judicial)
                  </option>
                  <option value="">Ninguno / Sola Persona Jurídica</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-charcoalMuted uppercase font-bold mb-1 text-[10px]">Co-demandados o Distribuidores Adicionales (Opcional)</label>
              <input
                type="text"
                value={demandado}
                placeholder="Ej. persona natural, distribuidor, contratista o co-demandado"
                onChange={(e) => setDemandado(e.target.value)}
                className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs text-charcoal"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="bg-cream border border-borderSoft text-charcoal px-4 py-2 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-charcoal text-cream hover:bg-charcoalSoft px-5 py-2 rounded-lg cursor-pointer"
              >
                Crear e Iniciar Conversación
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DUAL COLUMN SPLIT: Left Process Selection, Right Stage Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Process List Selector */}
        <div className="lg:col-span-3 space-y-3">
          <div className="text-xs uppercase font-bold tracking-wider text-charcoalMuted font-mono">
            Expedientes de la Empresa
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[500px]">
            {procesos.map((p) => {
              const isActive = selectedProcess?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProcess(p)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                    isActive
                      ? "bg-roseSoft border-roseOld/40 shadow-sm"
                      : "bg-paper hover:bg-paperDark border-borderSoft"
                  }`}
                  type="button"
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-sidebarRose leading-none">
                      {p.numero_proceso}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold font-sans ${
                      p.ficha_aprobada ? "bg-successSoft text-success" : "bg-dangerSoft text-danger"
                    }`}>
                      {p.ficha_aprobada ? "Activo" : "Ficha Pendiente"}
                    </span>
                  </div>
                  <h4 className="font-serif font-semibold text-charcoal text-base mt-2 line-clamp-2">
                    {p.titulo}
                  </h4>
                  <div className="flex justify-between items-center text-[10px] text-charcoalMuted mt-4 w-full">
                    <span>Materia: {p.materia.toUpperCase()}</span>
                    <span>{p.fecha_creacion}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Process Workspace Tabs */}
        {selectedProcess ? (
          <div className="lg:col-span-9 bg-paper border border-borderSoft rounded-2xl p-6 shadow-sm space-y-6">
            
            {/* Header process quick status banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-borderSoft pb-4 gap-4">
              <div>
                <span className="text-[10px] font-mono tracking-wider text-sidebarRose uppercase font-bold">
                  {selectedProcess.numero_proceso} · Materia: {selectedProcess.materia.toUpperCase()}
                </span>
                <h2 className="font-serif font-bold text-2xl text-charcoal mt-1 leading-tight">
                  {selectedProcess.titulo}
                </h2>
                <div className="flex gap-4 text-xs text-charcoalMuted mt-1.5 font-sans flex-wrap">
                  <span>Demandante: <strong>{selectedProcess.demandante}</strong></span>
                  <span>A cargo: <strong>{selectedProcess.abogado_cargo_nombre}</strong></span>
                  <span>Externo: <strong>{selectedProcess.abogado_externoy_nombre}</strong></span>
                </div>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-borderSoft gap-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setActiveSubTab("ficha")}
                className={`px-4 py-2 font-medium cursor-pointer ${
                  activeSubTab === "ficha" ? "border-b-2 border-sidebarRose text-charcoal" : "text-charcoalMuted"
                }`}
              >
                📋 Ficha del Caso
              </button>
              <button
                onClick={() => setActiveSubTab("chat")}
                className={`px-4 py-2 font-medium cursor-pointer ${
                  activeSubTab === "chat" ? "border-b-2 border-sidebarRose text-charcoal" : "text-charcoalMuted"
                }`}
              >
                💬 Recopilación de Hechos (AI Chat)
              </button>
              <button
                onClick={() => setActiveSubTab("etapas")}
                className={`px-4 py-2 font-medium cursor-pointer ${
                  activeSubTab === "etapas" ? "border-b-2 border-sidebarRose text-charcoal" : "text-charcoalMuted"
                }`}
              >
                📅 Línea de Tiempo ({selectedProcess.etapas.length})
              </button>
              <button
                onClick={() => setActiveSubTab("plazos")}
                className={`px-4 py-2 font-medium cursor-pointer ${
                  activeSubTab === "plazos" ? "border-b-2 border-sidebarRose text-charcoal" : "text-charcoalMuted"
                }`}
              >
                ⏳ Calculadora de Plazos ({selectedProcess.plazos.length})
              </button>
              <button
                onClick={() => setActiveSubTab("demanda")}
                className={`px-4 py-2 font-medium cursor-pointer ${
                  activeSubTab === "demanda" ? "border-b-2 border-sidebarRose text-charcoal" : "text-charcoalMuted"
                }`}
              >
                ⚖️ Generador de Demandas
              </button>
              <button
                onClick={() => setActiveSubTab("precedentes")}
                className={`px-4 py-2 font-medium cursor-pointer ${
                  activeSubTab === "precedentes" ? "border-b-2 border-sidebarRose text-charcoal" : "text-charcoalMuted"
                }`}
              >
                🔍 Precedentes SATJE
              </button>
            </div>

            {/* Sub Tab contents */}
            
            {/* SUBTAB: CHAT Legal facts collection */}
            {activeSubTab === "chat" && (
              <div className="space-y-4">
                <div className="bg-cream border border-borderSoft rounded-2xl p-4 flex gap-3 text-xs text-charcoalSoft leading-normal">
                  <MessageSquare className="w-5 h-5 text-sidebarRose flex-shrink-0" />
                  <p>
                    Comunícate con el Asistente de Litigación para relatar los antecedentes y flancos fácticos del caso en lenguaje natural. El robot evaluará si se cumplen los requisitos mínimos procesales por materia de Ecuador y autocompilará el informe de la Ficha del Caso.
                  </p>
                </div>

                <div className="border border-borderSoft rounded-xl p-4 bg-cream h-64 overflow-y-auto space-y-4">
                  {conversation.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`p-3 rounded-xl max-w-md text-xs relative ${
                        msg.role === "user"
                          ? "bg-charcoal text-cream rounded-tr-none"
                          : "bg-paper border border-borderSoft text-charcoal rounded-tl-none"
                      }`}>
                        <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1 leading-none font-bold">
                          {msg.role === "user" ? "Abogado Interno" : "Asistente LexControl"}
                        </div>
                        <p className="whitespace-pre-line font-sans">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Describe un hecho relevante para ${selectedEmpresa.nombre}: contratos, pagos, correos, fechas, responsables o anexos.`}
                    className="flex-1 bg-cream border border-borderSoft rounded-xl px-4 py-2 text-xs text-charcoal focus:outline-none"
                  />
                  <button type="submit" className="bg-charcoal text-cream hover:bg-charcoalSoft px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
                    Enviar
                  </button>
                </form>

                <div className="pt-4 border-t border-borderSoft flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-charcoalMuted">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Completeness del caso: <strong>Estatus óptimo (85%)</strong>
                  </div>
                  <button
                    onClick={handleGenerateFicha}
                    disabled={isGeneratingFicha}
                    className="bg-charcoal hover:bg-charcoalSoft text-cream text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGeneratingFicha ? "Compilando Ficha..." : "✨ Compilar Ficha Técnica"}
                  </button>
                </div>
              </div>
            )}

            {/* SUBTAB: Case technical sheet FICHA */}
            {activeSubTab === "ficha" && (
              <div className="space-y-6">
                {!selectedProcess.ficha_caso ? (
                  <div className="text-center py-16 space-y-4">
                    <Scale className="w-12 h-12 text-sidebarRose mx-auto animate-bounce" />
                    <h3 className="text-2xl font-serif font-semibold">Sin Ficha Técnica Generada</h3>
                    <p className="text-xs text-charcoalSoft max-w-sm mx-auto font-sans leading-relaxed">
                      Para redactar la ficha técnica estratégica de la causa judicial, engage en "Recopilación de Hechos" o pulse para autogenerar.
                    </p>
                    <button
                      onClick={handleGenerateFicha}
                      className="bg-charcoal text-cream text-xs px-5 py-2 rounded-xl cursor-pointer"
                    >
                      Autogenerar con gpt-4o
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Visual boutique parchment paper layout */}
                    <div className="lg:col-span-8 bg-cream border border-borderSoft rounded-2xl p-6 md:p-10 shadow-sm font-sans space-y-6 text-charcoal text-sm leading-relaxed text-justify">
                      
                      <div className="text-center border-b border-borderSoft pb-4">
                        <span className="text-[10px] font-mono tracking-widest text-sidebarRose uppercase font-bold">Documento Institucional - Confidencial</span>
                        <h2 className="font-serif font-medium text-2xl text-charcoal uppercase mt-2 select-none">
                          Ficha Técnica de Evaluación de Litigio
                        </h2>
                        <div className="text-xs text-charcoalMuted font-mono mt-1">Guayaquil, República del Ecuador</div>
                      </div>

                      <div className="bg-paper p-4 rounded-xl border border-borderSoft/40 font-mono text-xs text-charcoalSoft space-y-1">
                        <div>PARA: Departamento Legal de {selectedEmpresa.nombre}</div>
                        <div>RE: {selectedProcess.titulo}</div>
                        <div>MATERIA: {selectedProcess.materia.toUpperCase()}</div>
                        <div>ESTADO: {selectedProcess.ficha_aprobada ? "ACTIVO / SUSTANCIACIÓN" : "PENDIENTE DE APROBACIÓN POR SOCIO"}</div>
                      </div>

                      {/* I. ANTECEDENTES */}
                      <div className="space-y-3">
                        <h4 className="font-serif font-bold text-lg border-b border-borderSoft pb-1 text-sidebarRose uppercase">I. Antecedentes Fácticos (Ecuador)</h4>
                        <p className="whitespace-pre-line text-xs sm:text-sm text-charcoalSoft">{selectedProcess.ficha_caso.antecedentes}</p>
                      </div>

                      {/* II. REVISION DEL CASO */}
                      <div className="space-y-3">
                        <h4 className="font-serif font-bold text-lg border-b border-borderSoft pb-1 text-sidebarRose uppercase">II. Análisis de Dignidad Humana y Solidaridad</h4>
                        <p className="whitespace-pre-line text-xs sm:text-sm text-charcoalSoft">{selectedProcess.ficha_caso.analisis_dignidad_humana}</p>
                        
                        <div className="pl-4 border-l-2 border-roseOld italic font-serif text-charcoalMuted text-xs">
                          Nota Jurídica de la CNJ: De acuerdo con la última resolución de casación obrante, la interposición indiscriminada de prescripciones asume tácitamente la relación laboral en materias de choferes o fletes.
                        </div>
                      </div>

                      {/* III. CONCLUSIONES */}
                      <div className="space-y-3">
                        <h4 className="font-serif font-bold text-lg border-b border-borderSoft pb-1 text-sidebarRose uppercase">III. Conclusiones Directas</h4>
                        <p className="whitespace-pre-line text-xs sm:text-sm text-charcoalSoft">{selectedProcess.ficha_caso.conclusiones}</p>
                      </div>

                      {/* IV. LIMITACIONES */}
                      <div className="space-y-3">
                        <h4 className="font-serif font-bold text-lg border-b border-borderSoft pb-1 text-sidebarRose uppercase">IV. Limitaciones</h4>
                        <p className="whitespace-pre-line text-xs sm:text-sm text-charcoalSoft">{selectedProcess.ficha_caso.limitaciones}</p>
                      </div>

                      {/* V. ANALISIS ESTRATEGICO Y PROBABILIDADES */}
                      {selectedProcess.ficha_caso.probabilidad_exito_porcentaje !== undefined && (
                        <div className="space-y-3">
                          <h4 className="font-serif font-bold text-lg border-b border-borderSoft pb-1 text-sidebarRose uppercase">V. Probabilidad de Éxito de Ganar y Recomendación de Acción</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-justify">
                            <div className="bg-[#FDFCFB] p-4 rounded-xl border border-borderSoft/60 space-y-2">
                              <span className="text-[10px] uppercase font-mono font-bold text-sidebarRose">Análisis de Probabilidad Realista:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-extrabold text-3xl text-sidebarRose">{selectedProcess.ficha_caso.probabilidad_exito_porcentaje}%</span>
                                <span className="text-xs text-charcoalSoft font-sans font-medium">de Probabilidad de Ganar</span>
                              </div>
                              <p className="text-xs text-charcoalSoft leading-relaxed">{selectedProcess.ficha_caso.probabilidad_exito_analisis}</p>
                            </div>
                            <div className="bg-[#FDFCFB] p-4 rounded-xl border border-borderSoft/60 space-y-2">
                              <span className="text-[10px] uppercase font-mono font-bold text-sidebarRose">Acción Legal Recomendada:</span>
                              <div>
                                <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded uppercase font-sans ${
                                  selectedProcess.ficha_caso.recomendacion_estrategica === "litigar_defensa_tecnica"
                                    ? "bg-successSoft text-success"
                                    : selectedProcess.ficha_caso.recomendacion_estrategica === "abstenerse_por_costos"
                                    ? "bg-dangerSoft text-danger"
                                    : "bg-warningSoft text-warning"
                                }`}>
                                  {selectedProcess.ficha_caso.recomendacion_estrategica === "litigar_defensa_tecnica" 
                                    ? "Litigar / Oponer Excepción" 
                                    : selectedProcess.ficha_caso.recomendacion_estrategica === "abstenerse_por_costos"
                                    ? "Abstenerse por Costos Económicos"
                                    : "Conciliar por Mediación Rápida"
                                  }
                                </span>
                              </div>
                              <p className="text-xs text-charcoalSoft leading-relaxed">{selectedProcess.ficha_caso.analisis_economico_reputacional}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-center pt-8 border-t border-borderSoft text-xs text-charcoalMuted uppercase font-mono">
                        Redactado bajo estándares de LexControl - Samborondón, Ecuador
                      </div>
                    </div>

                    {/* Left Triage control sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                      
                      <div className="bg-paper border border-borderSoft rounded-2xl p-4 shadow-sm text-center space-y-3">
                        <div className={`p-4 rounded-xl text-center ${
                          selectedProcess.ficha_aprobada ? "bg-successSoft text-success" : "bg-warningSoft text-warning"
                        }`}>
                          <Gavel className="w-8 h-8 mx-auto mb-1" />
                          <div className="font-serif font-bold text-sm">
                            {selectedProcess.ficha_aprobada ? "Ficha Aprobada por Socio" : "Ficha Pendiente de Firma"}
                          </div>
                        </div>

                        {!selectedProcess.ficha_aprobada && (
                          <button
                            onClick={handleApproveFicha}
                            className="w-full py-2.5 bg-charcoal text-cream hover:bg-charcoalSoft rounded-xl text-xs font-semibold cursor-pointer font-sans transition-colors"
                            type="button"
                          >
                            ✓ Firmar y Aprobar Ficha
                          </button>
                        )}
                      </div>

                      {/* Probabilidad realist radial/gradient block */}
                      {selectedProcess.ficha_caso.probabilidad_exito_porcentaje !== undefined && (
                        <div className="bg-paper border border-borderSoft rounded-2xl p-4 shadow-sm space-y-3">
                          <h4 className="text-xs uppercase font-bold tracking-wider text-charcoal font-sans">Probabilidad de Éxito (Módulo de Ganar)</h4>
                          
                          <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-cream shrink-0 border-4 border-sidebarRose" style={{ borderColor: selectedProcess.ficha_caso.probabilidad_exito_porcentaje > 79 ? '#D4A5A5' : '#E6ADAD' }}>
                              <span className="font-serif font-extrabold text-[#7d3b3c] text-lg">{selectedProcess.ficha_caso.probabilidad_exito_porcentaje}%</span>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-charcoal uppercase tracking-wide">
                                {selectedProcess.ficha_caso.probabilidad_exito_porcentaje > 80 ? "Altamente Viable" : "Riesgo Moderado"}
                              </div>
                              <p className="text-[11px] text-charcoalSoft leading-tight">Mapeo contrastado con legislación COGEP.</p>
                            </div>
                          </div>

                          <div className="text-[11px] text-charcoalMuted bg-cream/70 border border-borderSoft/30 rounded-lg p-2.5 leading-relaxed font-sans">
                            <strong>Diagnóstico Estratégico:</strong> {selectedProcess.ficha_caso.probabilidad_exito_analisis}
                          </div>
                        </div>
                      )}

                      {/* Strategic action recommendation */}
                      {selectedProcess.ficha_caso.recomendacion_estrategica !== undefined && (
                        <div className="bg-paper border border-borderSoft rounded-2xl p-4 shadow-sm space-y-2">
                          <h4 className="text-xs uppercase font-bold tracking-wider text-charcoal font-sans">Recomendación Corporativa</h4>
                          <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                            selectedProcess.ficha_caso.recomendacion_estrategica === "litigar_defensa_tecnica"
                              ? "bg-successSoft/30 border-success/20 text-success"
                              : selectedProcess.ficha_caso.recomendacion_estrategica === "abstenerse_por_costos"
                              ? "bg-dangerSoft/30 border-danger/20 text-danger"
                              : "bg-warningSoft/30 border-warning/20 text-warning"
                          }`}>
                            <div className="font-bold text-base mt-0.5">⚖️</div>
                            <div className="space-y-0.5">
                              <span className="font-sans font-bold text-xs uppercase tracking-wider block">
                                {selectedProcess.ficha_caso.recomendacion_estrategica === "litigar_defensa_tecnica" 
                                  ? "Litigar / Excepción Técnica" 
                                  : selectedProcess.ficha_caso.recomendacion_estrategica === "abstenerse_por_costos"
                                  ? "Abstenerse / Conciliar"
                                  : "Conciliación Rápida"
                                }
                              </span>
                              <p className="text-[11px] text-charcoalSoft leading-tight">{selectedProcess.ficha_caso.analisis_economico_reputacional}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Strong points */}
                      <div className="bg-paper border border-borderSoft rounded-2xl p-4 shadow-sm space-y-2">
                        <h4 className="text-xs uppercase font-bold tracking-wider text-success font-sans">Argumentos Fuertes</h4>
                        <ul className="text-[11px] text-charcoalSoft space-y-2 font-sans list-disc list-inside leading-snug">
                          {selectedProcess.ficha_caso.puntos_fuertes.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Weak points */}
                      <div className="bg-paper border border-borderSoft rounded-2xl p-4 shadow-sm space-y-2">
                        <h4 className="text-xs uppercase font-bold tracking-wider text-danger font-sans">Puntos de Riesgo (Débiles)</h4>
                        <ul className="text-[11px] text-charcoalSoft space-y-2 font-sans list-disc list-inside leading-snug">
                          {selectedProcess.ficha_caso.puntos_debiles.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>

                    </div>

                  </div>
                )}
              </div>
            )}

            {/* SUBTAB: TIMELINE ETAPAS */}
            {activeSubTab === "etapas" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-2 border-b border-borderSoft">
                  <h3 className="font-serif font-semibold text-lg text-charcoal">Hitos y Actuaciones del Expediente</h3>
                  <button
                    onClick={handleAddMilestone}
                    className="bg-charcoal text-cream text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-transform hover:scale-105"
                  >
                    + Cargar Actuación / Proveído
                  </button>
                </div>

                <div className="timeline">
                  {selectedProcess.etapas.map((et, idx) => {
                    const isRevoked = et.review_estado === "revocado";
                    const isPendingSecond = et.review_estado === "pendiente_revision";
                    const hasPerms = hasHierarchyPermission(et.creado_por_rol);

                    return (
                      <div 
                        key={et.id} 
                        className={`etapa rounded-xl p-4 border relative pl-6 transition-all ${
                          isRevoked 
                            ? "border-amber-300 bg-amber-50/20 opacity-65 grayscale" 
                            : isPendingSecond
                              ? "border-amber-400 bg-amber-50/50"
                              : "border-borderSoft bg-paper"
                        }`}
                      >
                        <div className="flex justify-between items-center sm:text-xs">
                          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-sidebarRose">{et.tipo}</span>
                          <span className="text-xs font-mono text-charcoalMuted">{et.fecha}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <h4 className={`font-serif font-semibold text-base text-charcoal ${isRevoked ? "line-through text-charcoalMuted" : ""}`}>
                            {et.titulo}
                          </h4>
                          
                          {/* Audit Status Badges */}
                          {et.review_estado === "revocado" && (
                            <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                              🚫 Acción Revocada
                            </span>
                          )}
                          {et.review_estado === "pendiente_revision" && (
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                              ⚠️ Segunda Revisión Técnica
                            </span>
                          )}
                        </div>

                        {et.ejecutado_por && (
                          <div className="text-[10px] text-charcoalMuted mt-0.5 font-sans leading-none flex items-center gap-1">
                            <span>Cargado por: <strong>{et.ejecutado_por}</strong> ({et.creado_por_rol || "externo"})</span>
                          </div>
                        )}
                        
                        <div className="bg-roseSoft/40 p-3 rounded-lg border-l-2 border-roseOld mt-3 text-xs text-charcoalSoft font-sans leading-relaxed">
                          <strong className="text-sidebarRose block text-[10px] uppercase tracking-wider mb-1">Análisis de Resumen de Actuación por IA:</strong>
                          {et.resumen_ia}
                        </div>

                        {et.adjunto_url && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-charcoalMuted border border-borderSoft/60 bg-cream px-2 py-1 rounded mt-2 uppercase font-mono">
                            📎 {et.adjunto_url}
                          </span>
                        )}

                        {/* Hierarchical Action panel */}
                        {hasPerms && (
                          <div className="mt-3 pt-3 border-t border-dashed border-borderSoft flex flex-wrap items-center gap-1.5 font-sans">
                            <span className="text-[9px] uppercase font-bold tracking-wider text-charcoalMuted mr-1.5">Regulación de Defensa:</span>
                            {et.review_estado !== "aprobado" && (
                              <button
                                onClick={() => handleReviewAction("etapa", et.id, "approve")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                              >
                                ✓ Convalidar / Aprobar
                              </button>
                            )}
                            {et.review_estado !== "pendiente_revision" && (
                              <button
                                onClick={() => handleReviewAction("etapa", et.id, "second_review")}
                                className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                              >
                                ⏱ Enviar a Segunda Revisión
                              </button>
                            )}
                            {et.review_estado !== "revocado" && (
                              <button
                                onClick={() => handleReviewAction("etapa", et.id, "revoke")}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                              >
                                ✕ Revocar Acción de Co-Defensa
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUBTAB: PLAZOS PRECISE CALCULATOR */}
            {activeSubTab === "plazos" && (
              <div className="space-y-6">
                
                {/* Custom active calculation box */}
                <div className="bg-paper border border-borderSoft rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="font-serif font-semibold text-lg text-charcoal">Calcular Término de Proceso (COGEP / COIP)</h3>
                  <p className="text-xs text-charcoalSoft font-sans">
                    El calculador de plazos aplica estrictamente la exclusión de sábados, domingos y feriados nacionales o de cantón en Ecuador (Término) o corridos (Plazo Penal).
                  </p>

                  <form onSubmit={handleCalculateDeadline} className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-xs">
                    <div>
                      <label className="block text-charcoalMuted font-bold uppercase mb-1">Nombre del Trámite</label>
                      <input
                        type="text"
                        value={plazoTitulo}
                        onChange={(e) => setPlazoTitulo(e.target.value)}
                        className="w-full bg-cream border border-borderSoft p-2.5 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-charcoalMuted font-bold uppercase mb-1">Base Regulatorio / Norma</label>
                      <input
                        type="text"
                        value={plazoRegla}
                        onChange={(e) => setPlazoRegla(e.target.value)}
                        className="w-full bg-cream border border-borderSoft p-2.5 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-charcoalMuted font-bold uppercase mb-1">Días de Plazo</label>
                      <input
                        type="number"
                        value={plazoDias}
                        onChange={(e) => setPlazoDias(e.target.value)}
                        className="w-full bg-cream border border-borderSoft p-2.5 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-charcoalMuted font-bold uppercase mb-1">Horas adicionales</label>
                      <input
                        type="number"
                        value={plazoHoras}
                        onChange={(e) => setPlazoHoras(e.target.value)}
                        className="w-full bg-cream border border-borderSoft p-2.5 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-charcoalMuted font-bold uppercase mb-1">Tipo de Cómputo</label>
                      <select
                        value={plazoTipo}
                        onChange={(e) => setPlazoTipo(e.target.value as "termino" | "plazo")}
                        className="w-full bg-cream border border-borderSoft p-2.5 rounded-lg text-xs"
                      >
                        <option value="termino">Término (Días Hábiles Ecuador)</option>
                        <option value="plazo">Plazo (Días Corridos)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-charcoalMuted font-bold uppercase mb-1">Fecha de Notificación / Citación</label>
                      <input
                        type="date"
                        required
                        value={plazoStart}
                        onChange={(e) => setPlazoStart(e.target.value)}
                        className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-charcoalMuted font-bold uppercase mb-1">Observaciones</label>
                      <input
                        type="text"
                        value={plazoObservaciones}
                        onChange={(e) => setPlazoObservaciones(e.target.value)}
                        placeholder="Notas del abogado, fundamento de validación o criterio aplicado"
                        className="w-full bg-cream border border-borderSoft p-2.5 rounded-lg text-xs"
                      />
                    </div>
                    <label className="flex items-center gap-2 bg-cream border border-borderSoft p-2.5 rounded-lg">
                      <input
                        type="checkbox"
                        checked={plazoVerificadoManual}
                        onChange={(e) => setPlazoVerificadoManual(e.target.checked)}
                        className="accent-charcoal"
                      />
                      <span className="font-bold text-charcoalSoft">Verificado manualmente</span>
                    </label>
                    <div className="flex items-end">
                      <button type="submit" className="w-full bg-charcoal hover:bg-charcoalSoft text-cream text-xs font-semibold py-2.5 rounded-xl cursor-pointer">
                        Calcular e Inscribir en Calendario
                      </button>
                    </div>
                  </form>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif font-semibold text-lg text-charcoal">Términos Calculados y Fechas Límite</h3>
                  <div className="space-y-2">
                    {selectedProcess.plazos.length === 0 ? (
                      <div className="text-center py-8 text-charcoalMuted font-sans">No hay plazos inscriptos para esta causa judicial.</div>
                    ) : (
                      selectedProcess.plazos.map((pl) => {
                        const isRevoked = pl.review_estado === "revocado";
                        const isPendingSecond = pl.review_estado === "pendiente_revision";
                        const hasPerms = hasHierarchyPermission(pl.creado_por_rol);

                        return (
                          <div 
                            key={pl.id} 
                            className={`p-4 rounded-xl border relative space-y-2 shadow-sm transition-all ${
                              isRevoked 
                                ? "border-amber-300 bg-amber-50/20 opacity-65 grayscale" 
                                : isPendingSecond
                                  ? "border-amber-400 bg-amber-50/50"
                                  : "border-borderSoft bg-paper"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-sidebarRose mr-2">{pl.regla_origen}</span>
                                <span className="bg-roseSoft text-sidebarRose text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-sans mr-2">
                                  {pl.tipo}
                                </span>
                                
                                {/* Status badges */}
                                {pl.review_estado === "revocado" && (
                                  <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                    🚫 Término Revocado
                                  </span>
                                )}
                                {pl.review_estado === "pendiente_revision" && (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                    ⚠️ Segunda Revisión Técnica
                                  </span>
                                )}

                                <h4 className={`font-serif font-semibold text-base text-charcoal mt-1 ${isRevoked ? "line-through text-charcoalMuted" : ""}`}>
                                  {pl.titulo}
                                </h4>
                                <p className="text-[11px] text-charcoalSoft font-sans">Límite fatal de provisión: <strong className="text-charcoal">{pl.fecha_limite}</strong></p>
                                {(pl as any).alerta_estado && (
                                  <span className="inline-flex mt-1 text-[10px] bg-warningSoft text-warning px-2 py-0.5 rounded font-bold uppercase">
                                    {(pl as any).alerta_estado}
                                  </span>
                                )}
                                {(pl as any).verificado_manual && (
                                  <span className="inline-flex mt-1 ml-1 text-[10px] bg-successSoft text-success px-2 py-0.5 rounded font-bold uppercase">
                                    Verificado manualmente
                                  </span>
                                )}
                                
                                {pl.creado_por_nombre && (
                                  <div className="text-[10px] text-charcoalMuted mt-1">
                                    Calculado por: <strong>{pl.creado_por_nombre}</strong> ({pl.creado_por_rol || "externo"})
                                  </div>
                                )}
                              </div>
                              <div className="text-right sm:text-xs">
                                <div className={`font-serif font-bold text-2xl text-charcoal ${isRevoked ? "text-charcoalMuted line-through" : ""}`}>{pl.dias} Días</div>
                                <span className="text-[10px] text-charcoalMuted">Cómputo hábil</span>
                              </div>
                            </div>

                            {/* Anomaly outputs if any */}
                            {pl.anomalias && pl.anomalias.length > 0 && (
                              <div className="bg-dangerSoft/40 p-3 rounded-lg border-l-2 border-danger text-xs text-danger font-sans leading-relaxed space-y-1">
                                <strong className="block text-[10px] uppercase tracking-wider">¡Alerta de Anomalía Procesal Detectada!</strong>
                                {pl.anomalias.map((an, ai) => (
                                  <p key={ai}>{an}</p>
                                ))}
                              </div>
                            )}

                            {pl.dias_no_habiles_excluidos && pl.dias_no_habiles_excluidos.length > 0 && (
                              <div className="text-[10px] text-charcoalMuted font-mono">
                                Días excluidos por feriado/fin de semana: {pl.dias_no_habiles_excluidos.join(", ")}
                              </div>
                            )}
                            {(pl as any).observaciones && (
                              <div className="text-[10px] text-charcoalMuted font-sans">
                                Observaciones: {(pl as any).observaciones}
                              </div>
                            )}

                            {/* Control Bar */}
                            {hasPerms && (
                              <div className="mt-3 pt-3 border-t border-dashed border-borderSoft flex flex-wrap items-center gap-1.5 font-sans">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-charcoalMuted mr-1.5">Regulación de Términos:</span>
                                {pl.review_estado !== "aprobado" && (
                                  <button
                                    onClick={() => handleReviewAction("plazo", pl.id, "approve")}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                                  >
                                    ✓ Convalidar / Aprobar
                                  </button>
                                )}
                                {pl.review_estado !== "pendiente_revision" && (
                                  <button
                                    onClick={() => handleReviewAction("plazo", pl.id, "second_review")}
                                    className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                                  >
                                    ⏱ Enviar a Segunda Revisión
                                  </button>
                                )}
                                {pl.review_estado !== "revocado" && (
                                  <button
                                    onClick={() => handleReviewAction("plazo", pl.id, "revoke")}
                                    className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                                  >
                                    ✕ Revocar Cómputo
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* SUBTAB: DEMAND DRAFT GENERATOR */}
            {activeSubTab === "demanda" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <form onSubmit={handleGenerateDemanda} className="lg:col-span-5 bg-white border border-borderSoft rounded-2xl p-5 space-y-3 text-xs">
                  <h3 className="font-serif font-semibold text-lg text-charcoal">Generador de Demandas</h3>
                  <p className="text-charcoalSoft leading-relaxed">
                    Complete el interrogatorio base. La IA estructura una demanda editable y activa el flujo de revisión entre abogado interno y externo.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-charcoalMuted">Materia</span>
                      <select value={demandaForm.materia} onChange={(e) => setDemandaForm({ ...demandaForm, materia: e.target.value })} className="w-full bg-cream border border-borderSoft rounded-lg p-2">
                        <option value="civil">Civil</option>
                        <option value="laboral">Laboral</option>
                        <option value="mercantil">Mercantil</option>
                        <option value="contencioso administrativo">Contencioso Administrativo</option>
                        <option value="constitucional">Constitucional</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-charcoalMuted">Jurisdicción / Cantón</span>
                      <input value={demandaForm.jurisdiccion} onChange={(e) => setDemandaForm({ ...demandaForm, jurisdiccion: e.target.value })} className="w-full bg-cream border border-borderSoft rounded-lg p-2" />
                    </label>
                  </div>
                  {[
                    ["actor", "¿Quién demanda?"],
                    ["demandado", "¿A quién se demanda?"],
                    ["pretension", "¿Qué se pide al juez?"],
                    ["cuantia", "Cuantía estimada"]
                  ].map(([key, label]) => (
                    <label key={key} className="space-y-1 block">
                      <span className="text-[10px] uppercase font-bold text-charcoalMuted">{label}</span>
                      <input value={(demandaForm as any)[key]} onChange={(e) => setDemandaForm({ ...demandaForm, [key]: e.target.value })} className="w-full bg-cream border border-borderSoft rounded-lg p-2" />
                    </label>
                  ))}
                  <label className="space-y-1 block">
                    <span className="text-[10px] uppercase font-bold text-charcoalMuted">Hechos relevantes</span>
                    <textarea rows={4} value={demandaForm.hechos} onChange={(e) => setDemandaForm({ ...demandaForm, hechos: e.target.value })} className="w-full bg-cream border border-borderSoft rounded-lg p-2" />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[10px] uppercase font-bold text-charcoalMuted">Pruebas disponibles</span>
                    <textarea rows={3} value={demandaForm.pruebas} onChange={(e) => setDemandaForm({ ...demandaForm, pruebas: e.target.value })} className="w-full bg-cream border border-borderSoft rounded-lg p-2" />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[10px] uppercase font-bold text-charcoalMuted">Observaciones estratégicas</span>
                    <textarea rows={2} value={demandaForm.observaciones} onChange={(e) => setDemandaForm({ ...demandaForm, observaciones: e.target.value })} className="w-full bg-cream border border-borderSoft rounded-lg p-2" />
                  </label>
                  <button type="submit" disabled={isGeneratingDemanda} className="w-full bg-charcoal text-cream rounded-xl py-2.5 font-bold cursor-pointer">
                    {isGeneratingDemanda ? "Redactando..." : "Generar demanda editable"}
                  </button>
                </form>

                <div className="lg:col-span-7 bg-white border border-borderSoft rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-borderSoft pb-3">
                    <div>
                      <h3 className="font-serif font-semibold text-lg text-charcoal">Borrador editable</h3>
                      <p className="text-[11px] text-charcoalMuted">Estado: {demandaStatus || "Sin generar"}</p>
                    </div>
                    {generatedDemanda && (
                      <button onClick={() => navigator.clipboard?.writeText(generatedDemanda)} className="text-[11px] px-3 py-2 rounded-lg border border-borderSoft bg-cream font-bold">
                        Copiar texto
                      </button>
                    )}
                  </div>
                  {generatedDemanda ? (
                    <>
                      <textarea value={generatedDemanda} onChange={(e) => setGeneratedDemanda(e.target.value)} rows={22} className="w-full bg-cream border border-borderSoft rounded-xl p-4 text-xs font-mono leading-relaxed" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <button onClick={() => handleSaveDemanda("revision")} className="bg-[#8E6B6B] text-white rounded-xl py-2 text-xs font-bold">Enviar a revisión</button>
                        <button onClick={() => handleSaveDemanda("final")} className="bg-success text-white rounded-xl py-2 text-xs font-bold">Guardar final</button>
                        <button onClick={() => handleSaveDemanda("pdf")} className="bg-charcoal text-cream rounded-xl py-2 text-xs font-bold">Exportar PDF y guardar</button>
                      </div>
                      <p className="text-[10px] text-charcoalMuted">
                        Si se copia o exporta para ajustar formato/logos, cargue luego la versión final en Gabinete para constancia.
                      </p>
                    </>
                  ) : (
                    <div className="h-[420px] flex items-center justify-center text-center text-charcoalMuted text-xs">
                      Complete el formulario para iniciar el borrador.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB: PRECEDENTES SATJE */}
            {activeSubTab === "precedentes" && (
              <div className="space-y-4">
                <div className="bg-cream border border-borderSoft rounded-2xl p-4 flex gap-3 text-xs text-charcoalSoft leading-normal">
                  <Clock className="w-5 h-5 text-sidebarRose flex-shrink-0" />
                  <p>
                    <strong>Caché SATJE Activo (48 Horas):</strong> El sistema consulta de forma diferida las bases del Consejo de la Judicatura para buscar resoluciones coincidentes con la materia laboral para la empresa.
                  </p>
                </div>

                <div className="p-8 rounded-xl border border-borderSoft bg-paper text-center text-xs text-charcoalMuted">
                  Sin precedentes cargados todavía. Conecte la consulta SATJE o cargue resoluciones verificadas para iniciar el cotejo.
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="lg:col-span-9 text-center py-16 bg-paper border border-borderSoft rounded-2xl max-w-xl mx-auto space-y-4">
            <Scale className="w-12 h-12 text-sidebarRose mx-auto" />
            <h3 className="text-2xl font-serif font-semibold">Seleccione un Expediente</h3>
            <p className="text-xs text-charcoalMuted font-sans">
              Elija una causa de la columna izquierda para auditar sus plazos, etapas y ficha técnica boutique.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
