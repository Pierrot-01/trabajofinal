---
trigger: always_on
---

# Tasks: Módulo de Laboratorios y Equipos
 
**Feature:** 003-laboratorios-equipos
**Basado en:** `specs/003-laboratorios-equipos/plan.md`
 
---
 
## Fase A' — Migración del enum
 
- [ ] **T201** — Agregar `dado_de_baja` al enum `EstadoEquipo` en `schema.prisma` y migrar.
- [ ] **T202** — *(impacto cruzado con 001-tickets)* Ajustar el selector de equipos en `app/tickets/nuevo/page.tsx` (T022 de `001-tickets`) para excluir equipos `dado_de_baja`. Agregar prueba de integración que confirme que un equipo dado de baja no aparece como opción.
---
 
## Fase B' — Laboratorios (HU-01) — Prioridad P1
 
- [ ] **T203 [P]** — `laboratorio.validators.ts`: `crearLaboratorioSchema`.
- [ ] **T204** — Prueba unitaria: crear laboratorio con datos válidos → éxito.
- [ ] **T205** — Implementar `laboratorio.service.crear()` hasta que T204 pase.
- [ ] **T206** — Server Action `crearLaboratorio` + `app/admin/laboratorios/page.tsx`, protegido a `admin` (Edge case 4).
---
 
## Fase C' — Equipos: alta y edición (HU-02, HU-03) — Prioridad P0
 
*Nota: `equipo.service.ts` y `equipo.repository.ts` ya existen desde `001-tickets` (T045) — aquí se extienden, no se recrean.*
 
- [ ] **T207 [P]** — `equipo.validators.ts`: `crearEquipoSchema`, `editarEquipoSchema`.
- [ ] **T208** — Prueba unitaria: crear equipo con código de inventario único y laboratorio existente → éxito.
- [ ] **T209** — Prueba unitaria: código de inventario duplicado → `DomainError` (Edge case 1).
- [ ] **T210** — Prueba unitaria: `laboratorioId` inexistente → `DomainError` (Edge case 3).
- [ ] **T211** — Extender `equipo.service.ts` con `crear()` hasta que T208–T210 pasen.
- [ ] **T212** — Prueba unitaria: `editarEstado()` con tickets abiertos → respuesta `success: true` + `warning` (HU-03 Criterio 1, no bloqueo).
- [ ] **T213** — Prueba unitaria: `editarEstado()` sin tickets abiertos → respuesta limpia sin `warning`.
- [ ] **T214** — Extender `equipo.service.ts` con `editarEstado()` hasta que T212–T213 pasen.
- [ ] **T215** — Server Actions `crearEquipo`, `editarEquipo` + UI en `app/admin/equipos/page.tsx`.
**Checkpoint C':** el admin puede dar de alta y editar equipos, con las advertencias correctas.
 
---
 
## Fase D' — Baja de equipos (HU-04) — Prioridad P1
 
- [ ] **T216 [P]** — Prueba unitaria: `darDeBaja()` con tickets `pendiente`/`en_proceso` abiertos → `DomainError` (Edge case 2, bloqueo real — distinto del `warning` de T212).
- [ ] **T217 [P]** — Prueba unitaria: `darDeBaja()` sin tickets abiertos → éxito, estado pasa a `dado_de_baja`.
- [ ] **T218** — Extender `equipo.service.ts` con `darDeBaja()` hasta que T216–T217 pasen.
- [ ] **T219** — Server Action `darDeBajaEquipo` + botón correspondiente en `app/admin/equipos/page.tsx`.
---
 
## Fase E' — Catálogo administrativo (HU-05) — Prioridad P2
 
- [ ] **T220** — Extender `equipo.repository.ts`/`laboratorio.repository.ts` con listados paginados que incluyan equipos `dado_de_baja` (a diferencia de la vista pública de `001-tickets`, que los excluye) — Art. XIV.
- [ ] **T221** — Confirmar que `app/admin/equipos/page.tsx` (T215) ya cubre esta vista; si no, completar filtros de laboratorio/estado.
---
 
## Fase F' — Cierre
 
- [ ] **T222** — Correr `pnpm test` completo del módulo, incluyendo la prueba cruzada de T202.