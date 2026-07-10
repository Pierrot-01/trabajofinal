// scripts/pretest-integration.ts — Setup para base de datos de test (Art. XII, T014b)
// Carga las variables de entorno de .env.test y corre prisma migrate reset para limpiar y poblar la BD de pruebas.

import { execSync } from "child_process";
import path from "path";
import fs from "fs";

// Cargar .env.test manualmente para asegurar que los comandos ejecutados por child_process utilicen la BD de test.
const envTestPath = path.resolve(process.cwd(), ".env.test");

if (fs.existsSync(envTestPath)) {
  console.log("📝 Cargando variables de entorno desde .env.test...");
  const envConfig = fs.readFileSync(envTestPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      // Quitar comillas si existen
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} else {
  console.error("⚠️ No se encontró el archivo .env.test. Usando variables por defecto.");
}

console.log(`🔌 DATABASE_URL configurada para pruebas: ${process.env.DATABASE_URL}`);

try {
  console.log("🔄 Sincronizando base de datos de pruebas e iniciando seed...");
  execSync("pnpm prisma db push --accept-data-loss", { stdio: "inherit" });
  execSync("pnpm prisma db seed", { stdio: "inherit" });
  console.log("✅ Base de datos de pruebas inicializada y poblada.");
} catch (error) {
  console.error("❌ Error inicializando base de datos de pruebas:", error);
  process.exit(1);
}
