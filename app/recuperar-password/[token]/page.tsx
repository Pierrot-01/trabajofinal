// app/recuperar-password/[token]/page.tsx — Restablecer contraseña con token (HU-05)
"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { resetearPasswordConToken } from "../actions";

export default function RestablecerPasswordPage() {
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const params = useParams();
  const router = useRouter();

  const token = params.token as string;

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
      const res = await resetearPasswordConToken({
        token,
        passwordNueva,
      });

      if (res.success) {
        setMensaje("Contraseña restablecida exitosamente. Redirigiendo al inicio de sesión...");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
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
            Nueva Contraseña
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            Establece tu nueva contraseña de acceso. Mínimo 8 caracteres.
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
                disabled={isLoading || !!mensaje}
                className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 shadow-inner outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Confirmar Contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading || !!mensaje}
                className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 shadow-inner outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isLoading || !!mensaje}
              className="relative flex w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-98 disabled:opacity-50"
            >
              {isLoading ? "Restableciendo..." : "Guardar Contraseña"}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Ir al inicio de sesión
              </Link>
            </div>
          </div>
        </form>

      </div>
    </main>
  );
}
