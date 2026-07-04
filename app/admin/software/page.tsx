// app/admin/software/page.tsx — Gestión del Catálogo de Software (HU-01, HU-02, HU-03)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as softwareService from "@/lib/services/software.service";
import AdminSoftwareClient from "./AdminSoftwareClient";
import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";

export default async function AdminSoftwarePage() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") redirect("/login");

  const catalogo = await softwareService.listar();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/tickets" className="shrink-0 text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            EPIS UNSCH
          </Link>
          <div className="hidden sm:flex gap-3 text-xs text-slate-400">
            <Link href="/admin/laboratorios" className="hover:text-slate-200 transition-colors">Laboratorios</Link>
            <Link href="/admin/equipos" className="hover:text-slate-200 transition-colors">Equipos</Link>
            <Link href="/admin/usuarios" className="hover:text-slate-200 transition-colors">Usuarios</Link>
            <Link href="/tickets" className="hover:text-slate-200 transition-colors">Tickets</Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500 font-semibold bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
              {session.user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <AdminSoftwareClient catalogoInicial={catalogo as any} />
      </div>
    </main>
  );
}
