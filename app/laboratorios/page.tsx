// app/laboratorios/page.tsx — Vista pública de estado de equipos (HU-05) - Kinetic Lab Style
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/app/components/Sidebar";

interface SoftwareInstalado {
  software: {
    nombre: string;
    tipo: string;
  };
}

interface Equipo {
  id: string;
  codigoInventario: string;
  estado: string;
  softwareInstalado: SoftwareInstalado[];
  tickets: { id: string }[];
}

interface Laboratorio {
  id: string;
  nombre: string;
  ubicacion: string;
  capacidad: number;
  equipos: Equipo[];
}

export default async function LaboratoriosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Select explícito con campos necesarios para esta vista
  const laboratorios = await prisma.laboratorio.findMany({
    select: {
      id: true,
      nombre: true,
      ubicacion: true,
      capacidad: true,
      equipos: {
        where: { estado: { not: "dado_de_baja" } }, // Excluir dados de baja de la vista pública
        select: {
          id: true,
          codigoInventario: true,
          estado: true,
          softwareInstalado: {
            select: { software: { select: { nombre: true, tipo: true } } },
          },
          tickets: {
            where: { estado: { in: ["pendiente", "en_proceso"] } },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { nombre: "asc" },
  });

  const estadoBadge: Record<string, string> = {
    operativo: "kl-badge kl-badge-operative",
    mantenimiento: "kl-badge kl-badge-maintenance",
    inoperativo: "kl-badge kl-badge-inoperative",
  };

  const estadoLabel: Record<string, string> = {
    operativo: "Operativo",
    mantenimiento: "Mantenimiento",
    inoperativo: "Inoperativo",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      {/* Sidebar */}
      <Sidebar userNombre={session.user.name ?? "Usuario"} userRol={session.user.rol} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-10 pb-6 border-b border-white/5 bg-slate-950/10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-outfit text-4xl font-semibold text-slate-100">
                Estado de Laboratorios
              </h1>
              <p className="mt-1.5 text-sm text-slate-400">
                Consulta la disponibilidad y configuración de hardware en tiempo real.
              </p>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-2.5 p-1 bg-slate-900/40 rounded-lg border border-white/5 w-fit">
              {Object.entries(estadoLabel).map(([key, label]) => (
                <span key={key} className={estadoBadge[key]}>
                  ● {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Content Canvas */}
        <div className="px-8 py-8 space-y-8">
          {laboratorios.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 p-16 text-center text-slate-500">
              No hay laboratorios registrados en el sistema.
            </div>
          )}

          {(laboratorios as any as Laboratorio[]).map((lab) => (
            <div key={lab.id} className="kl-card p-6 bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl">
              {/* Lab Summary */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-white/5">
                <div>
                  <h2 className="font-outfit text-xl font-bold text-slate-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#cfbcff]">meeting_room</span>
                    {lab.nombre}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px] text-[#cfbcff]">location_on</span>
                    {lab.ubicacion}
                    <span className="text-slate-600">•</span>
                    <span className="material-symbols-outlined text-[13px] text-[#cfbcff]">devices</span>
                    {lab.capacidad} puestos
                  </p>
                </div>
                <span className="font-mono text-xs text-[#cfbcff] bg-[#cfbcff]/10 px-2.5 py-0.5 rounded border border-[#cfbcff]/20">
                  {lab.equipos.length} Equipos Activos
                </span>
              </div>

              {/* Workstations Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {lab.equipos.map((eq: Equipo) => {
                  const tieneTicketAbierto = eq.tickets.length > 0;

                  // Colores e íconos dinámicos del equipo
                  const statusColors: Record<string, { dot: string; bg: string; text: string; border: string }> = {
                    operativo: { dot: "#4edea3", bg: "rgba(78, 222, 163, 0.04)", text: "#4edea3", border: "rgba(78, 222, 163, 0.15)" },
                    mantenimiento: { dot: "#e7c365", bg: "rgba(231, 195, 101, 0.04)", text: "#e7c365", border: "rgba(231, 195, 101, 0.15)" },
                    inoperativo: { dot: "#ff7070", bg: "rgba(255, 112, 112, 0.04)", text: "#ff7070", border: "rgba(255, 112, 112, 0.15)" },
                  };

                  const activeStyle = statusColors[eq.estado] ?? statusColors.operativo;

                  return (
                    <div
                      key={eq.id}
                      className={`rounded-xl p-4 transition-all duration-300 border ${tieneTicketAbierto ? "shadow-[0_0_15px_rgba(231,195,101,0.1)]" : ""
                        }`}
                      style={{
                        background: activeStyle.bg,
                        borderColor: tieneTicketAbierto ? "rgba(231,195,101,0.4)" : activeStyle.border,
                      }}
                      title={`${eq.codigoInventario} — ${estadoLabel[eq.estado]}`}
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0`}
                            style={{
                              backgroundColor: activeStyle.dot,
                              animation: tieneTicketAbierto ? "pulse 2s infinite" : "none",
                            }}
                          />
                          <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                            {eq.codigoInventario}
                          </span>
                        </div>
                        <span className={estadoBadge[eq.estado]}>
                          {estadoLabel[eq.estado]}
                        </span>
                      </div>

                      {/* Alert banner if ticket open */}
                      {tieneTicketAbierto && (
                        <div className="mb-3 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-400 font-mono flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] animate-pulse">warning</span>
                          INCIDENCIA ACTIVA
                        </div>
                      )}

                      {/* Software installed */}
                      {eq.softwareInstalado.length > 0 ? (
                        <div className="pt-2 border-t border-white/5">
                          <p className="font-mono text-[9px] font-bold tracking-widest text-slate-500 mb-1.5 uppercase">SOFTWARE</p>
                          <div className="flex flex-wrap gap-1">
                            {eq.softwareInstalado.slice(0, 3).map((es: SoftwareInstalado) => (
                              <span key={es.software.nombre}
                                className="rounded px-1.5 py-0.5 font-geist"
                                style={{ fontSize: "9px", background: "var(--surface-high)", color: "var(--muted-foreground)" }}>
                                {es.software.nombre}
                              </span>
                            ))}
                            {eq.softwareInstalado.length > 3 && (
                              <span className="text-[9px] text-slate-500 font-mono self-center px-1">
                                +{eq.softwareInstalado.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-[9px] text-slate-600 font-mono italic">Sin software instalado</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Pulse keyframe for animations */}
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; transform: scale(1); } 50% { opacity:.4; transform: scale(1.1); } }
      `}</style>
    </div>
  );
}
