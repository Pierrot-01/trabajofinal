// app/tickets/TicketsPanelClient.tsx — Panel interactivo de gestión de tickets
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { asignarTicket, cambiarEstadoTicket } from "./actions";

type Prioridad = "alta" | "media" | "baja";
type Estado = "pendiente" | "en_proceso" | "resuelto";

interface TicketItem {
  id: string;
  tipo: string;
  categoria: string;
  estado: Estado;
  descripcion: string;
  fechaCreacion: Date;
  fechaLimite?: Date | null;
  tecnicoAsignadoId?: string | null;
  equipo: { codigoInventario: string; laboratorioId: string };
  usuarioReporta: { nombre: string };
  prioridad: Prioridad;
  atrasado: boolean;
}

interface Props {
  tickets: TicketItem[];
  nextCursor: string | null;
  rol: string;
  currentUserId: string;
}

const prioridadColor: Record<Prioridad, string> = {
  alta: "bg-red-500/10 text-red-400 border-red-500/20",
  media: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  baja: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const estadoColor: Record<Estado, string> = {
  pendiente: "bg-yellow-500/10 text-yellow-400",
  en_proceso: "bg-blue-500/10 text-blue-400",
  resuelto: "bg-emerald-500/10 text-emerald-400",
};

const estadoLabel: Record<Estado, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
};

export default function TicketsPanelClient({ tickets, nextCursor, rol, currentUserId: _currentUserId }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ id: string; msg: string; tipo: "ok" | "err" } | null>(null);
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);
  const [comentarioCierre, setComentarioCierre] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const esTecnicoOAdmin = rol === "tecnico" || rol === "admin";

  const handleAsignar = async (ticketId: string) => {
    setLoadingId(ticketId);
    const res = await asignarTicket(ticketId);
    if (res.success) {
      setFeedback({ id: ticketId, msg: "Ticket asignado exitosamente.", tipo: "ok" });
      router.refresh();
    } else {
      setFeedback({ id: ticketId, msg: res.error, tipo: "err" });
    }
    setLoadingId(null);
  };

  const handleCambiarEstado = async (ticketId: string, nuevoEstado: Estado) => {
    if (nuevoEstado === "resuelto") {
      setResolviendoId(ticketId);
      return;
    }
    setLoadingId(ticketId);
    const res = await cambiarEstadoTicket({ ticketId, nuevoEstado });
    if (res.success) {
      setFeedback({ id: ticketId, msg: `Estado cambiado a "${nuevoEstado}".`, tipo: "ok" });
      router.refresh();
    } else {
      setFeedback({ id: ticketId, msg: res.error, tipo: "err" });
    }
    setLoadingId(null);
  };

  const handleResolver = async (ticketId: string) => {
    if (!comentarioCierre || comentarioCierre.trim().length < 5) {
      setFeedback({ id: ticketId, msg: "El comentario de cierre debe tener al menos 5 caracteres.", tipo: "err" });
      return;
    }
    setLoadingId(ticketId);
    const res = await cambiarEstadoTicket({ ticketId, nuevoEstado: "resuelto", comentarioCierre });
    if (res.success) {
      setFeedback({ id: ticketId, msg: "Ticket resuelto correctamente.", tipo: "ok" });
      setResolviendoId(null);
      setComentarioCierre("");
      router.refresh();
    } else {
      setFeedback({ id: ticketId, msg: res.error, tipo: "err" });
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Tickets</h1>
        <span className="text-xs text-slate-500">{tickets.length} ticket(s) cargados</span>
      </div>

      {tickets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 p-16 text-center text-slate-500 text-sm">
          No hay tickets para mostrar en este momento.
        </div>
      )}

      {tickets.map((t) => (
        <div
          key={t.id}
          className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 shadow-md backdrop-blur-sm transition-all hover:border-slate-700"
        >
          {/* Cabecera */}
          <div className="flex flex-wrap items-start gap-3 justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${prioridadColor[t.prioridad]}`}>
                {t.prioridad.toUpperCase()}
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${estadoColor[t.estado]}`}>
                {estadoLabel[t.estado]}
              </span>
              {t.atrasado && (
                <span className="inline-flex rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 text-xs font-semibold">
                  ⏰ ATRASADO
                </span>
              )}
              <span className="text-xs text-slate-500 font-mono">#{t.id.slice(-8)}</span>
            </div>
            <div className="text-xs text-slate-500">
              {new Date(t.fechaCreacion).toLocaleDateString("es-PE")}
            </div>
          </div>

          {/* Descripción */}
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">{t.descripcion}</p>

          {/* Metadata */}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>🖥️ <span className="text-slate-400">{t.equipo.codigoInventario}</span></span>
            <span>📂 <span className="text-slate-400 capitalize">{t.tipo} / {t.categoria}</span></span>
            <span>👤 <span className="text-slate-400">{t.usuarioReporta.nombre}</span></span>
            {t.fechaLimite && (
              <span>📅 Límite: <span className="text-slate-400">{new Date(t.fechaLimite).toLocaleDateString("es-PE")}</span></span>
            )}
          </div>

          {/* Feedback inline */}
          {feedback?.id === t.id && (
            <div className={`mt-3 rounded-lg p-2.5 text-xs font-semibold ${feedback.tipo === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {feedback.msg}
            </div>
          )}

          {/* Acciones para técnico/admin */}
          {esTecnicoOAdmin && t.estado !== "resuelto" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {!t.tecnicoAsignadoId && (
                <button
                  onClick={() => handleAsignar(t.id)}
                  disabled={loadingId === t.id}
                  className="rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-600/40 disabled:opacity-50"
                >
                  {loadingId === t.id ? "..." : "Asignarme este ticket"}
                </button>
              )}
              {t.tecnicoAsignadoId && t.estado === "pendiente" && (
                <button
                  onClick={() => handleCambiarEstado(t.id, "en_proceso")}
                  disabled={loadingId === t.id}
                  className="rounded-lg bg-yellow-600/20 border border-yellow-500/30 px-3 py-1.5 text-xs font-semibold text-yellow-400 hover:bg-yellow-600/40 disabled:opacity-50"
                >
                  Iniciar atención
                </button>
              )}
              {t.estado === "en_proceso" && (
                <button
                  onClick={() => handleCambiarEstado(t.id, "resuelto")}
                  disabled={loadingId === t.id}
                  className="rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/40 disabled:opacity-50"
                >
                  Marcar como resuelto
                </button>
              )}
              <a
                href={`/tickets/${t.id}`}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Ver detalle →
              </a>
            </div>
          )}

          {/* Modal de cierre inline */}
          {resolviendoId === t.id && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-emerald-400">Describe cómo se resolvió el problema:</p>
              <textarea
                rows={3}
                placeholder="Mínimo 5 caracteres…"
                value={comentarioCierre}
                onChange={(e) => setComentarioCierre(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleResolver(t.id)}
                  disabled={loadingId === t.id}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Confirmar resolución
                </button>
                <button
                  onClick={() => { setResolviendoId(null); setComentarioCierre(""); }}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {nextCursor && (
        <div className="pt-4 flex justify-center">
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("cursor", nextCursor);
              window.location.href = url.toString();
            }}
            className="rounded-xl border border-slate-800 px-6 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cargar más tickets
          </button>
        </div>
      )}
    </div>
  );
}
