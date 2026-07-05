// app/tickets/[id]/TicketDetailClient.tsx — Vista Kinetic Lab completa
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { agregarComentario } from "../actions";
import Image from "next/image";

type Prioridad = "alta" | "media" | "baja";

interface Comentario {
  id: string;
  contenido: string;
  createdAt: Date;
  usuario: { nombre: string; rol: string };
}

interface TicketFull {
  id: string;
  tipo: string;
  categoria: string;
  estado: string;
  descripcion: string;
  fotoUrl?: string | null;
  fechaCreacion: Date;
  fechaCierre?: Date | null;
  fechaLimite?: Date | null;
  comentarioCierre?: string | null;
  softwareTexto?: string | null;
  tecnicoAsignadoId?: string | null;
  equipo: { codigoInventario: string; laboratorio?: { nombre?: string; ubicacion?: string } | null };
  usuarioReporta: { nombre: string };
  tecnicoAsignado?: { nombre: string } | null;
  comentarios: Comentario[];
}

interface Props {
  ticket: TicketFull;
  prioridad: Prioridad;
  atrasado: boolean;
  ticketsResueltos: { id: string; tipo: string; categoria: string; fechaCreacion: Date }[];
  rol: string;
  currentUserId: string;
}

const prioridadMeta = {
  alta:  { label: "HIGH",   cls: "bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/30" },
  media: { label: "MEDIUM", cls: "bg-[#e7c365]/15 text-[#e7c365] border-[#e7c365]/30" },
  baja:  { label: "LOW",    cls: "bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/30" },
};

const estadoMeta: Record<string, { label: string; cls: string; dot: string }> = {
  pendiente: { label: "OPEN",        cls: "bg-[#e7c365]/15 text-[#e7c365] border-[#e7c365]/30", dot: "#e7c365" },
  en_proceso:{ label: "IN PROGRESS", cls: "bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/30", dot: "#4edea3" },
  resuelto:  { label: "RESOLVED",    cls: "bg-[#cfbcff]/15 text-[#cfbcff] border-[#cfbcff]/30", dot: "#cfbcff" },
};

const categoriaLabel: Record<string, string> = {
  hardware: "Hardware Fault",
  software_general: "Software",
  software_licencia: "SW License",
  red: "Network Drop",
};

const rolLabel: Record<string, string> = {
  admin: "SysAdmin", tecnico: "Technician", docente: "Faculty", estudiante: "Student",
};

function ElapsedTimer({ from }: { from: Date }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(from).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [from]);
  return <span>{elapsed}</span>;
}

