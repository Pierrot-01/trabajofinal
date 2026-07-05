// app/admin/software/AdminSoftwareClient.tsx — CRUD interactivo del catálogo de software (Kinetic Lab Style)
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
      setOk(`Software "${nombre}" agregado exitosamente al catálogo.`);
      setNombre(""); setVersion(""); setTipo("licenciado");
      router.refresh();
    } else { setError(res.error); }
    setLoading(false);
  };

  const handleEditar = async (id: string) => {
    const res = await editarSoftware(id, { nombre: editNombre, tipo: editTipo, version: editVersion || undefined });
    if (res.success) {
      setRowFeedback({ id, msg: "Software actualizado correctamente.", tipo: "ok" });
      setEditandoId(null);
      router.refresh();
    } else { setRowFeedback({ id, msg: res.error, tipo: "err" }); }
  };

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}" del catálogo? Solo es posible si no está en uso.`)) return;
    const res = await eliminarSoftware(id);
    if (res.success) {
      setRowFeedback({ id, msg: "Software eliminado del catálogo.", tipo: "ok" });
      router.refresh();
    } else { setRowFeedback({ id, msg: res.error, tipo: "err" }); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulario */}
      <div className="lg:col-span-1">
        <div className="kl-card p-6 bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl sticky top-6">
          <h2 className="font-outfit text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#cfbcff]">add_box</span>
            Agregar Software
          </h2>
          <form onSubmit={handleCrear} className="space-y-4">
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}
            {ok && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">{ok}</div>}
            <div className="space-y-1">
              <label className="kl-label">Nombre del Software</label>
              <input required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="e.g. MATLAB, SPSS, VS Code" className="kl-input" />
            </div>
            <div className="space-y-1">
              <label className="kl-label">Tipo de Licencia</label>
              <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="kl-input cursor-pointer">
                <option value="licenciado">🔒 Licenciado / Comercial</option>
                <option value="gratuito">🆓 Gratuito / Open Source</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="kl-label">Versión (opcional)</label>
              <input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. R2023b, v1.8" className="kl-input" />
            </div>
            <button type="submit" disabled={loading} className="kl-btn-primary w-full justify-center mt-2">
              {loading ? "Registrando..." : "Agregar al Catálogo"}
            </button>
          </form>
        </div>
      </div>

      {/* Catálogo */}
      <div className="lg:col-span-2 space-y-4">
        <div className="kl-card overflow-hidden bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl">
          <div className="p-4 border-b border-white/5 bg-slate-950/20 flex justify-between items-center">
            <h3 className="font-outfit text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#cfbcff]">apps</span>
              Software Catalog
            </h3>
            <span className="font-mono text-xs text-[#cfbcff] bg-[#cfbcff]/10 px-2.5 py-0.5 rounded border border-[#cfbcff]/20">
              {catalogoInicial.length} Packages
            </span>
          </div>

          {catalogoInicial.length === 0 && (
            <div className="p-12 text-center text-slate-500">El catálogo está vacío. Comienza agregando uno.</div>
          )}

          <div className="divide-y divide-white/5">
            {catalogoInicial.map(sw => (
              <div key={sw.id} className="p-4 hover:bg-white/[0.01] transition-all">
                {editandoId === sw.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="kl-input" placeholder="Nombre" />
                      <select value={editTipo} onChange={e => setEditTipo(e.target.value as any)} className="kl-input cursor-pointer">
                        <option value="licenciado">🔒 Licenciado</option>
                        <option value="gratuito">🆓 Gratuito</option>
                      </select>
                      <input value={editVersion} onChange={e => setEditVersion(e.target.value)} placeholder="Versión" className="kl-input" />
                    </div>
                    {rowFeedback?.id === sw.id && (
                      <p className={`text-xs ${rowFeedback.tipo === "ok" ? "text-emerald-400" : "text-red-400"}`}>{rowFeedback.msg}</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleEditar(sw.id)} className="kl-btn-primary text-xs py-1 px-3">Guardar</button>
                      <button onClick={() => setEditandoId(null)} className="kl-btn-ghost text-xs py-1 px-3">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="font-outfit font-semibold text-slate-200 text-sm">{sw.nombre}</span>
                      {sw.version && <span className="ml-2 text-xs text-slate-500 font-mono">v{sw.version}</span>}
                      <span className={`ml-3 kl-badge ${sw.tipo === "licenciado" ? "kl-badge-admin" : "kl-badge-operative"}`}>
                        {sw.tipo === "licenciado" ? "Comercial" : "Open Source"}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {rowFeedback?.id === sw.id && (
                        <span className={`text-xs font-semibold mr-2 ${rowFeedback.tipo === "ok" ? "text-emerald-400" : "text-red-400"}`}>{rowFeedback.msg}</span>
                      )}
                      <button onClick={() => { setEditandoId(sw.id); setEditNombre(sw.nombre); setEditTipo(sw.tipo); setEditVersion(sw.version ?? ""); }} className="kl-btn-ghost text-xs py-1 px-3">
                        Editar
                      </button>
                      <button onClick={() => handleEliminar(sw.id, sw.nombre)} className="kl-btn-danger text-xs py-1 px-3">
                        Eliminar
                      </button>
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
