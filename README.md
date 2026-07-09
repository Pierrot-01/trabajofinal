# Sistema Web de Gestión de Mantenimiento y Control de Laboratorios — EPIS UNSCH

Este proyecto es el software desarrollado para la Escuela Profesional de Ingeniería de Sistemas de la Universidad Nacional de San Cristóbal de Huamanga (UNSCH), diseñado para la gestión integral de informes técnicos, control de incidencias, solicitudes lógicas y catalogación de activos de hardware y software de la facultad.

---

## 🚀 Arquitectura y Stack Tecnológico

El sistema sigue los principios de la **Arquitectura Hexagonal (Ports & Adapters)** para garantizar desacoplamiento total y alta testabilidad, implementando el siguiente stack:

*   **Frontend & API:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui.
*   **Base de Datos & ORM:** SQLite en desarrollo / MySQL en producción, gestionado con **Prisma ORM** bajo el patrón Singleton (`lib/prisma.ts`) para optimización de conexiones.
*   **Autenticación:** Auth.js v5 (NextAuth) con validación de credenciales del lado del servidor.
*   **Validación de Datos:** Zod para control estricto de esquemas de datos antes de interactuar con la base de datos.
*   **Testing Suite:** Vitest para pruebas unitarias e integración en el entorno de desarrollo y xUnit/Moq en C# para validación lógica multiplataforma.

---

## 🛠️ Metodología Spec-Driven Development (SDD) Automatizada

El desarrollo del sistema no se rigió por metodologías empíricas, sino por el rigor metodológico del **Spec-Driven Development (SDD)**:

```
[Constitution] ➔ [Specify] ➔ [Clarify] ➔ [Plan] ➔ [Tasks] ➔ [Analyze] ➔ [Implement]
```

### Automatización del Proceso:
*   **Motor de Agente Inteligente (`.agents/rules`):** Las reglas fundamentales (Constitución, Especificaciones y Planes Técnicos) residen en el repositorio bajo `.agents/rules/`. El agente de desarrollo lee automáticamente estas especificaciones abiertas antes de escribir código, forzando la consistencia lógica y rechazando de forma automática cualquier propuesta que viole la arquitectura limpia o las políticas de seguridad (defensa ante inyecciones o Broken Access Control).
*   **Compilador de Modelos (Prisma Engine):** Traduce automáticamente el esquema relacional (`schema.prisma`) a tipos y consultas de TypeScript seguras contra errores de tipo.
*   **Validador Sintáctico (Zod Engine):** Realiza análisis y validaciones sintácticas automáticas en la frontera de las peticiones HTTP de la API, bloqueando peticiones malformadas.

---

## 📖 Especificación Abierta de API (Open Spec) y Swagger UI

El proyecto implementa la especificación abierta **OpenAPI 3.0** para documentar y simular de forma dinámica el comportamiento de sus servicios:

*   **Especificación JSON:** Servida automáticamente por el sistema en la ruta `/api/openapi`.
*   **Swagger UI (Panel Interactivo):** Disponible localmente en `/docs`. Permite a cualquier evaluador o docente simular las transacciones lógicas del sistema, incluyendo:
    *   Autenticación de usuarios institucionales (`@unsch.edu.pe`).
    *   Reportes de incidencias y solicitudes de software.
    *   Ciclo de vida del ticket (Pendiente ➔ En Proceso ➔ Resuelto) con transiciones automáticas en el estado del hardware.
    *   Administración segura del catálogo lógico de software.

---

## 🧪 Plan de Aseguramiento de la Calidad (QA)

El software cuenta con una sólida suite de pruebas automatizadas:

### 1. Suite en TypeScript (Vitest)
Compuesta por **11 archivos de pruebas y 141 casos de prueba** lógicos unitarios y de integración con **92.3% de cobertura**:
*   *Pruebas Unitarias:* Validan el cálculo de prioridades de tickets al vuelo y validaciones de seguridad con aislamiento absoluto.
*   *Pruebas de Integración:* Ejecutan una base de datos SQLite aislada que se recrea y puebla con un histórico simulado de 6 meses de datos relacionales en cada corrida de pruebas.

### 2. Suite en C# (.NET xUnit & Moq)
Compuesta por **123 aserciones exitosas** en Visual Studio 2022. Valida la lógica de negocio pura mediante el uso de dobles de pruebas (Mocks) aplicados a las interfaces de la arquitectura, garantizando la consistencia funcional del dominio de forma independiente a la infraestructura.

---

## 💻 Instrucciones de Instalación y Ejecución

### Requisitos Previos:
*   **Node.js v20** o superior.
*   **pnpm** (gestor de paquetes recomendado).

### Paso 1: Clonar e instalar dependencias
```bash
git clone <url-del-repositorio>
cd trabajofinal_calidadsoftware
pnpm install
```

### Paso 2: Configurar las variables de entorno
Crea un archivo `.env` en la raíz (puedes guiarte de `.env.example`):
```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="un_secreto_muy_seguro_minimo_32_caracteres"
NEXTAUTH_URL="http://localhost:3000"
```

### Paso 3: Aprovisionar Base de Datos y Seed
Ejecuta la sincronización de Prisma y el poblamiento de datos iniciales (laboratorios, usuarios de prueba de todos los roles, catálogo de software e historial de tickets):
```bash
pnpm dlx prisma db push
pnpm dlx prisma db seed
```

### Paso 4: Levantar el servidor de desarrollo
```bash
pnpm dev
```
Abre [http://localhost:3000](http://localhost:3000) en el navegador.

*   Accede al panel de documentación interactiva OpenAPI en: [http://localhost:3000/docs](http://localhost:3000/docs).

### Paso 5: Correr la suite de pruebas
```bash
pnpm test
```
o para ver la cobertura de código:
```bash
pnpm test:coverage
```
