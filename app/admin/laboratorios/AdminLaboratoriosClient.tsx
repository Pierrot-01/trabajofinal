// app/admin/laboratorios/AdminLaboratoriosClient.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { crearLaboratorio } from "./actions";

interface Equipo { id: string; codigoInventario: string; estado: string; }
interface Laboratorio { id: string; nombre: string; ubicacion: string; capacidad: number; equipos: Equipo[]; }

export default function AdminLaboratoriosClient({ laboratoriosIniciales }: { laboratoriosIniciales: Laboratorio[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const estadoColor: Record<string, string> = {
    operativo: "bg-emerald-500",
    mantenimiento: "bg-yellow-500",
    inoperativo: "bg-red-500",
    dado_de_baja: "bg-slate-600",
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setOk(null); setLoading(true);
    const res = await crearLaboratorio({ nombre, ubicacion, capacidad: parseInt(capacidad) });
    if (res.success) {
      setOk(`Laboratorio "${nombre}" creado.`);
      setNombre(""); setUbicacion(""); setCapacidad("");
      router.refresh();
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulario */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl sticky top-6">
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Registrar Laboratorio
          </h2>
          <form onSubmit={handleCrear} className="mt-5 space-y-4">
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}
            {ok && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">{ok}</div>}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre</label>
              <input required value={nombre} onChange={e => setNombre(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50" placeholder="Laboratorio de Informática I" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Ubicación</label>
              <input required value={ubicacion} onChange={e => setUbicacion(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50" placeholder="Pabellón A, Planta 2" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Capacidad (PC)</label>
              <input required type="number" min={1} value={capacidad} onChange={e => setCapacidad(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50" placeholder="30" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-semibold text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50">
              {loading ? "Creando..." : "Registrar Laboratorio"}
            </button>
          </form>
        </div>
      </div>

      {/* Lista */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Laboratorios registrados</h2>
        {laboratoriosIniciales.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-600">No hay laboratorios.</div>
        )}
        {laboratoriosIniciales.map(lab => (
          <div key={lab.id} className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-100">{lab.nombre}</h3>
                <p className="text-xs text-slate-500 mt-0.5">📍 {lab.ubicacion} · {lab.capacidad} puestos</p>
              </div>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">{lab.equipos.length} equipos</span>
            </div>
            {lab.equipos.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {lab.equipos.slice(0, 12).map(eq => (
                  <span key={eq.id} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2.5 py-1 text-xs text-slate-400">
                    <span className={`h-1.5 w-1.5 rounded-full ${estadoColor[eq.estado] ?? "bg-slate-500"}`} />
                    {eq.codigoInventario}
                  </span>
                ))}
                {lab.equipos.length > 12 && <span className="text-xs text-slate-600">+{lab.equipos.length - 12} más</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
