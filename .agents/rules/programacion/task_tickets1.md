---
trigger: always_on
---

# Tasks: Módulo de Tickets (Incidencias y Solicitudes)

**Feature:** 001-tickets
**Basado en:** `specs/001-tickets/plan.md`
**Constitution de referencia:** v1.3
**Regla de ejecución:** cada tarea se implementa y se valida antes de pasar a la siguiente (Art. VIII, punto 3 — nada se genera de una sola vez). `[P]` = puede hacerse en paralelo con la tarea anterior si no comparte archivo.

---

## Fase A — Setup del proyecto

- [ ] **T001** — Inicializar proyecto Next.js (App Router + TypeScript) con `pnpm create next-app`.
- [ ] **T002** — Configurar `pnpm` según Constitution: `.npmrc` con `ignore-scripts=true` y `min-release-age=3`.
- [ ] **T003** — Instalar dependencias base: `prisma`, `@prisma/client`, `zod`, `next-auth` (Auth.js), `bcrypt`. `[P]`
- [ ] **T004** — Instalar Tailwind CSS + shadcn/ui. `[P]`
- [ ] **T005** — Crear `docker-compose.yml` con servicio MySQL (según lo acordado: Docker mínimo para la BD).
- [ ] **T006** — Instalar Vitest + Testing Library, configurar `vitest.config.ts`.

**Checkpoint A:** `pnpm dev` levanta la app vacía y `docker compose up` levanta MySQL sin errores.

---

## Fase B — Fundacional (bloquea todo lo demás)

- [ ] **T007** — Escribir `prisma/schema.prisma` completo tal como está en `plan.md` Sección 2 (todos los modelos y enums).
- [ ] **T008** — Correr `prisma migrate dev` inicial contra el MySQL de Docker.
- [ ] **T008b** — *(brecha detectada — optimización nunca formalizada)* Implementar `lib/prisma.ts` (singleton de `PrismaClient`, Art. XIV punto 6) — evita agotar conexiones de MySQL en el entorno serverless de Vercel. Todo `repository` importa de aquí, ninguno instancia `new PrismaClient()` por su cuenta.
- [ ] **T008c** — Agregar `@@index([fechaCreacion])` al modelo `Ticket` en `schema.prisma` (soporta el filtro por rango de fechas de HU-06) y correr una migración adicional.
- [ ] **T009** — Implementar `lib/api-response.ts` (helpers `ok()`/`fail()`) — Art. IX + IX v1.3.
- [ ] **T009b** — *(brecha detectada en Analyze)* Implementar `lib/logger.ts` (logger estructurado) — Art. X exige esto explícitamente y el plan original usaba `console.error` plano; corregido en `plan.md` Sección 5.4.
- [ ] **T010** — Implementar `lib/errors/domain-error.ts` (clase `DomainError`) — Art. X.
- [ ] **T010b** — *(brecha detectada: faltaba definir esto)* Definir el patrón de manejo de errores de **validación Zod** en las Server Actions: `schema.safeParse(input)`; si falla, devolver `fail(result.error.issues[0].message)` — nunca `JSON.stringify(result.error)` completo hacia el cliente (mismo principio del Art. X: no exponer detalle interno, en este caso del validador).
- [ ] **T011** — Configurar Auth.js (`lib/auth.ts`) con proveedor de credenciales + bcrypt para hash de contraseñas — Art. IV.
- [ ] **T012** — Escribir `prisma/seed.ts`: laboratorios, equipos base, un usuario de prueba por cada rol (`admin`, `tecnico`, `docente`, `estudiante`), catálogo de software. *(Sin histórico todavía — eso es T013. Depende de T011: las contraseñas de los usuarios de prueba se generan con `bcrypt.hash()`, igual que en producción — nunca texto plano, ni siquiera en datos de prueba.)*
- [ ] **T013** — Extender `prisma/seed.ts` con histórico simulado de 6 meses de tickets (Art. XII): incluir al menos 1 equipo con ≥5 tickets (recurrencia alta) y 1 equipo con 0 tickets, con `fechaCreacion`/`fechaCierre` distribuidas en el rango.
- [ ] **T014** — Correr el seed y verificar manualmente en Prisma Studio que los datos generados cumplen lo anterior.
- [ ] **T014b** — *(brecha detectada en Analyze)* Configurar en `vitest.config.ts` (o un script `pretest:integration`) que las pruebas de integración (T023, T050) ejecuten `prisma migrate reset --force` + seed **antes** de correr, para garantizar aislamiento entre corridas — el Artículo XII, punto 3, lo exige explícitamente y ninguna tarea anterior lo implementaba.

