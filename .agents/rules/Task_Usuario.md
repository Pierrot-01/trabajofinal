---
trigger: always_on
---

# Tasks: Módulo de Usuarios y Autenticación
 
**Feature:** 002-usuarios
**Basado en:** `specs/002-usuarios/plan.md`
**Nota:** Fases A (Setup) y B (Fundacional: `lib/api-response.ts`, `lib/errors/domain-error.ts`, `lib/logger.ts`, `lib/prisma.ts`) ya existen desde `001-tickets` — no se repiten. Solo se extiende `schema.prisma` y se agregan las tareas específicas de este módulo.
 
---
 
## Fase A' — Extensión del schema
 
- [ ] **T101** — Agregar `activo: Boolean @default(true)` al modelo `Usuario` y el modelo `PasswordResetToken` completo en `schema.prisma` (Plan Sección 1). Migrar.
---
 
## Fase B' — Login (HU-01) — Prioridad P0
 
- [ ] **T102 [P]** — Configurar Auth.js (`lib/auth.ts`) con Credentials provider (Plan Sección 6).
- [ ] **T103** — Prueba unitaria: `usuario.service.validarLogin()` con credenciales correctas y cuenta activa → éxito.
- [ ] **T104** — Prueba unitaria: contraseña incorrecta → `null` (mensaje genérico, HU-01 Criterio 1).
- [ ] **T105** — Prueba unitaria: cuenta con `activo: false` → rechazo con mensaje específico (Edge case 4).
- [ ] **T106** — Prueba unitaria: 5 intentos fallidos consecutivos → bloqueo temporal de 15 minutos (Edge case 5).
- [ ] **T107** — Implementar `usuario.service.validarLogin()` hasta que T103–T106 pasen.
- [ ] **T108** — Implementar `app/login/page.tsx`.
**Checkpoint B':** cualquier usuario de prueba del seed puede iniciar sesión.
 
---
 
## Fase C' — Admin crea y gestiona cuentas (HU-02, HU-03) — Prioridad P0
 
- [ ] **T109 [P]** — `usuario.validators.ts`: `crearUsuarioSchema` con `correoInstitucionalSchema` (Plan Sección 3).
- [ ] **T110** — Prueba unitaria: crear usuario con correo no institucional → rechazado por Zod (Edge case 1), nunca llega al `service`.
- [ ] **T111** — Prueba unitaria: crear usuario con correo institucional válido y único → éxito, contraseña hasheada.
- [ ] **T112** — Prueba unitaria: crear usuario con correo ya existente → `DomainError`.
- [ ] **T113** — Implementar `usuario.service.crear()` hasta que T110–T112 pasen.
- [ ] **T114** — Prueba unitaria: `validarNoUltimoAdmin()` — desactivar/degradar al único admin → `DomainError` (Clarify #4).
- [ ] **T115** — Prueba unitaria: desactivar un admin cuando hay más de uno activo → éxito.
- [ ] **T116** — Prueba unitaria: admin intenta cambiar su propio rol → `DomainError` (HU-03 Criterio 2).
- [ ] **T117** — Implementar `usuario.service.cambiarRol()` y `usuario.service.desactivar()` hasta que T114–T116 pasen.
- [ ] **T118** — Server Actions `crearUsuario`, `cambiarRol`, `desactivarUsuario` en `app/admin/usuarios/actions.ts` — contexto de sesión vía `auth()`, nunca `usuarioId` del cliente (mismo patrón del Art. IV que en `001-tickets`).
- [ ] **T119** — Implementar `app/admin/usuarios/page.tsx`: lista paginada (Art. XIV) + acciones, protegida por middleware para rol `admin` únicamente.
**Checkpoint C':** el admin gestiona el ciclo de vida completo de una cuenta.
 
---
 
## Fase D' — Cambio y recuperación de contraseña (HU-04, HU-05) — Prioridad P1
 
- [ ] **T120 [P]** — Prueba unitaria: cambiar contraseña con la actual correcta → éxito.
- [ ] **T121 [P]** — Prueba unitaria: cambiar contraseña con la actual incorrecta → `DomainError`.
- [ ] **T122** — Implementar `usuario.service.cambiarPassword()` hasta que T120–T121 pasen.
- [ ] **T123** — Implementar `app/cuenta/page.tsx` + Server Action `cambiarPassword`.
- [ ] **T124 [P]** — Prueba unitaria: solicitar recuperación con correo existente vs inexistente → misma respuesta genérica en ambos casos (Edge case, no enumeración).
- [ ] **T125 [P]** — Prueba unitaria: usar un token expirado o ya usado → `DomainError` (Edge case 2).
- [ ] **T126** — Implementar `usuario.service.solicitarRecuperacion()` y `resetearPassword()` hasta que T124–T125 pasen (incluye el hashing del token, Plan Sección 5).
- [ ] **T127** — Implementar `app/recuperar-password/page.tsx` y `[token]/page.tsx`.
- [ ] **T128** — Configurar envío real de correo (proveedor a definir — ej. Resend, dado que es compatible con Vercel; **si no se decide aquí, queda como ambigüedad para Clarify antes de esta tarea**, por Art. XIII).
**Checkpoint D':** ciclo completo de autenticación autoservicio, sin depender del admin para cada cambio de contraseña.
 
---
 
## Fase E' — Cierre
 
- [ ] **T129** — Extender `prisma/seed.ts` (de `001-tickets`) para que los 4 usuarios de prueba tengan `activo: true` y contraseñas hasheadas consistentes con este módulo.
- [ ] **T130** — Correr `pnpm test` completo del módulo antes de pasar a Analyze conjunto.
---
 
## Nota de ambigüedad pendiente (Art. XIII aplicado)
 
**T128** depende de una decisión no tomada todavía: **qué proveedor de envío de correo se usa** para el enlace de recuperación. No se asume ninguno por defecto — se debe resolver explícitamente (ej. Resend, SendGrid, o el SMTP institucional de la UNSCH si existe) antes de ejecutar esa tarea.