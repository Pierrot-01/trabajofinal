// app/admin/laboratorios/AdminLaboratoriosClient.tsx — Gestión de laboratorios (Kinetic Lab Style)
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { crearLaboratorio } from "./actions";

interface Equipo { id: string; codigoInventario: string; estado: string; }
interface Laboratorio { id: string; nombre: string; ubicacion: string; capacidad: number; equipos: Equipo[]; }

const estadoColor: Record<string, string> = {
  operativo: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  mantenimiento: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  inoperativo: "bg-red-500/20 text-red-400 border border-red-500/30",
  dado_de_baja: "bg-slate-700/40 text-slate-500 border border-slate-700/30",
};

export default function AdminLaboratoriosClient({ laboratoriosIniciales }: { laboratoriosIniciales: Laboratorio[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setOk(null); setLoading(true);
    const res = await crearLaboratorio({ nombre, ubicacion, capacidad: parseInt(capacidad) });
    if (res.success) {
      setOk(`Laboratorio "${nombre}" creado exitosamente.`);
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
        <div className="kl-card p-6 sticky top-6 bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl">
          <h2 className="font-outfit text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#cfbcff]">add_box</span>
            Registrar Laboratorio
          </h2>
          <form onSubmit={handleCrear} className="space-y-4">
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}
            {ok && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">{ok}</div>}
            <div className="space-y-1">
              <label className="kl-label">Nombre del Laboratorio</label>
              <input required value={nombre} onChange={e => setNombre(e.target.value)} className="kl-input" placeholder="e.g. Lab de Redes y Conectividad" />
            </div>
            <div className="space-y-1">
              <label className="kl-label">Ubicación</label>
              <input required value={ubicacion} onChange={e => setUbicacion(e.target.value)} className="kl-input" placeholder="e.g. Pabellón B - Aula 204" />
            </div>
            <div className="space-y-1">
              <label className="kl-label">Capacidad de Equipos</label>
              <input required type="number" min={1} value={capacidad} onChange={e => setCapacidad(e.target.value)} className="kl-input" placeholder="e.g. 30" />
            </div>
            <button type="submit" disabled={loading} className="kl-btn-primary w-full justify-center mt-2">
              {loading ? "Creando..." : "Registrar Laboratorio"}
            </button>
          </form>
        </div>
      </div>

      {/* Lista */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="font-outfit text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-[#cfbcff]">map</span>
          Laboratorios Registrados
        </h2>
        
        {laboratoriosIniciales.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-slate-500">
            No hay laboratorios en el sistema. Comienza registrando uno.
          </div>
        )}
        
        {laboratoriosIniciales.map(lab => (
          <div key={lab.id} className="kl-card p-5 bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-outfit text-base font-bold text-slate-200">{lab.nombre}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px] text-[#cfbcff]">location_on</span>
                  {lab.ubicacion}
                  <span className="text-slate-600">•</span>
                  <span className="material-symbols-outlined text-[13px] text-[#cfbcff]">group</span>
                  {lab.capacidad} puestos
                </p>
              </div>
              <span className="font-mono text-xs text-[#cfbcff] bg-[#cfbcff]/10 px-2.5 py-1 rounded-full border border-[#cfbcff]/20">
                {lab.equipos.length} equipos
              </span>
            </div>
            
            {lab.equipos.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="font-mono text-[9px] font-bold tracking-widest text-slate-500 mb-2.5">DISTRIBUCIÓN DE HARDWARE</p>
                <div className="flex flex-wrap gap-2">
                  {lab.equipos.slice(0, 15).map(eq => (
                    <span key={eq.id} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium ${estadoColor[eq.estado] ?? "bg-slate-800 text-slate-400"}`}>
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {eq.codigoInventario}
                    </span>
                  ))}
                  {lab.equipos.length > 15 && (
                    <span className="text-xs text-slate-500 font-mono self-center px-1">
                      +{lab.equipos.length - 15} más
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
