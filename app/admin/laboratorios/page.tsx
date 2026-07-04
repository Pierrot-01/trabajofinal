// app/admin/laboratorios/page.tsx — Gestión de Laboratorios (HU-01, HU-05 admin)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as laboratorioService from "@/lib/services/laboratorio.service";
import AdminLaboratoriosClient from "@/app/admin/laboratorios/AdminLaboratoriosClient";
import Link from "next/link";

export default async function AdminLaboratoriosPage() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") redirect("/login");

  const laboratorios = await laboratorioService.listarConEquipos();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            EPIS UNSCH — Admin
          </span>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link href="/admin/equipos" className="hover:text-slate-200">Equipos</Link>
            <Link href="/admin/software" className="hover:text-slate-200">Software</Link>
            <Link href="/admin/usuarios" className="hover:text-slate-200">Usuarios</Link>
            <Link href="/tickets" className="hover:text-slate-200">Tickets</Link>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <AdminLaboratoriosClient laboratoriosIniciales={laboratorios as any} />
      </div>
    </main>
  );
}
