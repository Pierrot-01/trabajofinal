---
trigger: always_on
---

# Constitution del Proyecto
## Sistema Web de Gestión de Informes Técnicos y Mantenimiento de Equipos de Cómputo — Laboratorios EPIS, UNSCH
 
**Versión:** 1.7
**Fecha:** Julio 2026
**Curso:** IS-489 — Pruebas y Aseguramiento de la Calidad de Software
**Metodología:** Spec-Driven Development (SDD)
 
---
 
## Propósito de este documento
 
Este documento establece los principios **no negociables** del proyecto. Toda especificación (`spec.md`), plan técnico (`plan.md`) y lista de tareas (`tasks.md`) generada en las siguientes fases del SDD debe cumplir con lo aquí definido. Si un artefacto entra en conflicto con esta constitución, la constitución prevalece y el artefacto debe corregirse.
 
---
 
## Artículo I — Alcance y propósito del sistema
 
El sistema resuelve la falta de trazabilidad en la gestión de fallas e insumos de los laboratorios de cómputo de la EPIS-UNSCH. Formaliza dos tipos de flujo, que deben mantenerse siempre diferenciados en el modelo de datos y en la interfaz:
 
1. **Incidencia** — un equipo presenta una falla física o de software que impide su uso (PC no enciende, mouse/teclado dañado, pantalla azul, sin red).
2. **Solicitud** — un equipo carece de un recurso necesario para clases (licencia de software como SPSS/MATLAB, instalación de un programa, actualización pendiente).
Ambos flujos comparten el mismo ciclo de vida (`pendiente → en_proceso → resuelto`) pero se clasifican y priorizan de forma independiente.
 
**No negociable:** ningún artefacto posterior puede fusionar Incidencia y Solicitud en una sola entidad sin distinción de tipo, porque rompe la trazabilidad que el curso de QA exige evaluar.
 
---
 
## Artículo II — Stack tecnológico (cerrado)
 
No se introduce tecnología fuera de esta lista sin justificar el cambio explícitamente en un nuevo artefacto de decisión:
 
| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes / Server Actions (mismo repo, sin servicio separado) |
| Base de datos | MySQL |
| ORM | Prisma |
| Gestor de paquetes | **pnpm** (no npm — estructura estricta de `node_modules`, mitiga phantom dependencies) |
| Autenticación | **Auth.js** (decisión cerrada en `plan.md` Sección 5.5 — Analyze v1.4: la Constitution decía "JWT o Auth.js", dejando una opción abierta que el plan ya resolvió) |
| Contenedores | Docker (obligatorio para MySQL; opcional para la app en desarrollo) |
| Despliegue | Vercel |
 
**No negociable:** un solo lenguaje (TypeScript) en todo el proyecto. No se mezcla PHP, JS vanilla suelto, ni un backend separado en otro framework.
 
---
 
## Artículo III — Arquitectura en capas
 
Todo módulo del backend sigue estrictamente esta separación, sin excepciones:
 
```
app/                     → rutas + Server/Client Components (presentación)
lib/
  ├── services/           → lógica de negocio (reglas, validaciones de dominio)
  ├── repositories/        → acceso a datos vía Prisma (queries aisladas)
  └── validators/           → esquemas de validación de entrada (Zod)
prisma/
  └── schema.prisma         → modelo de datos
```
 
**Reglas:**
- Un componente de presentación (`app/`) nunca llama a Prisma directamente; siempre pasa por un `service`.
- Un `service` nunca construye HTML/JSX ni maneja `request`/`response` de Next.js directamente.
- Cada capa debe poder testearse de forma aislada (esto es un requisito del curso de QA, no una preferencia).
---
 
## Artículo IV — Seguridad (no negociable)
 
Basado en OWASP Top 10:2025 y en la evidencia reciente de ataques a la cadena de suministro de npm (compromiso de Axios, marzo 2026; campañas Shai-Hulud/Miasma, 2026):
 
