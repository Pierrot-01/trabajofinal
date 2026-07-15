---
trigger: always_on
---

# Especificación: Módulo de Tickets (Incidencias y Solicitudes)

**Feature:** 001-tickets
**Estado:** Aclarado — listo para Plan
**Constitution de referencia:** v1.3

---

## 0. Clarifications (Sesión de aclaración — Fase 3 SDD)

| # | Pregunta | Decisión | Criterio aplicado |
|---|---|---|---|
| 1 | ¿El estado del Equipo cambia automáticamente al resolver un Ticket de hardware, o es un paso manual aparte? | **Automático.** Al marcar una Incidencia de categoría `hardware` como `resuelto`, el `Equipo.estado` pasa a `operativo` en la misma transacción — salvo que el equipo tenga otro ticket abierto, en cuyo caso se mantiene en `mantenimiento`. | Menor carga para el técnico, cero pasos olvidables, consistencia garantizada por el sistema y no por la memoria del usuario. |
| 2 | ¿La prioridad y la marca "atrasado" se recalculan con un cron job o al vuelo? | **Al vuelo.** Se calculan en el `service` cada vez que se consulta la lista de tickets, comparando fechas contra el momento actual. No se guarda un valor de prioridad "desactualizable" en la base de datos. | Cero infraestructura adicional, siempre exacto (nunca hay ventana de datos obsoletos), fácil de testear con fechas simuladas. |
| 3 | ¿Los técnicos están limitados a laboratorios específicos? | **No.** Cualquier técnico ve y puede tomar tickets de cualquier laboratorio. | Evita una capa de asignación/permisos innecesaria para el tamaño real del equipo técnico. |
| 4 | ¿Un software fuera del catálogo escrito en texto libre se agrega automáticamente al catálogo? | **No.** Se guarda como texto plano únicamente en ese ticket. El catálogo `Software` solo lo mantiene el admin explícitamente. | Evita que el catálogo se llene de duplicados o texto mal escrito sin revisión. |
| 5 | ¿Un técnico puede transferir un ticket directamente a otro técnico? | **No.** Solo el admin puede reasignar un ticket ya tomado. | Mantiene control y trazabilidad de por qué cambió el responsable — relevante para el Artículo I (trazabilidad). |
| 6 | ¿Quién puede escribir en `Comentario`? | **Ambos:** el técnico/admin para dar seguimiento, y el usuario que reportó el ticket para agregar contexto o confirmar que el problema persiste. | Mejora la trazabilidad real del caso, que es el propósito central del sistema (Artículo I). |
| 7 | Al resolver una **Solicitud** de software, ¿se actualiza automáticamente `Equipo_Software`, o queda solo como historial? | **Automático**, por simetría con la Clarify #1: al marcar como `resuelto` una Solicitud de categoría `software_licencia` o `software_general`, se crea/actualiza el registro en `Equipo_Software` marcando ese software como instalado en el equipo indicado. | Evita que HU-05 muestre información desactualizada del software instalado; mismo criterio de consistencia automática que ya se aplicó al hardware. |
| 8 | ¿Quién decide que un ticket nuevo está vinculado a uno anterior (`ticket_relacionado_id`)? | **El usuario que reporta**, de forma manual: al crear un ticket sobre un equipo que tiene tickets `resuelto` previos, el sistema le muestra esa lista y el usuario opcionalmente selecciona cuál es el problema que reaparece. | Evita falsos positivos de un matching automático por texto/IA, que sería más complejo y menos confiable que dejarlo a criterio de quien vive el problema. |
| 9 | ¿Quién define los valores N y M del reporte "equipos con más de N tickets en los últimos M meses" (HU-06)? | **El propio admin los ingresa como parámetros al generar el reporte**, no son configuración global guardada en el sistema. | Evita una pantalla de configuración adicional innecesaria; el admin ajusta el reporte según lo que necesite consultar en cada momento. |

**Regla general aplicada en toda esta sesión:** ante empate entre una opción más "potente" (cron jobs, permisos por laboratorio, transferencias directas) y una más simple, se elige la más simple y explícita, priorizando que cualquier usuario (docente, estudiante, técnico, admin) entienda el comportamiento del sistema sin ambigüedad ni curva de aprendizaje.

