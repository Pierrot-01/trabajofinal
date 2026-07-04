// app/login/page.tsx — Vista premium de inicio de sesión (HU-01)
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginAction(correo, password);
      if (res.success) {
        // Redirigir al panel principal de tickets
        router.push("/tickets");
        router.refresh();
      } else {
        setError(res.error || "Ocurrió un error inesperado.");
      }
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 py-12 text-white">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-slate-700/50">
        
        {/* Encabezado */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            EPIS — UNSCH
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            Sistema de Gestión de Mantenimiento de Laboratorios
          </p>
        </div>

        {/* Formulario */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 animate-pulse">
              <span className="font-semibold">Error:</span> {error}
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
                className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 shadow-inner outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Contraseña
                </label>
                <Link
                  href="/recuperar-password"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  ¿La olvidaste?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 shadow-inner outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="relative flex w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-98 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                "Ingresar al Sistema"
              )}
            </button>
          </div>
        </form>

      </div>
    </main>
  );
}