1. **Control de acceso:** toda validación de rol se hace en el backend (`service`/middleware), nunca solo ocultando elementos en el frontend.
2. **Autenticación:** contraseñas hasheadas con bcrypt o argon2. JWT firmado con secreto en variable de entorno, nunca hardcodeado.
3. **Inputs:** todo dato de entrada se valida con Zod antes de tocar la base de datos. Prisma se usa siempre con queries parametrizadas (nunca concatenación de strings SQL).
4. **Configuración:** variables sensibles solo en `.env`, nunca en el repositorio. Sin endpoints de debug activos en producción.
5. **Cadena de suministro (dependencias):**
   - `pnpm config set ignore-scripts true`
   - `pnpm audit` obligatorio antes de cada entrega/sprint de SDD
   - Fijar versiones exactas (sin `^`/`~`) en dependencias críticas
6. **Contra usuarios no deseados:** rate limiting en login/registro, CAPTCHA (Cloudflare Turnstile) en formularios públicos, bloqueo temporal tras intentos fallidos repetidos.
7. **Transporte:** HTTPS obligatorio en todo entorno desplegado (Vercel lo da por defecto).
---
 
## Artículo V — Testing y aseguramiento de calidad *(añadido — brecha detectada)*
 
> **Nota de coherencia:** el proyecto pertenece al curso de *Pruebas y Aseguramiento de la Calidad de Software* (IS-489), pero hasta este punto de la conversación no se había fijado un estándar de pruebas. Se incorpora aquí como artículo no negociable para que la Constitution sea coherente con el propósito académico del trabajo — sin esto, el Capítulo IV del documento final no tendría cómo demostrar la variable "Funcionamiento" con rigor.
 
1. Cada `service` de la capa de lógica de negocio debe tener pruebas unitarias antes de considerarse completo (mínimo: casos de éxito + un caso borde por función).
2. Los endpoints críticos (autenticación, creación/cambio de estado de tickets) requieren prueba de integración, no solo unitaria.
3. Toda spec (`spec.md`) de un módulo debe incluir **criterios de aceptación verificables**, que luego se convierten en casos de prueba — esto conecta directamente el SDD con el curso de QA.
4. Se usa una **Ficha de Análisis Documental** (igual que el trabajo de referencia) para auditar cumplimiento técnico de módulos críticos al cierre del proyecto.
5. Framework de testing sugerido: **Vitest** (rápido, compatible nativo con TypeScript y Next.js) + **Testing Library** para componentes.
---
 
## Artículo VI — Usabilidad e interfaz
 
1. Diseño **mobile-first** real (no solo responsive tardío) — los reportes de incidencia se hacen frecuentemente desde el celular, parados en el laboratorio.
2. Formulario de reporte de incidencia/solicitud: máximo 3 pasos, con categorías representadas por íconos, campo de foto opcional.
3. Estados visuales consistentes: verde (operativo), amarillo (en mantenimiento/proceso), rojo (inoperativo).
4. Feedback inmediato ante cada acción (confirmación visual, número de ticket generado).
5. Validación de usabilidad final mediante la Escala SUS (System Usability Scale), aplicada a una muestra piloto — igual metodología que el trabajo de referencia, pero con datos propios.
---
 
## Artículo VII — Modelo de datos (entidades base)
 
