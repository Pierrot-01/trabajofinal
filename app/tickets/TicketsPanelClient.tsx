// app/tickets/TicketsPanelClient.tsx — Data-grid Kinetic Lab
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

// Badge helpers
function PrioridadBadge({ p }: { p: Prioridad }) {
  const cls = p === "alta" ? "kl-badge kl-badge-high" : p === "media" ? "kl-badge kl-badge-medium" : "kl-badge kl-badge-low";
  const label = p === "alta" ? "High" : p === "media" ? "Medium" : "Low";
  return <span className={cls}>{label}</span>;
}

function EstadoBadge({ e, atrasado }: { e: Estado; atrasado: boolean }) {
  if (atrasado && e === "pendiente") {
    return <span className="kl-badge kl-badge-inoperative">Overdue</span>;
  }
  if (e === "pendiente") return <span className="kl-badge kl-badge-maintenance">Open</span>;
  if (e === "en_proceso") return <span className="kl-badge kl-badge-operative">In Progress</span>;
  return <span className="kl-badge kl-badge-retired">Resolved</span>;
}

const categoriaLabel: Record<string, string> = {
  hardware: "Hardware Fail",
  software_general: "Software",
  software_licencia: "License",
  red: "Network Drop",
};

export default function TicketsPanelClient({ tickets, nextCursor, rol, currentUserId: _currentUserId }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ id: string; msg: string; tipo: "ok" | "err" } | null>(null);
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);
  const [comentarioCierre, setComentarioCierre] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "mine" | "history">("all");

  const esTecnicoOAdmin = rol === "tecnico" || rol === "admin";

  const handleAsignar = async (ticketId: string) => {
    setLoadingId(ticketId);
    const res = await asignarTicket(ticketId);
    if (res.success) {
      router.push(`/tickets/${ticketId}`);
    } else {
      setFeedback({ id: ticketId, msg: res.error, tipo: "err" });
    }
    setLoadingId(null);
  };

  const handleCambiarEstado = async (ticketId: string, nuevoEstado: Estado) => {
    if (nuevoEstado === "resuelto") { setResolviendoId(ticketId); return; }
    setLoadingId(ticketId);
    const res = await cambiarEstadoTicket({ ticketId, nuevoEstado });
    if (res.success) {
      setFeedback({ id: ticketId, msg: `Estado cambiado.`, tipo: "ok" });
      router.refresh();
    } else {
      setFeedback({ id: ticketId, msg: res.error, tipo: "err" });
    }
    setLoadingId(null);
  };

  const handleResolver = async (ticketId: string) => {
    if (!comentarioCierre || comentarioCierre.trim().length < 5) {
      setFeedback({ id: ticketId, msg: "El comentario debe tener al menos 5 caracteres.", tipo: "err" });
      return;
    }
    setLoadingId(ticketId);
    const res = await cambiarEstadoTicket({ ticketId, nuevoEstado: "resuelto", comentarioCierre });
    if (res.success) {
      setFeedback({ id: ticketId, msg: "Ticket resuelto.", tipo: "ok" });
      setResolviendoId(null);
      setComentarioCierre("");
      router.refresh();
    } else {
      setFeedback({ id: ticketId, msg: res.error, tipo: "err" });
    }
    setLoadingId(null);
  };

  // Filtrar por tab
  const visibleTickets = tickets.filter((t) => {
    if (activeTab === "history") return t.estado === "resuelto";
    if (activeTab === "mine") return t.tecnicoAsignadoId !== null && t.tecnicoAsignadoId !== undefined;
    return true;
  });

  const tabClass = (tab: typeof activeTab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? "border-[#cfbcff] text-[#cfbcff]"
        : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
    }`;

  return (
    <div>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between rounded-t-lg border border-b-0 px-4"
        style={{ background: "var(--surface-container)", borderColor: "var(--border)" }}
      >
        {/* Tabs */}
        <div className="flex">
          <button className={tabClass("all")} onClick={() => setActiveTab("all")}>All Tickets</button>
          {esTecnicoOAdmin && (
            <button className={tabClass("mine")} onClick={() => setActiveTab("mine")}>Asignados</button>
          )}
          <button className={tabClass("history")} onClick={() => setActiveTab("history")}>Historial</button>
        </div>

        {/* New ticket button */}
        <Link href="/tickets/nuevo" className="kl-btn-primary my-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Ticket
        </Link>
      </div>

      {/* Data grid header */}
      <div
        className="hidden md:block border border-b-0 px-4"
        style={{ background: "var(--surface-low)", borderColor: "var(--border)" }}
      >
        <div
          className="grid items-center py-2"
          style={{
            gridTemplateColumns: "110px 1fr 130px 90px 90px 110px 110px 120px",
            gap: "1rem",
          }}
        >
          {["ID TICKET", "EQUIPO", "CATEGORÍA", "DETALLES", "PRIORIDAD", "ESTADO", "TÉCNICO", "FECHA"].map((h) => (
            <span key={h} className="kl-label">{h}</span>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div
        className="rounded-b-lg border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        {visibleTickets.length === 0 && (
          <div
            className="flex items-center justify-center py-16 text-sm"
            style={{ color: "var(--muted-foreground)", background: "var(--surface-container)" }}
          >
            No hay tickets para mostrar.
          </div>
        )}

        {visibleTickets.map((t) => (
          <div key={t.id} className="border-b last:border-b-0 border-[var(--border)]">
            {/* Mobile View Card */}
            <div className="flex flex-col gap-3 p-4 md:hidden bg-[var(--surface-container)]">
              <div className="flex items-center justify-between">
                <Link
                  href={`/tickets/${t.id}`}
                  className="font-geist text-xs font-semibold hover:underline hover:text-[#cfbcff] transition-colors"
                  style={{ color: "var(--primary-light)" }}
                >
                  TKT-{t.id.slice(-4).toUpperCase()}
                </Link>
                <div className="flex items-center gap-1.5">
                  <PrioridadBadge p={t.prioridad} />
                  <EstadoBadge e={t.estado} atrasado={t.atrasado} />
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-xs font-semibold text-[var(--foreground)]">
                  {t.equipo.codigoInventario}
                </span>
                <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                  {t.descripcion}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 text-[10px] text-[var(--muted-foreground)] border-t border-white/5">
                <span className="font-medium bg-white/5 px-2 py-0.5 rounded text-[10px]">
                  {categoriaLabel[t.categoria] ?? t.categoria}
                </span>
                <span>
                  {new Date(t.fechaCreacion).toLocaleDateString("es-PE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] italic" style={{ color: t.tecnicoAsignadoId ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {t.tecnicoAsignadoId ? "Asignado" : "Unassigned"}
                </span>
                <Link
                  href={`/tickets/${t.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#cfbcff] hover:underline"
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}>visibility</span>
                  Ver detalle
                </Link>
              </div>
            </div>

            {/* Desktop View Row */}
            <div
              className="hidden md:grid kl-row border-b-0"
              style={{
                gridTemplateColumns: "110px 1fr 130px 90px 90px 110px 110px 120px",
                gap: "1rem",
                background: "var(--surface-container)",
                minHeight: "2.5rem",
                height: "auto",
                paddingTop: "0.6rem",
                paddingBottom: "0.6rem",
              }}
            >
              {/* ID */}
              <Link
                href={`/tickets/${t.id}`}
                className="font-geist text-xs hover:underline hover:text-[#cfbcff] transition-colors"
                style={{ color: "var(--primary-light)" }}
              >
                TKT-{t.id.slice(-4).toUpperCase()}
              </Link>

              {/* Equipo + descripción */}
              <div className="min-w-0">
                <span className="block text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>
                  {t.equipo.codigoInventario}
                </span>
                <span className="block text-[11px] truncate" style={{ color: "var(--muted-foreground)" }}>
                  {t.descripcion.slice(0, 60)}{t.descripcion.length > 60 ? "…" : ""}
                </span>
              </div>

              {/* Categoría */}
              <span className="text-xs truncate" style={{ color: "var(--foreground)" }}>
                {categoriaLabel[t.categoria] ?? t.categoria}
              </span>

              {/* Detalles */}
              <div>
                <Link
                  href={`/tickets/${t.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#cfbcff] hover:underline transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}>visibility</span>
                  Ver
                </Link>
              </div>

              {/* Prioridad */}
              <div><PrioridadBadge p={t.prioridad} /></div>

              {/* Estado */}
              <div><EstadoBadge e={t.estado} atrasado={t.atrasado} /></div>

              {/* Técnico */}
              <span className="text-xs italic" style={{ color: t.tecnicoAsignadoId ? "var(--foreground)" : "var(--muted-foreground)" }}>
                {t.tecnicoAsignadoId ? "Asignado" : "Unassigned"}
              </span>

              {/* Fecha */}
              <span className="font-geist text-xs" style={{ color: "var(--muted-foreground)" }}>
                {new Date(t.fechaCreacion).toLocaleDateString("es-PE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Feedback inline */}
            {feedback?.id === t.id && (
              <div
                className="px-4 py-2 text-xs"
                style={{
                  background: feedback.tipo === "ok" ? "rgba(78,222,163,0.08)" : "rgba(255,112,112,0.08)",
                  color: feedback.tipo === "ok" ? "#4edea3" : "#ff7070",
                  borderTop: "1px solid var(--border)",
                }}
              >
                {feedback.msg}
              </div>
            )}

            {/* Acciones expandidas */}
            {esTecnicoOAdmin && t.estado !== "resuelto" && (
              <div
                className="flex flex-wrap items-center gap-2 px-4 py-2 border-t"
                style={{ background: "rgba(0,0,0,0.15)", borderColor: "var(--border)" }}
              >
                {!t.tecnicoAsignadoId && (
                  <button
                    onClick={() => handleAsignar(t.id)}
                    disabled={loadingId === t.id}
                    className="kl-btn-ghost text-xs py-1 px-3"
                  >
                    {loadingId === t.id ? "…" : "Asignarme"}
                  </button>
                )}
                {t.tecnicoAsignadoId && t.estado === "pendiente" && (
                  <button
                    onClick={() => handleCambiarEstado(t.id, "en_proceso")}
                    disabled={loadingId === t.id}
                    className="kl-btn-ghost text-xs py-1 px-3"
                    style={{ color: "#e7c365", borderColor: "rgba(231,195,101,0.30)" }}
                  >
                    Iniciar atención
                  </button>
                )}
                {t.estado === "en_proceso" && (
                  <button
                    onClick={() => handleCambiarEstado(t.id, "resuelto")}
                    disabled={loadingId === t.id}
                    className="kl-btn-ghost text-xs py-1 px-3"
                    style={{ color: "#4edea3", borderColor: "rgba(78,222,163,0.30)" }}
                  >
                    Marcar resuelto
                  </button>
                )}
                <Link
                  href={`/tickets/${t.id}`}
                  className="kl-btn-ghost text-xs py-1 px-3"
                >
                  Ver detalle →
                </Link>
              </div>
            )}

            {/* Panel de cierre */}
            {resolviendoId === t.id && (
              <div
                className="px-4 py-3 border-t space-y-2"
                style={{
                  background: "rgba(78,222,163,0.04)",
                  borderColor: "rgba(78,222,163,0.20)",
                }}
              >
                <p className="text-xs font-semibold" style={{ color: "#4edea3" }}>
                  Describe cómo se resolvió:
                </p>
                <textarea
                  rows={2}
                  placeholder="Mínimo 5 caracteres…"
                  value={comentarioCierre}
                  onChange={(e) => setComentarioCierre(e.target.value)}
                  className="kl-input resize-none text-xs"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolver(t.id)}
                    disabled={loadingId === t.id}
                    className="kl-btn-primary text-xs py-1.5 px-3"
                    style={{ background: "#00a572" }}
                  >
                    Confirmar resolución
                  </button>
                  <button
                    onClick={() => { setResolviendoId(null); setComentarioCierre(""); }}
                    className="kl-btn-ghost text-xs py-1.5 px-3"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Paginación */}
      {nextCursor && (
        <div className="pt-4 flex justify-center">
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("cursor", nextCursor);
              window.location.href = url.toString();
            }}
            className="kl-btn-ghost px-6"
          >
            Cargar más tickets
          </button>
        </div>
      )}
    </div>
  );
}
