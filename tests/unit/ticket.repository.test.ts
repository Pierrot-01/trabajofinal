// tests/unit/ticket.repository.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockeamos el singleton de Prisma ANTES de importar el repository —
// así ninguna función real llega a tocar una base de datos de verdad.
vi.mock("@/lib/prisma", () => ({
    prisma: {
        ticket: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            count: vi.fn(),
            groupBy: vi.fn(),
        },
        comentario: {
            create: vi.fn(),
        },
    },
}));

import { prisma } from "@/lib/prisma";
import * as ticketRepository from "@/lib/repositories/ticket.repository";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("ticketRepository.crear", () => {
    it("llama a prisma.ticket.create con los datos recibidos y devuelve el resultado", async () => {
        const data = {
            tipo: "incidencia" as const,
            categoria: "hardware" as const,
            descripcion: "PC no enciende",
            equipoId: "eq_1",
            usuarioReportaId: "usr_1",
        };
        const ticketCreado = { id: "tk_1", ...data, estado: "pendiente" };
        (prisma.ticket.create as any).mockResolvedValue(ticketCreado);

        const resultado = await ticketRepository.crear(data);

        expect(prisma.ticket.create).toHaveBeenCalledWith({ data });
        expect(resultado).toEqual(ticketCreado);
    });
});

describe("ticketRepository.buscarPorId", () => {
    it("busca por id incluyendo equipo, usuarios y comentarios", async () => {
        (prisma.ticket.findUnique as any).mockResolvedValue({ id: "tk_1" });

        const resultado = await ticketRepository.buscarPorId("tk_1");

        expect(prisma.ticket.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "tk_1" } })
        );
        expect(resultado).toEqual({ id: "tk_1" });
    });

    it("devuelve null si el ticket no existe", async () => {
        (prisma.ticket.findUnique as any).mockResolvedValue(null);
        const resultado = await ticketRepository.buscarPorId("no-existe");
        expect(resultado).toBeNull();
    });
});

describe("ticketRepository.buscarPorEquipoYEstado", () => {
    it("filtra por equipoId y una lista de estados", async () => {
        (prisma.ticket.findMany as any).mockResolvedValue([{ id: "tk_1" }]);

        const resultado = await ticketRepository.buscarPorEquipoYEstado("eq_1", ["pendiente", "en_proceso"]);

        expect(prisma.ticket.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { equipoId: "eq_1", estado: { in: ["pendiente", "en_proceso"] } },
            })
        );
        expect(resultado).toEqual([{ id: "tk_1" }]);
    });
});

describe("ticketRepository.listar (paginación por cursor)", () => {
    it("usa take=20 por defecto cuando no se especifica", async () => {
        (prisma.ticket.findMany as any).mockResolvedValue([]);
        await ticketRepository.listar({});
        expect(prisma.ticket.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 21 }) // take + 1, para detectar si hay siguiente página
        );
    });

    it("cuando hay más resultados que 'take', recorta el extra y devuelve nextCursor", async () => {
        const veintiunResultados = Array.from({ length: 21 }, (_, i) => ({ id: `tk_${i}` }));
        (prisma.ticket.findMany as any).mockResolvedValue(veintiunResultados);

        const resultado = await ticketRepository.listar({ take: 20 });

        expect(resultado.items).toHaveLength(20); // el 21º se recorta
        expect(resultado.nextCursor).toBe("tk_20"); // era el último antes de recortar
    });

    it("cuando hay menos o igual resultados que 'take', nextCursor es null", async () => {
        const cincoResultados = Array.from({ length: 5 }, (_, i) => ({ id: `tk_${i}` }));
        (prisma.ticket.findMany as any).mockResolvedValue(cincoResultados);

        const resultado = await ticketRepository.listar({ take: 20 });

        expect(resultado.items).toHaveLength(5);
        expect(resultado.nextCursor).toBeNull();
    });

    it("aplica el filtro de laboratorioId a través de la relación equipo", async () => {
        (prisma.ticket.findMany as any).mockResolvedValue([]);
        await ticketRepository.listar({ laboratorioId: "lab_1" });

        expect(prisma.ticket.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ equipo: { laboratorioId: "lab_1" } }),
            })
        );
    });

    it("pasa el cursor recibido en el formato que espera Prisma", async () => {
        (prisma.ticket.findMany as any).mockResolvedValue([]);
        await ticketRepository.listar({ cursor: "tk_99" });

        expect(prisma.ticket.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ cursor: { id: "tk_99" } })
        );
    });
});

