---
trigger: always_on
---

# Especificación: Módulo de Usuarios y Autenticación

**Feature:** 002-usuarios
**Estado:** Aclarado — listo para Plan
**Constitution de referencia:** v1.5
**Prioridad:** P0 — bloquea a todos los demás módulos (Tickets, Laboratorios, Equipos, Software dependen de saber quién es el usuario y qué rol tiene)

---

## 0. Clarifications (Sesión de aclaración)

| # | Pregunta | Decisión | Criterio aplicado |
|---|---|---|---|
| 1 | ¿Cualquiera puede registrarse (auto-registro), o solo el admin crea cuentas? | **Solo el admin crea cuentas.** No existe formulario público de registro. | Es un sistema institucional cerrado (EPIS-UNSCH); auto-registro abriría la puerta a cuentas falsas o de gente ajena a la facultad — conecta directo con el filtro de "usuarios no deseados" discutido antes. |
| 2 | ¿Se puede eliminar una cuenta de usuario permanentemente? | **No.** Solo se puede **desactivar** (`activo: false`). Nunca `DELETE` de un `Usuario`. | Un usuario desactivado puede tener tickets reportados/asignados en su historial — borrarlo rompería la trazabilidad (Art. I). Desactivar es reversible y más seguro. |
| 3 | ¿El correo debe ser institucional? | **Sí.** Se valida que termine en `@unsch.edu.pe` al crear la cuenta. | Filtra automáticamente usuarios ajenos a la institución, sin necesitar un mecanismo de aprobación manual aparte. |
| 4 | ¿Qué pasa si el único admin intenta desactivarse a sí mismo? | **Se bloquea con un error de dominio.** Debe existir al menos un admin activo en todo momento. | Evita que el sistema quede sin nadie que pueda gestionar usuarios — es un caso borde simple de prevenir y catastrófico si no se cubre. |
| 5 | ¿Cómo se recupera una contraseña olvidada? | **Enlace de un solo uso enviado por correo institucional**, válido por 1 hora, invalidado tras el primer uso. | Estándar de la industria, simple de implementar con Auth.js, no requiere soporte manual del admin para cada caso. |

---

## 1. Resumen (qué y por qué)

Este módulo gestiona la identidad y el acceso de todos los usuarios del sistema. Es la base sobre la que se apoyan los controles de rol usados en Tickets, Laboratorios, Equipos y Software (Art. IV — Broken Access Control). Sin este módulo, ningún otro puede validar "quién puede hacer qué".

---

## 2. Historias de usuario

### HU-01 — Iniciar sesión
**Como** cualquier usuario con cuenta creada por el admin,
**quiero** iniciar sesión con mi correo institucional y contraseña,
**para** acceder a las funciones que me corresponden según mi rol.

**Criterios de aceptación:**
1. El login rechaza credenciales inválidas con un mensaje genérico ("Correo o contraseña incorrectos") — nunca revela si el correo existe o no (evita enumeración de usuarios, Art. IV).
2. Una cuenta con `activo: false` no puede iniciar sesión, incluso con contraseña correcta; mensaje: "Esta cuenta está desactivada, contacta al administrador."
3. Tras 5 intentos fallidos consecutivos, la cuenta queda bloqueada temporalmente 15 minutos (Art. IV, punto 6).

---

### HU-02 — Admin crea una cuenta de usuario
**Como** administrador,
**quiero** crear una cuenta para un docente, estudiante o técnico,
**para** que puedan usar el sistema con el rol que les corresponde.

