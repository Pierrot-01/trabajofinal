# EpisLab — Sistema Web de Gestión de Mantenimiento y Control de Laboratorios — EPIS UNSCH

Este proyecto es el software desarrollado para la Escuela Profesional de Ingeniería de Sistemas de la Universidad Nacional de San Cristóbal de Huamanga (UNSCH), diseñado para la gestión integral de informes técnicos, control de incidencias, solicitudes lógicas y catalogación de activos de hardware y software de la facultad.

---

## 🚀 Arquitectura y Stack Tecnológico

El sistema sigue los principios de la **Arquitectura Hexagonal (Ports & Adapters)** para garantizar desacoplamiento total y alta testabilidad, implementando el siguiente stack:

*   **Frontend & API:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui.
*   **Base de Datos & ORM:** PostgreSQL (Supabase) en la nube para desarrollo, pruebas y producción, gestionado con **Prisma ORM** bajo el patrón Singleton (`lib/prisma.ts`) para optimizar conexiones en entornos serverless.
*   **Autenticación:** Auth.js v5 (NextAuth) con validación de credenciales del lado del servidor.
*   **Validación de Datos:** Zod para control estricto de esquemas de datos antes de interactuar con la base de datos.
*   **Testing Suite:** Vitest para pruebas unitarias e integración en el entorno de desarrollo y xUnit/Moq en C# para validación lógica multiplataforma.

---

## 🛠️ Metodología Spec-Driven Development (SDD) Automatizada

El desarrollo del sistema no se rigió por metodologías empíricas, sino por el rigor metodológico del **Spec-Driven Development (SDD)**:

```
[Constitution] ➔ [Specify] ➔ [Clarify] ➔ [Plan] ➔ [Tasks] ➔ [Analyze] ➔ [Implement]
```

---

## 🔄 Ciclo de Vida del Desarrollo (SDLC) en EpisLab

El proyecto fue construido y verificado recorriendo estrictamente todas las fases del ciclo de vida de desarrollo de software (SDLC) bajo el enfoque de aseguramiento de la calidad (QA):

### 1. Fase de Análisis
*   **Definición del Problema:** Falta de trazabilidad en la gestión manual de incidencias técnicas y solicitudes de instalación de software en los laboratorios de cómputo de la EPIS UNSCH.
*   **Historias de Usuario (HUs):** Se documentaron requerimientos detallados y criterios de aceptación objetivos para cada módulo.
*   **Reglas de Negocio:** Políticas de dominio estrictas (ej. impedir desactivar al último Administrador del sistema o impedir dar de baja un equipo con tickets técnicos abiertos).
*   **Casos Borde (Edge Cases):** Identificación preventiva de flujos complejos (ej. tickets duplicados activos sobre una misma terminal física).

### 2. Fase de Diseño
*   **Arquitectura en Capas:** Desacoplamiento total en tres capas (Presentación `app/`, Lógica de Negocio `lib/services/` e Infraestructura `lib/repositories/`).
*   **Diseño Relacional:** Modelo de datos en PostgreSQL con relaciones entre Usuarios, Roles, Laboratorios, Equipos, Software y Comentarios.
*   **Contrato Común de API:** Todas las Server Actions y endpoints del backend retornan el mismo formato de respuesta unificado `{ success, data, error, warning }` (Artículo IX).

### 3. Fase de Programación
*   **Tipado Estricto:** Código implementado 100% en TypeScript y C# para garantizar la detección de errores de tipo en tiempo de compilación.
*   **Lógica de Negocio Pura:** Prioridad de tickets calculada dinámicamente al vuelo (basada en el tipo y la cercanía de la fecha límite).
*   **Mutaciones Transaccionales:** Modificaciones de datos seguras (ej. al resolver el último ticket de hardware de un PC, su estado físico se restablece automáticamente a `operativo` dentro de la misma transacción de la base de datos).

