// app/admin/usuarios/page.tsx — Panel de administración de usuarios (HU-03)
import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as usuarioRepository from "@/lib/repositories/usuario.repository";
import UserManagementClient from "@/app/admin/usuarios/UserManagementClient";
import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";

interface PageProps {
  searchParams: Promise<{
    cursor?: string;
  }>;
}

export default async function AdminUsuariosPage({ searchParams }: PageProps) {
  // 1. Proteger acceso del lado servidor (Art. IV, punto 1)
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") {
    redirect("/login");
  }

  // Resolver searchParams de forma asíncrona (Next.js 15+)
  const resolvedParams = await searchParams;
  const cursor = resolvedParams.cursor;

  // 2. Obtención de datos (Art. XI, punto 1) con paginación por cursor (Art. XIV, punto 2)
  const { items: usuarios, nextCursor } = await usuarioRepository.listarPaginado({
    cursor,
    take: 10,
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra de navegación simple */}
      <nav className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/tickets" className="shrink-0 text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            EPIS UNSCH
          </Link>

          {/* Links de navegación (ocultos en mobile pequeño) */}
          <div className="hidden sm:flex gap-3 text-xs text-slate-400">
            <Link href="/laboratorios" className="hover:text-slate-200 transition-colors">Laboratorios</Link>
            <Link href="/tickets" className="hover:text-slate-200 transition-colors">Tickets</Link>
            <Link href="/admin/equipos" className="hover:text-slate-200 transition-colors">Equipos</Link>
            <Link href="/admin/software" className="hover:text-slate-200 transition-colors">Software</Link>
          </div>

          {/* Usuario + Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500 font-semibold bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
              {session.user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cliente interactivo de gestión */}
          <UserManagementClient 
            usuariosIniciales={usuarios} 
            nextCursor={nextCursor} 
            currentUserId={session.user.id} 
          />
        </div>
      </div>
    </main>
  );
}
