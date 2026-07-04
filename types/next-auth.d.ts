// types/next-auth.d.ts — Extensión de tipos para Auth.js
// Agrega el campo `rol` al objeto de sesión del usuario.

import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    rol: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      rol: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    rol: string;
  }
}
