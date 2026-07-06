// tests/unit/equipo.service.additional.test.ts
// Complementa tests/unit/equipo.service.test.ts (ya existente) cubriendo las líneas
// que el reporte de cobertura marcó como faltantes: 40-50, 70-72.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DomainError } from "@/lib/errors/domain-error";

vi.mock("@/lib/repositories/equipo.repository", () => ({
    buscarPorId: vi.fn(),
    buscarPorCodigo: vi.fn(),
    actualizarEstado: vi.fn(),
    crear: vi.fn(),
    editar: vi.fn(),
    contarTicketsAbiertos: vi.fn(),
    listarPaginado: vi.fn(),
    buscarEquiposPorLaboratorio: vi.fn(),
}));

vi.mock("@/lib/repositories/laboratorio.repository", () => ({
    buscarPorId: vi.fn(),
}));

import * as equipoRepository from "@/lib/repositories/equipo.repository";
import * as laboratorioRepository from "@/lib/repositories/laboratorio.repository";
import * as equipoService from "@/lib/services/equipo.service";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("equipoService.crear", () => {
    it("lanza DomainError si el laboratorio no existe (Edge case 3 de 003)", async () => {
        (laboratorioRepository.buscarPorId as any).mockResolvedValue(null);

        await expect(
            equipoService.crear({ codigoInventario: "PC-001", laboratorioId: "lab-inexistente" })
        ).rejects.toThrow(DomainError);
        await expect(
            equipoService.crear({ codigoInventario: "PC-001", laboratorioId: "lab-inexistente" })
        ).rejects.toThrow("El laboratorio no existe.");

        expect(equipoRepository.crear).not.toHaveBeenCalled();
    });

    it("lanza DomainError si el código de inventario ya existe (Edge case 1 de 003)", async () => {
        (laboratorioRepository.buscarPorId as any).mockResolvedValue({ id: "lab_1" });
        (equipoRepository.buscarPorCodigo as any).mockResolvedValue({ id: "eq_existente" });

        await expect(
            equipoService.crear({ codigoInventario: "PC-001", laboratorioId: "lab_1" })
        ).rejects.toThrow("Este código de inventario ya está registrado.");

        expect(equipoRepository.crear).not.toHaveBeenCalled();
    });

    it("crea el equipo cuando el laboratorio existe y el código es único", async () => {
        (laboratorioRepository.buscarPorId as any).mockResolvedValue({ id: "lab_1" });
        (equipoRepository.buscarPorCodigo as any).mockResolvedValue(null);
        (equipoRepository.crear as any).mockResolvedValue({ id: "eq_new", estado: "operativo" });

        const resultado = await equipoService.crear({ codigoInventario: "PC-050", laboratorioId: "lab_1" });

        expect(equipoRepository.crear).toHaveBeenCalledWith({ codigoInventario: "PC-050", laboratorioId: "lab_1" });
        expect(resultado.estado).toBe("operativo");
    });
});

describe("equipoService.editarEstado", () => {
    it("devuelve warning cuando el equipo tiene tickets abiertos (HU-03, Criterio 1)", async () => {
        (equipoRepository.contarTicketsAbiertos as any).mockResolvedValue(2);
        (equipoRepository.editar as any).mockResolvedValue({ id: "eq_1", estado: "inoperativo" });

        const resultado = await equipoService.editarEstado("eq_1", "inoperativo");

        expect(resultado.success).toBe(true);
        if (resultado.success) {
            expect(resultado.warning).toBe(
                "Este equipo tiene tickets abiertos que podrían quedar inconsistentes con el nuevo estado."
            );
        }
    });

    it("no incluye warning cuando el equipo no tiene tickets abiertos", async () => {
        (equipoRepository.contarTicketsAbiertos as any).mockResolvedValue(0);
        (equipoRepository.editar as any).mockResolvedValue({ id: "eq_1", estado: "operativo" });

        const resultado = await equipoService.editarEstado("eq_1", "operativo");

        expect(resultado.success).toBe(true);
        if (resultado.success) {
            expect(resultado.warning).toBeUndefined();
        }
    });
});

