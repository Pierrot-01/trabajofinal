// app/admin/software/AdminSoftwareClient.tsx — CRUD interactivo del catálogo de software
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { crearSoftware, editarSoftware, eliminarSoftware } from "./actions";

interface SoftwareItem {
  id: string;
  nombre: string;
  tipo: "licenciado" | "gratuito";
  version?: string | null;
}

export default function AdminSoftwareClient({ catalogoInicial }: { catalogoInicial: SoftwareItem[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"licenciado" | "gratuito">("licenciado");
  const [version, setVersion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTipo, setEditTipo] = useState<"licenciado" | "gratuito">("licenciado");
  const [editVersion, setEditVersion] = useState("");
  const [rowFeedback, setRowFeedback] = useState<{ id: string; msg: string; tipo: "ok" | "err" } | null>(null);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setOk(null); setLoading(true);
    const res = await crearSoftware({ nombre, tipo, version: version || undefined });
    if (res.success) {
      setOk(`Software "${nombre}" agregado al catálogo.`);
      setNombre(""); setVersion(""); setTipo("licenciado");
      router.refresh();
    } else { setError(res.error); }
    setLoading(false);
  };

  const handleEditar = async (id: string) => {
    const res = await editarSoftware(id, { nombre: editNombre, tipo: editTipo, version: editVersion || undefined });
    if (res.success) {
      setRowFeedback({ id, msg: "Actualizado.", tipo: "ok" });
      setEditandoId(null);
      router.refresh();
    } else { setRowFeedback({ id, msg: res.error, tipo: "err" }); }
  };

  const handleEliminar = async (id: string, nomre: string) => {
    if (!confirm(`¿Eliminar "${nomre}" del catálogo? Solo es posible si no está en uso.`)) return;
    const res = await eliminarSoftware(id);
    if (res.success) {
      setRowFeedback({ id, msg: "Eliminado.", tipo: "ok" });
      router.refresh();
    } else { setRowFeedback({ id, msg: res.error, tipo: "err" }); }
  };

  const tipoLabel = { licenciado: "🔒 Licenciado", gratuito: "🆓 Gratuito" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulario */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl sticky top-6">
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Agregar Software</h2>
          <form onSubmit={handleCrear} className="mt-5 space-y-4">
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}
            {ok && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">{ok}</div>}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre</label>
              <input required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="MATLAB, SPSS, VS Code..." className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none">
                <option value="licenciado">Licenciado</option>
                <option value="gratuito">Gratuito</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Versión (opcional)</label>
              <input value={version} onChange={e => setVersion(e.target.value)} placeholder="2024, v3.8, R2023b..." className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-semibold text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50">
              {loading ? "Agregando..." : "Agregar al catálogo"}
            </button>
          </form>
        </div>
      </div>

      {/* Catálogo */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Catálogo ({catalogoInicial.length})</h2>
          {catalogoInicial.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-slate-600">El catálogo está vacío.</div>
          )}
          <div className="space-y-2">
            {catalogoInicial.map(sw => (
              <div key={sw.id} className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                {editandoId === sw.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none" />
                      <select value={editTipo} onChange={e => setEditTipo(e.target.value as any)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none">
                        <option value="licenciado">Licenciado</option>
                        <option value="gratuito">Gratuito</option>
                      </select>
                      <input value={editVersion} onChange={e => setEditVersion(e.target.value)} placeholder="versión" className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none" />
                    </div>
                    {rowFeedback?.id === sw.id && <p className={`text-xs ${rowFeedback.tipo === "ok" ? "text-emerald-400" : "text-red-400"}`}>{rowFeedback.msg}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => handleEditar(sw.id)} className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500">Guardar</button>
                      <button onClick={() => setEditandoId(null)} className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-400">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 text-sm">{sw.nombre}</span>
                      {sw.version && <span className="ml-2 text-xs text-slate-500">v{sw.version}</span>}
                      <span className={`ml-3 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${sw.tipo === "licenciado" ? "bg-purple-500/10 text-purple-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {tipoLabel[sw.tipo]}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {rowFeedback?.id === sw.id && <span className={`text-xs ${rowFeedback.tipo === "ok" ? "text-emerald-400" : "text-red-400"}`}>{rowFeedback.msg}</span>}
                      <button onClick={() => { setEditandoId(sw.id); setEditNombre(sw.nombre); setEditTipo(sw.tipo); setEditVersion(sw.version ?? ""); }} className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200">Editar</button>
                      <button onClick={() => handleEliminar(sw.id, sw.nombre)} className="rounded border border-red-500/30 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10">Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
