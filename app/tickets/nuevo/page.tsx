// app/tickets/nuevo/page.tsx — Formulario de reporte de incidencia/solicitud (HU-01, HU-02)
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { crearTicket } from "@/app/tickets/actions";
import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";

type Tipo = "incidencia" | "solicitud";
type Categoria = "hardware" | "software_licencia" | "software_general" | "red";

export default function NuevoTicketPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>("incidencia");
  const [categoria, setCategoria] = useState<Categoria>("hardware");
  const [descripcion, setDescripcion] = useState("");
  const [equipoId, setEquipoId] = useState("");
  const [softwareId, setSoftwareId] = useState("");
  const [softwareTexto, setSoftwareTexto] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const categoriasIncidencia: Categoria[] = ["hardware", "software_general", "red"];
  const categoriasSolicitud: Categoria[] = ["software_licencia", "software_general"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setSuccess(null);
    setLoading(true);

    try {
      const payload: any = {
        tipo,
        categoria,
        descripcion,
        equipoId,
      };
      if (tipo === "solicitud") {
        if (softwareId) payload.softwareId = softwareId;
        else if (softwareTexto) payload.softwareTexto = softwareTexto;
        if (fechaLimite) payload.fechaLimite = new Date(fechaLimite);
      }

      const res = await crearTicket(payload);
      if (res.success) {
        if ("warning" in res && res.warning) setWarning(res.warning);
        setSuccess(`Ticket creado exitosamente (ID: ${(res.data as any)?.id ?? "nuevo"})`);
        setTimeout(() => router.push("/tickets"), 2000);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Ocurrió un error. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const categorias = tipo === "incidencia" ? categoriasIncidencia : categoriasSolicitud;

  const labelCategoria: Record<Categoria, string> = {
    hardware: "🖥️ Hardware (PC, mouse, teclado, monitor)",
    software_licencia: "📦 Software con licencia (SPSS, MATLAB…)",
    software_general: "💿 Software general",
    red: "🌐 Red / Conectividad",
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra de navegación */}
      <nav className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/tickets" className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            EPIS UNSCH
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/tickets" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
              ← Volver al panel
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-400">
            Nuevo Reporte
          </span>
          <h1 className="mt-4 text-3xl font-bold text-slate-100">
            Reportar Incidencia o Solicitud
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Completa el formulario y recibirás un número de seguimiento.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {warning && (
            <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-400">
              ⚠️ {warning}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400 font-semibold">
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Tipo de reporte
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["incidencia", "solicitud"] as Tipo[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTipo(t);
                      setCategoria(t === "incidencia" ? "hardware" : "software_licencia");
                      setSoftwareId("");
                      setSoftwareTexto("");
                      setFechaLimite("");
                    }}
                    className={`rounded-xl border py-3 text-sm font-semibold transition-all ${
                      tipo === t
                        ? "border-blue-500 bg-blue-500/20 text-blue-300 shadow-md"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {t === "incidencia" ? "🔧 Incidencia" : "📋 Solicitud"}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Categoria)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>{labelCategoria[c]}</option>
                ))}
              </select>
            </div>

            {/* Código de inventario */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Código de inventario del equipo
              </label>
              <input
                type="text"
                required
                placeholder="Ej: LAB02-PC15 (visible en el equipo)"
                value={equipoId}
                onChange={(e) => setEquipoId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50"
              />
              <p className="mt-1 text-xs text-slate-600">
                El código está pegado físicamente en la PC o monitor.
              </p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Descripción del problema
              </label>
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={4}
                placeholder="Describe el problema con el mayor detalle posible..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50"
              />
              <p className="text-right text-xs text-slate-600">{descripcion.length}/500</p>
            </div>

            {/* Campos extra para Solicitud */}
            {tipo === "solicitud" && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Software requerido
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre del software (si no está en catálogo)"
                    value={softwareTexto}
                    onChange={(e) => setSoftwareTexto(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Fecha límite (opcional)
                  </label>
                  <input
                    type="date"
                    value={fechaLimite}
                    onChange={(e) => setFechaLimite(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
            >
              {loading ? "Enviando reporte…" : "Enviar Reporte →"}
            </button>
          </form>
        </div>
        </div>
      </div>
    </main>
  );
}