---

## 1. Resumen (qué y por qué)

Los usuarios de los laboratorios de cómputo de la EPIS-UNSCH (docentes, estudiantes) no tienen hoy una forma formal de reportar fallas en los equipos ni de solicitar recursos de software faltantes. Esto genera pérdida de trazabilidad y demoras en la resolución.

Este módulo permite que cualquier usuario autenticado reporte un **Ticket** (Incidencia o Solicitud) sobre un equipo específico, que el personal técnico lo gestione a través de un ciclo de vida controlado, y que el sistema mantenga un historial completo y auditable de cada caso.

Este es el módulo central del sistema: todos los demás módulos (Usuarios, Laboratorios, Equipos, Software) existen para soportar este flujo.

---

## 2. Historias de usuario

### HU-01 — Reportar una Incidencia
**Como** docente o estudiante,
**quiero** reportar que un equipo específico tiene una falla,
**para** que el personal técnico se entere y lo repare.

**Criterios de aceptación:**
1. El usuario debe estar autenticado para reportar un ticket.
2. El usuario selecciona el equipo afectado por su código de inventario (visible físicamente en la PC).
3. El usuario elige la categoría: `hardware` | `software_general` | `red`.
4. El usuario describe el problema en texto libre (mínimo 10 caracteres, máximo 500).
5. El usuario puede adjuntar una foto de forma opcional.
6. Al enviar, el sistema genera un ticket con estado `pendiente` y devuelve un número de ticket visible al usuario. *(Cumplimiento: Artículo IX — la respuesta llega como `{ success: true, data: { numero_ticket, estado } }`.)*
7. Si el equipo seleccionado ya tiene un ticket abierto (`pendiente` o `en_proceso`) de tipo Incidencia, el sistema lo advierte antes de crear uno duplicado (no lo bloquea, solo avisa — puede haber más de una falla real). *(Cumplimiento: Artículo IX v1.3 — esto es una **advertencia**, no un error de dominio; la respuesta es `{ success: true, data: {...}, warning: "Ya existe un ticket abierto para este equipo" }`. Prohibido implementarlo como `throw Error` o como `success: false`.)*

---

### HU-02 — Solicitar un recurso de software
**Como** docente,
**quiero** solicitar que se instale o licencie un software específico en uno o más equipos antes de mi clase,
**para** que mis estudiantes puedan usarlo (ej. SPSS antes de un examen).