```
Usuario         (rol: admin | tecnico | docente | estudiante, activo: boolean (default true) — Analyze v1.6: requerido por specs/002-usuarios/spec.md)
PasswordResetToken (usuario_id, token_hash, expira_en, usado: boolean, creado_en) — Analyze v1.6: nueva entidad requerida por specs/002-usuarios/spec.md (HU-05)
Laboratorio     (nombre, ubicación, capacidad, encargado)
Equipo          (código_inventario, laboratorio_id, estado: operativo|mantenimiento|inoperativo|dado_de_baja — Analyze v1.7: se agrega dado_de_baja, requerido por specs/003-laboratorios-equipos/spec.md)
Software        (nombre, tipo: licenciado|gratuito, versión)
Equipo_Software (tabla intermedia equipo ↔ software instalado)
Ticket          (tipo: incidencia|solicitud, categoría: hardware|software_licencia|software_general|red,
                 prioridad: alta|media|baja (calculada, no editable por el usuario que reporta),
                 estado: pendiente|en_proceso|resuelto,
                 equipo_id, usuario_reporta_id, tecnico_asignado_id,
                 fecha_creacion, fecha_cierre, fecha_limite (opcional, solo Solicitudes),
                 ticket_relacionado_id (opcional, referencia a un ticket previo por recurrencia),
                 comentario_cierre (obligatorio al pasar a estado resuelto),
                 software_id (opcional, si el software solicitado viene del catálogo — Analyze v1.4: faltaba, usado desde HU-02),
                 software_texto (opcional, texto libre si el software no está en catálogo — Analyze v1.4: faltaba, usado desde HU-02))
Comentario      (ticket_id, usuario_id, contenido, fecha) — seguimiento del ticket
```
 
Cualquier `spec.md` de un módulo debe referenciar estas entidades por su nombre exacto; no se renombran a mitad de proyecto.
 
---
 
## Artículo VIII — Proceso de desarrollo (gobernanza SDD)
 
1. Orden obligatorio de fases: `Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement`.
2. Ninguna fase se salta. Si una spec tiene ambigüedad detectable, se resuelve en `Clarify` antes de pasar a `Plan`.
3. La implementación es **incremental**: nunca se genera un módulo completo de una sola vez; se implementa por tareas pequeñas y verificables (esto también es evidencia documental para el Capítulo IV — cada incremento es un punto de control).
4. Cada módulo (Usuarios, Laboratorios, Equipos, Tickets, Software) se trata como una "feature" independiente dentro del flujo Spec → Plan → Tasks → Implement, documentada por separado.
5. Un cambio a esta Constitution requiere justificación explícita y se versiona (v1.0 → v1.1, etc.).
---
 
## Artículo IX — Contrato de respuesta de la API *(añadido v1.1)*
 
> **Brecha detectada:** el Artículo III define capas pero no el formato de comunicación backend↔frontend. Sin esto, cada endpoint generado por IA responde distinto (array suelto, objeto con `message`, etc.), rompiendo la capa de presentación.
 
Toda API Route o Server Action, sin excepción, devuelve el mismo contrato:
 
```ts
{ success: boolean, data?: any, error?: string, warning?: string }
```
 
- `success: true` → `data` presente, `error` ausente. `warning` es opcional y coexiste con `success: true` (ej. "ticket creado, pero ya existe otro abierto para este equipo") — una advertencia **nunca** se modela como error, porque no impide completar la operación.
- `success: false` → `error` presente con mensaje seguro para el cliente (ver Artículo X), `data` ausente, `warning` ausente.
- Ningún componente del frontend consume una respuesta que no siga este contrato.
---
 
## Artículo X — Manejo de errores y excepciones *(añadido v1.1)*
 
> **Brecha detectada:** sin regla explícita, la IA usa `try/catch` genéricos con `console.log`, ocultando fallas críticas en un sistema donde la trazabilidad del mantenimiento es el propósito central del proyecto.
 
1. Se distinguen dos tipos de error en la capa `services`:
   - **Error de dominio** (ej. reportar un equipo que ya está en mantenimiento, asignar un ticket ya cerrado) → se captura explícitamente, con un tipo/clase propio (ej. `DomainError`), y se traduce a un mensaje claro en `error` del contrato del Artículo IX.
   - **Error no controlado** (fallo de Prisma, de red, de MySQL) → se captura, se registra en un log del servidor (nunca solo `console.log`; usar un logger mínimo estructurado), y hacia el cliente se devuelve un mensaje genérico ("Ocurrió un error, intenta nuevamente"), **nunca** el detalle interno del ORM o de la base de datos.
2. **No negociable:** prohibido exponer stack traces, códigos de error de Prisma/MySQL, o rutas de archivo del servidor en cualquier respuesta hacia el cliente.
---
 