describe("equipoService.editar", () => {
    it("lanza DomainError si el nuevo laboratorioId no existe", async () => {
        (laboratorioRepository.buscarPorId as any).mockResolvedValue(null);

        await expect(
            equipoService.editar("eq_1", { laboratorioId: "lab-fantasma" })
        ).rejects.toThrow("El laboratorio no existe.");
    });

    it("lanza DomainError si el nuevo código ya lo tiene OTRO equipo", async () => {
        (equipoRepository.buscarPorCodigo as any).mockResolvedValue({ id: "eq_otro" });

        await expect(
            equipoService.editar("eq_1", { codigoInventario: "PC-999" })
        ).rejects.toThrow("Este código de inventario ya está registrado.");
    });

    it("permite editar si el código encontrado pertenece al MISMO equipo (no es un duplicado real)", async () => {
        (equipoRepository.buscarPorCodigo as any).mockResolvedValue({ id: "eq_1" }); // mismo id
        (equipoRepository.editar as any).mockResolvedValue({ id: "eq_1", codigoInventario: "PC-001" });

        const resultado = await equipoService.editar("eq_1", { codigoInventario: "PC-001" });

        expect(equipoRepository.editar).toHaveBeenCalledWith("eq_1", { codigoInventario: "PC-001" });
        expect(resultado).toEqual({ id: "eq_1", codigoInventario: "PC-001" });
    });

    it("permite editar sin tocar laboratorioId ni codigoInventario (solo, por ejemplo, el estado)", async () => {
        (equipoRepository.editar as any).mockResolvedValue({ id: "eq_1", estado: "mantenimiento" });

        await equipoService.editar("eq_1", { estado: "mantenimiento" });

        expect(laboratorioRepository.buscarPorId).not.toHaveBeenCalled();
        expect(equipoRepository.buscarPorCodigo).not.toHaveBeenCalled();
        expect(equipoRepository.editar).toHaveBeenCalledWith("eq_1", { estado: "mantenimiento" });
    });
});

describe("equipoService.darDeBaja", () => {
    it("lanza DomainError si tiene tickets abiertos (Edge case 2 de 003 — bloqueo real, no warning)", async () => {
        (equipoRepository.contarTicketsAbiertos as any).mockResolvedValue(1);

        await expect(equipoService.darDeBaja("eq_1")).rejects.toThrow(
            "No se puede dar de baja un equipo con tickets abiertos. Resuélvelos primero."
        );
        expect(equipoRepository.actualizarEstado).not.toHaveBeenCalled();
    });

    it("da de baja el equipo cuando no tiene tickets abiertos", async () => {
        (equipoRepository.contarTicketsAbiertos as any).mockResolvedValue(0);
        (equipoRepository.actualizarEstado as any).mockResolvedValue({ id: "eq_1", estado: "dado_de_baja" });

        const resultado = await equipoService.darDeBaja("eq_1");

        expect(equipoRepository.actualizarEstado).toHaveBeenCalledWith("eq_1", "dado_de_baja");
        expect(resultado.estado).toBe("dado_de_baja");
    });
});

describe("equipoService.actualizarEstadoPorResolucion (Clarify #1 de 001-tickets)", () => {
    it("pasa a 'mantenimiento' si el equipo aún tiene otros tickets abiertos", async () => {
        (equipoRepository.contarTicketsAbiertos as any).mockResolvedValue(1);
        (equipoRepository.actualizarEstado as any).mockResolvedValue({ id: "eq_1", estado: "mantenimiento" });

        const resultado = await equipoService.actualizarEstadoPorResolucion("eq_1");

        expect(equipoRepository.actualizarEstado).toHaveBeenCalledWith("eq_1", "mantenimiento");
        expect(resultado.estado).toBe("mantenimiento");
    });

    it("pasa a 'operativo' si ya no quedan tickets abiertos", async () => {
        (equipoRepository.contarTicketsAbiertos as any).mockResolvedValue(0);
        (equipoRepository.actualizarEstado as any).mockResolvedValue({ id: "eq_1", estado: "operativo" });

        const resultado = await equipoService.actualizarEstadoPorResolucion("eq_1");

        expect(equipoRepository.actualizarEstado).toHaveBeenCalledWith("eq_1", "operativo");
        expect(resultado.estado).toBe("operativo");
    });
});