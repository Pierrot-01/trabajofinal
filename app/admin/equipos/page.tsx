// app/admin/equipos/page.tsx — Gestión de Equipos (HU-02, HU-03, HU-04, HU-05 admin) — Kinetic Lab
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as equipoRepository from "@/lib/repositories/equipo.repository";
import * as laboratorioService from "@/lib/services/laboratorio.service";
import AdminEquiposClient from "@/app/admin/equipos/AdminEquiposClient";
import Sidebar from "@/app/components/Sidebar";

interface PageProps {
  searchParams: Promise<{ cursor?: string }>;
}

export default async function AdminEquiposPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") redirect("/login");

  const params = await searchParams;
  const { items: equipos, nextCursor } = await equipoRepository.listarPaginado({
    cursor: params.cursor,
    take: 20,
    incluirDadosDeBaja: true,
  });

  const laboratorios = await laboratorioService.listar();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar userNombre={session.user.name ?? "Admin"} userRol={session.user.rol} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-8 pt-10 pb-6">
          <h1 className="font-outfit text-4xl font-semibold" style={{ color: "var(--foreground)" }}>
            Inventario de Equipos
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Gestiona el ciclo de vida de los equipos de cómputo.
          </p>
        </div>
        <div className="px-8 pb-10">
          <AdminEquiposClient
            equiposIniciales={equipos as any}
            nextCursor={nextCursor}
            laboratorios={laboratorios as any}
          />
        </div>
      </main>
    </div>
  );
}
