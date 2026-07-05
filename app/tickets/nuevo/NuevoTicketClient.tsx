// app/tickets/nuevo/NuevoTicketClient.tsx — Formulario interactivo Kinetic Lab con selector de equipos
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearTicket } from "@/app/tickets/actions";

type Tipo = "incidencia" | "solicitud";
type Categoria = "hardware" | "software_licencia" | "software_general" | "red";

interface EquipoItem {
  id: string;
  codigoInventario: string;
  laboratorio: { nombre: string };
}

interface Props {
  equipos: EquipoItem[];
}

const categoriaLabel: Record<Categoria, string> = {
  hardware: "Hardware Fail",
  software_licencia: "Software License",
  software_general: "Software General",
  red: "Network Drop",
};

export default function NuevoTicketClient({ equipos }: Props) {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>("incidencia");
  const [categoria, setCategoria] = useState<Categoria>("hardware");
  const [descripcion, setDescripcion] = useState("");
  const [equipoId, setEquipoId] = useState(equipos[0]?.codigoInventario ?? ""); // Guardamos el codigoInventario
  const [softwareTexto, setSoftwareTexto] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const categoriasIncidencia: Categoria[] = ["hardware", "software_general", "red"];
  const categoriasSolicitud: Categoria[] = ["software_licencia", "software_general"];
  const categorias = tipo === "incidencia" ? categoriasIncidencia : categoriasSolicitud;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setWarning(null); setSuccess(null);
    setLoading(true);
    try {
      const payload: any = { tipo, categoria, descripcion, equipoId };
      if (tipo === "solicitud") {
        if (softwareTexto) payload.softwareTexto = softwareTexto;
        if (fechaLimite) payload.fechaLimite = new Date(fechaLimite);
      }
      const res = await crearTicket(payload);
      if (res.success) {
        if ("warning" in res && res.warning) setWarning(res.warning);
        setSuccess(`Ticket creado — ID: ${(res.data as any)?.id?.slice(-8).toUpperCase() ?? "OK"}`);
        setTimeout(() => router.push("/tickets"), 2200);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Ocurrió un error. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const selectTipo = (t: Tipo) => {
    setTipo(t);
    setCategoria(t === "incidencia" ? "hardware" : "software_licencia");
    setSoftwareTexto(""); setFechaLimite("");
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12 relative"
      style={{ background: "var(--background)" }}
    >
      {/* Grid pattern */}
      <div className="pointer-events-none fixed inset-0" style={{
        backgroundImage: "linear-gradient(rgba(103,80,164,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(103,80,164,0.03) 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Back link */}
        <Link
          href="/tickets"
          className="mb-6 inline-flex items-center gap-2 text-xs transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
          Volver a Tickets
        </Link>

        {/* Warnings & success */}
        {warning && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-xs"
            style={{ background: "rgba(231,195,101,0.08)", borderColor: "rgba(231,195,101,0.30)", color: "#e7c365" }}>
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16 }}>warning</span>
            <span><strong>Warning:</strong> {warning}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border px-4 py-3 text-xs font-semibold"
            style={{ background: "rgba(78,222,163,0.08)", borderColor: "rgba(78,222,163,0.30)", color: "#4edea3" }}>
            ✓ {success} — Redirigiendo...
          </div>
        )}

        {/* Card */}
        <div className="kl-card p-8 bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <h1 className="font-outfit text-2xl font-bold text-slate-100">
                New Request
              </h1>
              <span className="kl-badge kl-badge-admin">DRAFT</span>
            </div>
            <p className="text-xs text-slate-400">
              Completa el formulario para reportar un incidente o solicitar un recurso.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Target Equipment Selector */}
            <div className="space-y-1">
              <label className="kl-label">Target Equipment (Equipo)</label>
              <select
                required
                value={equipoId}
                onChange={(e) => setEquipoId(e.target.value)}
                className="kl-input cursor-pointer"
              >
                {equipos.length === 0 ? (
                  <option value="">No hay equipos registrados disponibles</option>
                ) : (
                  equipos.map((eq) => (
                    <option key={eq.id} value={eq.codigoInventario}>
                      {eq.codigoInventario} ({eq.laboratorio.nombre})
                    </option>
                  ))
                )}
              </select>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Selecciona la unidad de hardware que presenta la incidencia.
              </p>
            </div>

            {/* Request Type */}
            <div className="space-y-2">
              <label className="kl-label">Request Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(["incidencia", "solicitud"] as Tipo[]).map((t) => {
                  const active = tipo === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => selectTipo(t)}
                      className="relative flex flex-col items-center gap-2 rounded-lg border py-4 text-xs font-semibold transition-all cursor-pointer"
                      style={{
                        background: active ? "rgba(103,80,164,0.12)" : "var(--surface-low)",
                        borderColor: active ? "var(--primary)" : "var(--border)",
                        color: active ? "var(--primary-light)" : "var(--muted-foreground)",
                      }}
                    >
                      {active && (
                        <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                      {t === "incidencia" ? (
                        <span className="material-symbols-outlined text-2xl text-[#ff7070]">warning</span>
                      ) : (
                        <span className="material-symbols-outlined text-2xl text-[#e7c365]">code</span>
                      )}
                      {t === "incidencia" ? "Report Incident" : "Request Software"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="kl-label">Category</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Categoria)}
                className="kl-input cursor-pointer"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>{categoriaLabel[c]}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="kl-label">Description</label>
                <span className="font-geist text-[10px] text-slate-500">
                  {descripcion.length} / 500
                </span>
              </div>
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={3}
                placeholder="Describe los síntomas de la falla o detalles del software..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="kl-input resize-none"
              />
            </div>

            {/* Solicitud extras */}
            {tipo === "solicitud" && (
              <>
                <div className="space-y-1">
                  <label className="kl-label">Software requerido</label>
                  <input
                    type="text"
                    placeholder="e.g. SPSS v28, AutoCAD 2024"
                    value={softwareTexto}
                    onChange={(e) => setSoftwareTexto(e.target.value)}
                    className="kl-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="kl-label">Fecha límite (opcional)</label>
                  <input
                    type="date"
                    value={fechaLimite}
                    onChange={(e) => setFechaLimite(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="kl-input"
                  />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link href="/tickets" className="kl-btn-ghost flex-1 justify-center py-2.5">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || equipos.length === 0}
                className="kl-btn-primary flex-1 justify-center py-2.5"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Enviando...
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
