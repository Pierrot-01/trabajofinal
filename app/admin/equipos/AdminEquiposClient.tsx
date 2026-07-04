// app/admin/equipos/AdminEquiposClient.tsx — Gestión interactiva de equipos
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

const estadoColor: Record<string, string> = {
  operativo: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  mantenimiento: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  inoperativo: "bg-red-500/10 text-red-400 border-red-500/20",
  dado_de_baja: "bg-slate-700/40 text-slate-500 border-slate-700",
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
      setOk(`Equipo "${codigoInventario}" registrado.`);
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
      showFeedback(id, w ? `Estado actualizado. ⚠️ ${w}` : "Estado actualizado.", w ? "warn" : "ok");
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl sticky top-6">
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Registrar Equipo</h2>
          <form onSubmit={handleCrear} className="mt-5 space-y-4">
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}
            {ok && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">{ok}</div>}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Código de Inventario</label>
              <input required value={codigoInventario} onChange={e => setCodigoInventario(e.target.value)} placeholder="LAB01-PC01" className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Laboratorio</label>
              <select value={laboratorioId} onChange={e => setLaboratorioId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50">
                {laboratorios.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading || laboratorios.length === 0} className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-semibold text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50">
              {loading ? "Creando..." : "Registrar Equipo"}
            </button>
            {laboratorios.length === 0 && <p className="text-xs text-slate-600 text-center">Primero debes crear un laboratorio.</p>}
          </form>
        </div>
      </div>

      {/* Tabla */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Inventario de Equipos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Laboratorio</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50">
                {equiposIniciales.map(eq => (
                  <React.Fragment key={eq.id}>
                    <tr className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-200">{eq.codigoInventario}</td>
                      <td className="py-3 px-4 text-slate-400">{eq.laboratorio?.nombre}</td>
                      <td className="py-3 px-4 text-center">
                        {eq.estado === "dado_de_baja" ? (
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estadoColor[eq.estado]}`}>Dado de baja</span>
                        ) : (
                          <select
                            value={eq.estado}
                            onChange={e => handleCambiarEstado(eq.id, e.target.value)}
                            className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 outline-none"
                          >
                            <option value="operativo">Operativo</option>
                            <option value="mantenimiento">Mantenimiento</option>
                            <option value="inoperativo">Inoperativo</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {eq.estado !== "dado_de_baja" && (
                          <button onClick={() => handleDarDeBaja(eq.id, eq.codigoInventario)} className="rounded border border-red-500/30 px-2.5 py-1 font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
                            Dar de baja
                          </button>
                        )}
                      </td>
                    </tr>
                    {feedbackId === eq.id && feedbackMsg && (
                      <tr>
                        <td colSpan={4} className={`px-4 py-2 text-xs font-semibold ${feedbackType === "ok" ? "text-emerald-400" : feedbackType === "warn" ? "text-yellow-400" : "text-red-400"}`}>
                          {feedbackMsg}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {nextCursor && (
            <div className="mt-4 flex justify-center">
              <button onClick={() => { const url = new URL(window.location.href); url.searchParams.set("cursor", nextCursor); window.location.href = url.toString(); }} className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200">Cargar más</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
