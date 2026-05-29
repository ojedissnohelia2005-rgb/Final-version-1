import React, { useState, useEffect, useMemo, useRef } from "react";
import { Empresa, ChatMensaje, UserProfile, ProcesoJudicial } from "../types";
import { 
  MessageSquare, 
  Send, 
  CheckCheck, 
  ShieldCheck, 
  Mail, 
  ArrowRight, 
  UserCheck2, 
  Lock, 
  Users, 
  Building, 
  ShieldAlert, 
  Search, 
  Sparkles,
  CheckCircle,
  Briefcase,
  AlertTriangle
} from "lucide-react";
import { FormattedText } from "./FormattedText";

interface QuickChatProps {
  selectedEmpresa: Empresa;
  currentProfile: UserProfile;
}

export default function QuickChat({ selectedEmpresa, currentProfile }: QuickChatProps) {
  const [messages, setMessages] = useState<ChatMensaje[]>([]);
  const [inputText, setInputText] = useState("");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [procesos, setProcesos] = useState<ProcesoJudicial[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search query to filter contacts or group chats on left pane
  const [searchTerm, setSearchTerm] = useState("");
  
  // Active channel identifier
  const [activeChannel, setActiveChannel] = useState<string>(
    currentProfile.rol === "super_admin" ? "servicio_tecnico" : "internos"
  );
  
  // Animated typing indicator simulator state
  const [isTyping, setIsTyping] = useState(false);
  const [typingName, setTypingName] = useState("");

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch profiles and processes on mount/organization change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profilesRes, procesosRes] = await Promise.all([
          fetch("/api/profiles"),
          fetch(`/api/procesos?negocio_id=${selectedEmpresa.id}`)
        ]);
        
        const profilesData = await profilesRes.json();
        const procesosData = await procesosRes.json();
        
        setProfiles(profilesData);
        setProcesos(procesosData);
        
        // Auto-select correct default channel depending on role access
        if (currentProfile.rol === "super_admin") {
          setActiveChannel("servicio_tecnico");
        } else if (currentProfile.rol !== "invitado") {
          setActiveChannel("internos");
        } else {
          // If external guest (invitado), filter available channels and select the first case group chat
          const defaultGuestChannel = procesosData.length > 0 ? `case_${procesosData[0].id}` : "";
          if (defaultGuestChannel) {
            setActiveChannel(defaultGuestChannel);
          } else {
            const companyAdmin = profilesData.find((p: UserProfile) => p.rol === "admin" && p.empresa_id === selectedEmpresa.id);
            if (companyAdmin) {
              const sorted = [companyAdmin.email.toLowerCase(), currentProfile.email.toLowerCase()].sort();
              setActiveChannel(`direct_${sorted[0]}_${sorted[1]}`);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching chat structural metadata:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedEmpresa, currentProfile]);

  // 2. Fetch messages whenever the active channel or selected company changes
  useEffect(() => {
    fetchMessages();
  }, [selectedEmpresa, activeChannel]);

  // Keep chat scrolled down smoothly
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const fetchMessages = async () => {
    if (!activeChannel) return;
    try {
      const res = await fetch(`/api/chat?negocio_id=${selectedEmpresa.id}&canal=${activeChannel}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Error loading chat contents:", err);
    }
  };

  // Helper properties check
  const myEmail = currentProfile.email.toLowerCase();
  const isInhouseUser = currentProfile.rol !== "invitado";

  // 3. Dynamic thread/chat compiler according to safety & provider-isolation rules
  const availableThreads = useMemo(() => {
    const threads: {
      id: string; // db canal key
      nombre: string;
      subtitulo: string;
      tipo: "group_inhouse" | "case_group" | "direct";
      participantes: string[];
      badgeText: string;
      badgeColor: string;
      connected: boolean;
    }[] = [];

    // --- RULE A: Colegio Legal Interno (In-House group) ---
    // Visibilidad: Solo usuarios In-House (admins, standard users).
    // "Los super admins no van en el chat de la empresa, pero si debe haber un chat entre ellos y los administradores que se llame 'Servicio técnico'"
    if (isInhouseUser && currentProfile.rol !== "super_admin") {
      const inhouseEmails = profiles
        .filter(p => p.rol !== "invitado" && p.rol !== "super_admin")
        .map(p => p.email.toLowerCase());
        
      threads.push({
        id: "internos",
        nombre: `Abogados (${selectedEmpresa.nombre})`,
        subtitulo: `Abogados internos de ${selectedEmpresa.nombre}`,
        tipo: "group_inhouse",
        participantes: inhouseEmails,
        badgeText: "Grupo Empresa",
        badgeColor: "bg-dangerSoft/80 text-roseOld border-roseOld/10",
        connected: true
      });
    }

    // --- RULE A2: Servicio Técnico (Super Admins + Admins Only) ---
    if (currentProfile.rol === "super_admin" || currentProfile.rol === "admin") {
      const techEmails = profiles
        .filter(p => p.rol === "super_admin" || p.rol === "admin")
        .map(p => p.email.toLowerCase());

      threads.push({
        id: "servicio_tecnico",
        nombre: "Servicio técnico",
        subtitulo: "Soporte técnico y coordinación de administración",
        tipo: "group_inhouse", // Render as team/group chat
        participantes: techEmails,
        badgeText: "Servicio Técnico",
        badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
        connected: true
      });
    }

    // --- RULE B: Case Group Chats (Dynamic Co-defending teams of 3) ---
    // "Y si hay mas de un inhouse y un externo asignados dentro de un mismo caso, que con el nombre del caso se cree un chat grupal entre los 3"
    procesos.forEach((proc) => {
      const mainInhouseEmail = (proc.abogado_a_cargo_email || "").toLowerCase();
      
      // Let's lookup any "invitado" profiles as external providers
      const externalProfile = profiles.find(p => p.rol === "invitado");
      const externalEmail = externalProfile ? externalProfile.email.toLowerCase() : "fiorella.rendon@montblanc.com.ec";

      // Let's locate the corporate compliance administrator as secondary In-House member
      const adminProfile = profiles.find(p => p.rol === "admin" && p.empresa_id === selectedEmpresa.id);
      const adminEmail = adminProfile ? adminProfile.email.toLowerCase() : "";

      // Assemble the designated co-defense trio (2 In-Houses + 1 External)
      const participants = Array.from(new Set([
        adminEmail,
        mainInhouseEmail,
        externalEmail
      ])).filter(Boolean);

      // Verify if the current session email belongs to this co-defense team
      const isPart = participants.includes(myEmail);

      if (participants.length >= 3 && isPart) {
        // Clean title representation for the case channel label.
        const cleanTitle = proc.titulo.split(" vs. ")[0].replace("Abg. ", "") || proc.titulo;
        threads.push({
          id: `case_${proc.id}`,
          nombre: `Defensa: ${cleanTitle}`,
          subtitulo: `Expediente N° ${proc.numero_proceso}`,
          tipo: "case_group",
          participantes: participants,
          badgeText: "Case Group (Trio)",
          badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-150",
          connected: true
        });
      }
    });

    // --- RULE C: Direct Chats (1-to-1 secure connections) ---
    // "que los inhouse tengan contacto con todos los inhouse y externos. Y los externos solo con los inhouse, no con otros externos"
    profiles.forEach((p) => {
      const targetEmail = p.email.toLowerCase();
      
      // Skip messaging self
      if (targetEmail === myEmail) return;

      const targetIsInhouse = p.rol !== "invitado";
      const targetIsExternal = p.rol === "invitado";

      let eligible = false;
      if (isInhouseUser) {
        // In-house lawyers can see other in-house and all external lawyers
        eligible = true;
      } else {
        // External lawyers can ONLY see in-house lawyers
        if (targetIsInhouse) {
          eligible = true;
        }
      }

      if (eligible) {
        const sorted = [myEmail, targetEmail].sort();
        const threadId = `direct_${sorted[0]}_${sorted[1]}`;

        threads.push({
          id: threadId,
          nombre: p.nombre,
          subtitulo: targetIsInhouse ? `${p.estudio_juridico || "In-House Legal Team"}` : `${p.estudio_juridico || "Litigante Externo"}`,
          tipo: "direct",
          participantes: [myEmail, targetEmail],
          badgeText: targetIsInhouse ? "In-House" : "Proveedor Externo",
          badgeColor: targetIsInhouse ? "bg-[#E6FAF2] text-emerald-800 border-emerald-200" : "bg-purple-50 text-purple-700 border-purple-200",
          connected: true
        });
      }
    });

    return threads;
  }, [profiles, procesos, currentProfile, selectedEmpresa]);

  // Filter available threads based on sidebar search query
  const filteredThreads = useMemo(() => {
    if (!searchTerm.trim()) return availableThreads;
    return availableThreads.filter(t => 
      t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.subtitulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.badgeText.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableThreads, searchTerm]);

  // Find currently selected channel details
  const activeThreadDetails = useMemo(() => {
    return availableThreads.find(t => t.id === activeChannel);
  }, [availableThreads, activeChannel]);

  // 4. Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeThreadDetails) return;

    const userMessageContent = inputText;
    setInputText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negocio_id: selectedEmpresa.id,
          canal: activeChannel,
          remitente_nombre: currentProfile.nombre,
          remitente_email: currentProfile.email,
          contenido: userMessageContent
        })
      });

      if (res.ok) {
        await fetchMessages();
      }
    } catch (err) {
      console.error("Error publishing message:", err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. COMPREHENSIVE COMPLIANCE HEADERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderSoft pb-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-charcoal flex items-center gap-2">
            Sala de Chats y Mensajería Rápida
          </h1>
          <p className="text-sm text-charcoalSoft font-sans">
            Comuníquese de forma segura y coordine la legítima defensa legal de {selectedEmpresa.nombre}.
          </p>
        </div>
      </div>

      {/* 2. CONFIDENTIALITY FILTER ALERTS AND INSTRUCTIONS */}
      <div className="rounded-2xl border p-4.5 bg-[#FAF8F5] border-borderSoft flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm">
        <div className="bg-charcoal text-cream p-3 rounded-xl shrink-0">
          <ShieldAlert className="w-5 h-5 text-sidebarRose" />
        </div>
        <div className="space-y-1 font-sans">
          <h4 className="font-bold text-xs text-charcoal uppercase tracking-wider font-mono">
            {isInhouseUser ? "🛡️ Política de Confidencialidad: Filtro Activo de Proveedores" : "⚠️ Restricción Externa: Secreto de Sumario y Proveedores"}
          </h4>
          <p className="text-[11px] text-charcoalSoft leading-relaxed">
            {isInhouseUser 
              ? "Los directivos e internos (In-House) participan libremente en todos los canales. Los proveedores externos asignados a casos legales independientes están estrictamente aislados y configuran silos confidenciales; no pueden contactarse entre ellos ni ver sus respectivas carteras."
              : "Como patrocinador externo contratado, usted posee un canal exclusivo de co-defensa en sus casos asignados y mensajería directa únicamente con abogados internos de la empresa. No posee visibilidad de otros proveedores jurídicos externos independientes o canales internos corporativos."
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 3. COLUMNA IZQUIERDA: CONTTACTOS, CHATS Y BUSCADOR */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-paper border border-borderSoft rounded-2xl p-4 shadow-sm space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-charcoalMuted font-mono">
              Buscador de Personas y Salas
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-charcoalMuted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar salas, contactos, cargos..."
                className="w-full bg-cream border border-borderSoft rounded-xl pl-9 pr-4 py-2.5 text-xs text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:border-charcoal transition-colors font-sans"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-charcoalMuted font-mono px-1">
              Canales y Contactos Disponibles ({filteredThreads.length})
            </div>

            <div className="overflow-y-auto max-h-[400px] space-y-2 pr-1">
              {loading ? (
                <div className="text-center py-10 text-charcoalMuted font-sans text-xs">
                  <div className="w-6 h-6 border-2 border-sidebarRose border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Cargando directorio legal seguro...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-center py-12 bg-paper border border-borderSoft rounded-2xl p-4 text-charcoalMuted text-xs font-sans">
                  No se hallaron contactos correspondientes con su nivel de seguridad.
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const isSelected = activeChannel === thread.id;
                  const isGroup = thread.tipo !== "direct";
                  
                  return (
                    <button
                      key={thread.id}
                      onClick={() => {
                        setActiveChannel(thread.id);
                        setSearchTerm("");
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-roseSoft border-roseOld/40 shadow-sm"
                          : "bg-paper hover:bg-paperDark border-borderSoft"
                      }`}
                      type="button"
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isSelected ? "bg-cream text-charcoal" : "bg-[#F5F2EC] text-charcoalSoft"
                      }`}>
                        {isGroup ? (
                          <Users className="w-4 h-4" />
                        ) : (
                          <UserCheck2 className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-serif font-bold text-charcoal text-sm truncate leading-tight">
                            {thread.nombre}
                          </h4>
                          <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full font-mono font-bold border ${thread.badgeColor} shrink-0`}>
                            {thread.badgeText}
                          </span>
                        </div>
                        
                        <p className="text-[10.5px] text-charcoalMuted font-sans truncate leading-tight">
                          {thread.subtitulo}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Active status block */}
          <div className="bg-paper border border-borderSoft rounded-2xl p-4 space-y-3 shadow-sm text-xs text-charcoalSoft">
            <div className="flex items-center gap-1.5 font-bold font-serif text-charcoal">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              LexControl - Casillero Activo
            </div>
            <div className="font-mono text-[10px] space-y-1 text-charcoalMuted">
              <div>Sesión: {currentProfile.nombre}</div>
              <div>Rango: {currentProfile.rol === "invitado" ? "Defensor Externo" : "Asesor Permanente In-House"}</div>
              <div className="truncate">Email: {currentProfile.email}</div>
            </div>
          </div>

        </div>

        {/* 4. COLUMNA DERECHA: VENTANA DE CHAT ACTIVADA */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-paper border border-borderSoft rounded-2xl h-[550px] overflow-hidden shadow-sm">
          
          {activeThreadDetails ? (
            <>
              {/* Header de la sala */}
              <div className="bg-paperDark/60 border-b border-borderSoft px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-serif font-bold text-charcoal text-base flex items-center gap-1.5">
                    {activeThreadDetails.nombre}
                    <Lock className="w-3.5 h-3.5 text-success inline shrink-0" />
                  </h4>
                  <p className="text-[10px] text-charcoalMuted font-sans truncate">
                    Participantes: {activeThreadDetails.participantes.join(", ")}
                  </p>
                </div>
                
                <div className="shrink-0">
                  <span className="text-[9.5px] font-mono rounded bg-sidebarRose/10 text-sidebarRose border border-sidebarRose/20 px-2 py-1 font-bold uppercase tracking-wider">
                    {activeThreadDetails.tipo === "group_inhouse" 
                      ? "FILTRADO INTERNO" 
                      : activeThreadDetails.tipo === "case_group"
                        ? "TRIO CODIFUSO"
                        : "DIRECTO ENCRIPTADO"
                    }
                  </span>
                </div>
              </div>

              {/* Contenedor de la conversación */}
              <div ref={chatContainerRef} className="flex-1 bg-cream/30 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-24 text-charcoalMuted text-xs font-sans italic space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-charcoalMuted/40" />
                    <p>No hay mensajes en este canal confidencial.</p>
                    <p className="text-[10px]">Inicie la conversación enviando un mensaje directo seguro debajo.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.remitente_email.toLowerCase() === myEmail;
                    
                    // Identify role for tag
                    const displaysAsExternal = m.remitente_rol === "invitado";
                    
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`p-4 rounded-2xl max-w-md shadow-xs relative ${
                          isMe
                            ? "bg-charcoal text-cream rounded-tr-none"
                            : "bg-paper border border-borderSoft text-charcoal rounded-tl-none"
                        }`}>
                          <div className={`text-[9.5px] uppercase font-mono font-bold opacity-75 mb-1 flex items-center gap-1 ${
                            isMe ? "text-sidebarRose" : "text-charcoalMuted"
                          }`}>
                            <span>{m.remitente_nombre}</span>
                            <span className="opacity-50 font-sans font-normal">({m.remitente_email.split("@")[0]})</span>
                            <span className={`text-[8px] font-mono px-1 rounded ${
                              displaysAsExternal 
                                ? "bg-purple-100 text-purple-700 font-bold" 
                                : "bg-dangerSoft text-roseOld font-bold"
                            }`}>
                              {displaysAsExternal ? "Externo" : "Interno"}
                            </span>
                          </div>
                          
                          <div className="text-xs font-sans leading-relaxed">
                            <FormattedText text={m.contenido} />
                          </div>
                          
                          <div className="flex justify-between items-center text-[8.5px] opacity-60 mt-2.5 font-mono leading-none">
                            <span>{(m.fecha_envio || "").slice(11, 16) || "Hoy"} EST</span>
                            {isMe && <CheckCheck className="w-3.5 h-3.5 text-success inline ml-1" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Animated Typing Simulation Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-paper border border-borderSoft text-charcoal p-3.5 rounded-2xl rounded-tl-none max-w-sm flex items-center gap-2">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-sidebarRose rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-1.5 h-1.5 bg-sidebarRose rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-1.5 h-1.5 bg-sidebarRose rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                      <span className="text-[10px] text-charcoalMuted font-mono">
                        {typingName} está escribiendo...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulario de envio inferior */}
              <div className="p-4 border-t border-borderSoft bg-paper">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Enviar mensaje seguro a ${activeThreadDetails.nombre}...`}
                    className="flex-grow bg-cream border border-borderSoft rounded-xl pl-4 pr-10 py-3.5 text-xs text-charcoal focus:outline-none focus:border-charcoal transition-colors font-sans"
                  />
                  <button
                    type="submit"
                    className="p-3 bg-charcoal hover:bg-charcoalSoft text-cream rounded-xl cursor-pointer transition-colors shrink-0 flex items-center justify-center.5"
                    title="Enviar mensaje encriptado"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </form>
                
                <div className="flex items-center gap-1.5 text-[9px] text-charcoalMuted font-mono mt-2.5 select-none">
                  <Mail className="w-3.5 h-3.5 text-sidebarRose" />
                  Este canal conserva trazabilidad interna con acuse de envío dentro del workspace.
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-cream/20 space-y-3 font-sans">
              <MessageSquare className="w-12 h-12 text-charcoalMuted" />
              <h3 className="text-sm font-bold text-charcoal">Ninguna Sala de Defensa Seleccionada</h3>
              <p className="text-xs text-charcoalMuted max-w-xs">
                Por favor presione sobre un canal de grupo o un contacto seguro del listado izquierdo para iniciar el flujo de co-defensa.
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
