---
trigger: always_on
---

# Especificación: Módulo de Laboratorios y Equipos
 
**Feature:** 003-laboratorios-equipos
**Estado:** Aclarado — listo para Plan
**Constitution de referencia:** v1.6
**Decisión de alcance:** se agrupan Laboratorios y Equipos en una sola feature (no dos separadas como sugiere Art. VIII punto 4 al pie de la letra) porque un Equipo no existe sin un Laboratorio — son CRUD acoplados de bajo riesgo, y separarlos generaría dos specs casi idénticas. Se documenta como decisión explícita, no como atajo silencioso.
 
---
 
## 0. Clarifications
 
| # | Pregunta | Decisión | Criterio aplicado |
|---|---|---|---|
| 1 | ¿Se puede eliminar (`DELETE`) un equipo o laboratorio? | **No.** Solo se puede marcar un equipo como `dado_de_baja` (nuevo valor del enum `EstadoEquipo`, distinto de `inoperativo`). Un laboratorio no se elimina si tiene al menos un equipo (activo o dado de baja). | Mismo criterio de trazabilidad que Usuarios (Clarify #2 de 002): un equipo dado de baja puede tener historial de tickets que no debe perderse. |
| 2 | ¿Qué diferencia hay entre `inoperativo` y `dado_de_baja`? | `inoperativo` = temporalmente sin funcionar, con expectativa de reparación (gestionado automáticamente por Tickets, Clarify #1 de 001). `dado_de_baja` = decisión administrativa de retirar el equipo permanentemente (ej. muy antiguo, irreparable). | Evita que un equipo retirado aparezca como "en cola de mantenimiento" en el panel del técnico. |
| 3 | ¿El código de inventario tiene un formato validado, o es texto libre? | **Texto libre con solo la restricción de ser único.** No se impone un patrón regex específico. | La UNSCH ya tiene su propio sistema de codificación de inventario; imponer un formato nuevo generaría fricción real sin beneficio. |
| 4 | ¿Quién puede crear/editar laboratorios y equipos? | **Solo `admin`.** Ni siquiera el técnico puede dar de alta un equipo nuevo. | Mantiene una única fuente de verdad administrativa sobre qué existe físicamente — evita equipos duplicados o mal registrados por error de un técnico apurado. |
 
---
 
## 1. Resumen
 
Este módulo permite al administrador mantener actualizado el catálogo real de laboratorios y equipos — la base física sobre la que operan los Tickets (Edge case 2 de `001-tickets` depende de que el equipo exista previamente).
 
---
 
## 2. Historias de usuario
 
### HU-01 — Crear un laboratorio
**Como** admin,
**quiero** registrar un nuevo laboratorio con su nombre, ubicación y capacidad,
**para** luego poder asociarle equipos.
 
**Criterios de aceptación:**
1. Nombre y ubicación son obligatorios; capacidad es un entero positivo.
2. No se valida unicidad de nombre (podría haber dos laboratorios con nombre similar en distintas sedes) — solo se distinguen por su `id` interno y ubicación.
---
 
### HU-02 — Crear un equipo dentro de un laboratorio
**Como** admin,
**quiero** registrar un equipo nuevo asociado a un laboratorio existente,
**para** que pueda recibir tickets y aparecer en la vista de estado (HU-05 de `001-tickets`).
 
**Criterios de aceptación:**
1. El código de inventario es obligatorio y único en todo el sistema (Clarify #3).
2. El laboratorio debe existir (no se puede crear un equipo "flotante" sin laboratorio).
3. Estado inicial siempre `operativo`.
---
 
### HU-03 — Editar datos de un equipo
**Como** admin,
**quiero** corregir el laboratorio, código de inventario o estado de un equipo manualmente,
**para** reflejar cambios que no pasan por el flujo automático de Tickets (ej. reubicar un equipo a otro laboratorio).
 
**Criterios de aceptación:**
1. Cambiar el estado manualmente a `operativo`/`inoperativo`/`mantenimiento` es posible, pero **si el equipo tiene tickets abiertos** (`pendiente`/`en_proceso`), el sistema advierte (no bloquea, mismo patrón `warning` del Art. IX) que hay tickets activos que quedarán inconsistentes con el nuevo estado.
2. Reasignar un equipo a otro laboratorio no afecta sus tickets ni su historial — el `equipoId` no cambia, solo su `laboratorioId`.
---
 
### HU-04 — Dar de baja un equipo
**Como** admin,
**quiero** marcar un equipo como retirado permanentemente,
**para** que deje de aparecer disponible para nuevos tickets, sin perder su historial.
 
**Criterios de aceptación:**
1. Un equipo `dado_de_baja` no aparece en el selector de equipos al crear un nuevo ticket (HU-01 de `001-tickets`).
2. Si el equipo tiene tickets `pendiente`/`en_proceso`, el sistema exige resolverlos o cerrarlos explícitamente antes de permitir la baja (a diferencia de HU-03, aquí sí se bloquea — dar de baja un equipo con trabajo pendiente es un error real, no una advertencia).
3. El historial de tickets del equipo dado de baja sigue siendo consultable desde HU-06 de `001-tickets`.
---
 
### HU-05 — Consultar catálogo de laboratorios y equipos
**Como** admin,
**quiero** ver la lista completa de laboratorios con sus equipos,
**para** administrar el inventario.
 
**Criterios de aceptación:**
1. Vista paginada (Art. XIV), separada de la vista pública de HU-05 de `001-tickets` (esa es para docentes/estudiantes consultando disponibilidad; esta es de gestión administrativa, incluye equipos `dado_de_baja`).
---
 
## 3. Edge cases
 
| # | Caso | Comportamiento esperado |
|---|---|---|
| 1 | Se intenta crear un equipo con un código de inventario ya existente | `DomainError`: "Este código de inventario ya está registrado." |
| 2 | Se intenta dar de baja un equipo con tickets abiertos | `DomainError` (Clarify + HU-04 Criterio 2) — bloqueado, no advertencia. |
| 3 | Se intenta crear un equipo con un `laboratorioId` inexistente | `DomainError`: "El laboratorio no existe." |
| 4 | Un técnico o docente intenta acceder a las rutas de creación/edición de laboratorios/equipos | Rechazado a nivel de middleware y de `service` (defensa en profundidad, Art. IV), solo `admin`. |
 
---
 
## 4. Entidades involucradas
 
- `Laboratorio` (ya en Constitution Art. VII, sin cambios).
- `Equipo` — requiere agregar el valor `dado_de_baja` al enum `EstadoEquipo`, no contemplado originalmente en el Art. VII/plan de `001-tickets`.
**Nota (resuelta):** propagado a la Constitution en v1.7.
 
---
 
## 5. Fuera de alcance
 
- Historial de reubicaciones de un equipo entre laboratorios (solo se guarda el estado actual, no un log de movimientos — se podría agregar en una iteración futura si se necesita para el documento).
- Carga masiva de equipos vía CSV/Excel.
---
 
## 6. Criterios de éxito del módulo
 
1. Ningún ticket puede crearse sobre un equipo `dado_de_baja` (verificable en la prueba de integración cruzada con `001-tickets`).
2. Cero equipos "huérfanos" sin laboratorio asociado — la relación es obligatoria a nivel de schema.
---
 
## 7. Trazabilidad con la Constitution
 
| Punto de la spec | Artículo |
|---|---|
| Solo `admin` gestiona laboratorios/equipos | Art. IV, punto 1 |
| Nuevo valor de enum `dado_de_baja` | Pendiente de propagar a Art. VII |
| Vista paginada de gestión | Art. XIV, punto 2 |
| Advertencia (no bloqueo) al cambiar estado con tickets abiertos (HU-03) vs bloqueo real en baja (HU-04) | Art. IX v1.3 (`warning`) + Art. X (`DomainError`) — mismo patrón ya usado en `001-tickets` |