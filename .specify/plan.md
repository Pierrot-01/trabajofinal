# Plan Técnico: Sistema de Gestión de Informes Técnicos e Inventario (EpisLab)
**Feature:** E-001-EpisLab-Core
**Basado en:** spec.md (Aclarado)
**Constitution de referencia:** v1.8
**Estado:** Completado

---

## 1. Validación contra la Constitution
| Decisión de este plan | Artículo que la rige |
|---|---|
| Aislamiento de lógica en `lib/services/` sin imports de Prisma. | Art. III (Arquitectura Hexagonal) |
| Retornos en Server Actions con formato `{ success, data?, error?, warning? }`. | Art. IX (Contrato de API) |
| Lanzamiento de `DomainError` en reglas de negocio en lugar de propagar errores de base de datos. | Art. X (Manejo de Errores) |
| Bloqueo temporal de login en el service mediante Zod + lógica de intentos fallidos. | Art. IV (Seguridad OWASP) |
| Ejecución unitaria obligatoria mediante mockeo de interfaces `IXxxRepository`. | Art. V (Testing) |

---

## 2. Modelo de datos (Prisma Schema)
No se modifican modelos existentes. Toda la estructura está mapeada según la base de datos de producción:
* `Usuario` (admins, técnicos, docentes, estudiantes)
* `PasswordResetToken` (tokens para reseteo)
* `Laboratorio` (nombre, ubicación, capacidad)
* `Equipo` (código de inventario, laboratorio, estado)
* `Software` (tipo, versión, nombre)
* `EquipoSoftware` (instalación)
* `Ticket` (incidencia o solicitud, estado, relaciones, descripciones)
* `Comentario` (comunicación interna)

---

## 3. Arquitectura Hexagonal — Mapa de Capas

### Fase 1 — Puertos: `lib/ports/`
Definen las interfaces que aíslan al Dominio de la Infraestructura de base de datos:
* [IUsuarioRepository.ts](file:///d:/zapata/EpisLab/lib/ports/IUsuarioRepository.ts): Métodos `buscarPorCorreo`, `buscarPorId`, `guardar`, `desactivar`.
* [ITicketRepository.ts](file:///d:/zapata/EpisLab/lib/ports/ITicketRepository.ts): Métodos `buscarPorId`, `crear`, `actualizar`, `listarPaginado`.
* [IEquipoRepository.ts](file:///d:/zapata/EpisLab/lib/ports/IEquipoRepository.ts): Métodos `buscarPorCodigo`, `buscarPorId`, `guardar`.
* [ISoftwareRepository.ts](file:///d:/zapata/EpisLab/lib/ports/ISoftwareRepository.ts): Métodos `buscarPorNombre`, `guardar`, `eliminar`.

### Fase 2 — Validadores: `lib/validators/`
Esquemas de Zod para asegurar tipos limpios y mensajes seguros en español:
* [usuario.validators.ts](file:///d:/zapata/EpisLab/lib/validators/usuario.validators.ts): Validaciones de contraseña, correo institucional, creación y login.
* [ticket.validators.ts](file:///d:/zapata/EpisLab/lib/validators/ticket.validators.ts): Validaciones para reporte de incidencias (10-500 caracteres, urls de fotos).

### Fase 3 — Errores: `lib/errors/`
Modelos de excepción de negocio:
* [domain-error.ts](file:///d:/zapata/EpisLab/lib/errors/domain-error.ts): Clase base `DomainError` y subclases (`BloqueoCuentaError`, `EquipoDadoDeBajaError`, `AdminUnicoError`, etc.).

### Fase 4 — Repositorios: `lib/repositories/`
Implementación de los puertos con Prisma Client:
* `usuario.repository.ts`, `ticket.repository.ts`, `equipo.repository.ts`, `software.repository.ts`.
* Único lugar con imports de `lib/prisma` y `@prisma/client`.
* Se aplican queries con `select` explícito.

### Fase 5 — Servicios: `lib/services/`
Contienen las reglas de negocio críticas libres de APIs de Next.js o base de datos:
* `usuario.service.ts` (Validar login, intentos fallidos, bloqueos temporales, prevención de desactivación del último admin).
* `ticket.service.ts` (Lógica de transiciones, auto-operatividad de equipos al resolver, adición automática al inventario de software).
* `equipo.service.ts` (Reglas de baja y mantenimiento).
* `software.service.ts` (Validar desasociación antes de eliminar).

---

## 4. Decisiones Técnicas
* **Prioridad al vuelo:** Para simplificar el almacenamiento, la prioridad de un ticket se calcula al vuelo combinando el rol del reportante (ej. docente tiene más peso en horas de clase) y el tipo/categoría del ticket.
* **Transacciones en base de datos:** El cambio de estado de un equipo al resolverse su ticket correspondiente se ejecuta en una sola transacción (`prisma.$transaction`) en el repositorio, garantizando consistencia.
* **No Borrado Físico:** Se implementó borrado lógico mediante flags (`activo: false` en usuarios y `estado: dado_de_baja` en equipos) para evitar que queden huérfanos los tickets históricos.
