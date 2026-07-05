// app/admin/usuarios/UserManagementClient.tsx — Gestión de usuarios (Kinetic Lab Style)
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { crearUsuario, cambiarRolUsuario, desactivarUsuario } from "./actions";

type Rol = "admin" | "tecnico" | "docente" | "estudiante";

interface UsuarioItem {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  createdAt: Date;
}

interface Props {
  usuariosIniciales: UsuarioItem[];
  nextCursor: string | null;
  currentUserId: string;
}

const rolMeta: Record<Rol, { label: string; badgeCls: string; dotColor: string }> = {
  admin:      { label: "System Admin", badgeCls: "kl-badge kl-badge-admin", dotColor: "#cfbcff" },
  tecnico:    { label: "Lead Tech",    badgeCls: "kl-badge kl-badge-tecnico", dotColor: "#4edea3" },
  docente:    { label: "Faculty Member", badgeCls: "kl-badge kl-badge-docente", dotColor: "#e7c365" },
  estudiante: { label: "Student",      badgeCls: "kl-badge kl-badge-estudiante", dotColor: "#6b7a8d" },
};

function Avatar({ nombre }: { nombre: string }) {
  const initials = nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold font-mono border"
      style={{
        background: "rgba(103,80,164,0.15)",
        borderColor: "rgba(207,188,255,0.3)",
        color: "#cfbcff",
      }}
    >
      {initials}
    </div>
  );
}

