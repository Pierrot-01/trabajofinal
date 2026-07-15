# Spec: Sistema de Gestión de Informes Técnicos e Inventario (EpisLab)
**Feature:** E-001-EpisLab-Core
**Estado:** Listo para Plan
**Constitution de referencia:** v1.8
**Fecha:** 2026-07-15

## 0. Clarifications
| # | Pregunta | Decisión | Criterio aplicado |
|---|---|---|---|
| 1 | ¿Cómo se diferencian las fallas de hardware y las solicitudes de software? | Aclarado | Las fallas que impiden el uso son **Incidencias**; la falta de recursos (software, licencias) son **Solicitudes** (Art. I). |
| 2 | ¿Un técnico puede ver tickets de otros laboratorios? | Aclarado | Sí, los técnicos y administradores ven tickets de cualquier laboratorio para simplificar el flujo (Precedente #25). |
| 3 | ¿Se pueden eliminar físicamente registros de Equipos o Usuarios? | Aclarado | No, los usuarios se desactivan (`activo: false`) y los equipos se marcan como `dado_de_baja` para preservar el historial de tickets (Precedentes #31 y #33). |

---

## 1. Resumen (qué y por qué)
EpisLab es la plataforma web diseñada para la Escuela Profesional de Ingeniería de Sistemas (EPIS) de la UNSCH para resolver la falta de trazabilidad en la gestión de fallas de computadoras e insumos en los laboratorios. Centraliza el reporte de incidencias y solicitudes por parte de estudiantes y docentes, y gestiona el inventario de hardware y licencias por parte de técnicos y administradores.

---

## 2. Actores y Permisos
* **Administrador (admin):** Control total. Crea y gestiona cuentas, laboratorios, equipos, catálogo de software y reasigna tickets.
* **Técnico (tecnico):** Resuelve tickets de incidencias y solicitudes, gestiona estados de equipos e instalaciones.
* **Docente (docente):** Reporta incidencias y solicita software en equipos de laboratorios donde dicta clase.
* **Estudiante (estudiante):** Reporta incidencias de hardware/red en los equipos que usa.

---

## 3. Historias de Usuario (HUs)

### Módulo 001 — Tickets de Soporte
#### HU-1.1: Reportar Incidencia de Hardware
**Como** estudiante o docente,
**quiero** reportar una falla en una PC (ej. no enciende, mouse dañado),
**para** que el equipo de soporte técnico la resuelva.
* **Criterios de Aceptación:**
  * Se requiere seleccionar el laboratorio y el equipo mediante su `codigoInventario`.
  * Lanza un `warning` si el equipo seleccionado ya tiene un ticket abierto (evita duplicados sin bloquear).

#### HU-1.2: Solicitar Instalación de Software
**Como** docente,
**quiero** solicitar la instalación de un software específico (ej. MATLAB, SPSS),
**para** el dictado de mis clases en un laboratorio.
* **Criterios de Aceptación:**
  * Permite elegir un software del catálogo o escribir uno nuevo (texto libre).
  * Si se resuelve la solicitud, se asocia automáticamente el software al inventario del equipo (`EquipoSoftware`).

#### HU-1.3: Gestionar Ciclo de Vida del Ticket
**Como** técnico,
**quiero** tomar un ticket pendiente (estado a `en_proceso`) y cerrarlo como `resuelto`,
**para** llevar el control del soporte técnico.
* **Criterios de Aceptación:**
  * El flujo es estrictamente `pendiente → en_proceso → resuelto`. No hay retrocesos.
  * Al marcar como `resuelto` una incidencia de hardware, el estado del equipo cambia automáticamente a `operativo` (misma transacción).
  * Es obligatorio incluir un comentario de cierre.

---

### Módulo 002 — Usuarios y Autenticación
#### HU-2.1: Iniciar Sesión Seguro
**Como** usuario de la EPIS (estudiante, docente, técnico, admin),
**quiero** autenticarme con mis credenciales institucionales,
**para** acceder a mis paneles correspondientes.
* **Criterios de Aceptación:**
  * Login mediante correo `@unsch.edu.pe`. Contraseñas hasheadas con `bcrypt`.
  * Tras 5 intentos fallidos, la cuenta se bloquea por 15 minutos (Seguridad OWASP).
  * Un administrador inactivo (`activo: false`) no puede iniciar sesión.

#### HU-2.2: Crear y Desactivar Cuentas (Admin)
**Como** admin,
**quiero** crear cuentas y desactivar usuarios obsoletos,
**para** mantener segura la plataforma.
* **Criterios de Aceptación:**
  * Regla crítica: El sistema bloquea con un `DomainError` si se intenta desactivar al último administrador activo del sistema (garantiza acceso continuo).

---

### Módulo 003 — Laboratorios y Equipos
#### HU-3.1: Control de Inventario
**Como** admin,
**quiero** registrar y dar de baja equipos de cómputo,
**para** mantener el inventario de los laboratorios actualizado.
* **Criterios de Aceptación:**
  * El `codigoInventario` es un texto libre único.
  * Dar de baja un equipo cambia su estado a `dado_de_baja`. Bloquea con `DomainError` si el equipo tiene algún ticket en estado `pendiente` o `en_proceso`.

---

### Módulo 004 — Catálogo de Software
#### HU-4.1: Registrar y Asignar Software
**Como** admin o técnico,
**quiero** mantener el catálogo de software y asociarlo a los equipos,
**para** saber qué programas están instalados en qué computadoras.
* **Criterios de Aceptación:**
  * No se puede eliminar un software del catálogo si está instalado en algún equipo (`EquipoSoftware`) o tiene tickets pendientes asociados.

---

## 4. Reglas de Negocio (BRs)
* **BR-01:** Crear un ticket sobre un equipo con otro ticket abierto genera un `warning`, no un error bloqueante.
* **BR-02:** Resolver incidencia de hardware cambia automáticamente `Equipo.estado = operativo` en la misma transacción.
* **BR-03:** Resolver solicitud de software asocia automáticamente el software al equipo (`EquipoSoftware`).
* **BR-04:** Un ticket en estado `resuelto` no puede volver a estados anteriores.
* **BR-05:** Solo el `admin` puede reasignar un ticket que ya fue tomado por otro técnico.
* **BR-06:** No se puede desactivar o degradar al último administrador activo del sistema.
* **BR-09:** Bloquear la baja de un equipo si tiene tickets activos (`pendiente` o `en_proceso`).
* **BR-10:** Bloquear la eliminación de un software si está relacionado con equipos o tickets.

---

## 5. Casos Borde (Edge Cases)
* **EC-01:** Intento de login en cuenta bloqueada temporalmente: Retorna error informando cuántos minutos restan de bloqueo.
* **EC-02:** Intento de baja de un equipo inoperativo: Si no tiene tickets pendientes, permite la baja administrativa cambiándolo a `dado_de_baja`.

---

## 6. Entidades Afectadas
* `Usuario` -> Gestión y seguridad de accesos.
* `Laboratorio` -> Sedes físicas de soporte.
* `Equipo` -> Inventariado y estado operacional.
* `Software` -> Catálogo oficial de programas.
* `EquipoSoftware` -> Tabla intermedia de software instalado.
* `Ticket` -> Registro de incidencias y solicitudes.
* `Comentario` -> Trazabilidad de comunicación en los casos.
