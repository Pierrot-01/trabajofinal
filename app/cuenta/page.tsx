// app/cuenta/page.tsx — Perfil de usuario para cambiar contraseña propia (HU-04)
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cambiarPasswordPropia } from "./actions";

export default function CuentaPage() {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    if (passwordNueva !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await cambiarPasswordPropia({
        passwordActual,
        passwordNueva,
      });

      if (res.success) {
        setMensaje("Contraseña cambiada exitosamente.");
        setPasswordActual("");
        setPasswordNueva("");
        setConfirmPassword("");
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra de navegación simple */}
      <nav className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl justify-between items-center">
          <Link href="/tickets" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            EPIS UNSCH Mantenimiento
          </Link>
          <div className="flex gap-4">
            <Link href="/tickets" className="text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors">
              Tickets
            </Link>
            <Link href="/cuenta" className="text-sm font-semibold text-slate-200">
              Mi Cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-8 shadow-2xl backdrop-blur-md">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Seguridad de la Cuenta
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Actualiza tu contraseña de acceso para mantener tu cuenta segura.
          </p>

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
                <label htmlFor="passwordActual" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Contraseña Actual
                </label>
                <input
                  id="passwordActual"
                  name="passwordActual"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 shadow-inner outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="passwordNueva" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Nueva Contraseña
                </label>
                <input
                  id="passwordNueva"
                  name="passwordNueva"
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 shadow-inner outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 shadow-inner outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="relative flex w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-98 disabled:opacity-50"
              >
                {isLoading ? "Guardando..." : "Actualizar Contraseña"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
