// app/components/Sidebar.tsx — Navegación lateral Kinetic Lab
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/app/components/SignOutButton";

interface SidebarProps {
  userNombre: string;
  userRol: string;
}

// Íconos SVG inline (sin dependencia externa)
const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  tickets: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h7" />
      <path d="M16 3h5v5" />
      <path d="M21 3l-9 9" />
    </svg>
  ),
  labs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path d="M9 3v11.5a3.5 3.5 0 007 0V3" />
      <path d="M6.5 3h11" />
      <path d="M6 20h12" />
    </svg>
  ),
  inventory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="17" />
      <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  software: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

const rolLabel: Record<string, string> = {
  admin: "SysAdmin",
  tecnico: "Técnico",
  docente: "Docente",
  estudiante: "Estudiante",
};

export default function Sidebar({ userNombre, userRol }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const navItem = (href: string, icon: React.ReactNode, label: string) => (
    <Link
      href={href}
      className={`kl-nav-item ${isActive(href) ? "active" : ""}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );

  // Avatar con iniciales
  const initials = userNombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <aside
      className="flex h-screen w-60 shrink-0 flex-col border-r"
      style={{
        background: "var(--sidebar)",
        borderColor: "var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "var(--primary)", flexShrink: 0 }}
        >
          {/* Ícono de laboratorio */}
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5">
            <path d="M9 3v11.5a3.5 3.5 0 007 0V3" />
            <path d="M6.5 3h11" />
          </svg>
        </div>
        <div>
          <p className="font-outfit text-sm font-700 leading-tight" style={{ color: "var(--foreground)", fontWeight: 700 }}>
            EPIS Lab
          </p>
          <p className="font-geist text-[10px] leading-tight" style={{ color: "var(--muted-foreground)" }}>
            Precision Systems
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {navItem("/tickets", Icons.tickets, "Tickets")}
        {navItem("/laboratorios", Icons.labs, "Labs")}

        {(userRol === "admin" || userRol === "tecnico") && (
          navItem("/admin/equipos", Icons.inventory, "Inventario")
        )}

        {userRol === "admin" && (
          <>
            {navItem("/admin/laboratorios", Icons.labs, "Laboratorios")}
            {navItem("/admin/software", Icons.software, "Software")}
            {navItem("/admin/usuarios", Icons.users, "Usuarios")}
          </>
        )}

        <div className="pt-2 mt-2 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          {navItem("/cuenta", Icons.settings, "Mi cuenta")}
        </div>
      </nav>

      {/* User footer */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-t"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            {userNombre}
          </p>
          <p className="font-geist text-[10px]" style={{ color: "var(--muted-foreground)" }}>
            {rolLabel[userRol] ?? userRol}
          </p>
        </div>
        <SignOutButton compact />
      </div>
    </aside>
  );
}
