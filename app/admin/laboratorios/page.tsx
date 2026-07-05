// app/admin/laboratorios/page.tsx — Gestión de Laboratorios (HU-01, HU-05 admin)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as laboratorioService from "@/lib/services/laboratorio.service";
import AdminLaboratoriosClient from "@/app/admin/laboratorios/AdminLaboratoriosClient";
import Sidebar from "@/app/components/Sidebar";

export default async function AdminLaboratoriosPage() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") redirect("/login");

  const laboratorios = await laboratorioService.listarConEquipos();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar userNombre={session.user.name ?? "Admin"} userRol={session.user.rol} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-8 pt-10 pb-6">
          <h1 className="font-outfit text-4xl font-semibold" style={{ color: "var(--foreground)" }}>
            Laboratorios
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Administra los laboratorios y su catálogo de equipos.
          </p>
        </div>
        <div className="px-8 pb-10">
          <AdminLaboratoriosClient laboratoriosIniciales={laboratorios as any} />
        </div>
      </main>
    </div>
  );
}
