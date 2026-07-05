// app/components/SignOutButton.tsx
"use client";

import { signOut } from "next-auth/react";

interface Props {
  compact?: boolean;
}

export default function SignOutButton({ compact = false }: Props) {
  if (compact) {
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        title="Cerrar sesión"
        className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        style={{ color: "var(--muted-foreground)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ff7070")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="kl-btn-ghost flex items-center gap-1.5"
      title="Cerrar sesión"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span className="hidden sm:inline text-xs">Salir</span>
    </button>
  );
}