export default function TicketDetailClient({
  ticket, prioridad, atrasado, rol,
}: Props) {
  const router = useRouter();
  const logRef = useRef<HTMLDivElement>(null);

  const [comentario, setComentario] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const puedeComentrar = ticket.estado !== "resuelto";
  const estado = estadoMeta[ticket.estado] ?? estadoMeta["pendiente"];
  const prio = prioridadMeta[prioridad];

  // scroll al fondo del log cuando cargan comentarios
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [ticket.comentarios.length]);

  const handleComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await agregarComentario({ ticketId: ticket.id, contenido: comentario });
      if (res.success) {
        setComentario("");
        router.refresh();
      } else {
        setErrorMsg(res.error);
      }
    } catch {
      setErrorMsg("Error al enviar el comentario.");
    } finally {
      setLoading(false);
    }
  };

  const shortId = `TKT-${ticket.id.slice(-4).toUpperCase()}`;

  // Timeline steps
  const timelineSteps = [
    {
      icon: "add_task",
      label: "Ticket creado",
      sub: `por ${ticket.usuarioReporta.nombre}`,
      date: ticket.fechaCreacion,
      done: true,
      active: false,
    },
    {
      icon: "person_add",
      label: ticket.tecnicoAsignado ? `Asignado a ${ticket.tecnicoAsignado.nombre}` : "Sin asignar",
      sub: ticket.tecnicoAsignado ? "Técnico responsable" : "Esperando asignación",
      date: null,
      done: !!ticket.tecnicoAsignado,
      active: !ticket.tecnicoAsignado && ticket.estado !== "resuelto",
    },
    {
      icon: "sync",
      label: "Diagnóstico en proceso",
      sub: "Atención activa",
      date: null,
      done: ticket.estado === "resuelto",
      active: ticket.estado === "en_proceso",
    },
    {
      icon: "task_alt",
      label: "Ticket resuelto",
      sub: ticket.fechaCierre ? new Date(ticket.fechaCierre).toLocaleString("es-PE") : "Pendiente",
      date: ticket.fechaCierre,
      done: ticket.estado === "resuelto",
      active: false,
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">

      {/* Back button */}
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-xs font-medium mb-6 transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        Volver a Tickets
      </Link>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="mb-8">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider font-mono ${estado.cls}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: estado.dot,
                animation: ticket.estado === "en_proceso" ? "pulse 2s infinite" : "none",
              }}
            />
            {estado.label}
          </span>

          <span
            className={`inline-flex items-center px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider font-mono ${prio.cls}`}
          >
            PRIORITY: {prio.label}
          </span>

          <span
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider font-mono"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)", color: "var(--muted-foreground)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>category</span>
            {categoriaLabel[ticket.categoria] ?? ticket.categoria}
          </span>

          {atrasado && ticket.estado !== "resuelto" && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider"
              style={{ background: "rgba(255,112,112,0.15)", color: "#ff7070", borderColor: "rgba(255,112,112,0.40)" }}>
              ⏰ OVERDUE
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold font-outfit mb-1" style={{ color: "var(--foreground)" }}>
          {shortId}: {ticket.tipo.charAt(0).toUpperCase() + ticket.tipo.slice(1)} de {(categoriaLabel[ticket.categoria] ?? ticket.categoria)}
        </h1>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Laboratorio {(ticket.equipo as { laboratorio?: { nombre?: string } | null }).laboratorio?.nombre ?? "—"} · Equipo {ticket.equipo.codigoInventario}
        </p>
      </header>

      {/* ── Main grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left column — details */}
        <div className="lg:col-span-8 space-y-6">

          {/* Meta bento */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "EQUIPO ID",      value: ticket.equipo.codigoInventario, mono: true },
              { label: "REPORTADO POR",  value: ticket.usuarioReporta.nombre,   mono: false },
              { label: "CREADO",         value: new Date(ticket.fechaCreacion).toLocaleDateString("es-PE", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }), mono: true },
              { label: "TIEMPO TRANSCURRIDO",
                value: ticket.estado !== "resuelto"
                  ? <ElapsedTimer from={ticket.fechaCreacion} />
                  : ticket.fechaCierre
                    ? `Cerrado: ${new Date(ticket.fechaCierre).toLocaleDateString("es-PE")}`
                    : "—",
                mono: true },
            ].map(({ label, value, mono }) => (
              <div
                key={label}
                className="rounded-xl p-4 transition-colors"
                style={{
                  background: "rgba(16,32,52,0.9)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span className="font-mono block mb-1 text-[9px] font-bold tracking-widest uppercase" style={{ color: "var(--muted-foreground)" }}>
                  {label}
                </span>
                <span className={`${mono ? "font-mono" : ""} text-sm font-semibold`} style={{ color: mono ? "#cfbcff" : "var(--foreground)" }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Description card */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(9,9,11,0.7)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)" }}
          >
            <div className="p-6 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <h2 className="font-outfit font-semibold text-lg flex items-center gap-2 mb-4" style={{ color: "var(--foreground)" }}>
                <span className="material-symbols-outlined text-base" style={{ color: "#cfbcff" }}>description</span>
                Reporte de incidencia
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>
                {ticket.descripcion}
              </p>
              {ticket.softwareTexto && (
                <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(207,188,255,0.06)", border: "1px solid rgba(207,188,255,0.15)" }}>
                  <span className="material-symbols-outlined text-sm" style={{ color: "#cfbcff" }}>apps</span>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    Software solicitado: <span className="font-semibold" style={{ color: "var(--foreground)" }}>{ticket.softwareTexto}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Photo */}
            {ticket.fotoUrl && (
              <div className="p-6" style={{ background: "rgba(0,0,0,0.25)" }}>
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--muted-foreground)" }}>
                  DIAGNÓSTICO FOTOGRÁFICO
                </p>
                <div className="relative rounded-lg overflow-hidden border h-56 group cursor-pointer" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
                  <Image src={ticket.fotoUrl} alt="Foto del problema" fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-300" loading="lazy" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
                    <span className="px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2"
                      style={{ background: "rgba(255,255,255,0.12)", color: "var(--foreground)" }}>
                      <span className="material-symbols-outlined text-sm">zoom_in</span>
                      Ampliar imagen
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Closing comment */}
            {ticket.comentarioCierre && (
              <div className="mx-6 mb-6 p-4 rounded-xl" style={{ background: "rgba(78,222,163,0.06)", border: "1px solid rgba(78,222,163,0.20)" }}>
                <p className="font-mono text-[9px] font-bold tracking-widest mb-2" style={{ color: "#4edea3" }}>
                  COMENTARIO DE CIERRE
                </p>
                <p className="text-sm" style={{ color: "var(--foreground)" }}>{ticket.comentarioCierre}</p>
              </div>
            )}
          </div>

          {/* Technician assigned */}
          {ticket.tecnicoAsignado && (
            <div className="rounded-xl p-4 flex items-center gap-4"
              style={{ background: "rgba(207,188,255,0.05)", border: "1px solid rgba(207,188,255,0.15)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: "rgba(207,188,255,0.15)", color: "#cfbcff", border: "1px solid rgba(207,188,255,0.30)" }}>
                {ticket.tecnicoAsignado.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold tracking-widest mb-0.5" style={{ color: "var(--muted-foreground)" }}>TÉCNICO ASIGNADO</p>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{ticket.tecnicoAsignado.nombre}</p>
              </div>
              <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold font-mono"
                style={{ background: "rgba(78,222,163,0.12)", color: "#4edea3", border: "1px solid rgba(78,222,163,0.25)" }}>
                {rolLabel["tecnico"]}
              </span>
            </div>
          )}
        </div>

        {/* Right column — timeline + log */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">

          {/* Timeline */}
          <div className="rounded-xl p-5" style={{ background: "rgba(9,9,11,0.7)", border: "2px solid rgba(207,188,255,0.20)", borderTopColor: "#cfbcff", backdropFilter: "blur(24px)" }}>
            <h2 className="font-mono text-[10px] font-bold tracking-widest uppercase mb-5 flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>history</span>
              RESOLUTION TIMELINE
            </h2>

            <div className="space-y-6 relative">
              {/* vertical line */}
              <div className="absolute left-[15px] top-6 bottom-0 w-0.5" style={{ background: "linear-gradient(to bottom, rgba(207,188,255,0.25), transparent)" }} />

              {timelineSteps.map((step, i) => (
                <div key={i} className="relative flex gap-4 z-10 group">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: step.done
                        ? "rgba(78,222,163,0.15)"
                        : step.active
                          ? "rgba(78,222,163,0.15)"
                          : "rgba(38,54,74,0.8)",
                      border: step.done
                        ? "1px solid rgba(78,222,163,0.5)"
                        : step.active
                          ? "1px solid #4edea3"
                          : "1px dashed rgba(148,142,156,0.4)",
                      color: step.done || step.active ? "#4edea3" : "var(--muted-foreground)",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 14,
                        animation: step.active && step.icon === "sync" ? "spin 1.5s linear infinite" : "none",
                      }}
                    >
                      {step.done && !step.active ? "check" : step.icon}
                    </span>
                  </div>
                  <div className="pt-1">
                    <p className="text-xs font-medium" style={{ color: step.active ? "#4edea3" : step.done ? "var(--foreground)" : "var(--muted-foreground)" }}>
                      {step.label}
                    </p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {step.date ? new Date(step.date).toLocaleDateString("es-PE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : step.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment log (visible solo para técnicos y administradores) */}
          {(rol === "tecnico" || rol === "admin") && (
            <div
              className="rounded-xl flex flex-col overflow-hidden"
              style={{ background: "rgba(9,9,11,0.7)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", minHeight: 320 }}
            >
              <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
                <span className="material-symbols-outlined text-sm" style={{ color: "var(--muted-foreground)", fontSize: 15 }}>forum</span>
                <h2 className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--muted-foreground)" }}>
                  OPERATOR LOG
                </h2>
                {ticket.comentarios.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full font-mono text-[10px] font-bold"
                    style={{ background: "rgba(207,188,255,0.12)", color: "#cfbcff" }}>
                    {ticket.comentarios.length}
                  </span>
                )}
              </div>

              {/* Messages */}
              <div
                ref={logRef}
                className="flex-1 p-4 overflow-y-auto space-y-4"
                style={{ maxHeight: 280, scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}
              >
                {ticket.comentarios.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 gap-2" style={{ color: "var(--muted-foreground)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28, opacity: 0.3 }}>chat_bubble_outline</span>
                    <p className="text-xs">Sin entradas aún.</p>
                  </div>
                ) : (
                  ticket.comentarios.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: "rgba(103,80,164,0.20)", color: "#cfbcff", border: "1px solid rgba(207,188,255,0.20)" }}
                      >
                        {c.usuario.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div
                        className="flex-1 rounded-r-xl rounded-bl-xl p-3"
                        style={{ background: "rgba(38,54,74,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <div className="flex justify-between items-center mb-1 gap-3">
                          <span className="text-[11px] font-semibold font-mono" style={{ color: "#cfbcff" }}>{c.usuario.nombre}</span>
                          <span className="font-mono text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                            {new Date(c.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{c.contenido}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              {puedeComentrar ? (
                <form
                  onSubmit={handleComentario}
                  className="p-4 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}
                >
                  {errorMsg && (
                    <div className="mb-2 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(255,112,112,0.10)", color: "#ff7070", border: "1px solid rgba(255,112,112,0.20)" }}>
                      {errorMsg}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(103,80,164,0.15)", border: "1px solid rgba(207,188,255,0.30)", color: "#cfbcff" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>person</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        rows={2}
                        placeholder="Agrega una entrada al log..."
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        required
                        className="w-full resize-none rounded-lg p-2 text-xs outline-none transition-all"
                        style={{
                          background: "rgba(38,54,74,0.4)",
                          border: "1px solid rgba(73,69,81,0.6)",
                          color: "var(--foreground)",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#cfbcff")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(73,69,81,0.6)")}
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={loading || !comentario.trim()}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all"
                          style={{
                            background: "rgba(38,54,74,0.8)",
                            color: loading ? "var(--muted-foreground)" : "var(--foreground)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            opacity: !comentario.trim() ? 0.5 : 1,
                            cursor: !comentario.trim() ? "not-allowed" : "pointer",
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>send</span>
                          {loading ? "Enviando…" : "Post"}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-4 text-center border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
                  <span className="font-mono text-[10px] flex items-center justify-center gap-2" style={{ color: "#4edea3" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
                    CASE CLOSED
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
      `}</style>
    </div>
  );
}