**Criterios de aceptación:**
1. El flujo de creación es el mismo que HU-01, pero con `tipo: solicitud` y categoría `software_licencia` o `software_general`.
2. El usuario indica el software requerido (de un catálogo existente, o texto libre si no está en catálogo). *(Clarify #4: si es texto libre, se guarda únicamente como dato del ticket; no se crea una entrada nueva en la tabla `Software` automáticamente — el catálogo solo lo mantiene el admin.)*
3. El usuario puede indicar una **fecha límite** (ej. antes de qué fecha lo necesita) — este campo es opcional pero, si se indica, afecta el cálculo de prioridad (ver HU-04).

---

### HU-03 — Gestionar tickets como técnico
**Como** técnico de laboratorio,
**quiero** ver todos los tickets pendientes, asignarme uno, y cambiar su estado,
**para** organizar mi trabajo de mantenimiento.

**Criterios de aceptación:**
1. Solo usuarios con rol `tecnico` o `admin` pueden ver el panel de gestión de tickets.
2. El técnico puede filtrar por: laboratorio, tipo (incidencia/solicitud), categoría, prioridad, estado.
3. El técnico puede asignarse un ticket (`tecnico_asignado_id` = su propio id). Un ticket sin asignar es visible para todos los técnicos; uno asignado solo destaca para su técnico asignado (pero sigue siendo visible a todo el equipo técnico). *(Clarify #3: no hay restricción por laboratorio — cualquier técnico ve y puede tomar tickets de cualquier laboratorio.)*
4. El técnico puede cambiar el estado del ticket: `pendiente → en_proceso → resuelto`.
5. Al marcar como `resuelto`, el sistema exige un comentario de cierre (mínimo 5 caracteres) describiendo qué se hizo. *(Clarify #1: si el ticket es una Incidencia de categoría `hardware`, al pasar a `resuelto` el `Equipo.estado` cambia automáticamente a `operativo` en la misma transacción — salvo que el equipo tenga otro ticket abierto, en cuyo caso permanece en `mantenimiento`. Clarify #7: si el ticket es una Solicitud de categoría `software_licencia` o `software_general`, al pasar a `resuelto` se crea/actualiza el registro correspondiente en `Equipo_Software`.)*
6. Un ticket `resuelto` no puede volver a `pendiente` directamente; si el problema reaparece, se crea un ticket nuevo referenciando el anterior (ver Edge Cases).
7. Solo un usuario con rol `admin` puede reasignar un ticket ya tomado por un técnico a otro técnico. *(Clarify #5.)*

---

### HU-04 — Priorización de tickets
**Como** técnico,
**quiero** ver los tickets ordenados por urgencia real,
**para** atender primero lo más crítico.

**Criterios de aceptación:**
1. La prioridad se calcula, no se elige libremente por el usuario que reporta (evita que todo se marque "urgente").
2. Reglas de prioridad:
   - `alta`: Incidencias de categoría `hardware` (el equipo queda inutilizable), o Solicitudes con fecha límite dentro de las próximas 48 horas.
   - `media`: Incidencias de categoría `software_general` o `red`, o Solicitudes con fecha límite entre 3 y 7 días.
   - `baja`: Solicitudes sin fecha límite o con fecha límite mayor a 7 días.
3. La prioridad se recalcula automáticamente si pasa el tiempo y una Solicitud se acerca a su fecha límite sin haber sido atendida. *(Clarify #2: el cálculo es al vuelo — el `service` compara `fecha_limite`/`fecha_creacion` contra el momento actual en cada consulta; no se guarda un valor de prioridad en la base de datos que pueda quedar desactualizado.)*

---

### HU-05 — Consultar estado de equipos antes de clase
**Como** docente,
**quiero** ver el estado actual de los equipos de un laboratorio (operativo, en mantenimiento, inoperativo) y qué software tienen instalado,
**para** decidir si puedo asignar una actividad que dependa de un recurso específico.

**Criterios de aceptación:**
1. Cualquier usuario autenticado puede ver esta vista, sin importar su rol.
2. La vista se actualiza automáticamente cuando el estado de un equipo cambia por resolución de un ticket. *(Cumplimiento: Artículo XI — el cambio de estado del ticket ocurre vía Server Action; al completarse, se ejecuta `revalidatePath` sobre la ruta de la vista de laboratorio. Prohibido resolver esto con `fetch` desde un Client Component o con `setInterval`/polling manual.)*
3. Si un equipo tiene tickets pendientes/en_proceso, se muestra un indicador visual (no el detalle completo del ticket, solo que "tiene incidencias abiertas").

---

### HU-06 — Historial y trazabilidad
**Como** administrador (jefe de laboratorio),
**quiero** ver el historial completo de tickets de un equipo,
**para** identificar equipos con fallas recurrentes y justificar renovación o compra ante la facultad.

**Criterios de aceptación:**
1. El admin ve todos los tickets (resueltos y activos) de cualquier equipo, con fechas de creación y cierre.
2. El sistema calcula y muestra el tiempo promedio de resolución por categoría. *(Cumplimiento: Artículo XII — esta lógica se prueba con datos generados por `prisma/seed.ts`, que debe incluir tickets con `fecha_creacion` y `fecha_cierre` distribuidos en al menos los últimos 6 meses simulados. Sin este histórico sintético, la prueba de integración de esta HU es inviable.)*
3. El admin puede exportar o visualizar un resumen de "equipos con más de N tickets en los últimos M meses" (N y M ingresados por el admin como parámetros del reporte, no configuración global — Clarify #9). *(Cumplimiento: Artículo XII — misma dependencia del seed histórico; el seed debe garantizar al menos un equipo con recurrencia alta (≥5 tickets) para poder testear el caso positivo del filtro, y al menos uno con cero tickets para el caso negativo.)*

---
