// tests/unit/equipo.repository.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        equipo: {
            findUnique: vi.fn(),
            update: vi.fn(),
            create: vi.fn(),
            findMany: vi.fn(),
        },
        ticket: {
            count: vi.fn(),
        },
    },
}));

import { prisma } from "@/lib/prisma";
import * as equipoRepository from "@/lib/repositories/equipo.repository";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("equipoRepository.buscarPorId", () => {
    it("busca un equipo por id con los campos seleccionados", async () => {
        (prisma.equipo.findUnique as any).mockResolvedValue({ id: "eq_1", estado: "operativo" });

        const resultado = await equipoRepository.buscarPorId("eq_1");

        expect(prisma.equipo.findUnique).toHaveBeenCalledWith({
            where: { id: "eq_1" },
            select: { id: true, codigoInventario: true, laboratorioId: true, estado: true },
        });
        expect(resultado).toEqual({ id: "eq_1", estado: "operativo" });
    });

    it("devuelve null si el equipo no existe", async () => {
        (prisma.equipo.findUnique as any).mockResolvedValue(null);
        const resultado = await equipoRepository.buscarPorId("no-existe");
        expect(resultado).toBeNull();
    });
});

describe("equipoRepository.buscarPorCodigo", () => {
    it("busca un equipo por su código de inventario", async () => {
        (prisma.equipo.findUnique as any).mockResolvedValue({ id: "eq_1", codigoInventario: "PC-001" });
        const resultado = await equipoRepository.buscarPorCodigo("PC-001");
        expect(prisma.equipo.findUnique).toHaveBeenCalledWith({ where: { codigoInventario: "PC-001" } });
        expect(resultado).toEqual({ id: "eq_1", codigoInventario: "PC-001" });
    });

    it("devuelve null si el código no existe (usado para validar unicidad, Edge case 1 de 003)", async () => {
        (prisma.equipo.findUnique as any).mockResolvedValue(null);
        const resultado = await equipoRepository.buscarPorCodigo("NO-EXISTE");
        expect(resultado).toBeNull();
    });
});

describe("equipoRepository.actualizarEstado", () => {
    it("actualiza únicamente el estado del equipo", async () => {
        (prisma.equipo.update as any).mockResolvedValue({ id: "eq_1", estado: "mantenimiento" });
        const resultado = await equipoRepository.actualizarEstado("eq_1", "mantenimiento");
        expect(prisma.equipo.update).toHaveBeenCalledWith({
            where: { id: "eq_1" },
            data: { estado: "mantenimiento" },
        });
        expect(resultado).toEqual({ id: "eq_1", estado: "mantenimiento" });
    });

    it("acepta el estado dado_de_baja (Constitution v1.7)", async () => {
        (prisma.equipo.update as any).mockResolvedValue({ id: "eq_1", estado: "dado_de_baja" });
        await equipoRepository.actualizarEstado("eq_1", "dado_de_baja");
        expect(prisma.equipo.update).toHaveBeenCalledWith({
            where: { id: "eq_1" },
            data: { estado: "dado_de_baja" },
        });
    });
});

describe("equipoRepository.crear", () => {
    it("crea un equipo forzando el estado inicial 'operativo' (spec HU-02, Criterio 3)", async () => {
        const data = { codigoInventario: "PC-050", laboratorioId: "lab_1" };
        (prisma.equipo.create as any).mockResolvedValue({ id: "eq_new", ...data, estado: "operativo" });

        const resultado = await equipoRepository.crear(data);

        expect(prisma.equipo.create).toHaveBeenCalledWith({
            data: { ...data, estado: "operativo" },
        });
        expect(resultado.estado).toBe("operativo");
    });

    it("ignora cualquier estado que se intente pasar por fuera de 'data' — siempre queda operativo", async () => {
        // aunque alguien intente colar un estado distinto en el objeto data, la función lo sobreescribe
        const data = { codigoInventario: "PC-051", laboratorioId: "lab_1" };
        (prisma.equipo.create as any).mockResolvedValue({ id: "eq_new2", ...data, estado: "operativo" });

        await equipoRepository.crear(data);

        const argumentosLlamada = (prisma.equipo.create as any).mock.calls[0][0];
        expect(argumentosLlamada.data.estado).toBe("operativo");
    });
});

