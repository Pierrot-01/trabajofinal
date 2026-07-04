---
trigger: always_on
---

# Tasks: Módulo de Catálogo de Software
 
**Feature:** 004-software
**Basado en:** `specs/004-software/plan.md`
 
---
 
## Fase A' — CRUD básico (HU-01, HU-02) — Prioridad P2
 
- [ ] **T301 [P]** — `software.validators.ts`: `crearSoftwareSchema`, `editarSoftwareSchema`.
- [ ] **T302** — Prueba unitaria: crear software con nombre único → éxito.
- [ ] **T303** — Prueba unitaria: crear software con nombre duplicado → `DomainError` (Edge case 1).
- [ ] **T304** — Implementar `software.service.crear()` y `editar()` hasta que T302–T303 pasen.
- [ ] **T305** — Server Actions `crearSoftware`, `editarSoftware` + `app/admin/software/page.tsx`, protegido a `admin`.
---
 
## Fase B' — Eliminación segura (HU-03) — Prioridad P2
 
- [ ] **T306 [P]** — Prueba unitaria: `contarRelaciones()` devuelve la suma correcta de `EquipoSoftware` + `Ticket` para un software dado.
- [ ] **T307** — Prueba unitaria: eliminar software con relaciones > 0 → `DomainError` (Edge case 2).
- [ ] **T308** — Prueba unitaria: eliminar software sin relaciones → éxito, se elimina físicamente.
- [ ] **T309** — Implementar `software.service.eliminar()` hasta que T307–T308 pasen.
- [ ] **T310** — Server Action `eliminarSoftware` + botón correspondiente en la UI.
---
 
## Fase C' — Cierre
 
- [ ] **T311** — Correr `pnpm test` completo del módulo.