### 4. Fase de Pruebas (QA)
*   **Pruebas Unitarias (TypeScript & C#):** Validación aislada del comportamiento de servicios y validadores utilizando dobles de prueba (Mocks).
*   **Pruebas de Integración (TypeScript):** Ejecución de flujos lógicos reales de extremo a extremo utilizando un esquema aislado (`test`) en Supabase y una base de datos semilla (`seed.ts`) que modela 6 meses de historial.
*   **Estadísticas de Pruebas:** **141 casos de prueba en TypeScript** (cobertura global de **93.23%** en código de negocio) y **141 pruebas homólogas en C#** (Visual Studio / xUnit / Moq).

### 5. Fase de Despliegue y Optimización
*   **Base de Datos en la Nube:** PostgreSQL alojado en Supabase con soporte de Connection Pooling (PgBouncer) para optimizar el consumo serverless.
*   **Pipeline de CI/CD:** Despliegue automatizado en Vercel vinculado al repositorio GitHub.
*   **Optimización del Lado del Servidor:** Implementación de **On-Demand ISR (Incremental Static Regeneration)** con `revalidatePath` para mantener estáticas las vistas (carga instantánea) e invalidar la caché únicamente al ocurrir mutaciones.
*   **Optimización de Recursos:** Compresión y conversión automática de evidencias fotográficas pesadas al formato WebP al vuelo con `next/image`.

---

## 🤖 Herramientas de Automatización (Open Spec & Spec Kit)

El proyecto integra de forma explícita herramientas automatizadas basadas en especificaciones, divididas en dos categorías gobernadas por la ingeniería de calidad:

### 1. Especificación Abierta (Open Spec)
*   **Estándar OpenAPI 3.0 (`openapi.json`):** Definición formal de los contratos de entrada/salida y endpoints del sistema, expuesta automáticamente en la ruta `/api/openapi`.
*   **Swagger UI (`/docs`):** Interfaz interactiva y automatizada que renderiza la especificación de API. Permite al evaluador o docente simular transacciones lógicas del sistema (como creación de tickets, autenticación y transiciones de estado) directamente desde el navegador.

### 2. Kit de Generación y Validación (Spec Kit)
*   **Prisma Client Generator:** Actúa como el *Spec Kit* de base de datos. Lee la especificación relacional (`schema.prisma`) y genera automáticamente las clases, tipos de TypeScript y consultas del cliente SQL, garantizando consistencia absoluta y mitigando errores de tipado.
*   **Zod Schema Validator:** Funciona como el *Spec Kit* de validación sintáctica del lado del servidor. Genera y automatiza el análisis y validación de las cargas útiles (payloads) de entrada en tiempo de ejecución, rechazando datos malformados en frontera.
*   **Antigravity (Agentic Coding Engine):** El IDE de desarrollo inteligente actúa como el compilador del *Spec Kit* metodológico. Lee de forma automática las especificaciones abiertas ubicadas en `.agents/rules/` (Constitución, especificaciones e Historias de Usuario) para auditar, planificar e implementar la arquitectura del código, impidiendo la inyección silenciosa de deuda técnica o violaciones de seguridad.

---

## 🧪 Plan de Aseguramiento de la Calidad (QA)

El software cuenta con una sólida suite de pruebas automatizadas:

### 1. Suite en TypeScript (Vitest)
Compuesta por **11 archivos de pruebas y 141 casos de prueba** lógicos unitarios y de integración con **93.23% de cobertura de líneas**:
*   *Pruebas Unitarias:* Validan el cálculo de prioridades de tickets al vuelo y validaciones de seguridad con aislamiento absoluto.
*   *Pruebas de Integración:* Ejecutan un esquema aislado (`test`) dentro de la base de datos PostgreSQL en Supabase que se recrea y puebla con un histórico simulado de 6 meses de datos relacionales en cada corrida de pruebas.

### 2. Suite en C# (.NET xUnit & Moq)
Compuesta por **141 pruebas exitosas** en Visual Studio 2022. Valida la lógica de negocio pura mediante el uso de dobles de pruebas (Mocks) aplicados a las interfaces de la arquitectura, garantizando la consistencia funcional del dominio de forma independiente a la infraestructura y manteniendo una equivalencia del 100% con los casos de TypeScript.

---

## 💻 Instrucciones de Instalación y Ejecución

### Requisitos Previos:
*   **Node.js v20** o superior.
*   **pnpm** (gestor de paquetes recomendado).

### Paso 1: Clonar e instalar dependencias
```bash
git clone https://github.com/Pierrot-01/EpisLab.git
cd EpisLab
pnpm install
```

### Paso 2: Configurar las variables de entorno
Crea un archivo `.env` en la raíz (puedes guiarte de `.env.example`):
```env
# Supabase PostgreSQL (IPv4-only / Pooler para serverless)
DATABASE_URL="postgresql://postgres.xxxx:tu_contraseña@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Conexión directa para migraciones estables
DIRECT_URL="postgresql://postgres.xxxx:tu_contraseña@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

AUTH_SECRET="un_secreto_muy_seguro_minimo_32_caracteres"
NEXTAUTH_URL="http://localhost:3000"
```

### Paso 3: Aprovisionar Base de Datos y Seed
Ejecuta la sincronización de Prisma y el poblamiento de datos iniciales (laboratorios, usuarios de prueba de todos los roles, catálogo de software e historial de tickets):
```bash
pnpm prisma db push
pnpm prisma db seed
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