describe("equipoRepository.editar", () => {
    it("edita solo los campos provistos (parcial)", async () => {
        (prisma.equipo.update as any).mockResolvedValue({ id: "eq_1", laboratorioId: "lab_2" });
        await equipoRepository.editar("eq_1", { laboratorioId: "lab_2" });
        expect(prisma.equipo.update).toHaveBeenCalledWith({
            where: { id: "eq_1" },
            data: { laboratorioId: "lab_2" },
        });
    });

    it("permite editar código, laboratorio y estado juntos", async () => {
        (prisma.equipo.update as any).mockResolvedValue({ id: "eq_1" });
        const cambios = { codigoInventario: "PC-099", laboratorioId: "lab_3", estado: "inoperativo" as const };
        await equipoRepository.editar("eq_1", cambios);
        expect(prisma.equipo.update).toHaveBeenCalledWith({ where: { id: "eq_1" }, data: cambios });
    });
});

describe("equipoRepository.contarTicketsAbiertos", () => {
    it("cuenta tickets pendientes y en_proceso de un equipo", async () => {
        (prisma.ticket.count as any).mockResolvedValue(2);

        const resultado = await equipoRepository.contarTicketsAbiertos("eq_1");

        expect(prisma.ticket.count).toHaveBeenCalledWith({
            where: { equipoId: "eq_1", estado: { in: ["pendiente", "en_proceso"] } },
        });
        expect(resultado).toBe(2);
    });

    it("devuelve 0 cuando no hay tickets abiertos (caso que permite dar de baja, HU-04)", async () => {
        (prisma.ticket.count as any).mockResolvedValue(0);
        const resultado = await equipoRepository.contarTicketsAbiertos("eq_2");
        expect(resultado).toBe(0);
    });
});

describe("equipoRepository.listarPaginado", () => {
    it("usa take=20 por defecto y pide take+1 para detectar página siguiente", async () => {
        (prisma.equipo.findMany as any).mockResolvedValue([]);
        await equipoRepository.listarPaginado({});
        expect(prisma.equipo.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 21 })
        );
    });

    it("por defecto EXCLUYE equipos dado_de_baja (vista pública, Edge case de 003)", async () => {
        (prisma.equipo.findMany as any).mockResolvedValue([]);
        await equipoRepository.listarPaginado({});
        expect(prisma.equipo.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ estado: { not: "dado_de_baja" } }),
            })
        );
    });

    it("incluye equipos dado_de_baja cuando incluirDadosDeBaja=true (vista admin, HU-05 de 003)", async () => {
        (prisma.equipo.findMany as any).mockResolvedValue([]);
        await equipoRepository.listarPaginado({ incluirDadosDeBaja: true });

        const argumentos = (prisma.equipo.findMany as any).mock.calls[0][0];
        expect(argumentos.where.estado).toBeUndefined(); // no se filtra por estado en absoluto
    });

    it("calcula nextCursor correctamente cuando hay más resultados que 'take'", async () => {
        const veintiuno = Array.from({ length: 21 }, (_, i) => ({ id: `eq_${i}` }));
        (prisma.equipo.findMany as any).mockResolvedValue(veintiuno);

        const resultado = await equipoRepository.listarPaginado({ take: 20 });

        expect(resultado.items).toHaveLength(20);
        expect(resultado.nextCursor).toBe("eq_20");
    });

    it("nextCursor es null cuando los resultados caben en una sola página", async () => {
        (prisma.equipo.findMany as any).mockResolvedValue([{ id: "eq_1" }]);
        const resultado = await equipoRepository.listarPaginado({ take: 20 });
        expect(resultado.nextCursor).toBeNull();
    });

    it("filtra por laboratorioId cuando se especifica", async () => {
        (prisma.equipo.findMany as any).mockResolvedValue([]);
        await equipoRepository.listarPaginado({ laboratorioId: "lab_5" });
        expect(prisma.equipo.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ laboratorioId: "lab_5" }),
            })
        );
    });
});

describe("equipoRepository.buscarEquiposPorLaboratorio", () => {
    it("devuelve los equipos de un laboratorio con id, código y estado", async () => {
        (prisma.equipo.findMany as any).mockResolvedValue([{ id: "eq_1", codigoInventario: "PC-001", estado: "operativo" }]);

        const resultado = await equipoRepository.buscarEquiposPorLaboratorio("lab_1");

        expect(prisma.equipo.findMany).toHaveBeenCalledWith({
            where: { laboratorioId: "lab_1" },
            select: { id: true, codigoInventario: true, estado: true },
        });
        expect(resultado).toHaveLength(1);
    });
});