**Criterios de aceptación:**
1. El admin ingresa nombre, correo institucional, rol (`admin`|`tecnico`|`docente`|`estudiante`) y una contraseña temporal.
2. El correo debe ser único y terminar en `@unsch.edu.pe` (Clarify #3); si no cumple el formato, se rechaza antes de tocar la base de datos.
3. La contraseña temporal se hashea con bcrypt antes de guardarse — nunca se almacena en texto plano, ni siquiera momentáneamente en un log (Art. IV, punto 2).
4. Al primer login con contraseña temporal, el sistema exige cambiarla (ver HU-04) antes de continuar.

---

### HU-03 — Admin gestiona cuentas existentes
**Como** administrador,
**quiero** ver la lista de usuarios, cambiar su rol o desactivarlos,
**para** mantener el acceso al sistema actualizado (ej. un técnico que ya no trabaja ahí).

**Criterios de aceptación:**
1. El admin ve una lista paginada de usuarios (Art. XIV, punto 2) con nombre, correo, rol, estado (activo/inactivo).
2. El admin puede cambiar el rol de cualquier usuario excepto el suyo propio (evita que se quite privilegios de admin por error, sin querer bloquearse).
3. El admin puede desactivar cualquier cuenta, **salvo si es la única cuenta `admin` activa** (Clarify #4) — en ese caso el sistema responde con `DomainError`: "Debe existir al menos un administrador activo."
4. Desactivar un usuario no borra ni modifica los tickets que reportó o tiene asignados — solo bloquea su acceso futuro.

---

### HU-04 — Cambiar la propia contraseña
**Como** usuario autenticado,
**quiero** cambiar mi contraseña,
**para** dejar de usar la temporal que me asignó el admin, o por seguridad periódica.

**Criterios de aceptación:**
1. Se exige la contraseña actual antes de aceptar la nueva (evita que alguien con una sesión abierta sin permiso cambie la contraseña sin saber la anterior).
2. La nueva contraseña requiere mínimo 8 caracteres — sin exigir combinaciones complejas de símbolos (fricción innecesaria para usuarios no técnicos, y NIST ya no recomienda esas reglas rígidas).

---

### HU-05 — Recuperar contraseña olvidada
**Como** usuario que olvidó su contraseña,
**quiero** solicitar un enlace de recuperación a mi correo institucional,
**para** poder volver a acceder sin depender de que el admin me la resetee manualmente.

**Criterios de aceptación:**
1. El usuario ingresa su correo; el sistema responde siempre con el mismo mensaje genérico ("Si el correo existe, se envió un enlace"), exista o no la cuenta (Art. IV — evita enumeración).
2. El enlace es de un solo uso, expira en 1 hora, y el token se guarda **hasheado** en la base de datos, nunca en texto plano (mismo criterio que una contraseña).
3. Al usar el enlace, se exige una nueva contraseña (mismas reglas de HU-04, criterio 2); tras el cambio, el token queda invalidado aunque no haya expirado.

---

## 3. Edge cases

| # | Caso | Comportamiento esperado |
|---|---|---|
| 1 | El admin intenta crear una cuenta con un correo no institucional | Rechazado antes de tocar la base de datos, error de validación (Zod), no de dominio. |
| 2 | Se usa un token de recuperación ya usado o expirado | `DomainError`: "Este enlace ya no es válido, solicita uno nuevo." |
| 3 | El único admin activo intenta desactivarse a sí mismo o degradar su propio rol | `DomainError`: "Debe existir al menos un administrador activo." (Clarify #4) |
| 4 | Un usuario desactivado intenta iniciar sesión | Rechazado con mensaje claro, sin dar pistas de si la contraseña era correcta. |
| 5 | Se alcanzan 5 intentos fallidos de login | Cuenta bloqueada temporalmente 15 minutos, incluso si luego se ingresa la contraseña correcta durante ese lapso. |

---

## 4. Entidades involucradas

- `Usuario` (ya definida en Constitution Art. VII) — se agrega el campo `activo: boolean` (default `true`), no contemplado originalmente.
- `PasswordResetToken` (nueva — no estaba en el Art. VII): `id, usuarioId, tokenHash, expiraEn, usado: boolean, creadoEn`.

**Nota (resuelta):** ambos campos se propagaron a la Constitution en v1.6.

---

## 5. Fuera de alcance (MVP)

- Login social/OAuth (Google, Microsoft).
- Autenticación de dos factores (2FA) — posible extensión futura, no crítica para el tamaño de este proyecto.
- Auto-registro público.

---

## 6. Criterios de éxito del módulo

1. Ningún usuario puede acceder a una función fuera de su rol, ni siquiera manipulando la URL directamente (validado en `service`, no solo en la UI — Art. IV).
2. Cero contraseñas o tokens de recuperación almacenados en texto plano, verificable revisando el schema y el código (Art. IV, XIV).
3. El sistema nunca queda en un estado sin ningún admin activo (Edge case 3).

---

## 7. Trazabilidad con la Constitution

| Punto de la spec | Artículo que lo rige |
|---|---|
| Mensajes genéricos ante login/recuperación fallidos | Art. IV — Broken Access Control (no enumeración de usuarios) |
| Contraseñas y tokens hasheados | Art. IV, punto 2 |
| Rate limiting tras 5 intentos fallidos | Art. IV, punto 6 |
| Correo institucional obligatorio | Art. IV, punto 6 (filtro de usuarios no deseados) |
| Paginación de la lista de usuarios | Art. XIV, punto 2 |
| `Usuario.activo` y `PasswordResetToken` no estaban en Art. VII | Pendiente de propagar (mismo patrón que Tickets v1.2/v1.4) |
