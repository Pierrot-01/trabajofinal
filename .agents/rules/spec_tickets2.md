---
trigger: always_on
---


### HU-07 — Comentarios de seguimiento *(añadida en Clarify, a partir de la pregunta #6)*
**Como** usuario que reportó un ticket o como técnico/admin asignado,
**quiero** poder agregar comentarios a un ticket existente,
**para** dar más contexto, actualizar información, o registrar el avance del trabajo.

**Criterios de aceptación:**
1. Tanto el usuario que reportó el ticket como el técnico/admin asignado pueden escribir comentarios mientras el ticket esté en estado `pendiente` o `en_proceso`.
2. Una vez el ticket pasa a `resuelto`, no se permiten comentarios nuevos (el cierre queda fijado con el `comentario_cierre` del Artículo VII).
3. Cada comentario guarda quién lo escribió y cuándo, visible para todos los que tienen acceso al ticket.

---

## 3. Edge cases (deben resolverse en Clarify si algo no está claro — no se asume)

| # | Caso | Comportamiento esperado |
|---|---|---|
| 1 | Un ticket queda `pendiente` sin asignar por más de 48 horas | Se marca visualmente como "atrasado" en el panel del técnico (no se escala automáticamente por notificación en este MVP — fuera de alcance, ver sección 5). *(Clarify #2: cálculo al vuelo, no vía cron job.)* |
| 2 | Un usuario reporta un ticket sobre un equipo que no existe en el sistema | El sistema rechaza la creación; el equipo debe existir previamente (dado de alta por el admin). |
| 3 | Un problema "resuelto" reaparece en el mismo equipo | Se crea un ticket nuevo con un campo `ticket_relacionado_id` apuntando al ticket anterior, para mantener trazabilidad de recurrencia. *(Clarify #8: el vínculo lo elige manualmente el usuario que reporta, seleccionando de una lista de tickets `resuelto` previos de ese equipo — no hay detección automática.)* |
| 4 | Dos técnicos intentan asignarse el mismo ticket casi al mismo tiempo | Gana el primero en confirmarse (control de concurrencia a nivel de base de datos); el segundo recibe un **error de dominio** ("Este ticket ya fue asignado"). *(Cumplimiento: Artículo X — se captura como `DomainError` en el `service`, y se traduce a `{ success: false, error: "Este ticket ya fue asignado" }` según el Artículo IX. Prohibido dejar propagar el error crudo de Prisma/MySQL hacia el cliente.)* |
| 5 | Un usuario intenta cambiar el estado de un ticket sin ser técnico/admin | Rechazado como **error de dominio** ("No tienes permisos para esta acción"), validado en el `service`, nunca solo ocultado en el frontend. *(Cumplimiento: Artículo IV + Artículo X — mismo tratamiento que el caso 4: `DomainError` → `{ success: false, error: "..." }`, nunca un `throw` sin capturar que rompa la Server Action.)* |

---

## 4. Entidades involucradas

Referencian directamente al Artículo VII de la Constitution — no se renombran ni se agregan campos no listados aquí sin pasar por Clarify:

- `Ticket` (agrega respecto a la Constitution: `ticket_relacionado_id` opcional, `fecha_limite` opcional para Solicitudes, `comentario_cierre`, `software_id`/`software_texto` — *Analyze v1.4: estos dos últimos ya estaban en uso desde HU-02 pero nunca se listaron aquí formalmente*)
- `Equipo`
- `Usuario`
- `Software`
- `Equipo_Software` *(tabla intermedia, definida en la Constitution Art. VII; relevante aquí porque HU-05 y Clarify #7 dependen de ella directamente)*
- `Comentario`

**Nota (resuelta):** los campos `ticket_relacionado_id` y `fecha_limite` no estaban en el Artículo VII original. Ya se incorporaron a la Constitution en v1.2, y el contrato de API (`warning`) se amplió en v1.3 — ambos cambios están reflejados en la copia vigente de `constitution.md`. Esta spec ya no tiene dependencias pendientes de la Constitution.

**Nota de alcance (no es ambigüedad, es decisión intencional):** la advertencia de ticket duplicado (HU-01, Criterio 7) aplica solo a **Incidencias** sobre el mismo equipo, no a Solicitudes — dos docentes distintos pueden pedir el mismo software en el mismo equipo sin que eso sea un error ni una duplicación real.

---

## 5. Fuera de alcance (explícitamente, para este MVP)

- Notificaciones push/email automáticas por ticket atrasado.
- Chat en tiempo real entre usuario y técnico (se usa el campo `Comentario` como bitácora simple, no chat).
- Aprobación en dos pasos para Solicitudes de software licenciado (ej. que un jefe de facultad apruebe la compra) — se asume que el técnico/admin decide directamente.
- Reserva de laboratorios (mencionado como posible extensión en conversaciones previas, no forma parte de este módulo).

---

## 6. Criterios de éxito del módulo

1. Un usuario nuevo (sin capacitación previa) logra reportar una incidencia en menos de 1 minuto — validable en la evaluación SUS.
2. El 100% de los cambios de estado de un ticket quedan registrados con quién y cuándo los hizo (trazabilidad total, Artículo I).
3. Cero tickets con datos inconsistentes (ej. `resuelto` sin comentario de cierre) — validable con la Ficha de Análisis Documental (Artículo V).

## 7. Trazabilidad con la Constitution (equivalente manual a /speckit.analyze)

| Punto de la spec | Riesgo si no se referencia | Artículo de la Constitution que lo cierra |
|---|---|---|
| HU-01, Criterio 6 (devolver número de ticket) | Formato de respuesta inconsistente entre endpoints | Art. IX — Contrato de respuesta |
| HU-01, Criterio 7 (advertir sin bloquear) | La IA podría implementarlo como error fatal (`throw`) | Art. IX v1.3 (`warning`) + Art. X |
| HU-05, Criterio 2 (actualización automática de estado) | Caché agresiva de Next.js muestra datos obsoletos | Art. XI — Server Actions + `revalidatePath` |
| HU-06, Criterios 2 y 3 (reportes históricos) | Imposible de testear sin datos históricos simulados | Art. XII — Seeding |
| Edge case 4 (asignación concurrente) | Error crudo de Prisma expuesto al usuario | Art. X — Manejo de errores |
| Edge case 5 (permisos) | Error crudo o solo bloqueado en frontend | Art. IV + Art. X |
| Sección 3, nota sobre campos faltantes en Art. VII | La IA podría modificar el schema en silencio | Art. XIII — Regla de parada (failsafe) |

**Regla aplicada de aquí en adelante:** ninguna Historia de Usuario nueva se da por completa en este documento si no cita el artículo de la Constitution que gobierna su implementación. Si no existe un artículo que la cubra, se detiene la spec y se actualiza la Constitution primero (como ya ocurrió con el Art. VII → v1.2 y el Art. IX → v1.3).