export default function UserManagementClient({ usuariosIniciales, nextCursor, currentUserId }: Props) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<Rol>("docente");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filtro, setFiltro] = useState("");

  const router = useRouter();

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setIsLoading(true);
    try {
      const res = await crearUsuario({ nombre, correo, rol, password });
      if (res.success) {
        setMensaje(`Usuario "${nombre}" registrado exitosamente.`);
        setNombre(""); setCorreo(""); setPassword(""); setRol("docente");
        setShowForm(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError("Ocurrió un error. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCambiarRol = async (id: string, nuevoRol: Rol) => {
    setError(null); setMensaje(null);
    try {
      const res = await cambiarRolUsuario(id, nuevoRol);
      if (res.success) { setMensaje("Rol de usuario actualizado."); router.refresh(); }
      else setError(res.error);
    } catch { setError("Error al cambiar el rol."); }
  };

  const handleDesactivar = async (id: string) => {
    if (!confirm("¿Desactivar esta cuenta? El usuario perderá acceso inmediato.")) return;
    setError(null); setMensaje(null);
    try {
      const res = await desactivarUsuario(id);
      if (res.success) { setMensaje("Usuario desactivado."); router.refresh(); }
      else setError(res.error);
    } catch { setError("Error al desactivar el usuario."); }
  };

  const usuariosFiltrados = usuariosIniciales.filter(u =>
    u.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    u.correo.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/10 p-1">
        <div className="flex bg-slate-950/40 rounded-lg p-1 border border-white/5 w-fit">
          <button className="px-4 py-2 rounded font-mono text-xs transition-all bg-surface-tint/20 text-[#cfbcff] border border-primary/20 shadow-sm">
            Personnel Registry
          </button>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="kl-btn-primary"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Provision User
        </button>
      </div>

      {/* Global notifications */}
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

      {/* Provision form */}
      {showForm && (
        <div className="kl-card p-6 bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl">
          <h3 className="font-outfit text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#cfbcff]">person_add</span>
            Provision new institutional account
          </h3>
          <form onSubmit={handleCrearUsuario} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="kl-label">Nombre Completo</label>
              <input type="text" required placeholder="e.g. Elena Rostova" value={nombre}
                onChange={(e) => setNombre(e.target.value)} disabled={isLoading} className="kl-input" />
            </div>
            <div className="space-y-1">
              <label className="kl-label">Correo Institucional (@unsch.edu.pe)</label>
              <input type="email" required placeholder="e.g. erostova@unsch.edu.pe" value={correo}
                onChange={(e) => setCorreo(e.target.value)} disabled={isLoading} className="kl-input" />
            </div>
            <div className="space-y-1">
              <label className="kl-label">Clearance Level (Rol)</label>
              <select value={rol} onChange={(e) => setRol(e.target.value as Rol)}
                disabled={isLoading} className="kl-input cursor-pointer">
                <option value="docente">Docente / Investigador</option>
                <option value="estudiante">Estudiante</option>
                <option value="tecnico">Técnico de Laboratorio</option>
                <option value="admin">Administrador del Sistema</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="kl-label">Contraseña Temporal</label>
              <input type="password" required placeholder="Min. 8 caracteres" value={password}
                onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="kl-input" />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={isLoading} className="kl-btn-primary">
                {isLoading ? "Creando..." : "Confirm Provision"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="kl-btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Data Container */}
      <div className="kl-card overflow-hidden bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl">
        {/* Search */}
        <div className="p-4 border-b border-white/5 bg-slate-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="kl-input pl-9"
            />
          </div>
          <span className="font-mono text-xs text-[#cfbcff] bg-[#cfbcff]/10 px-2.5 py-0.5 rounded border border-[#cfbcff]/20">
            {usuariosFiltrados.length} Personnel Active
          </span>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/30 text-slate-400 font-mono text-[10px] font-bold tracking-widest uppercase">
                <th className="py-3 px-4">Personnel</th>
                <th className="py-3 px-4">Institutional Email</th>
                <th className="py-3 px-4">Clearance / Role</th>
                <th className="py-3 px-4 text-right">Directives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    No se encontraron usuarios coincidentes.
                  </td>
                </tr>
              )}

              {usuariosFiltrados.map((usr) => {
                const isMe = usr.id === currentUserId;
                const meta = rolMeta[usr.rol];
                return (
                  <tr key={usr.id} className="hover:bg-white/[0.01] transition-colors">
                    {/* Personnel */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={usr.nombre} />
                        <div>
                          <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                            {usr.nombre}
                            {!usr.activo && (
                              <span className="kl-badge kl-badge-retired">Desactivado</span>
                            )}
                          </div>
                          <div className="sm:hidden text-xs text-slate-500 font-mono mt-0.5">{usr.correo}</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-slate-400">{usr.correo}</td>

                    {/* Clearance */}
                    <td className="py-3.5 px-4">
                      <span className={meta.badgeCls}>
                        <span className="w-1 h-1 rounded-full bg-current mr-1" />
                        {meta.label}{isMe ? " (Tú)" : ""}
                      </span>
                    </td>

                    {/* Directives */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isMe ? (
                          <span className="text-slate-500 font-mono italic text-[11px] pr-2">System Session</span>
                        ) : (
                          <>
                            <select
                              value={usr.rol}
                              onChange={(e) => handleCambiarRol(usr.id, e.target.value as Rol)}
                              className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none focus:border-[#cfbcff]/50 cursor-pointer"
                            >
                              <option value="docente">Docente</option>
                              <option value="estudiante">Estudiante</option>
                              <option value="tecnico">Técnico</option>
                              <option value="admin">Admin</option>
                            </select>

                            {usr.activo ? (
                              <button
                                onClick={() => handleDesactivar(usr.id)}
                                className="kl-btn-danger text-xs py-1 px-3"
                              >
                                <span className="material-symbols-outlined text-[13px]">person_off</span>
                                Deactivate
                              </button>
                            ) : (
                              <span className="text-xs text-slate-600 font-mono pr-2">Inactive</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {nextCursor && (
          <div className="p-4 border-t border-white/5 flex justify-center bg-slate-950/10">
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("cursor", nextCursor);
                window.location.href = url.toString();
              }}
              className="kl-btn-ghost text-xs"
            >
              Cargar más usuarios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
