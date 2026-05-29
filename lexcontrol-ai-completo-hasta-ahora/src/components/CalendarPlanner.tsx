import React, { useEffect, useMemo, useState } from "react";
import { CalendarioEvento, Empresa, ProcesoJudicial, UserProfile } from "../types";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Gavel,
  LayoutGrid,
  ListChecks,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X
} from "lucide-react";

interface CalendarPlannerProps {
  selectedEmpresa: Empresa;
  currentProfile: UserProfile;
}

type VistaCalendario = "planner" | "mes" | "agenda";
type PlannerScope = "mine" | "team";
type EventoTipo = CalendarioEvento["tipo"];
type EventoVisibilidad = CalendarioEvento["visibilidad"];

const ECUADOR_HOLIDAYS = new Set(["2026-01-01", "2026-05-01", "2026-05-24", "2026-08-10", "2026-10-09", "2026-11-02", "2026-11-03", "2026-12-25"]);
const TIPO_LABELS: Record<EventoTipo, string> = {
  audiencia: "Audiencia",
  plazo: "Plazo",
  vencimiento_matriz: "Matriz",
  reunion: "Reunión",
  manual: "Manual"
};

const TIPO_CLASSES: Record<EventoTipo, string> = {
  audiencia: "bg-info/10 text-info border-info/20",
  plazo: "bg-warningSoft text-warning border-warning/20",
  vencimiento_matriz: "bg-roseSoft text-sidebarRose border-sidebarRose/20",
  reunion: "bg-successSoft text-success border-success/20",
  manual: "bg-charcoal/5 text-charcoalMuted border-borderSoft"
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoDay(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDate(date: string | Date, withWeekday = false) {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("es-EC", {
    weekday: withWeekday ? "short" : undefined,
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function daysUntil(date: string) {
  return Math.ceil((startOfDay(new Date(date)).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
}

function urgencyClass(event: CalendarioEvento) {
  if (event.cumplido) return "border-success";
  const days = daysUntil(event.fecha_inicio);
  if (days < 0) return "border-danger";
  if (days <= 3) return "border-danger";
  if (days <= 7) return "border-warning";
  return "border-success";
}

function initials(value: string) {
  const name = value.includes("@") ? value.split("@")[0] : value;
  return name
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function eventIcon(tipo: EventoTipo) {
  if (tipo === "audiencia") return <Gavel className="w-4 h-4" />;
  if (tipo === "plazo") return <Clock className="w-4 h-4" />;
  if (tipo === "vencimiento_matriz") return <ShieldCheck className="w-4 h-4" />;
  if (tipo === "reunion") return <Users className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

export default function CalendarPlanner({ selectedEmpresa, currentProfile }: CalendarPlannerProps) {
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [procesos, setProcesos] = useState<ProcesoJudicial[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [vista, setVista] = useState<VistaCalendario>("planner");
  const [scope, setScope] = useState<PlannerScope>("mine");
  const [showFilters, setShowFilters] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarioEvento | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedTypes, setSelectedTypes] = useState<EventoTipo[]>(["audiencia", "plazo", "vencimiento_matriz", "reunion", "manual"]);
  const [processFilter, setProcessFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"todos" | EventoVisibilidad>("todos");
  const [participantFilter, setParticipantFilter] = useState("");
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    fecha_inicio: toDateInputValue(new Date()),
    fecha_fin: "",
    todo_el_dia: false,
    tipo: "manual" as EventoTipo,
    visibilidad: "solo_yo" as EventoVisibilidad,
    proceso_id: "",
    participantes: [currentProfile.email],
    recordatorio_minutos: [1440, 60]
  });

  const canSeeTeam = currentProfile.rol === "admin" || currentProfile.rol === "super_admin";

  useEffect(() => {
    setScope(canSeeTeam ? scope : "mine");
  }, [canSeeTeam, scope]);

  useEffect(() => {
    fetchAuxiliaryData();
  }, [selectedEmpresa.id]);

  useEffect(() => {
    fetchEvents();
  }, [selectedEmpresa.id, scope, selectedTypes, processFilter, visibilityFilter, participantFilter]);

  const fetchAuxiliaryData = async () => {
    const [procesosRes, profilesRes] = await Promise.all([
      fetch(`/api/procesos?negocio_id=${selectedEmpresa.id}`),
      fetch("/api/profiles")
    ]);
    if (procesosRes.ok) setProcesos(await procesosRes.json());
    if (profilesRes.ok) setProfiles(await profilesRes.json());
  };

  const fetchEvents = async () => {
    const params = new URLSearchParams({
      negocio_id: selectedEmpresa.id,
      email: currentProfile.email,
      scope,
      tipo: selectedTypes.join(","),
      visibilidad: visibilityFilter
    });
    if (processFilter) params.set("proceso_id", processFilter);
    if (participantFilter) params.set("participante", participantFilter);
    const res = await fetch(`/api/eventos?${params.toString()}`);
    if (res.ok) setEventos(await res.json());
  };

  const filteredParticipants = profiles.filter((profile) => {
    if (profile.rol === "super_admin") return currentProfile.rol === "super_admin";
    return !profile.empresa_id || profile.empresa_id === selectedEmpresa.id;
  });

  const toggleType = (tipo: EventoTipo) => {
    setSelectedTypes((prev) => prev.includes(tipo) ? prev.filter((item) => item !== tipo) : [...prev, tipo]);
  };

  const toggleParticipant = (email: string) => {
    setForm((prev) => ({
      ...prev,
      participantes: prev.participantes.includes(email)
        ? prev.participantes.filter((item) => item !== email)
        : [...prev.participantes, email]
    }));
  };

  const handleProcessSelection = (processId: string) => {
    const process = procesos.find((item) => item.id === processId);
    const automaticParticipants = process
      ? [process.abogado_a_cargo_email, (process as ProcesoJudicial & { abogado_externo_email?: string }).abogado_externo_email].filter(Boolean) as string[]
      : [];
    setForm((prev) => ({
      ...prev,
      proceso_id: processId,
      participantes: prev.visibilidad === "compartido" ? Array.from(new Set([...prev.participantes, ...automaticParticipants])) : prev.participantes
    }));
  };

  const createEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        negocio_id: selectedEmpresa.id,
        ...form,
        created_by: currentProfile.email,
        creado_por_nombre: currentProfile.nombre,
        creado_por_rol: currentProfile.rol,
        fecha_fin: form.fecha_fin || form.fecha_inicio
      })
    });
    if (res.ok) {
      setShowCreate(false);
      setForm((prev) => ({ ...prev, titulo: "", descripcion: "", fecha_inicio: toDateInputValue(new Date()), fecha_fin: "", proceso_id: "" }));
      fetchEvents();
    }
  };

  const toggleCompleted = async (eventId: string) => {
    const res = await fetch(`/api/eventos/${eventId}/cumplir`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setSelectedEvent(data.event);
      fetchEvents();
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm("¿Eliminar este evento del calendario?")) return;
    const res = await fetch(`/api/eventos/${eventId}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedEvent(null);
      fetchEvents();
    }
  };

  const sortedEvents = useMemo(() => [...eventos].sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()), [eventos]);
  const today = startOfDay(new Date());
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - (today.getDay() || 7)));
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  const plannerGroups = useMemo(() => {
    const hoy: CalendarioEvento[] = [];
    const semana: CalendarioEvento[] = [];
    const mes: CalendarioEvento[] = [];
    sortedEvents.forEach((event) => {
      const eventDate = startOfDay(new Date(event.fecha_inicio));
      if (eventDate.getTime() === today.getTime()) hoy.push(event);
      else if (eventDate > today && eventDate <= endOfWeek) semana.push(event);
      else if (eventDate > endOfWeek && eventDate <= in30Days) mes.push(event);
    });
    return { hoy, semana, mes };
  }, [sortedEvents]);

  const monthDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [monthCursor]);

  const resetFilters = () => {
    setSelectedTypes(["audiencia", "plazo", "vencimiento_matriz", "reunion", "manual"]);
    setProcessFilter("");
    setVisibilityFilter("todos");
    setParticipantFilter("");
  };

  const EventAvatars = ({ participants }: { participants: string[] }) => {
    const visible = participants.slice(0, 4);
    const remaining = participants.length - visible.length;
    return (
      <div className="flex -space-x-1.5">
        {visible.map((participant) => (
          <span key={participant} title={participant} className="h-6 w-6 rounded-full bg-roseSoft border border-paper text-[9px] font-bold text-sidebarRose flex items-center justify-center">
            {initials(participant)}
          </span>
        ))}
        {remaining > 0 && <span className="h-6 min-w-6 px-1 rounded-full bg-charcoal text-cream text-[9px] flex items-center justify-center border border-paper">+{remaining}</span>}
      </div>
    );
  };

  const EventCard = ({ event }: { event: CalendarioEvento; key?: React.Key }) => (
    <button
      onClick={() => setSelectedEvent(event)}
      className={`w-full text-left bg-cream border-l-4 ${urgencyClass(event)} border-y border-r border-borderSoft rounded-lg p-3 shadow-sm hover:shadow-card transition-all duration-150 space-y-2`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${TIPO_CLASSES[event.tipo]}`}>
          {eventIcon(event.tipo)}
          {TIPO_LABELS[event.tipo]}
        </span>
        {!event.todo_el_dia && <span className="text-[10px] font-mono text-charcoalMuted">{formatTime(event.fecha_inicio)}</span>}
      </div>
      <h4 className="font-serif font-semibold text-charcoal text-sm leading-tight">{event.titulo}</h4>
      {event.descripcion && <p className="text-[11px] text-charcoalSoft line-clamp-2">{event.descripcion}</p>}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[10px] font-mono text-charcoalMuted">{formatDate(event.fecha_inicio, true)}</span>
        <EventAvatars participants={event.participantes || []} />
      </div>
    </button>
  );

  const EventPill = ({ event }: { event: CalendarioEvento; key?: React.Key }) => (
    <button
      onClick={() => setSelectedEvent(event)}
      className={`w-full truncate rounded border px-1.5 py-0.5 text-[10px] text-left ${TIPO_CLASSES[event.tipo]}`}
      title={event.titulo}
    >
      {!event.todo_el_dia ? `${formatTime(event.fecha_inicio)} ` : ""}{event.titulo}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-borderSoft pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-charcoal">Calendario Legal & Planner</h1>
          <p className="text-sm text-charcoalSoft font-sans">
            Plazos, audiencias, vencimientos de matriz y reuniones de {selectedEmpresa.nombre}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["planner", "mes", "agenda"] as VistaCalendario[]).map((item) => (
            <button
              key={item}
              onClick={() => setVista(item)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors duration-150 ${
                vista === item ? "bg-charcoal text-cream" : "bg-paper border border-borderSoft text-charcoal hover:bg-paperDark"
              }`}
            >
              {item === "planner" ? <ListChecks className="w-4 h-4" /> : item === "mes" ? <LayoutGrid className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
              {item === "planner" ? "Planner" : item === "mes" ? "Mes" : "Agenda"}
            </button>
          ))}
          <button onClick={() => setShowFilters((prev) => !prev)} className="inline-flex items-center gap-1.5 rounded-lg border border-borderSoft bg-paper px-3 py-2 text-xs font-bold hover:bg-paperDark">
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-sidebarRose px-3 py-2 text-xs font-bold text-cream hover:bg-charcoal transition-colors duration-150">
            <PlusCircle className="w-4 h-4" /> Nuevo evento
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setScope("mine")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${scope === "mine" ? "bg-charcoal text-cream" : "border border-borderSoft bg-paper"}`}>Mi planner</button>
        {canSeeTeam && <button onClick={() => setScope("team")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${scope === "team" ? "bg-charcoal text-cream" : "border border-borderSoft bg-paper"}`}>Planner del equipo</button>}
        <button onClick={fetchEvents} className="ml-auto inline-flex items-center gap-1 rounded-full border border-borderSoft bg-paper px-3 py-1.5 text-xs font-bold hover:bg-paperDark">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      <div className={`grid gap-5 ${showFilters ? "lg:grid-cols-[1fr_280px]" : "grid-cols-1"}`}>
        <main className="min-w-0">
          {vista === "planner" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { title: "Hoy", events: plannerGroups.hoy, badge: `${plannerGroups.hoy.length} items` },
                { title: "Esta semana", events: plannerGroups.semana, badge: `${plannerGroups.semana.length} items` },
                { title: "Próximos 30 días", events: plannerGroups.mes, badge: `${plannerGroups.mes.length} items` }
              ].map((group) => (
                <section key={group.title} className="rounded-xl border border-borderSoft bg-paper p-4 shadow-card">
                  <div className="mb-3 flex items-center justify-between border-b border-borderSoft pb-2">
                    <h2 className="font-serif text-lg font-semibold text-charcoal">{group.title}</h2>
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold uppercase text-charcoalMuted">{group.badge}</span>
                  </div>
                  <div className="space-y-2">
                    {group.events.length ? group.events.map((event) => <EventCard key={event.id} event={event} />) : (
                      <div className="rounded-lg border border-dashed border-borderSoft bg-cream/50 p-8 text-center text-xs text-charcoalMuted">Sin eventos en este horizonte.</div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}

          {vista === "mes" && (
            <section className="rounded-xl border border-borderSoft bg-paper p-4 shadow-card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft pb-3">
                <h2 className="font-serif text-xl font-semibold capitalize text-charcoal">
                  {monthCursor.toLocaleDateString("es-EC", { month: "long", year: "numeric" })}
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="rounded-lg border border-borderSoft bg-cream p-2"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setMonthCursor(new Date())} className="rounded-lg border border-borderSoft bg-cream px-3 py-2 text-xs font-bold">Hoy</button>
                  <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="rounded-lg border border-borderSoft bg-cream p-2"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-charcoalMuted">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <div key={day}>{day}</div>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {monthDays.map((day) => {
                  const dayKey = isoDay(day);
                  const dayEvents = sortedEvents.filter((event) => isoDay(new Date(event.fecha_inicio)) === dayKey);
                  const isToday = dayKey === isoDay(new Date());
                  const isCurrentMonth = day.getMonth() === monthCursor.getMonth();
                  const isHoliday = ECUADOR_HOLIDAYS.has(dayKey);
                  const hasOverdue = dayEvents.some((event) => daysUntil(event.fecha_inicio) < 0 && !event.cumplido);
                  return (
                    <div key={dayKey} className={`min-h-[92px] rounded-lg border p-1.5 ${hasOverdue ? "border-danger" : "border-borderSoft"} ${isHoliday ? "bg-paperDark" : "bg-cream"} ${!isCurrentMonth ? "opacity-40" : ""}`}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className={`h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center ${isToday ? "bg-roseSoft text-sidebarRose" : "text-charcoal"}`}>{day.getDate()}</span>
                        {isHoliday && <span className="text-[10px]">EC</span>}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => <EventPill key={event.id} event={event} />)}
                        {dayEvents.length > 3 && <span className="block text-[10px] font-bold text-charcoalMuted">+{dayEvents.length - 3} más</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {vista === "agenda" && (
            <section className="rounded-xl border border-borderSoft bg-paper p-4 shadow-card">
              <h2 className="mb-3 border-b border-borderSoft pb-2 font-serif text-xl font-semibold text-charcoal">Agenda de los próximos 30 días</h2>
              <div className="divide-y divide-borderSoft">
                {sortedEvents.filter((event) => {
                  const diff = daysUntil(event.fecha_inicio);
                  return diff >= 0 && diff <= 30;
                }).map((event) => (
                  <button key={event.id} onClick={() => setSelectedEvent(event)} className="grid w-full grid-cols-1 gap-3 py-3 text-left transition-colors duration-150 hover:bg-cream md:grid-cols-[160px_1fr_120px_130px] md:items-center">
                    <span className="font-mono text-[11px] text-charcoalMuted">{formatDate(event.fecha_inicio, true)} · {event.todo_el_dia ? "Todo el día" : formatTime(event.fecha_inicio)}</span>
                    <span>
                      <strong className="block font-serif text-sm text-charcoal">{event.titulo}</strong>
                      <span className="text-[11px] text-charcoalMuted">{event.descripcion || selectedEmpresa.nombre}</span>
                    </span>
                    <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${TIPO_CLASSES[event.tipo]}`}>{eventIcon(event.tipo)} {TIPO_LABELS[event.tipo]}</span>
                    <EventAvatars participants={event.participantes || []} />
                  </button>
                ))}
                {sortedEvents.length === 0 && <div className="p-8 text-center text-xs text-charcoalMuted">No hay eventos con los filtros actuales.</div>}
              </div>
            </section>
          )}
        </main>

        {showFilters && (
          <aside className="rounded-xl border border-borderSoft bg-paper p-4 shadow-card h-fit">
            <div className="mb-3 flex items-center justify-between border-b border-borderSoft pb-2">
              <h3 className="font-serif text-lg font-semibold text-charcoal">Filtros</h3>
              <button onClick={resetFilters} className="text-[10px] font-bold text-sidebarRose">Limpiar</button>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <div className="mb-2 font-bold uppercase text-charcoalMuted">Por tipo</div>
                <div className="space-y-2">
                  {(Object.keys(TIPO_LABELS) as EventoTipo[]).map((tipo) => (
                    <label key={tipo} className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedTypes.includes(tipo)} onChange={() => toggleType(tipo)} />
                      {TIPO_LABELS[tipo]}
                    </label>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1 block font-bold uppercase text-charcoalMuted">Por proceso</span>
                <select value={processFilter} onChange={(e) => setProcessFilter(e.target.value)} className="w-full rounded-lg border border-borderSoft bg-cream p-2">
                  <option value="">Todos los procesos</option>
                  {procesos.map((process) => <option key={process.id} value={process.id}>{process.titulo}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-bold uppercase text-charcoalMuted">Por visibilidad</span>
                <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value as "todos" | EventoVisibilidad)} className="w-full rounded-lg border border-borderSoft bg-cream p-2">
                  <option value="todos">Todos</option>
                  <option value="solo_yo">Solo yo</option>
                  <option value="interno">Interno</option>
                  <option value="compartido">Compartido</option>
                  <option value="externo">Externo</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-bold uppercase text-charcoalMuted">Por participante</span>
                <select value={participantFilter} onChange={(e) => setParticipantFilter(e.target.value)} className="w-full rounded-lg border border-borderSoft bg-cream p-2">
                  <option value="">Todos</option>
                  {filteredParticipants.map((profile) => <option key={profile.email} value={profile.email}>{profile.nombre}</option>)}
                </select>
              </label>
            </div>
          </aside>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-borderSoft bg-paper p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between border-b border-borderSoft pb-3">
              <h3 className="font-serif text-xl font-semibold text-charcoal">Nuevo evento</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-borderSoft bg-cream p-2"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={createEvent} className="space-y-4 text-xs">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block font-bold uppercase text-charcoalMuted">Título</span>
                  <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="w-full rounded-lg border border-borderSoft bg-cream p-2.5" />
                </label>
                <label className="block">
                  <span className="mb-1 block font-bold uppercase text-charcoalMuted">Tipo</span>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as EventoTipo })} className="w-full rounded-lg border border-borderSoft bg-cream p-2.5">
                    {(Object.keys(TIPO_LABELS) as EventoTipo[]).map((tipo) => <option key={tipo} value={tipo}>{TIPO_LABELS[tipo]}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block font-bold uppercase text-charcoalMuted">Descripción</span>
                <textarea rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full rounded-lg border border-borderSoft bg-cream p-2.5" />
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block font-bold uppercase text-charcoalMuted">Inicio</span>
                  <input type="datetime-local" required value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} className="w-full rounded-lg border border-borderSoft bg-cream p-2.5" />
                </label>
                <label className="block">
                  <span className="mb-1 block font-bold uppercase text-charcoalMuted">Fin</span>
                  <input type="datetime-local" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} className="w-full rounded-lg border border-borderSoft bg-cream p-2.5" />
                </label>
                <label className="mt-5 flex items-center gap-2 rounded-lg border border-borderSoft bg-cream p-2.5">
                  <input type="checkbox" checked={form.todo_el_dia} onChange={(e) => setForm({ ...form, todo_el_dia: e.target.checked })} />
                  Todo el día
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block font-bold uppercase text-charcoalMuted">Vincular a proceso</span>
                  <select value={form.proceso_id} onChange={(e) => handleProcessSelection(e.target.value)} className="w-full rounded-lg border border-borderSoft bg-cream p-2.5">
                    <option value="">Sin proceso vinculado</option>
                    {procesos.map((process) => <option key={process.id} value={process.id}>{process.titulo}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-bold uppercase text-charcoalMuted">Visibilidad</span>
                  <select value={form.visibilidad} onChange={(e) => setForm({ ...form, visibilidad: e.target.value as EventoVisibilidad })} className="w-full rounded-lg border border-borderSoft bg-cream p-2.5">
                    <option value="solo_yo">Solo yo</option>
                    <option value="interno">Interno</option>
                    <option value="compartido">Compartido</option>
                    <option value="externo">Externo</option>
                  </select>
                </label>
              </div>
              <div>
                <span className="mb-2 block font-bold uppercase text-charcoalMuted">Participantes</span>
                <div className="grid gap-2 md:grid-cols-2">
                  {filteredParticipants.map((profile) => (
                    <label key={profile.email} className="flex items-center gap-2 rounded-lg border border-borderSoft bg-cream p-2">
                      <input type="checkbox" checked={form.participantes.includes(profile.email)} onChange={() => toggleParticipant(profile.email)} />
                      <span>{profile.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-2 block font-bold uppercase text-charcoalMuted">Recordatorios</span>
                <div className="flex flex-wrap gap-2">
                  {[1440, 60, 15].map((minutes) => (
                    <label key={minutes} className="flex items-center gap-2 rounded-lg border border-borderSoft bg-cream px-3 py-2">
                      <input
                        type="checkbox"
                        checked={form.recordatorio_minutos.includes(minutes)}
                        onChange={() => setForm((prev) => ({
                          ...prev,
                          recordatorio_minutos: prev.recordatorio_minutos.includes(minutes)
                            ? prev.recordatorio_minutos.filter((item) => item !== minutes)
                            : [...prev.recordatorio_minutos, minutes]
                        }))}
                      />
                      {minutes === 1440 ? "24h antes" : minutes === 60 ? "1h antes" : "15 min antes"}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-borderSoft pt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-borderSoft bg-cream px-4 py-2 font-bold">Cancelar</button>
                <button type="submit" className="rounded-lg bg-charcoal px-4 py-2 font-bold text-cream">Guardar evento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
          <div className="w-full max-w-xl rounded-xl border border-borderSoft bg-paper p-5 shadow-card">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-borderSoft pb-3">
              <div>
                <span className={`mb-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${TIPO_CLASSES[selectedEvent.tipo]}`}>{eventIcon(selectedEvent.tipo)} {TIPO_LABELS[selectedEvent.tipo]}</span>
                <h3 className="font-serif text-xl font-semibold text-charcoal">{selectedEvent.titulo}</h3>
                <p className="text-xs text-charcoalMuted">{formatDate(selectedEvent.fecha_inicio, true)} · {selectedEvent.todo_el_dia ? "Todo el día" : formatTime(selectedEvent.fecha_inicio)}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="rounded-lg border border-borderSoft bg-cream p-2"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4 text-xs">
              {selectedEvent.descripcion && <p className="rounded-lg border border-borderSoft bg-cream p-3 text-charcoalSoft">{selectedEvent.descripcion}</p>}
              <div>
                <div className="mb-2 font-bold uppercase text-charcoalMuted">Participantes</div>
                <div className="flex flex-wrap gap-2">
                  {(selectedEvent.participantes || []).map((participant) => (
                    <span key={participant} className="inline-flex items-center gap-2 rounded-full border border-borderSoft bg-cream px-2 py-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-roseSoft text-[9px] font-bold text-sidebarRose">{initials(participant)}</span>
                      {participant}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 font-bold uppercase text-charcoalMuted">Recordatorios programados</div>
                <div className="flex flex-wrap gap-2">
                  {(selectedEvent.recordatorio_minutos || []).map((minutes) => (
                    <span key={minutes} className="rounded-lg border border-borderSoft bg-cream px-2 py-1 font-mono text-[10px]">
                      {minutes >= 1440 ? `${minutes / 1440} día(s)` : `${minutes} min`} antes
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-borderSoft pt-4">
                <button onClick={() => toggleCompleted(selectedEvent.id)} className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-2 font-bold text-cream"><Check className="w-4 h-4" /> {selectedEvent.cumplido ? "Reabrir" : "Marcar cumplido"}</button>
                <button onClick={() => deleteEvent(selectedEvent.id)} className="inline-flex items-center gap-1 rounded-lg bg-danger px-3 py-2 font-bold text-cream"><Trash2 className="w-4 h-4" /> Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