**Checkpoint B:** base de datos migrada y poblada; helpers de respuesta/error listos; no se puede avanzar a Fase C sin esto.

---

## Fase C — Historia de Usuario 1: Reportar una Incidencia (HU-01) — Prioridad P1

*Objetivo: un usuario autenticado puede reportar una falla de un equipo y recibir un número de ticket. Es la historia mínima que hace el sistema útil por sí solo.*

- [ ] **T015 [P]** — Escribir `lib/validators/ticket.validators.ts`: `crearTicketSchema` (Zod) con las reglas de HU-01 (descripción 10–500 caracteres, categoría enum, equipoId requerido).
- [ ] **T016** — Escribir prueba unitaria de `ticket.service.crear()` para el caso de éxito (Art. V: prueba antes de dar el service por completo).
- [ ] **T017** — Escribir prueba unitaria de `ticket.service.crear()` para Edge case 2 (equipo inexistente → `DomainError`).
- [ ] **T018** — Escribir prueba unitaria de `ticket.service.crear()` para HU-01 Criterio 7 (ticket duplicado de Incidencia → respuesta con `warning`, no error).
- [ ] **T019** — Implementar `lib/repositories/ticket.repository.ts` (solo `crear`, `buscarPorEquipoYEstado`).
- [ ] **T020** — Implementar `ticket.service.crear()` hasta que T016–T018 pasen.
- [ ] **T021** — Implementar Server Action `crearTicket` en `app/tickets/actions.ts`, con contexto de sesión (Plan Sección 5.5) — nunca recibe `usuarioId` del cliente.
- [ ] **T021b** — *(brecha detectada: faltaba antes de poder subir fotos)* Configurar Vercel Blob: variable de entorno `BLOB_READ_WRITE_TOKEN`, endpoint de subida firmada. Documentar en `.env.example`.
- [ ] **T022** — Implementar `app/tickets/nuevo/page.tsx`: formulario con selector de equipo, categoría, descripción, adjunto de foto opcional vía Vercel Blob (usa T021b).
- [ ] **T023** — Prueba de integración: simular `crearTicket` end-to-end contra la BD de test y verificar que el ticket queda `pendiente`.

**Checkpoint C:** un usuario puede reportar una incidencia completa, de UI a base de datos, con sus pruebas en verde. **Este es el primer punto del proyecto que es demostrable.**

---

## Fase D — Historia de Usuario 2: Solicitar recurso de software (HU-02) — Prioridad P1

