---
trigger: always_on
---

# Especificación: Módulo de Catálogo de Software
 
**Feature:** 004-software
**Estado:** Aclarado — listo para Plan
**Constitution de referencia:** v1.7
 
---
 
## 0. Clarifications
 
| # | Pregunta | Decisión | Criterio aplicado |
|---|---|---|---|
| 1 | ¿Se puede eliminar un software del catálogo si está en uso (instalado en algún equipo, o referenciado por algún ticket)? | **No.** Bloqueado con `DomainError` si tiene relaciones activas en `EquipoSoftware` o `Ticket.softwareId`. | Igual criterio de trazabilidad que el resto del sistema — borrar rompería el historial de tickets ya resueltos que referencian ese software. |
| 2 | ¿Quién mantiene el catálogo? | **Solo `admin`**, consistente con Clarify #4 de `001-tickets` ("el catálogo solo lo mantiene el admin explícitamente"). | Ya estaba decidido en el módulo de Tickets; esta spec solo lo hace operativo con una UI real. |
 
---
 
## 1. Resumen
 
Este módulo es el más simple de los cuatro: un CRUD de catálogo que ya fue referenciado (pero nunca implementado) desde `001-tickets` (HU-02, Clarify #4) para permitir que las Solicitudes de software elijan de una lista real en vez de solo texto libre.
 
---
 
## 2. Historias de usuario
 
### HU-01 — Agregar software al catálogo
**Como** admin,
**quiero** registrar un software con su nombre, tipo (licenciado/gratuito) y versión,
**para** que esté disponible como opción al crear una Solicitud (HU-02 de `001-tickets`).
 
**Criterios de aceptación:**
1. El nombre es único en el catálogo (evita duplicados como "SPSS" y "Spss").
2. `tipo` es obligatorio (`licenciado`|`gratuito`); `version` es opcional.
---
 
### HU-02 — Editar un software del catálogo
**Como** admin,
**quiero** corregir el nombre, tipo o versión de un software ya registrado,
**para** mantener el catálogo actualizado (ej. nueva versión de SPSS).
 
**Criterios de aceptación:**
1. Editar no afecta los tickets ya cerrados que referenciaron ese software por `softwareId` — el historial se lee con el nombre vigente al momento de la consulta (se acepta esta simplificación; no se versiona el nombre históricamente, fuera de alcance).
---
 
### HU-03 — Eliminar un software del catálogo
**Como** admin,
**quiero** eliminar un software que ya no se usa,
**para** mantener el catálogo limpio.
 
**Criterios de aceptación:**
1. Si el software tiene registros en `EquipoSoftware` (está instalado en algún equipo) o es referenciado por algún `Ticket.softwareId`, la eliminación se **bloquea** con `DomainError` (Clarify #1) — se sugiere al admin usarlo igual pero no eliminarlo, o quitarlo primero de los equipos donde está instalado.
2. Si no tiene relaciones, se elimina físicamente (a diferencia de Usuario/Equipo, aquí sí es un catálogo simple sin trazabilidad crítica propia si nunca se usó).
---
 
## 3. Edge cases
 
| # | Caso | Comportamiento esperado |
|---|---|---|
| 1 | Se intenta crear un software con nombre duplicado | `DomainError`: "Este software ya está en el catálogo." |
| 2 | Se intenta eliminar un software en uso | `DomainError` con el detalle de Clarify #1. |
| 3 | Un técnico o docente intenta acceder al CRUD de software | Rechazado, solo `admin` (Clarify #2). |
 
---
 
## 4. Entidades involucradas
 
- `Software` (ya en Constitution Art. VII, sin cambios).
- `EquipoSoftware` (ya definida, sin cambios) — se usa solo para verificar si hay relaciones antes de eliminar.
**Sin cambios pendientes de propagar a la Constitution** — este es el único módulo de los cuatro que no requirió tocar el Art. VII.
 
---
 
## 5. Fuera de alcance
 
- Versionado histórico de nombres/versiones de software.
- Categorías o etiquetas adicionales de software más allá de `licenciado`/`gratuito`.
---
 
## 6. Criterios de éxito del módulo
 
1. Nunca queda un `Ticket` o `EquipoSoftware` con una referencia rota a un `Software` eliminado (garantizado por el bloqueo de Edge case 2, no por `ON DELETE CASCADE`, que destruiría trazabilidad).
---
 
## 7. Trazabilidad con la Constitution
 
| Punto de la spec | Artículo |
|---|---|
| Solo `admin` gestiona el catálogo | Art. IV, punto 1 — y Clarify #4 de `001-tickets` |
| Bloqueo de eliminación con relaciones activas | Art. I (trazabilidad) aplicado por analogía |