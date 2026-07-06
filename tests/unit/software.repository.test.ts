// tests/unit/software.repository.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        software: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        equipoSoftware: {
            count: vi.fn(),
        },
        ticket: {
            count: vi.fn(),
        },
    },
}));

import { prisma } from "@/lib/prisma";
import * as softwareRepository from "@/lib/repositories/software.repository";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("softwareRepository.crear", () => {
    it("crea un software con nombre, tipo y versión opcional", async () => {
        const data = { nombre: "SPSS", tipo: "licenciado" as const, version: "29" };
        (prisma.software.create as any).mockResolvedValue({ id: "sw_1", ...data });

        const resultado = await softwareRepository.crear(data);

        expect(prisma.software.create).toHaveBeenCalledWith({ data });
        expect(resultado).toEqual({ id: "sw_1", ...data });
    });

    it("permite crear sin especificar versión", async () => {
        const data = { nombre: "GIMP", tipo: "gratuito" as const };
        (prisma.software.create as any).mockResolvedValue({ id: "sw_2", ...data });
        await softwareRepository.crear(data);
        expect(prisma.software.create).toHaveBeenCalledWith({ data });
    });
});

describe("softwareRepository.buscarPorId", () => {
    it("busca software por id", async () => {
        (prisma.software.findUnique as any).mockResolvedValue({ id: "sw_1", nombre: "SPSS" });
        const resultado = await softwareRepository.buscarPorId("sw_1");
        expect(prisma.software.findUnique).toHaveBeenCalledWith({ where: { id: "sw_1" } });
        expect(resultado).toEqual({ id: "sw_1", nombre: "SPSS" });
    });
});

describe("softwareRepository.buscarPorNombre", () => {
    it("busca por nombre exacto (usado para validar unicidad, Edge case 1 de 004)", async () => {
        (prisma.software.findUnique as any).mockResolvedValue({ id: "sw_1", nombre: "SPSS" });
        const resultado = await softwareRepository.buscarPorNombre("SPSS");
        expect(prisma.software.findUnique).toHaveBeenCalledWith({ where: { nombre: "SPSS" } });
        expect(resultado).toEqual({ id: "sw_1", nombre: "SPSS" });
    });

    it("devuelve null si el nombre no existe todavía", async () => {
        (prisma.software.findUnique as any).mockResolvedValue(null);
        const resultado = await softwareRepository.buscarPorNombre("Software Nuevo");
        expect(resultado).toBeNull();
    });
});

describe("softwareRepository.listar", () => {
    it("lista el catálogo ordenado alfabéticamente", async () => {
        (prisma.software.findMany as any).mockResolvedValue([{ id: "sw_1", nombre: "SPSS" }]);
        const resultado = await softwareRepository.listar();
        expect(prisma.software.findMany).toHaveBeenCalledWith({
            select: { id: true, nombre: true, tipo: true, version: true },
            orderBy: { nombre: "asc" },
        });
        expect(resultado).toEqual([{ id: "sw_1", nombre: "SPSS" }]);
    });
});

describe("softwareRepository.actualizar", () => {
    it("actualiza solo los campos provistos", async () => {
        (prisma.software.update as any).mockResolvedValue({ id: "sw_1", version: "30" });
        await softwareRepository.actualizar("sw_1", { version: "30" });
        expect(prisma.software.update).toHaveBeenCalledWith({ where: { id: "sw_1" }, data: { version: "30" } });
    });
});

describe("softwareRepository.eliminar", () => {
    it("elimina físicamente el software (solo se llama cuando no tiene relaciones, HU-03 de 004)", async () => {
        (prisma.software.delete as any).mockResolvedValue({ id: "sw_1" });
        const resultado = await softwareRepository.eliminar("sw_1");
        expect(prisma.software.delete).toHaveBeenCalledWith({ where: { id: "sw_1" } });
        expect(resultado).toEqual({ id: "sw_1" });
    });
});

describe("softwareRepository.contarRelaciones", () => {
    it("suma las relaciones de EquipoSoftware y Ticket (Clarify #1 de 004)", async () => {
        (prisma.equipoSoftware.count as any).mockResolvedValue(3);
        (prisma.ticket.count as any).mockResolvedValue(2);

        const resultado = await softwareRepository.contarRelaciones("sw_1");

        expect(prisma.equipoSoftware.count).toHaveBeenCalledWith({ where: { softwareId: "sw_1" } });
        expect(prisma.ticket.count).toHaveBeenCalledWith({ where: { softwareId: "sw_1" } });
        expect(resultado).toBe(5); // 3 + 2
    });

    it("devuelve 0 cuando no hay ninguna relación (permite eliminar sin bloqueo)", async () => {
        (prisma.equipoSoftware.count as any).mockResolvedValue(0);
        (prisma.ticket.count as any).mockResolvedValue(0);

        const resultado = await softwareRepository.contarRelaciones("sw_nuevo");

        expect(resultado).toBe(0);
    });

    it("cuenta relaciones aunque solo exista en uno de los dos lados", async () => {
        (prisma.equipoSoftware.count as any).mockResolvedValue(0);
        (prisma.ticket.count as any).mockResolvedValue(4);

        const resultado = await softwareRepository.contarRelaciones("sw_2");

        expect(resultado).toBe(4);
    });
});