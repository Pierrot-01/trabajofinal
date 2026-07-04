---
trigger: always_on
---

# Plan Técnico: Módulo de Catálogo de Software
 
**Feature:** 004-software
**Basado en:** `specs/004-software/spec.md`
**Constitution de referencia:** v1.7
**Nota:** no requiere cambios al schema — `Software` y `EquipoSoftware` ya existen desde `001-tickets`.
 
---
 
## 1. Estructura de carpetas
 
```
app/
  admin/software/
    page.tsx        → lista + crear/editar/eliminar
    actions.ts         → crearSoftware, editarSoftware, eliminarSoftware
 
lib/
  services/
    software.service.ts    → nuevo
  repositories/
    software.repository.ts   → nuevo (incluye contarRelaciones())
  validators/
    software.validators.ts     → crearSoftwareSchema, editarSoftwareSchema
```
 
---
 
## 2. Regla de dominio: bloqueo de eliminación con relaciones activas
 
```ts
// lib/services/software.service.ts
async function eliminar(softwareId: string) {
  const relaciones = await softwareRepository.contarRelaciones(softwareId); // cuenta EquipoSoftware + Ticket.softwareId
  if (relaciones > 0) {
    throw new DomainError(
      "Este software está en uso (instalado en algún equipo o referenciado por un ticket) y no se puede eliminar."
    );
  }
  return softwareRepository.eliminar(softwareId);
}
```
 
```ts
// lib/repositories/software.repository.ts
async function contarRelaciones(softwareId: string): Promise<number> {
  const [enEquipos, enTickets] = await Promise.all([
    prisma.equipoSoftware.count({ where: { softwareId } }),
    prisma.ticket.count({ where: { softwareId } }),
  ]);
  return enEquipos + enTickets;
}
```
 
---
 
## 3. Trazabilidad Plan ↔ Spec
 
| Elemento | Origen |
|---|---|
| `contarRelaciones()` sumando `EquipoSoftware` + `Ticket` | HU-03 Criterio 1, Edge case 2 |
| Sin `ON DELETE CASCADE` en el schema | Criterio de éxito del módulo, Sección 6 de la spec |