---
trigger: always_on
---

# Plan Técnico: Módulo de Laboratorios y Equipos
 
**Feature:** 003-laboratorios-equipos
**Basado en:** `specs/003-laboratorios-equipos/spec.md`
**Constitution de referencia:** v1.7
 
---
 
## 1. Modelo de datos (modifica el enum ya existente en `001-tickets`)
 
```prisma
enum EstadoEquipo {
  operativo
  mantenimiento
  inoperativo
  dado_de_baja   // nuevo — Constitution v1.7
}
```
 
**Importante:** este es un cambio al schema compartido de `001-tickets`, no un modelo nuevo. Requiere una migración adicional sobre la base ya existente, y **no rompe** ninguna lógica de `ticket.service.ts` porque ese módulo nunca asigna `dado_de_baja` — solo lee/escribe `operativo`/`mantenimiento` (Clarify #1 de `001-tickets`).
 
---
 
## 2. Estructura de carpetas
 
```
app/
  admin/
    laboratorios/
      page.tsx                → lista + crear laboratorio
      actions.ts                 → crearLaboratorio
    equipos/
      page.tsx                    → lista paginada (incluye dado_de_baja) + crear/editar/dar de baja
      actions.ts                     → crearEquipo, editarEquipo, darDeBajaEquipo
 
lib/
  services/
    laboratorio.service.ts             → crear, listar
    equipo.service.ts                    → ya existe desde 001-tickets (efectos automáticos al resolver ticket) — se EXTIENDE, no se duplica, con: crear, editar, darDeBaja
  repositories/
    laboratorio.repository.ts              → **nuevo** — `001-tickets` nunca creó este archivo; solo consultaba `Laboratorio` indirectamente vía `equipo.repository.ts` (join). *(Corrección detectada en Analyze: la redacción anterior decía "ya podría existir parcialmente", una duda que viola el espíritu del Art. XIII — se verifica con certeza en vez de dejarlo ambiguo.)*
    equipo.repository.ts                     → ya existe desde 001-tickets; se extiende con crear/editar/contarTicketsAbiertos
  validators/
    laboratorio.validators.ts                  → crearLaboratorioSchema
    equipo.validators.ts                         → crearEquipoSchema, editarEquipoSchema
```
 
**Nota de coherencia con Art. III:** `equipo.service.ts` y `equipo.repository.ts` ya existían para soportar los efectos automáticos de Tickets (Clarify #1/#7 de `001-tickets`). Este módulo **extiende** esos archivos con las operaciones CRUD administrativas — no crea una segunda fuente de lógica para la misma entidad, lo cual violaría el Artículo III.
 
---
 
## 3. Reglas de dominio clave
 
```ts
// lib/services/equipo.service.ts (extensión)
 
async function darDeBaja(equipoId: string) {
  const ticketsAbiertos = await ticketRepository.contarPorEquipoYEstados(equipoId, ["pendiente", "en_proceso"]);
  if (ticketsAbiertos > 0) {
    throw new DomainError("No se puede dar de baja un equipo con tickets abiertos. Resuélvelos primero.");
  }
  return equipoRepository.actualizarEstado(equipoId, "dado_de_baja");
}
 
async function editarEstado(equipoId: string, nuevoEstado: EstadoEquipo) {
  const ticketsAbiertos = await ticketRepository.contarPorEquipoYEstados(equipoId, ["pendiente", "en_proceso"]);
  const equipo = await equipoRepository.actualizarEstado(equipoId, nuevoEstado);
  if (ticketsAbiertos > 0) {
    return ok(equipo, "Este equipo tiene tickets abiertos que podrían quedar inconsistentes con el nuevo estado.");
  }
  return ok(equipo);
}
```
 
Nótese la diferencia deliberada entre `darDeBaja` (bloquea con `DomainError`) y `editarEstado` (solo advierte con `warning`) — es exactamente la distinción que pide HU-03 vs HU-04 de la spec.
 
---
 
## 4. Selector de equipos en `001-tickets` (impacto cruzado)
 
El formulario de creación de ticket (`app/tickets/nuevo/page.tsx`, T022 de `001-tickets`) debe excluir equipos con `estado: dado_de_baja` de su selector — esto es un ajuste retroactivo a una tarea ya definida en el otro módulo, no algo nuevo de este. Se documenta aquí para que no se pierda al ejecutar Tasks.
 
---
 
## 5. Trazabilidad Plan ↔ Spec
 
| Elemento | Origen |
|---|---|
| Enum `dado_de_baja` | Constitution v1.7, spec Clarify #1/#2 |
| `darDeBaja()` bloquea con tickets abiertos | HU-04 Criterio 2, Edge case 2 |
| `editarEstado()` solo advierte | HU-03 Criterio 1 |
| Extensión (no duplicación) de `equipo.service.ts` | Art. III — coherencia de capas |
| Exclusión de equipos dados de baja en selector de `001-tickets` | Impacto cruzado, HU-04 Criterio 1 |