describe("ticketRepository.actualizarEstado", () => {
    it("actualiza el estado y combina los campos extra (comentarioCierre, fechaCierre)", async () => {
        (prisma.ticket.update as any).mockResolvedValue({ id: "tk_1", estado: "resuelto" });

        await ticketRepository.actualizarEstado("tk_1", "resuelto", {
            comentarioCierre: "Se reemplazó la fuente de poder",
            fechaCierre: new Date("2026-07-05"),
        });

        expect(prisma.ticket.update).toHaveBeenCalledWith({
            where: { id: "tk_1" },
            data: {
                estado: "resuelto",
                comentarioCierre: "Se reemplazó la fuente de poder",
                fechaCierre: new Date("2026-07-05"),
            },
        });
    });

    it("funciona sin campos extra (solo cambio de estado)", async () => {
        (prisma.ticket.update as any).mockResolvedValue({ id: "tk_1", estado: "en_proceso" });
        await ticketRepository.actualizarEstado("tk_1", "en_proceso");
        expect(prisma.ticket.update).toHaveBeenCalledWith({
            where: { id: "tk_1" },
            data: { estado: "en_proceso" },
        });
    });
});

describe("ticketRepository.asignarTecnico", () => {
    it("actualiza tecnicoAsignadoId", async () => {
        (prisma.ticket.update as any).mockResolvedValue({ id: "tk_1", tecnicoAsignadoId: "tec_1" });
        await ticketRepository.asignarTecnico("tk_1", "tec_1");
        expect(prisma.ticket.update).toHaveBeenCalledWith({
            where: { id: "tk_1" },
            data: { tecnicoAsignadoId: "tec_1" },
        });
    });
});

describe("ticketRepository.contarPorEquipoYEstados", () => {
    it("cuenta tickets de un equipo filtrando por estados", async () => {
        (prisma.ticket.count as any).mockResolvedValue(3);
        const resultado = await ticketRepository.contarPorEquipoYEstados("eq_1", ["pendiente"]);
        expect(prisma.ticket.count).toHaveBeenCalledWith({
            where: { equipoId: "eq_1", estado: { in: ["pendiente"] } },
        });
        expect(resultado).toBe(3);
    });
});

describe("ticketRepository.crearComentario", () => {
    it("crea un comentario con ticketId, usuarioId y contenido", async () => {
        const data = { ticketId: "tk_1", usuarioId: "usr_1", contenido: "Sigue fallando" };
        (prisma.comentario.create as any).mockResolvedValue({ id: "cm_1", ...data });

        const resultado = await ticketRepository.crearComentario(data);

        expect(prisma.comentario.create).toHaveBeenCalledWith({ data });
        expect(resultado).toEqual({ id: "cm_1", ...data });
    });
});

describe("ticketRepository.listarResueltosPorEquipo", () => {
    it("filtra solo tickets resueltos de un equipo, ordenados por fecha descendente", async () => {
        (prisma.ticket.findMany as any).mockResolvedValue([{ id: "tk_1" }]);
        const resultado = await ticketRepository.listarResueltosPorEquipo("eq_1");
        expect(prisma.ticket.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { equipoId: "eq_1", estado: "resuelto" },
                orderBy: { fechaCreacion: "desc" },
            })
        );
        expect(resultado).toEqual([{ id: "tk_1" }]);
    });
});

describe("ticketRepository.tiempoPromedioResolucion", () => {
    it("calcula el promedio de horas de resolución agrupado por categoría", async () => {
        (prisma.ticket.findMany as any).mockResolvedValue([
            {
                categoria: "hardware",
                fechaCreacion: new Date("2026-07-01T00:00:00Z"),
                fechaCierre: new Date("2026-07-01T10:00:00Z"), // 10h
            },
            {
                categoria: "hardware",
                fechaCreacion: new Date("2026-07-02T00:00:00Z"),
                fechaCierre: new Date("2026-07-02T20:00:00Z"), // 20h
            },
            {
                categoria: "red",
                fechaCreacion: new Date("2026-07-03T00:00:00Z"),
                fechaCierre: new Date("2026-07-03T05:00:00Z"), // 5h
            },
        ]);

        const resultado = await ticketRepository.tiempoPromedioResolucion();

        expect(resultado.hardware).toBe(15); // promedio de 10 y 20
        expect(resultado.red).toBe(5);
    });

    it("ignora tickets sin fechaCierre y devuelve objeto vacío si no hay resueltos", async () => {
        (prisma.ticket.findMany as any).mockResolvedValue([]);
        const resultado = await ticketRepository.tiempoPromedioResolucion();
        expect(resultado).toEqual({});
    });
});

describe("ticketRepository.equiposConMasTickets", () => {
    it("agrupa por equipoId filtrando por fecha y umbral de tickets", async () => {
        (prisma.ticket.groupBy as any).mockResolvedValue([{ equipoId: "eq_1", _count: { id: 6 } }]);

        const resultado = await ticketRepository.equiposConMasTickets(5, 6);

        expect(prisma.ticket.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({
                by: ["equipoId"],
                having: { id: { _count: { gt: 5 } } },
            })
        );
        expect(resultado).toEqual([{ equipoId: "eq_1", _count: { id: 6 } }]);
    });
});