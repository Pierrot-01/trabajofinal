// tests/unit/laboratorio.repository.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        laboratorio: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
        },
        equipo: {
            count: vi.fn(),
        },
    },
}));

import { prisma } from "@/lib/prisma";
import * as laboratorioRepository from "@/lib/repositories/laboratorio.repository";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("laboratorioRepository.crear", () => {
    it("crea un laboratorio con nombre, ubicación y capacidad", async () => {
        const data = { nombre: "Lab 1", ubicacion: "Pabellón A", capacidad: 30 };
        (prisma.laboratorio.create as any).mockResolvedValue({ id: "lab_1", ...data });

        const resultado = await laboratorioRepository.crear(data);

        expect(prisma.laboratorio.create).toHaveBeenCalledWith({ data });
        expect(resultado).toEqual({ id: "lab_1", ...data });
    });
});

describe("laboratorioRepository.buscarPorId", () => {
    it("busca un laboratorio por id", async () => {
        (prisma.laboratorio.findUnique as any).mockResolvedValue({ id: "lab_1", nombre: "Lab 1" });
        const resultado = await laboratorioRepository.buscarPorId("lab_1");
        expect(prisma.laboratorio.findUnique).toHaveBeenCalledWith({ where: { id: "lab_1" } });
        expect(resultado).toEqual({ id: "lab_1", nombre: "Lab 1" });
    });

    it("devuelve null si no existe (Edge case 3 de 003: laboratorioId inexistente)", async () => {
        (prisma.laboratorio.findUnique as any).mockResolvedValue(null);
        const resultado = await laboratorioRepository.buscarPorId("no-existe");
        expect(resultado).toBeNull();
    });
});

describe("laboratorioRepository.listar", () => {
    it("lista laboratorios ordenados alfabéticamente, con los campos básicos", async () => {
        (prisma.laboratorio.findMany as any).mockResolvedValue([{ id: "lab_1", nombre: "Lab A" }]);

        const resultado = await laboratorioRepository.listar();

        expect(prisma.laboratorio.findMany).toHaveBeenCalledWith({
            select: { id: true, nombre: true, ubicacion: true, capacidad: true },
            orderBy: { nombre: "asc" },
        });
        expect(resultado).toEqual([{ id: "lab_1", nombre: "Lab A" }]);
    });
});

describe("laboratorioRepository.listarConEquipos", () => {
    it("incluye los equipos de cada laboratorio, ordenados por código", async () => {
        (prisma.laboratorio.findMany as any).mockResolvedValue([
            { id: "lab_1", nombre: "Lab A", equipos: [{ id: "eq_1", codigoInventario: "PC-001", estado: "operativo" }] },
        ]);

        const resultado = await laboratorioRepository.listarConEquipos();

        expect(prisma.laboratorio.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: expect.objectContaining({
                    equipos: expect.objectContaining({ orderBy: { codigoInventario: "asc" } }),
                }),
            })
        );
        expect(resultado[0].equipos).toHaveLength(1);
    });
});

describe("laboratorioRepository.contarEquipos", () => {
    it("cuenta los equipos asociados a un laboratorio", async () => {
        (prisma.equipo.count as any).mockResolvedValue(12);
        const resultado = await laboratorioRepository.contarEquipos("lab_1");
        expect(prisma.equipo.count).toHaveBeenCalledWith({ where: { laboratorioId: "lab_1" } });
        expect(resultado).toBe(12);
    });

    it("devuelve 0 para un laboratorio recién creado sin equipos", async () => {
        (prisma.equipo.count as any).mockResolvedValue(0);
        const resultado = await laboratorioRepository.contarEquipos("lab_nuevo");
        expect(resultado).toBe(0);
    });
});