// app/laboratorios/page.tsx — Vista pública de estado de equipos (HU-05)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";

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

  // Art. XIV punto 1: select explícito con campos necesarios para esta vista
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

  const estadoColor: Record<string, string> = {
    operativo: "bg-emerald-500",
    mantenimiento: "bg-yellow-500",
    inoperativo: "bg-red-500",
  };

  const estadoLabel: Record<string, string> = {
    operativo: "Operativo",
    mantenimiento: "En mantenimiento",
    inoperativo: "Inoperativo",
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/tickets" className="shrink-0 text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            EPIS UNSCH
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/tickets" className="text-xs text-slate-400 hover:text-slate-200 transition-colors hidden sm:inline">
              Tickets
            </Link>
            <Link href="/tickets/nuevo" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">
              + Reportar
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Estado de Laboratorios</h1>
          <p className="mt-2 text-sm text-slate-500">
            Consulta el estado actual de los equipos antes de tu clase.
          </p>
        </div>

        {/* Leyenda */}
        <div className="mb-8 flex flex-wrap gap-4 text-xs">
          {Object.entries(estadoLabel).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${estadoColor[key]}`} />
              <span className="text-slate-400">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-slate-400">Con incidencias abiertas</span>
          </div>
        </div>

        <div className="space-y-8">
          {laboratorios.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 p-16 text-center text-slate-600">
              No hay laboratorios registrados todavía.
            </div>
          )}

          {(laboratorios as any as Laboratorio[]).map((lab) => (
            <div key={lab.id} className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{lab.nombre}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    📍 {lab.ubicacion} · {lab.capacidad} puestos
                  </p>
                </div>
                <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
                  {lab.equipos.length} equipos
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {lab.equipos.map((eq: Equipo) => {
                  const tieneTicketAbierto = eq.tickets.length > 0;
                  return (
                    <div
                      key={eq.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition-all"
                      title={`${eq.codigoInventario} — ${estadoLabel[eq.estado]}`}
                    >
                      {/* Indicador de estado */}
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${estadoColor[eq.estado]} ${tieneTicketAbierto ? "animate-pulse" : ""}`}
                        />
                        <span className="font-mono text-xs font-semibold text-slate-300 truncate">
                          {eq.codigoInventario}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 capitalize">{estadoLabel[eq.estado]}</div>
                      {tieneTicketAbierto && (
                        <div className="mt-1.5 text-xs text-orange-400 font-semibold">
                          ⚠️ Incidencia abierta
                        </div>
                      )}
                      {/* Software instalado */}
                      {eq.softwareInstalado.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {eq.softwareInstalado.slice(0, 3).map((es: SoftwareInstalado) => (
                            <span key={es.software.nombre} className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-500" style={{ fontSize: "10px" }}>
                              {es.software.nombre}
                            </span>
                          ))}
                          {eq.softwareInstalado.length > 3 && (
                            <span className="text-slate-600" style={{ fontSize: "10px" }}>+{eq.softwareInstalado.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
