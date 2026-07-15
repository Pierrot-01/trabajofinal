# Fase de Analisis - Sistema Web de Gestion de Informes Tecnicos y Mantenimiento de Equipos de Computo
## Laboratorios EPIS, UNSCH

**Curso:** IS-489 - Pruebas y Aseguramiento de la Calidad de Software | **Metodologia:** SDD | **Fecha:** Julio 2026

---

## 1. Problema

Los laboratorios EPIS-UNSCH no tienen mecanismo formal para reportar fallas, solicitar software, mantener historial auditable ni justificar renovacion de equipos con datos objetivos.

---

## 2. Objetivos

**General:** Formalizar y automatizar la gestion de incidencias y solicitudes de software en los labs EPIS-UNSCH con trazabilidad completa del ciclo de vida.

**Especificos:**
1. Permitir que docentes/estudiantes reporten desde cualquier dispositivo.
2. Proveer al tecnico un panel con priorizacion automatica.
3. Mantener historial completo por equipo para analisis de fallas recurrentes.
4. Control de acceso por roles; registros historicos nunca se borran.

---

## 3. Actores

| Actor | Rol |
|---|---|
| Estudiante | Reporta incidencias en equipos de practicas. |
| Docente | Reporta incidencias y solicita software antes de clases. |
| Tecnico | Gestiona tickets: toma, cambia estado, cierra con comentario. |
| Administrador | Gestion completa: usuarios, labs, equipos, software y reportes. |

> Solo el admin crea cuentas. Solo con correo @unsch.edu.pe. Sin auto-registro publico.

---

## 4. Modulos

```
[001] Tickets (modulo central)
[002] Usuarios y Autenticacion  <- P0, bloquea a todos los demas
[003] Laboratorios y Equipos
[004] Catalogo de Software
```

---

## 5. Requerimientos Funcionales

### Modulo 001: Tickets

Dos tipos de flujo diferenciados en datos e interfaz:
- **Incidencia:** falla fisica/software que impide uso (PC no enciende, mouse danado, sin red).
- **Solicitud:** recurso faltante para clases (licencia SPSS/MATLAB, instalacion de programa).

**Ciclo de vida:** `pendiente -> en_proceso -> resuelto` (sin retroceso; reaparicion = nuevo ticket referenciado).

| HU | Descripcion resumida |
|---|---|
| HU-01 | Reportar incidencia: equipo por codigo inventario, categoria, descripcion 10-500 chars, foto opcional, ticket generado. |
| HU-02 | Solicitar software: igual a HU-01 + campo fecha limite opcional (afecta prioridad). |
| HU-03 | Tecnico gestiona tickets: filtros, asignacion libre, flujo de estado, comentario cierre obligatorio. Efectos automaticos al resolver: hardware -> equipo operativo; software -> actualiza Equipo_Software. |
| HU-04 | Priorizacion calculada (no elegida): alta=hardware o <48h; media=software/red o 3-7d; baja=sin fecha o >7d. Calculo al vuelo, no almacenado en BD. |
| HU-05 | Vista publica: estado y software instalado por laboratorio. Se actualiza al resolver ticket. |
| HU-06 | Historial admin: historial completo por equipo, tiempo promedio de resolucion, reporte de N tickets en M meses (parametros ingresados por admin). |

### Modulo 002: Usuarios y Autenticacion (P0)

| HU | Descripcion resumida |
|---|---|
| HU-01 | Login con correo institucional. Mensaje generico ante error. Bloqueo 15 min tras 5 intentos fallidos. |
| HU-02 | Admin crea cuenta: nombre, correo @unsch.edu.pe (unico), rol, contrasena temporal (debe cambiarse en 1er login). |
| HU-03 | Admin gestiona cuentas: lista paginada, cambiar rol, desactivar (excepto ultimo admin activo). |
| HU-04 | Cambio de contrasena propia: exige contrasena actual, minimo 8 caracteres. |
| HU-05 | Recuperacion por enlace: un solo uso, 1 hora de validez, token hasheado, respuesta siempre generica. |

### Modulo 003: Laboratorios y Equipos

| HU | Descripcion resumida |
|---|---|
| HU-01 | Admin crea laboratorio (nombre, ubicacion, capacidad). |
| HU-02 | Admin registra equipo: codigo inventario unico, laboratorio existente, estado inicial operativo. |
| HU-03 | Admin edita equipo: si tiene tickets abiertos, advierte (no bloquea). |
| HU-04 | Admin da de baja equipo (dado_de_baja): si tiene tickets abiertos, BLOQUEA con DomainError. |
| HU-05 | Admin consulta catalogo paginado (incluye dados de baja). |

> **inoperativo** = temporalmente sin funcionar. **dado_de_baja** = retiro permanente (no aparece en selector de nuevos tickets, historial se conserva).

