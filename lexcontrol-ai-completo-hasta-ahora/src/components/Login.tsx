import React, { useState, useEffect } from "react";
import { UserProfile, ProfileRole } from "../types";
import { Lock, Mail, User, ShieldCheck, KeyRound, ArrowRight, ArrowLeft } from "lucide-react";
import ScaleWithN from "./ScaleWithN";

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [view, setView] = useState<"login" | "register" | "awaiting_confirm" | "schedule_meeting">("login");
  const [email, setEmail] = useState("nohelia.ojedis@uees.edu.ec");
  const [password, setPassword] = useState("Superadmin");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Meeting Schedule States
  const [meetEmail, setMeetEmail] = useState("");
  const [meetDates, setMeetDates] = useState("");
  const [meetHours, setMeetHours] = useState("");
  const [meetCorpName, setMeetCorpName] = useState("");
  const [meetDetails, setMeetDetails] = useState("");
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  // Registration Form States
  const [regNombre, setRegNombre] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regRol, setRegRol] = useState<ProfileRole>("admin");
  const [regSuccessData, setRegSuccessData] = useState<{
    confirm_link: string;
    email: string;
    nombre: string;
    role: string;
  } | null>(null);

  // Parse invite code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCodeInUrl = params.get("invite_code") || params.get("register_invite");
    if (inviteCodeInUrl) {
      setRegCode(inviteCodeInUrl);
      setView("register");
      // Pre-select role as user or invitado if code looks like invitation
      if (inviteCodeInUrl.toUpperCase().startsWith("INV-")) {
        setRegRol("user");
      }
    }
  }, []);

  const presetAccounts = [
    { email: "nohelia.ojedis@uees.edu.ec", password: "Superadmin", name: "Nohelia Ojedis", role: "super_admin" as ProfileRole, desc: "Superadmin1" },
    { email: "gabriel.torres@duragas.com.ec", password: "administrador1", name: "Gabriel Torres", role: "admin" as ProfileRole, desc: "Administrador de DURAGAS S.A." },
    { email: "emily.campos@duragas.com.ec", password: "inhouse1", name: "Emily Campos", role: "user" as ProfileRole, desc: "Abogada in-house de DURAGAS" },
    { email: "fiorella.rendon@montblanc.com.ec", password: "externo1", name: "Fiorella Rendon", role: "invitado" as ProfileRole, desc: "Abogada externa, estudio Montblanc" }
  ];

  const handlePresetSelect = (account: typeof presetAccounts[0]) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Por favor ingrese su correo electrónico");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (data.success) {
        if (!data.profile.activo) {
          setErrorMsg("Su cuenta de Oficial de LexControl se encuentra inactiva o con enlace de confirmación de correo pendiente.");
        } else {
          onLoginSuccess(data.profile);
        }
      } else {
        setErrorMsg("Credenciales o correo de firma digital inválido.");
      }
    } catch (error) {
      console.error("Auth error", error);
      setErrorMsg("Ocurrió un error de red. Verifique que el servidor de LexControl esté activo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNombre.trim() || !regEmail.trim() || !regPassword.trim() || !regCode.trim()) {
      setErrorMsg("Todos los campos con asterisco (*) son requeridos.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const resp = await fetch("/api/auth/register-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: regNombre.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword.trim(),
          code: regCode.trim(),
          rol: regRol
        })
      });

      const data = await resp.json();
      if (data.success) {
        setRegSuccessData({
          confirm_link: data.confirm_link,
          email: data.email,
          nombre: data.nombre,
          role: data.role
        });
        setView("awaiting_confirm");
      } else {
        setErrorMsg(data.error || "Código incorrecto o error al registrar.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de red al procesar el auto-registro.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetEmail.trim() || !meetDates.trim() || !meetHours.trim()) {
      setErrorMsg("Correo, fechas y horarios son campos requeridos.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const resp = await fetch("/api/auth/schedule-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: meetEmail.trim().toLowerCase(),
          dates: meetDates.trim(),
          hours: meetHours.trim(),
          corpName: meetCorpName.trim(),
          details: meetDetails.trim()
        })
      });

      const data = await resp.json();
      if (data.success) {
        setScheduleSuccess(true);
      } else {
        setErrorMsg(data.error || "Ocurrió un error al procesar su solicitud.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de red al agendar la reunión de inducción.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulatedConfirm = async () => {
    if (!regSuccessData) return;
    setSubmitting(true);
    try {
      // Simulate confirmation with a backend call
      const resp = await fetch(regSuccessData.confirm_link);
      if (resp.ok) {
        // Log them in immediately to complete the flow seamlessly!
        alert("¡Éxito! Su correo se ha confirmado y su firma digital ha quedado indexada de forma segura.");
        onLoginSuccess({
          email: regSuccessData.email,
          nombre: regSuccessData.nombre,
          rol: regSuccessData.role as ProfileRole,
          activo: true
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al confirmar el correo de auto-registro.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 py-12 md:py-24 relative" style={{ minHeight: "100vh" }}>
      <div className="w-full max-w-lg bg-paper border border-borderSoft rounded-2xl shadow-card p-6 md:p-10 text-charcoal">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-charcoal text-cream flex items-center justify-center mb-3 shadow-sm relative group">
            <ScaleWithN className="text-cream" size={32} />
          </div>
          <h1 className="text-3xl font-serif font-medium tracking-tight text-charcoal">
            LexControl <span className="text-sidebarRose font-light">AI</span>
          </h1>
          <p className="text-charcoalSoft font-sans text-[13px] mt-1.5 max-w-xs mx-auto">
            Garantía legal y control normativo empresarial en el Ecuador.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-dangerSoft text-danger text-xs p-3.5 rounded-xl border border-danger/20 font-sans mb-4">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* --------------------- PRE-SET LOGIN SCREEN --------------------- */}
        {view === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-charcoalMuted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@empresa.com"
                  className="w-full bg-cream border border-borderSoft rounded-xl pl-10 pr-4 py-3 text-xs text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:border-charcoal focus:ring-1 focus:ring-charcoal transition-colors font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-2">
                Firma Digital o Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-charcoalMuted" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-cream border border-borderSoft rounded-xl pl-10 pr-4 py-3 text-xs text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:border-charcoal focus:ring-1 focus:ring-charcoal transition-colors font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-charcoal text-cream font-medium rounded-xl text-xs hover:bg-[#2A2A2A] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm font-sans"
            >
              {submitting ? "Accediendo..." : "Ingresar con Firma Digital"}
            </button>

            <div className="border-t border-borderSoft/40 my-2 pt-4 text-center">
              <p className="text-xs text-charcoalSoft font-sans">
                ¿Posee un código de empresa o invitación?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setView("register");
                    setErrorMsg("");
                  }}
                  className="text-sidebarRose font-bold hover:underline cursor-pointer"
                >
                  Regístrese aquí
                </button>
              </p>
              <p className="text-[11px] text-charcoalMuted font-sans mt-2">
                ¿No dispone de código de acceso?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setView("schedule_meeting");
                    setErrorMsg("");
                    setScheduleSuccess(false);
                    setMeetEmail("");
                    setMeetDates("Próximo lunes o martes");
                    setMeetHours("09:00 - 11:30 ECT");
                    setMeetCorpName("");
                    setMeetDetails("");
                  }}
                  className="text-charcoal font-bold hover:underline cursor-pointer text-sidebarRose"
                >
                  Agendar Inducción con Super Admin
                </button>
              </p>
            </div>

            {/* Authorized access shortcuts */}
            <div className="bg-[#FAF8F5] border border-borderSoft/60 p-3 rounded-xl mt-4">
              <span className="block text-[9px] font-extrabold tracking-widest text-[#B5A18C] uppercase mb-2">
                Ingresos autorizados:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetAccounts.map((ac) => (
                  <button
                    key={ac.email}
                    type="button"
                    onClick={() => handlePresetSelect(ac)}
                    className="px-2.5 py-1 bg-white border border-borderSoft/40 hover:border-sidebarRose hover:bg-roseSoft/10 rounded-lg text-[10px] font-medium text-charcoalSoft transition-all flex flex-col items-start cursor-pointer text-left"
                  >
                    <span className="font-bold">{ac.name}</span>
                    <span className="text-[8px] text-charcoalMuted font-mono leading-none mt-0.5">{ac.role.replace("_", " ")}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* --------------------- REGISTRATION SIGN UP SCREEN --------------------- */}
        {view === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="flex items-center gap-1 text-sidebarRose font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Auto-registro con Firma Electrónica Obligatoria</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-1">
                Nombre Completo *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-charcoalMuted" />
                <input
                  type="text"
                  required
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  placeholder="Ej. Fiorella Rendon"
                  className="w-full bg-cream border border-borderSoft rounded-xl pl-10 pr-4 py-2.5 text-xs text-charcoal focus:outline-none focus:border-charcoal transition-colors font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-1">
                Correo Institucional / Personal *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-charcoalMuted" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ej: fiorella.rendon@montblanc.com.ec"
                  className="w-full bg-cream border border-borderSoft rounded-xl pl-10 pr-4 py-2.5 text-xs text-charcoal focus:outline-none focus:border-charcoal transition-colors font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-1">
                  Código de Registro * (Empresa o Invitado)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-4 h-4 text-charcoalMuted" />
                  <input
                    type="text"
                    required
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                    placeholder="Ej. LX-EMPRESA-2026 o INV-EXT-8832"
                    className="w-full bg-cream border border-borderSoft rounded-xl pl-9 pr-2 py-2 text-xs text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:border-[#8E222F] font-mono"
                  />
                </div>
                <span className="text-[9px] text-[#A8A29E] leading-relaxed block mt-0.5">
                  Ingrese el código generado por su Super Admin o Administrador.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-1">
                  Rol Solicitado (Si es Código Empresa)
                </label>
                <select
                  value={regRol}
                  onChange={(e) => setRegRol(e.target.value as ProfileRole)}
                  className="w-full bg-cream border border-borderSoft rounded-xl px-3 py-2 text-xs text-charcoal font-semibold h-[38px] focus:outline-none focus:border-charcoal"
                >
                  <option value="admin">💼 Administrador de Empresa</option>
                  <option value="user">👩‍💼 In-House / Abogado Interno</option>
                  <option value="invitado">🎓 Externo / Estudio Asesor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-1">
                Contraseña Legal Segura *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-charcoalMuted" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Establezca su contraseña de firma"
                  className="w-full bg-cream border border-borderSoft rounded-xl pl-10 pr-4 py-2.5 text-xs text-charcoal focus:outline-none focus:border-charcoal transition-colors font-sans"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setErrorMsg("");
                }}
                className="w-1/3 py-2.5 px-3 bg-cream hover:bg-paperDark text-charcoal border border-borderSoft rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Volver
              </button>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-2/3 py-2.5 px-4 bg-[#8E222F] hover:bg-[#731D28] text-cream font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                {submitting ? "Procesando código..." : "Registrar Oficial ✓"}
              </button>
            </div>
          </form>
        )}

        {/* --------------------- AWAITING EMAIL CONFIRMATION LINK SIMULATION --------------------- */}
        {view === "awaiting_confirm" && regSuccessData && (
          <div className="space-y-5 text-center font-sans py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-roseSoft/10 text-sidebarRose flex items-center justify-center font-bold text-3xl">
              ✉
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-serif font-bold text-charcoal">Enlace de Confirmación Enviado</h2>
              <p className="text-xs text-charcoalSoft leading-relaxed px-2">
                Se ha generado un token de confirmación de correo para proteger su identidad y encriptación de firma digital de oficial en:
              </p>
              <strong className="block text-sm text-[#8D2531] font-mono bg-cream py-1 px-3 border border-borderSoft/50 rounded-lg mx-6 mt-1">{regSuccessData.email}</strong>
            </div>

            <div className="bg-[#FAF8F5] border border-borderSoft/80 p-4 rounded-xl space-y-3 text-left">
              <span className="block text-[10px] font-extrabold tracking-wider text-charcoalMuted uppercase">
                Simulación del Servidor de Correo (Sandbox virtual):
              </span>
              <p className="text-[11px] text-charcoalSoft font-sans leading-relaxed">
                Por motivos de depuración y testing en el contenedor, puede hacer clic en el botón a continuación para simular la confirmación automática e instantánea del correo.
              </p>
              <button
                type="button"
                onClick={handleSimulatedConfirm}
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-[#1E1E1E] hover:bg-charcoalSoft text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Simular Clic en Correo de Confirmación
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setView("login");
                setRegSuccessData(null);
                setErrorMsg("");
              }}
              className="text-xs text-charcoalSoft hover:underline hover:text-charcoal cursor-pointer font-bold block mx-auto pt-2"
            >
              ← Regresar al Inicio de Sesión
            </button>
          </div>
        )}

        {/* --------------------- SCHEDULE INDUCTION MEETING VIEW --------------------- */}
        {view === "schedule_meeting" && (
          <div className="space-y-4 font-sans text-xs">
            {scheduleSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="mx-auto w-14 h-14 bg-emerald-100 rounded-full text-emerald-800 flex items-center justify-center font-bold text-2xl">
                  ✓
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-serif font-bold text-charcoal">Reunión de Inducción Solicitada</h3>
                  <p className="text-charcoalSoft leading-relaxed px-4 text-[13px]">
                    Tu solicitud ha sido catalogada y agendada correctamente. Nos pondremos en contacto contigo en las próximas 24 horas laborables para formalizar el enlace de Zoom o Teams.
                  </p>
                </div>

                <div className="bg-[#FAF8F5] border border-borderSoft/60 p-4 rounded-xl text-left space-y-2">
                  <span className="block text-[9px] uppercase tracking-wider font-extrabold text-[#B5A18C]">
                    Detalles del Registro Sincronizado:
                  </span>
                  <div className="text-[11px] space-y-1 text-charcoalSoft font-mono">
                    <p><strong>Correo Contacto:</strong> {meetEmail}</p>
                    <p><strong>Corporativo:</strong> {meetCorpName || "No especificada"}</p>
                    <p><strong>Fechas propuestas:</strong> {meetDates}</p>
                    <p><strong>Horas propuestas:</strong> {meetHours}</p>
                  </div>
                  <div className="border-t border-borderSoft/40 pt-2 mt-2">
                    <p className="text-[10px] text-emerald-700 italic">
                      ✉ Se ha enviado un correo electrónico de confirmación automática a {meetEmail}.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setErrorMsg("");
                  }}
                  className="px-4 py-2.5 bg-charcoal hover:bg-black text-cream font-bold rounded-xl transition-all cursor-pointer font-sans text-xs"
                >
                  Volver al Inicio de Sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div className="flex items-center gap-1.5 text-[#8E222F] font-bold">
                  <span className="p-1 px-1.5 bg-roseSoft text-[#8E222F] rounded-md text-[10px] uppercase font-mono">Inducción</span>
                  <span className="text-xs">Solicitud de Acceso y Licencia Digital</span>
                </div>

                <p className="text-charcoalSoft leading-relaxed text-[12px]">
                  Si tu corporativo no cuenta aún con un Código Único de Registro, puedes agendar una sesión de inducción personalizada con un Super Administrador para dar de alta tu empresa.
                </p>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-1">
                    Correo de Contacto Oficial *
                  </label>
                  <input
                    type="email"
                    required
                    value={meetEmail}
                    onChange={(e) => setMeetEmail(e.target.value)}
                    placeholder="ejemplo@corporativo.com"
                    className="w-full bg-cream border border-borderSoft rounded-xl px-3 py-2.5 text-xs text-charcoal focus:outline-none focus:border-charcoal transition-colors font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-1">
                    Nombre del Corporativo / Empresa
                  </label>
                  <input
                    type="text"
                    value={meetCorpName}
                    onChange={(e) => setMeetCorpName(e.target.value)}
                    placeholder="Ej. compañía industrial, holding o corporativo"
                    className="w-full bg-cream border border-borderSoft rounded-xl px-3 py-2.5 text-xs text-charcoal focus:outline-none focus:border-charcoal transition-colors font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-1">
                      Fechas Tentativas *
                    </label>
                    <input
                      type="text"
                      required
                      value={meetDates}
                      onChange={(e) => setMeetDates(e.target.value)}
                      placeholder="Ej. Lunes 1 de Junio"
                      className="w-full bg-cream border border-borderSoft rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-charcoal transition-colors font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-1">
                      Horarios Tentativos *
                    </label>
                    <input
                      type="text"
                      required
                      value={meetHours}
                      onChange={(e) => setMeetHours(e.target.value)}
                      placeholder="Ej. 10:00 - 12:00 ECT"
                      className="w-full bg-cream border border-borderSoft rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-charcoal transition-colors font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider uppercase text-charcoalMuted mb-1">
                    Información Requerida o Comentarios Extra
                  </label>
                  <textarea
                    value={meetDetails}
                    onChange={(e) => setMeetDetails(e.target.value)}
                    placeholder="Escríbenos si requieres aclaraciones sobre normativas aplicables o consultoría previa..."
                    rows={2}
                    className="w-full bg-cream border border-borderSoft rounded-xl p-3 text-xs text-charcoal focus:outline-none focus:border-charcoal transition-colors font-sans resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setErrorMsg("");
                    }}
                    className="w-1/3 py-2.5 px-3 bg-cream hover:bg-paperDark text-charcoal border border-borderSoft rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver
                  </button>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-2/3 py-2.5 px-4 bg-[#8E222F] hover:bg-[#731D28] text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {submitting ? "Agendando..." : "Solicitar Reunión ✓"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
      
      {/* Subtle attribution watermark */}
      <span className="mt-4 text-[9px] font-mono select-none pointer-events-none opacity-[0.25] text-charcoalSoft tracking-widest uppercase">
        Powered by OJEDISTECH
      </span>
    </div>
  );
}
