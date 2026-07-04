// app/recuperar-password/page.tsx — Solicitar enlace de recuperación (HU-05)
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { solicitarEnlaceRecuperacion } from "./actions";

export default function RecuperarPasswordPage() {
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setIsLoading(true);

    try {
      const res = await solicitarEnlaceRecuperacion({ correo });
      if (res.success) {
        // Mensaje genérico para no dar pistas si el correo existe o no (HU-05 Criterio 1)
        setMensaje("Si el correo existe en nuestro sistema, se ha enviado un enlace de recuperación válido por 1 hora.");
        setCorreo("");
      } else {
        setError(res.error);
      }
    } catch {
      setError("Ocurrió un error. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 py-12 text-white">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-slate-700/50">
        
        {/* Encabezado */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            Recuperar Contraseña
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            Ingresa tu correo institucional para recibir un enlace de acceso temporal.
          </p>
        </div>

        {/* Formulario */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {mensaje && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400 font-medium">
              {mensaje}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="correo" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Correo Institucional
              </label>
              <input
                id="correo"
                name="correo"
                type="email"
                required
                placeholder="nombre.apellido@unsch.edu.pe"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                disabled={isLoading}
                className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 shadow-inner outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="relative flex w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-98 disabled:opacity-50"
            >
              {isLoading ? "Procesando..." : "Enviar Enlace"}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </form>

      </div>
    </main>
  );
}