- [ ] **T024 [P]** — Extender `crearTicketSchema` para el caso `tipo: solicitud` (campo `softwareId`/`softwareTexto` mutuamente excluyentes, `fechaLimite` opcional).
- [ ] **T025** — Prueba unitaria: crear Solicitud con software del catálogo.
- [ ] **T026** — Prueba unitaria: crear Solicitud con software en texto libre — verificar que **no** se crea entrada nueva en `Software` (Clarify #4).
- [ ] **T027** — Extender `ticket.service.crear()` para soportar ambos casos hasta que T025–T026 pasen.
- [ ] **T028** — Extender el formulario de `nuevo/page.tsx` con los campos de Solicitud (reusa T022, no duplica formulario).

**Checkpoint D:** ambos tipos de ticket (Incidencia y Solicitud) se pueden crear desde la misma UI.

---

## Fase E — Historia de Usuario 3 y 4: Gestión y priorización (HU-03, HU-04) — Prioridad P2

- [ ] **T029 [P]** — Prueba unitaria de `calcularPrioridad()` (Plan Sección 6) — casos: hardware→alta, software_general→media, solicitud con distintos `fechaLimite`.
- [ ] **T030 [P]** — Prueba unitaria de `estaAtrasado()` — casos límite en 47h/48h/49h.
- [ ] **T031** — Implementar ambas funciones puras en `ticket.service.ts` hasta que T029–T030 pasen.
- [ ] **T032** — Prueba unitaria: técnico se asigna un ticket sin dueño → éxito.
- [ ] **T033** — Prueba unitaria: técnico intenta asignarse un ticket ya asignado → `DomainError` (Edge case 4).
- [ ] **T034** — Prueba unitaria: admin reasigna un ticket ya asignado → éxito (Clarify #5); técnico (no admin) intenta lo mismo → `DomainError`.
- [ ] **T035** — Implementar `ticket.service.asignar()` y `ticket.service.reasignar()` hasta que T032–T034 pasen.
- [ ] **T036** — Prueba unitaria: cambiar estado sin rol técnico/admin → `DomainError` (Edge case 5).
- [ ] **T037** — Prueba unitaria: transición inválida `resuelto → pendiente` → `DomainError`.
- [ ] **T038** — Prueba unitaria: resolver sin `comentarioCierre` → `DomainError`.
- [ ] **T039** — Implementar `ticket.service.cambiarEstado()` hasta que T036–T038 pasen.
- [ ] **T040** — Server Actions `asignarTicket`, `reasignarTicket`, `cambiarEstadoTicket` en `app/tickets/actions.ts`.
- [ ] **T041** — Implementar `app/tickets/page.tsx`: panel del técnico con filtros (laboratorio, tipo, categoría, estado) — Art. XI, lectura vía Server Component. *(Nota de brecha resuelta: el filtro por "prioridad" no puede ir en la query de Prisma porque `prioridad` no es un campo de la BD (Clarify #2) — la ruta trae los tickets ya filtrados por los campos de BD, y aplica `calcularPrioridad()` en memoria sobre ese subconjunto antes de ordenarlos. Decisión aceptable para el volumen esperado de un campus universitario; si el proyecto creciera a miles de tickets simultáneos, se reevaluaría materializar `prioridad` como campo — pero eso está fuera de alcance del MVP.)*
- [ ] **T041b** — *(brecha de optimización detectada)* Implementar paginación por cursor en `ticket.repository.listar()` (Art. XIV, punto 2) y consumirla desde `app/tickets/page.tsx` — nunca traer todos los tickets de una sola query a medida que crece el histórico del semestre.

**Checkpoint E:** el técnico puede gestionar el ciclo de vida completo de un ticket desde el panel.

---

## Fase F — Historia de Usuario 1 y 7 (continuación): efectos automáticos al resolver — Prioridad P1

*Se separa de la Fase C porque depende de `equipo.service.ts`, que aún no existía.*

- [ ] **T042 [P]** — Prueba unitaria: resolver Incidencia `hardware` → `Equipo.estado` pasa a `operativo` (Clarify #1).
- [ ] **T043 [P]** — Prueba unitaria: resolver Incidencia `hardware` con otro ticket del mismo equipo aún abierto → `Equipo.estado` permanece `mantenimiento`.
- [ ] **T044 [P]** — Prueba unitaria: resolver Solicitud de software → upsert en `EquipoSoftware` (Clarify #7).
- [ ] **T045** — Implementar `lib/services/equipo.service.ts` hasta que T042–T044 pasen.
- [ ] **T046** — Conectar `ticket.service.cambiarEstado()` con `equipo.service.ts` cuando `nuevoEstado === "resuelto"`.
- [ ] **T047** — Confirmar en T040 que `cambiarEstadoTicket` llama `revalidatePath("/laboratorios")` tras resolver (Art. XI).

**Checkpoint F:** resolver un ticket refleja el cambio en tiempo real en la vista de laboratorios (HU-05, Criterio 2), sin intervención manual del técnico sobre el equipo.

---

## Fase G — Historia de Usuario 5: Consulta de estado para docentes (HU-05) — Prioridad P1

- [ ] **T048** — Implementar `equipo.repository.ts`: consulta de equipos por laboratorio con su software instalado y flag de "tiene tickets abiertos". *(Usar `select` explícito con los campos exactos que consume la vista — Art. XIV, punto 1; nunca `findMany()` sin `select`.)*
- [ ] **T049** — Implementar `app/laboratorios/page.tsx`: vista pública (cualquier rol autenticado) con estado de equipos y software — Server Component, sin `useEffect`/`fetch`.
- [ ] **T049b** — *(brecha de optimización detectada)* Mostrar `fotoUrl` de tickets asociados con `next/image` (Art. XIV, punto 3) en `app/tickets/[id]/page.tsx`, nunca `<img>` plano.
- [ ] **T050** — Prueba de integración: resolver un ticket de hardware y verificar que la siguiente carga de `/laboratorios` refleja `operativo`.

**Checkpoint G:** un docente puede consultar el estado de un laboratorio antes de su clase — cierra el ciclo completo de la historia de valor principal del sistema.

---

