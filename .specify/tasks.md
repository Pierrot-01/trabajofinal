# Tasks: Sistema de Gestión de Informes Técnicos e Inventario (EpisLab)
**Feature:** E-001-EpisLab-Core
**Basado en:** plan.md
**Constitution de referencia:** v1.8
**Estado:** Completado
**Regla de ejecución:** Cada tarea se implementa y valida antes de pasar a la siguiente (Art. VIII punto 3).
`[P]` = puede hacerse en paralelo con la tarea anterior si no comparte archivo.

---

## Fase 0 — Modelo de Datos (Prisma)
- [x] **T001** — Diseñar e implementar el schema de base de datos en `prisma/schema.prisma`.
  - Criterio: Ejecución limpia de `npx prisma generate` y aplicación de migraciones correctas con los índices necesarios para las búsquedas (ej. índices en `[equipoId, estado]` y `[tecnicoAsignadoId, estado]`).

**Checkpoint 0:** Base de datos migrada exitosamente. Modelos creados para todas las entidades.

---

## Fase 1 — Puertos / Contratos
- [x] **T002** — Crear la interfaz `IUsuarioRepository.ts` en `lib/ports/`.
- [x] **T003 [P]** — Crear la interfaz `ITicketRepository.ts` en `lib/ports/`.
- [x] **T004 [P]** — Crear la interfaz `IEquipoRepository.ts` en `lib/ports/`.
- [x] **T005 [P]** — Crear la interfaz `ISoftwareRepository.ts` en `lib/ports/`.

**Checkpoint 1:** Los contratos existen. Toda la capa de servicios se implementa dependiendo únicamente de las interfaces, no de la base de datos concreta.

---

## Fase 2 — Validadores
- [x] **T006** — Crear los validadores de Zod para la gestión de usuarios en `lib/validators/usuario.validators.ts`.
- [x] **T007 [P]** — Crear los validadores de Zod para tickets e incidencias en `lib/validators/ticket.validators.ts`.

---

## Fase 3 — Errores de Dominio
- [x] **T008** — Crear el archivo de manejo de excepciones base en `lib/errors/domain-error.ts` con todos los errores específicos requeridos (bloqueos, admin único, equipo inactivo).

---

## Fase 4 — Repositorio (Adaptadores de Salida)
- [x] **T009** — Implementar `usuario.repository.ts` en `lib/repositories/` heredando de `IUsuarioRepository`.
- [x] **T010 [P]** — Implementar `ticket.repository.ts` en `lib/repositories/` heredando de `ITicketRepository`.
- [x] **T011 [P]** — Implementar `equipo.repository.ts` en `lib/repositories/` heredando de `IEquipoRepository`.
- [x] **T012 [P]** — Implementar `software.repository.ts` en `lib/repositories/` heredando de `ISoftwareRepository`.

---

## Fase 5 — Servicios (Núcleo de Dominio)
- [x] **T013** — Implementar reglas de login seguro y bloqueo temporal en `lib/services/usuario.service.ts` (HU-2.1).
- [x] **T014** — Implementar regla de conservación de al menos un admin activo en `lib/services/usuario.service.ts` (HU-2.2).
- [x] **T015** — Implementar lógica de creación de tickets con avisos no bloqueantes en `lib/services/ticket.service.ts` (HU-1.1 y HU-1.2).
- [x] **T016** — Implementar transiciones de estado de tickets e impacto automático en equipos en `lib/services/ticket.service.ts` (HU-1.3).
- [x] **T017** — Implementar validaciones de estado de equipos (baja de equipo bloqueado) en `lib/services/equipo.service.ts` (HU-3.1).
- [x] **T018** — Implementar validación de eliminación de software en catálogo en `lib/services/software.service.ts` (HU-4.1).

---

## Fase 6 — Tests Unitarios
- [x] **T019** — Desarrollar pruebas unitarias para `usuario.service.test.ts` con mocks de repositorios (CAs de login, bloqueos, admin único).
- [x] **T020 [P]** — Desarrollar pruebas unitarias para `ticket.service.test.ts` (CAs de cambio de estado y transacciones).
- [x] **T021 [P]** — Desarrollar pruebas unitarias para `equipo.service.test.ts` y `software.service.test.ts`.

**Checkpoint 6:** `npm run test:coverage` (Vitest) pasa en verde para todos los módulos con cobertura superior al 90% en la capa de servicios. `dotnet test` se ejecuta limpiamente para la parte complementaria de C#.

---

## Fase 7 — Presentación
- [x] **T022** — Crear Server Actions en `app/tickets/actions.ts` y `app/admin/usuarios/actions.ts` retornando `{ success, data?, error?, warning? }`.
- [x] **T023** — Implementar vistas de paneles de tickets, laboratorios, usuarios e inventario en la carpeta `app/` utilizando Server Components.

**Checkpoint Final:** El sistema completo se despliega en Vercel, enlazado y validado en todas las capas del hexágono.

---

## Checklist de Coherencia
- [x] Ningún servicio importa `@prisma/client` o `lib/prisma` directamente.
- [x] Toda Server Action valida sus parámetros de entrada con Zod y obtiene la sesión mediante `auth()`.
- [x] Los tests unitarios simulan correctamente las interfaces de repositorio (`vi.fn()`).
- [x] Las pruebas unitarias cubren los casos felices, warnings y DomainErrors.
