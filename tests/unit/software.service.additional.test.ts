// tests/unit/software.service.additional.test.ts
// Complementa tests/unit/software.service.test.ts (ya existente) cubriendo las líneas
// que el reporte de cobertura marcó como faltantes: 18-24, 41.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DomainError } from "@/lib/errors/domain-error";

vi.mock("@/lib/repositories/software.repository", () => ({
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorNombre: vi.fn(),
    listar: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    contarRelaciones: vi.fn(),
}));

import * as softwareRepository from "@/lib/repositories/software.repository";
import * as softwareService from "@/lib/services/software.service";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("softwareService.crear", () => {
    it("lanza DomainError si el nombre ya existe en el catálogo (Edge case 1 de 004)", async () => {
        (softwareRepository.buscarPorNombre as any).mockResolvedValue({ id: "sw_existente" });

        await expect(
            softwareService.crear({ nombre: "SPSS", tipo: "licenciado" })
        ).rejects.toThrow("Este software ya está en el catálogo.");

        expect(softwareRepository.crear).not.toHaveBeenCalled();
    });

    it("crea el software cuando el nombre es único", async () => {
        (softwareRepository.buscarPorNombre as any).mockResolvedValue(null);
        (softwareRepository.crear as any).mockResolvedValue({ id: "sw_new", nombre: "MATLAB" });

        const resultado = await softwareService.crear({ nombre: "MATLAB", tipo: "licenciado" });

        expect(softwareRepository.crear).toHaveBeenCalledWith({ nombre: "MATLAB", tipo: "licenciado" });
        expect(resultado).toEqual({ id: "sw_new", nombre: "MATLAB" });
    });
});

describe("softwareService.editar", () => {
    it("lanza DomainError si el nuevo nombre ya lo tiene OTRO software", async () => {
        (softwareRepository.buscarPorNombre as any).mockResolvedValue({ id: "sw_otro" });

        await expect(
            softwareService.editar("sw_1", { nombre: "SPSS" })
        ).rejects.toThrow("Este nombre de software ya está en el catálogo.");

        expect(softwareRepository.actualizar).not.toHaveBeenCalled();
    });

    it("permite editar si el nombre encontrado pertenece al MISMO software (no es duplicado real)", async () => {
        (softwareRepository.buscarPorNombre as any).mockResolvedValue({ id: "sw_1" }); // mismo id
        (softwareRepository.actualizar as any).mockResolvedValue({ id: "sw_1", nombre: "SPSS", version: "30" });

        const resultado = await softwareService.editar("sw_1", { nombre: "SPSS", version: "30" });

        expect(softwareRepository.actualizar).toHaveBeenCalledWith("sw_1", { nombre: "SPSS", version: "30" });
        expect(resultado.version).toBe("30");
    });

    it("permite editar sin cambiar el nombre (ej. solo la versión) sin validar duplicados", async () => {
        (softwareRepository.actualizar as any).mockResolvedValue({ id: "sw_1", version: "31" });

        await softwareService.editar("sw_1", { version: "31" });

        expect(softwareRepository.buscarPorNombre).not.toHaveBeenCalled();
        expect(softwareRepository.actualizar).toHaveBeenCalledWith("sw_1", { version: "31" });
    });
});

describe("softwareService.eliminar", () => {
    it("lanza DomainError si el software tiene relaciones activas (Edge case 2 de 004)", async () => {
        (softwareRepository.contarRelaciones as any).mockResolvedValue(3);

        await expect(softwareService.eliminar("sw_1")).rejects.toThrow(
            "Este software está en uso (instalado en algún equipo o referenciado por un ticket) y no se puede eliminar."
        );
        expect(softwareRepository.eliminar).not.toHaveBeenCalled();
    });

    it("elimina el software cuando no tiene ninguna relación", async () => {
        (softwareRepository.contarRelaciones as any).mockResolvedValue(0);
        (softwareRepository.eliminar as any).mockResolvedValue({ id: "sw_1" });

        const resultado = await softwareService.eliminar("sw_1");

        expect(softwareRepository.eliminar).toHaveBeenCalledWith("sw_1");
        expect(resultado).toEqual({ id: "sw_1" });
    });
});

describe("softwareService.listar", () => {
    it("delega directamente al repository", async () => {
        (softwareRepository.listar as any).mockResolvedValue([{ id: "sw_1", nombre: "SPSS" }]);

        const resultado = await softwareService.listar();

        expect(softwareRepository.listar).toHaveBeenCalled();
        expect(resultado).toEqual([{ id: "sw_1", nombre: "SPSS" }]);
    });
});