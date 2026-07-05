// app/admin/software/page.tsx — Gestión del Catálogo de Software (HU-01, HU-02, HU-03) - Kinetic Lab Style
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as softwareService from "@/lib/services/software.service";
import AdminSoftwareClient from "./AdminSoftwareClient";
import Sidebar from "@/app/components/Sidebar";

export default async function AdminSoftwarePage() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") redirect("/login");

  const catalogo = await softwareService.listar();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <Sidebar userNombre={session.user.name ?? "Admin"} userRol={session.user.rol} />
      
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-10 pb-6 border-b border-white/5 bg-slate-950/10">
          <h1 className="font-outfit text-4xl font-semibold text-slate-100">
            Catálogo de Software
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Administra los programas y licencias disponibles para instalación en equipos.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <AdminSoftwareClient catalogoInicial={catalogo as any} />
        </div>
      </main>
    </div>
  );
}
