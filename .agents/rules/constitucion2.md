---
trigger: always_on
---

## Artículo XI — Estrategia de datos en el frontend *(añadido v1.1)*
 
> **Brecha detectada:** el Artículo II fija Next.js App Router pero no la estrategia de fetching/mutación, dejando espacio a que la IA mezcle `fetch` clásico, Server Actions y librerías de estado global sin justificación.
 
1. **Obtención de datos (lectura):** exclusivamente vía Server Components nativos (`async` components + Prisma a través del `service` correspondiente). No se usa `useEffect` + `fetch` para cargar datos iniciales.
2. **Mutaciones (crear, actualizar, cambiar estado):** exclusivamente vía **Server Actions**, seguidas de `revalidatePath` (o `revalidateTag`) para refrescar la UI.
3. **Prohibido** introducir librerías de estado global (Redux, Zustand, Recoil, etc.) sin una justificación explícita documentada en un `plan.md`. El estado de UI puramente local (ej. abrir/cerrar un modal) se maneja con `useState`.
---
 
## Artículo XII — Seeding de datos para entornos de prueba *(añadido v1.1)*
 
> **Brecha detectada:** el Artículo V exige pruebas de integración pero no define el origen de los datos de prueba, y sin un estado predecible de la base de datos no se pueden escribir tests confiables sobre el ciclo de vida de un `Ticket`.
 
1. Existe un script único y versionado en `prisma/seed.ts` que puebla: laboratorios base, equipos con sus estados iniciales, usuarios de prueba (uno por cada rol: admin, técnico, docente, estudiante) y catálogo de software.
2. Ejecutar el seed es **prerrequisito obligatorio** antes de correr cualquier suite de Vitest — ninguna prueba de integración asume datos "que ya deberían estar" en la base de datos.
3. El seed se re-ejecuta de forma limpia (`prisma migrate reset` + seed) en cada ciclo de pruebas de integración para garantizar aislamiento entre corridas.
---
 
## Artículo XIII — Regla de parada para el agente de IA (failsafe) *(añadido v1.1)*
 
> **Brecha detectada:** el Artículo VIII define el flujo de fases pero no restringe el comportamiento del agente ante ambigüedad, y los LLM tienden a "inventar" requerimientos faltantes en vez de preguntar.
 
**Directiva no negociable, vigente en todas las fases (Specify, Clarify, Plan, Tasks, Implement):**
 
Si el agente de IA detecta ambigüedad en el modelo de datos, en una dependencia, o en un requerimiento no cubierto explícitamente por esta Constitution o por el `spec.md` vigente, **tiene estrictamente prohibido inventar campos, entidades o flujos nuevos por su cuenta**. Su única acción permitida es detenerse y solicitar clarificación al desarrollador antes de continuar. Generar una suposición no documentada se considera una violación de esta Constitution.
 
---
 
## Artículo XIV — Optimización y rendimiento *(añadido — brecha detectada)*
 
> **Brecha detectada:** en una conversación anterior se acordó una arquitectura de optimización completa (Server Components por defecto, ISR, `next/image`, caching, índices de BD) para la aplicación en general, pero nunca quedó formalizada como regla no negociable — ningún artefacto de SDD posterior (`spec.md`, `plan.md`, `tasks.md`) la aplicó. Se cierra ese vacío aquí.
 
1. **Consultas Prisma explícitas:** toda query usa `select`/`include` con los campos exactos que la vista necesita — prohibido traer un modelo completo (`findMany()` sin `select`) cuando solo se usan 3-4 campos.
2. **Paginación obligatoria:** cualquier listado que pueda crecer sin límite natural (tickets, historial de un equipo, comentarios) se pagina desde el primer `service` que lo expone — nunca se trae la tabla completa "porque por ahora son pocos datos".
3. **Imágenes:** toda imagen (fotos de incidencias, íconos de categoría) se sirve con `next/image`, nunca `<img>` plano — compresión y lazy loading automáticos.
4. **Revalidación (ISR) para lecturas de baja volatilidad:** vistas que cambian con poca frecuencia y son de lectura pública (ej. catálogo de laboratorios sin filtrar) usan `revalidate` con un tiempo fijo razonable (ej. 60 segundos) en vez de forzar recarga total en cada visita; vistas que dependen de una mutación específica (ej. `/laboratorios` tras resolver un ticket) usan `revalidatePath` bajo demanda (Art. XI), no ISR por tiempo.
5. **Índices de base de datos:** todo campo usado como filtro frecuente en un reporte o listado (ej. `fechaCreacion` para reportes históricos) debe tener un índice declarado en `schema.prisma` — no se agregan índices "después, si hace falta".
6. **Conexión de Prisma en entorno serverless (Vercel):** se usa un patrón de instancia única de `PrismaClient` (singleton) para evitar agotar el pool de conexiones de MySQL en cada invocación serverless — patrón estándar documentado en la guía oficial de Prisma para Next.js.
---
 
## Registro de cambios
 
| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | Julio 2026 | Versión inicial. Se incorpora Artículo V (Testing) como corrección de coherencia respecto al propósito del curso IS-489. |
| 1.1 | Julio 2026 | Se incorporan Artículos IX–XIII: contrato de respuesta de API, manejo de errores, estrategia de datos en frontend, seeding para pruebas, y regla de parada del agente ante ambigüedad. Brechas identificadas por el desarrollador. |
| 1.2 | Julio 2026 | Se actualiza el Artículo VII (entidad `Ticket`) para incluir `fecha_limite`, `ticket_relacionado_id` y `comentario_cierre`, campos requeridos por `specs/001-tickets/spec.md` y no contemplados en la versión anterior. |
| 1.3 | Julio 2026 | Se amplía el Artículo IX con el campo opcional `warning`, para cubrir el caso de advertencias que no bloquean una operación exitosa (detectado en HU-01, Criterio 7, de `specs/001-tickets/spec.md`). |
| 1.4 | Julio 2026 | **Fase Analyze:** se agregan `software_id`/`software_texto` al Artículo VII (usados desde HU-02 en `spec.md` y `plan.md` pero nunca propagados a la Constitution); se cierra la ambigüedad "JWT o Auth.js" del Artículo II a favor de Auth.js, ya decidido en `plan.md`. |
| 1.5 | Julio 2026 | Se incorpora el Artículo XIV (Optimización y rendimiento): consultas Prisma explícitas, paginación obligatoria, `next/image`, ISR para lecturas de baja volatilidad, índices de BD para reportes, y singleton de `PrismaClient` en entorno serverless. La arquitectura de optimización se había discutido antes en la conversación pero nunca se formalizó en ningún artefacto de SDD. |
| 1.6 | Julio 2026 | Se agrega `Usuario.activo` y la entidad `PasswordResetToken` al Artículo VII, requeridos por `specs/002-usuarios/spec.md`. |
| 1.7 | Julio 2026 | Se agrega el valor `dado_de_baja` al enum de estado de `Equipo` (Artículo VII), requerido por `specs/003-laboratorios-equipos/spec.md`. |