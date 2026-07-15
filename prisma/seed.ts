// prisma/seed.ts — Seed de datos (Art. XII)
// Puebla: laboratorios, equipos, usuarios de prueba (uno por rol),
// catálogo de software, y un histórico de 6 meses de tickets.
//
// Contraseñas hasheadas con bcrypt — nunca texto plano, ni en datos de prueba.
// Contraseña de todos los usuarios de prueba: "Password123"

import { PrismaClient } from "../lib/prisma-client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Limpiar datos existentes (orden por dependencias FK) ───
  await prisma.comentario.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.equipoSoftware.deleteMany();
  await prisma.software.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.laboratorio.deleteMany();
  await prisma.usuario.deleteMany();

  // ─── 1. Usuarios de prueba (uno por rol) ───
  const passwordHash = await bcrypt.hash("Password123", 10);

  await prisma.usuario.create({
    data: {
      nombre: "Carlos Administrador",
      correo: "admin@unsch.edu.pe",
      passwordHash,
      rol: "admin",
    },
  });

  const tecnico = await prisma.usuario.create({
    data: {
      nombre: "María Técnico",
      correo: "tecnico@unsch.edu.pe",
      passwordHash,
      rol: "tecnico",
    },
  });

  const docente = await prisma.usuario.create({
    data: {
      nombre: "José Docente",
      correo: "docente@unsch.edu.pe",
      passwordHash,
      rol: "docente",
    },
  });

  const estudiante = await prisma.usuario.create({
    data: {
      nombre: "Ana Estudiante",
      correo: "estudiante@unsch.edu.pe",
      passwordHash,
      rol: "estudiante",
    },
  });

  console.log("✅ Usuarios creados");

  // ─── 2. Laboratorios ───
  const lab1 = await prisma.laboratorio.create({
    data: {
      nombre: "Laboratorio de Computación I",
      ubicacion: "Pabellón A, Piso 2",
      capacidad: 30,
    },
  });

  const lab2 = await prisma.laboratorio.create({
    data: {
      nombre: "Laboratorio de Computación II",
      ubicacion: "Pabellón A, Piso 3",
      capacidad: 25,
    },
  });

  const lab3 = await prisma.laboratorio.create({
    data: {
      nombre: "Laboratorio de Redes",
      ubicacion: "Pabellón B, Piso 1",
      capacidad: 20,
    },
  });

  console.log("✅ Laboratorios creados");

  // ─── 3. Equipos ───
  // Lab1: 6 equipos, Lab2: 4 equipos, Lab3: 3 equipos
  const equiposLab1 = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      prisma.equipo.create({
        data: {
          codigoInventario: `LAB1-PC-${String(i + 1).padStart(3, "0")}`,
          laboratorioId: lab1.id,
          estado: i === 5 ? "mantenimiento" : "operativo", // último en mantenimiento
        },
      })
    )
  );

  const equiposLab2 = await Promise.all(
    Array.from({ length: 4 }, (_, i) =>
      prisma.equipo.create({
        data: {
          codigoInventario: `LAB2-PC-${String(i + 1).padStart(3, "0")}`,
          laboratorioId: lab2.id,
          estado: i === 3 ? "inoperativo" : "operativo", // último inoperativo
        },
      })
    )
  );

  const equiposLab3 = await Promise.all(
    Array.from({ length: 3 }, (_, i) =>
      prisma.equipo.create({
        data: {
          codigoInventario: `LAB3-PC-${String(i + 1).padStart(3, "0")}`,
          laboratorioId: lab3.id,
          estado: "operativo",
        },
      })
    )
  );

  console.log("✅ Equipos creados");

  // ─── 4. Catálogo de Software ───
  const spss = await prisma.software.create({
    data: { nombre: "SPSS", tipo: "licenciado", version: "29.0" },
  });

  const matlab = await prisma.software.create({
    data: { nombre: "MATLAB", tipo: "licenciado", version: "R2024b" },
  });

  const vscode = await prisma.software.create({
    data: { nombre: "Visual Studio Code", tipo: "gratuito", version: "1.90" },
  });

  const python = await prisma.software.create({
    data: { nombre: "Python", tipo: "gratuito", version: "3.12" },
  });

  const netbeans = await prisma.software.create({
    data: { nombre: "NetBeans", tipo: "gratuito", version: "21" },
  });

  // Instalar software en algunos equipos
  await prisma.equipoSoftware.createMany({
    data: [
      { equipoId: equiposLab1[0].id, softwareId: vscode.id },
      { equipoId: equiposLab1[0].id, softwareId: python.id },
      { equipoId: equiposLab1[1].id, softwareId: vscode.id },
      { equipoId: equiposLab2[0].id, softwareId: spss.id },
      { equipoId: equiposLab2[0].id, softwareId: matlab.id },
      { equipoId: equiposLab2[1].id, softwareId: netbeans.id },
    ],
  });

  console.log("✅ Software y relaciones creados");

  // ─── 5. Histórico de tickets (6 meses) ───
  // Art. XII: al menos 1 equipo con ≥5 tickets (recurrencia alta)
  // y 1 equipo con 0 tickets.
  // equiposLab3[2] (LAB3-PC-003) tiene 0 tickets — equipo sin incidencias.
  // equiposLab1[0] (LAB1-PC-001) tendrá ≥5 tickets — equipo con recurrencia alta.

  const ahora = new Date();
  const reporteros = [docente, estudiante];
  type Categoria = "hardware" | "software_general" | "red" | "software_licencia";

  // Helper para generar una fecha aleatoria dentro de los últimos N meses
  function fechaAleatoria(mesesAtras: number): Date {
    const desde = new Date(ahora);
    desde.setMonth(desde.getMonth() - mesesAtras);
    const rango = ahora.getTime() - desde.getTime();
    return new Date(desde.getTime() + Math.random() * rango);
  }

  // Helper para generar un ticket
  async function crearTicketHistorico(params: {
    equipo: { id: string };
    tipo: "incidencia" | "solicitud";
    categoria: Categoria;
    mesesAtras: number;
    resuelto: boolean;
    descripcion: string;
    softwareId?: string;
    softwareTexto?: string;
    fechaLimite?: Date;
  }) {
    const fechaCreacion = fechaAleatoria(params.mesesAtras);
    const fechaCierre = params.resuelto
      ? new Date(
          fechaCreacion.getTime() +
            Math.random() * 7 * 24 * 3600 * 1000 // 0–7 días para resolver
        )
      : null;

    return prisma.ticket.create({
      data: {
        tipo: params.tipo,
        categoria: params.categoria,
        descripcion: params.descripcion,
        estado: params.resuelto ? "resuelto" : "pendiente",
        fechaCreacion,
        fechaCierre,
        fechaLimite: params.fechaLimite ?? null,
        comentarioCierre: params.resuelto
          ? "Problema resuelto satisfactoriamente."
          : null,
        equipoId: params.equipo.id,
        usuarioReportaId:
          reporteros[Math.floor(Math.random() * reporteros.length)].id,
        tecnicoAsignadoId: params.resuelto ? tecnico.id : null,
        softwareId: params.softwareId ?? null,
        softwareTexto: params.softwareTexto ?? null,
      },
    });
  }

  // Equipo con recurrencia alta: LAB1-PC-001 — 7 tickets en 6 meses
  const equipoRecurrente = equiposLab1[0];
  await crearTicketHistorico({
    equipo: equipoRecurrente,
    tipo: "incidencia",
    categoria: "hardware",
    mesesAtras: 6,
    resuelto: true,
    descripcion: "La PC no enciende, el LED de la fuente no prende.",
  });
  await crearTicketHistorico({
    equipo: equipoRecurrente,
    tipo: "incidencia",
    categoria: "hardware",
    mesesAtras: 5,
    resuelto: true,
    descripcion: "El monitor parpadea y se apaga intermitentemente.",
  });
  await crearTicketHistorico({
    equipo: equipoRecurrente,
    tipo: "incidencia",
    categoria: "software_general",
    mesesAtras: 4,
    resuelto: true,
    descripcion: "Pantalla azul frecuente al abrir Visual Studio Code.",
  });
  await crearTicketHistorico({
    equipo: equipoRecurrente,
    tipo: "solicitud",
    categoria: "software_licencia",
    mesesAtras: 3,
    resuelto: true,
    descripcion: "Se necesita instalar SPSS para el curso de Estadística.",
    softwareId: spss.id,
  });
  await crearTicketHistorico({
    equipo: equipoRecurrente,
    tipo: "incidencia",
    categoria: "red",
    mesesAtras: 2,
    resuelto: true,
    descripcion: "Sin conexión a internet, el cable de red parece dañado.",
  });
  await crearTicketHistorico({
    equipo: equipoRecurrente,
    tipo: "incidencia",
    categoria: "hardware",
    mesesAtras: 1,
    resuelto: true,
    descripcion: "El teclado no responde, teclas atascadas.",
  });
  await crearTicketHistorico({
    equipo: equipoRecurrente,
    tipo: "incidencia",
    categoria: "hardware",
    mesesAtras: 0,
    resuelto: false,
    descripcion: "El mouse USB no es detectado por el sistema operativo.",
  });

  // Tickets dispersos en otros equipos
  await crearTicketHistorico({
    equipo: equiposLab1[2],
    tipo: "incidencia",
    categoria: "software_general",
    mesesAtras: 4,
    resuelto: true,
    descripcion: "Windows Update se queda colgado al 45%.",
  });
  await crearTicketHistorico({
    equipo: equiposLab1[3],
    tipo: "solicitud",
    categoria: "software_general",
    mesesAtras: 3,
    resuelto: true,
    descripcion: "Instalar Python 3.12 para el curso de Programación.",
    softwareId: python.id,
  });
  await crearTicketHistorico({
    equipo: equiposLab2[0],
    tipo: "incidencia",
    categoria: "hardware",
    mesesAtras: 5,
    resuelto: true,
    descripcion: "Un parlante del equipo emite ruido estático constante.",
  });
  await crearTicketHistorico({
    equipo: equiposLab2[1],
    tipo: "solicitud",
    categoria: "software_licencia",
    mesesAtras: 2,
    resuelto: false,
    descripcion: "Solicito licencia de MATLAB para el laboratorio de Señales.",
    softwareId: matlab.id,
    fechaLimite: new Date(ahora.getTime() + 5 * 24 * 3600 * 1000),
  });
  await crearTicketHistorico({
    equipo: equiposLab2[2],
    tipo: "incidencia",
    categoria: "red",
    mesesAtras: 1,
    resuelto: true,
    descripcion: "La PC no obtiene dirección IP por DHCP.",
  });
  await crearTicketHistorico({
    equipo: equiposLab3[0],
    tipo: "incidencia",
    categoria: "hardware",
    mesesAtras: 3,
    resuelto: true,
    descripcion: "El ventilador del CPU hace ruido excesivo.",
  });
  await crearTicketHistorico({
    equipo: equiposLab3[1],
    tipo: "solicitud",
    categoria: "software_general",
    mesesAtras: 1,
    resuelto: true,
    descripcion: "Instalar NetBeans IDE para el curso de POO.",
    softwareId: netbeans.id,
  });

  // Agregar algunos comentarios a tickets existentes
  const ticketsExistentes = await prisma.ticket.findMany({
    take: 3,
    orderBy: { fechaCreacion: "desc" },
  });

  for (const ticket of ticketsExistentes) {
    await prisma.comentario.create({
      data: {
        ticketId: ticket.id,
        usuarioId: tecnico.id,
        contenido: "Revisando el equipo, se procederá con el diagnóstico.",
      },
    });
  }

  console.log("✅ Histórico de tickets y comentarios creados");
  console.log("🌱 Seed completado exitosamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