### Modulo 004: Catalogo de Software

| HU | Descripcion resumida |
|---|---|
| HU-01 | Admin agrega software: nombre unico, tipo licenciado/gratuito, version opcional. |
| HU-02 | Admin edita software existente. |
| HU-03 | Admin elimina software: solo si no tiene relaciones en Equipo_Software ni en tickets. |

---

## 6. Reglas de Negocio

| ID | Regla | Respuesta |
|---|---|---|
| BR-01 | Equipo con ticket abierto al crear uno nuevo: advierte, no bloquea. | warning |
| BR-02 | Incidencia hardware resuelta: Equipo.estado = operativo (automatico, misma transaccion). | Efecto auto |
| BR-03 | Solicitud software resuelta: crea/actualiza Equipo_Software (automatico). | Efecto auto |
| BR-04 | Ticket resuelto no puede volver a pendiente. | DomainError |
| BR-05 | Solo admin reasigna ticket ya tomado por tecnico. | Control rol |
| BR-06 | Ultimo admin activo no puede desactivarse ni degradarse. | DomainError |
| BR-07 | Contrasena temporal debe cambiarse en el primer login. | Flujo forzado |
| BR-08 | Equipo dado_de_baja no aparece en selector de nuevos tickets. | Filtro datos |
| BR-09 | No se puede dar de baja equipo con tickets pendiente/en_proceso. | DomainError |
| BR-10 | No se puede eliminar software en uso (Equipo_Software o ticket). | DomainError |
| BR-11 | Texto libre en ticket no agrega al catalogo automaticamente. | Control rol |

---

## 7. Edge Cases Criticos

| # | Caso | Comportamiento |
|---|---|---|
| EC-01 | Hardware resuelto pero el equipo tiene otro ticket abierto | Equipo permanece en mantenimiento. |
| EC-02 | Solicitud con fecha limite < 48h sin atender | Prioridad sube a alta al vuelo. |
| EC-03 | Ticket relacionado con falla anterior | Usuario elige manualmente el ticket previo. |
| EC-04 | Login con cuenta desactivada | Rechazado sin revelar si la contrasena era correcta. |
| EC-05 | Token de recuperacion ya usado o expirado | DomainError: "Este enlace ya no es valido." |
| EC-06 | Codigo de inventario duplicado | DomainError: "Este codigo ya esta registrado." |
| EC-07 | Nombre de software duplicado | DomainError: "Este software ya esta en el catalogo." |

---

## 8. Requerimientos No Funcionales

**Seguridad (OWASP Top 10:2025):** control de acceso en backend, bcrypt para contrasenas, Zod en toda entrada, .env para secretos, rate limiting login, HTTPS en produccion, pnpm audit por entrega.

**Usabilidad:** mobile-first, formulario en max 3 pasos, estados con colores consistentes (verde/amarillo/rojo), feedback inmediato con numero de ticket, evaluacion SUS con muestra piloto.

**Rendimiento:** queries Prisma con select explicito, paginacion obligatoria, next/image para imagenes, ISR para vistas de baja volatilidad, indices de BD en filtros frecuentes.

**Calidad:** pruebas unitarias por service (exito + caso borde), pruebas de integracion en endpoints criticos, seed con 6 meses de historial simulado, cobertura minima 90% en capa de servicios.

---

## 9. Modelo de Datos Conceptual

```
Usuario            -- id, nombre, correo, passwordHash, rol, activo
PasswordResetToken -- id, usuarioId, tokenHash, expiraEn, usado
Laboratorio        -- id, nombre, ubicacion, capacidad
Equipo             -- id, codigoInventario*, laboratorioId, estado(operativo|mantenimiento|inoperativo|dado_de_baja)
Software           -- id, nombre*, tipo(licenciado|gratuito), version?
Equipo_Software    -- equipoId + softwareId (tabla intermedia)
Ticket             -- id, tipo, categoria, descripcion, fotoUrl?, estado, fechaCreacion,
                      fechaCierre?, fechaLimite?, comentarioCierre?,
                      equipoId, usuarioReportaId, tecnicoAsignadoId?,
                      ticketRelacionadoId?, softwareId?, softwareTexto?
Comentario         -- id, ticketId, usuarioId, contenido, fecha
* = campo unico
```

---

## 10. Criterios de Aceptacion del Sistema

1. Ningun usuario accede a funciones fuera de su rol, ni manipulando la URL.
2. Historial de tickets, equipos y usuarios nunca se borra fisicamente.
3. Prioridad de tickets siempre refleja urgencia real en tiempo de consulta.
4. Efectos automaticos (estado equipo, software instalado) ocurren en la misma transaccion del cierre.
5. Ningun error interno de Prisma/PostgreSQL se expone al cliente.
6. El sistema nunca queda sin ningun administrador activo.