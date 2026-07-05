// app/admin/equipos/AdminEquiposClient.tsx — Gestión interactiva de equipos (Kinetic Lab Style)
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { crearEquipo, editarEquipo, darDeBajaEquipo } from "./actions";

interface Equipo {
  id: string;
  codigoInventario: string;
  estado: string;
  laboratorio: { nombre: string };
}

interface Laboratorio { id: string; nombre: string; ubicacion: string; capacidad: number; }

interface Props {
  equiposIniciales: Equipo[];
  nextCursor: string | null;
  laboratorios: Laboratorio[];
}

const estadoMeta: Record<string, { label: string; badgeCls: string; dotColor: string }> = {
  operativo: { label: "Operativo", badgeCls: "kl-badge kl-badge-operative", dotColor: "#4edea3" },
  mantenimiento: { label: "Mantenimiento", badgeCls: "kl-badge kl-badge-maintenance", dotColor: "#e7c365" },
  inoperativo: { label: "Inoperativo", badgeCls: "kl-badge kl-badge-inoperative", dotColor: "#ff7070" },
  dado_de_baja: { label: "Dado de baja", badgeCls: "kl-badge kl-badge-retired", dotColor: "#6b7a8d" },
};

export default function AdminEquiposClient({ equiposIniciales, nextCursor, laboratorios }: Props) {
  const router = useRouter();
  const [codigoInventario, setCodigoInventario] = useState("");
  const [laboratorioId, setLaboratorioId] = useState(laboratorios[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"ok" | "warn" | "err">("ok");

  const showFeedback = (id: string, msg: string, tipo: "ok" | "warn" | "err") => {
    setFeedbackId(id); setFeedbackMsg(msg); setFeedbackType(tipo);
    setTimeout(() => { setFeedbackId(null); setFeedbackMsg(null); }, 5000);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setOk(null); setLoading(true);
    const res = await crearEquipo({ codigoInventario, laboratorioId });
    if (res.success) {
      setOk(`Equipo "${codigoInventario}" registrado exitosamente.`);
      setCodigoInventario("");
      router.refresh();
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  const handleCambiarEstado = async (id: string, estado: string) => {
    const res = await editarEquipo(id, { estado: estado as any });
    if (res.success) {
      const w = "warning" in res ? res.warning : undefined;
      showFeedback(id, w ? `Estado actualizado. ⚠️ ${w}` : "Estado de equipo actualizado correctamente.", w ? "warn" : "ok");
      router.refresh();
    } else {
      showFeedback(id, res.error, "err");
    }
  };

  const handleDarDeBaja = async (id: string, codigo: string) => {
    if (!confirm(`¿Confirmas dar de baja permanentemente el equipo "${codigo}"? Esta acción requiere que no tenga tickets abiertos.`)) return;
    const res = await darDeBajaEquipo(id);
    if (res.success) {
      showFeedback(id, "Equipo dado de baja exitosamente.", "ok");
      router.refresh();
    } else {
      showFeedback(id, res.error, "err");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulario */}
      <div className="lg:col-span-1">
        <div className="kl-card p-6 sticky top-6 bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl">
          <h2 className="font-outfit text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#cfbcff]">add_box</span>
            Registrar Equipo
          </h2>
          <form onSubmit={handleCrear} className="space-y-4">
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}
            {ok && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">{ok}</div>}
            <div className="space-y-1">
              <label className="kl-label">Código de Inventario</label>
              <input required value={codigoInventario} onChange={e => setCodigoInventario(e.target.value)} placeholder="e.g. LAB01-PC01" className="kl-input" />
            </div>
            <div className="space-y-1">
              <label className="kl-label">Laboratorio Destino</label>
              <select value={laboratorioId} onChange={e => setLaboratorioId(e.target.value)} className="kl-input cursor-pointer">
                {laboratorios.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading || laboratorios.length === 0} className="kl-btn-primary w-full justify-center mt-2">
              {loading ? "Creando..." : "Registrar Equipo"}
            </button>
            {laboratorios.length === 0 && <p className="text-xs text-slate-500 text-center mt-2">Primero debes crear un laboratorio.</p>}
          </form>
        </div>
      </div>

      {/* Tabla / Lista */}
      <div className="lg:col-span-2 space-y-4">
        <div className="kl-card overflow-hidden bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl">
          <div className="p-4 border-b border-white/5 bg-slate-950/20 flex justify-between items-center">
            <h3 className="font-outfit text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#cfbcff]">devices</span>
              Hardware Registry
            </h3>
            <span className="font-mono text-xs text-[#cfbcff] bg-[#6750a4]/10 px-2 py-0.5 rounded border border-[#cfbcff]/20">
              {equiposIniciales.length} Units
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/30 text-slate-400 font-mono text-[10px] font-bold tracking-widest uppercase">
                  <th className="py-3 px-4">Código / Inventario</th>
                  <th className="py-3 px-4">Laboratorio</th>
                  <th className="py-3 px-4 text-center">Estado del Equipo</th>
                  <th className="py-3 px-4 text-right">Directivas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {equiposIniciales.map(eq => {
                  const meta = estadoMeta[eq.estado] ?? estadoMeta.operativo;
                  return (
                    <React.Fragment key={eq.id}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#cfbcff]">{eq.codigoInventario}</td>
                        <td className="py-3.5 px-4 text-slate-300">{eq.laboratorio?.nombre}</td>
                        <td className="py-3.5 px-4 text-center">
                          {eq.estado === "dado_de_baja" ? (
                            <span className={meta.badgeCls}>{meta.label}</span>
                          ) : (
                            <select
                              value={eq.estado}
                              onChange={e => handleCambiarEstado(eq.id, e.target.value)}
                              className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none focus:border-[#cfbcff]/50 transition-colors cursor-pointer"
                            >
                              <option value="operativo">🟢 Operativo</option>
                              <option value="mantenimiento">🟡 Mantenimiento</option>
                              <option value="inoperativo">🔴 Inoperativo</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {eq.estado !== "dado_de_baja" ? (
                            <button
                              onClick={() => handleDarDeBaja(eq.id, eq.codigoInventario)}
                              className="kl-btn-danger text-xs py-1 px-3"
                            >
                              <span className="material-symbols-outlined text-[13px]">archive</span>
                              Decommission
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 font-mono italic">Retired</span>
                          )}
                        </td>
                      </tr>
                      {feedbackId === eq.id && feedbackMsg && (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                            <div className={`text-xs font-semibold ${feedbackType === "ok" ? "text-emerald-400" : feedbackType === "warn" ? "text-yellow-400" : "text-red-400"}`}>
                              {feedbackType === "ok" ? "✓" : feedbackType === "warn" ? "⚠️" : "✗"} {feedbackMsg}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {nextCursor && (
            <div className="p-4 border-t border-white/5 flex justify-center bg-slate-950/10">
              <button
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("cursor", nextCursor);
                  window.location.href = url.toString();
                }}
                className="kl-btn-ghost text-xs"
              >
                Cargar más unidades
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
