// app/cuenta/CuentaClient.tsx — Formulario de cambio de contraseña con estilo Kinetic Lab
"use client";

import React, { useState } from "react";
import { cambiarPasswordPropia } from "./actions";

interface Props {
  userNombre: string;
  userRol: string;
}

export default function CuentaClient({ userNombre: _userNombre, userRol: _userRol }: Props) {
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
    <div className="max-w-md mx-auto">
      <div className="kl-card p-8 bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl">
        <h2 className="font-outfit text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-[#cfbcff]">lock</span>
          Seguridad de la Cuenta
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Actualiza tu contraseña de acceso para mantener la confidencialidad de tu clearance.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              ⚠️ {error}
            </div>
          )}

          {mensaje && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              ✓ {mensaje}
            </div>
          )}

          <div className="space-y-1">
            <label className="kl-label">Contraseña Actual</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              disabled={isLoading}
              className="kl-input"
            />
          </div>

          <div className="space-y-1">
            <label className="kl-label">Nueva Contraseña</label>
            <input
              type="password"
              required
              placeholder="Mínimo 8 caracteres"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              disabled={isLoading}
              className="kl-input"
            />
          </div>

          <div className="space-y-1">
            <label className="kl-label">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              required
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="kl-input"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="kl-btn-primary w-full justify-center mt-4 py-2.5"
          >
            {isLoading ? "Guardando..." : "Actualizar Contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
