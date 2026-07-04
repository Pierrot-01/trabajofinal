// tests/unit/software.service.test.ts — Pruebas unitarias T302–T309 (004-software)
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as softwareService from "@/lib/services/software.service";
import * as softwareRepository from "@/lib/repositories/software.repository";
import { DomainError } from "@/lib/errors/domain-error";

vi.mock("@/lib/repositories/software.repository");

const mockedSoftwareRepo = vi.mocked(softwareRepository);
const swBase = { id: "sw-1", nombre: "SPSS", tipo: "licenciado" as const, version: "29" };

beforeEach(() => vi.clearAllMocks());

// ===========================================================================
// crear (T302–T303)
// ===========================================================================
describe("crear software", () => {
  it("T302 — nombre único → éxito", async () => {
    mockedSoftwareRepo.buscarPorNombre.mockResolvedValue(null);
    mockedSoftwareRepo.crear.mockResolvedValue(swBase as any);

    const result = await softwareService.crear({ nombre: "SPSS", tipo: "licenciado", version: "29" });
    expect(result).toMatchObject({ id: "sw-1" });
  });

  it("T303 — nombre duplicado → DomainError", async () => {
    mockedSoftwareRepo.buscarPorNombre.mockResolvedValue(swBase as any);

    await expect(softwareService.crear({ nombre: "SPSS", tipo: "licenciado" })).rejects.toThrow(DomainError);
    await expect(softwareService.crear({ nombre: "SPSS", tipo: "licenciado" })).rejects.toThrow("ya está en el catálogo");
  });
});

// ===========================================================================
// contarRelaciones + eliminar (T306–T308)
// ===========================================================================
describe("eliminar software", () => {
  it("T306 — contarRelaciones devuelve suma de EquipoSoftware + Ticket", async () => {
    // Verificamos que el repositorio sea llamado con el id correcto
    mockedSoftwareRepo.contarRelaciones.mockResolvedValue(5); // 3 equipos + 2 tickets
    const count = await softwareRepository.contarRelaciones("sw-1");
    expect(count).toBe(5);
  });

  it("T307 — software con relaciones > 0 → DomainError", async () => {
    mockedSoftwareRepo.contarRelaciones.mockResolvedValue(2);

    await expect(softwareService.eliminar("sw-1")).rejects.toThrow(DomainError);
    await expect(softwareService.eliminar("sw-1")).rejects.toThrow("está en uso");
  });

  it("T308 — software sin relaciones → eliminación física exitosa", async () => {
    mockedSoftwareRepo.contarRelaciones.mockResolvedValue(0);
    mockedSoftwareRepo.eliminar.mockResolvedValue(swBase as any);

    await softwareService.eliminar("sw-1");
    expect(mockedSoftwareRepo.eliminar).toHaveBeenCalledWith("sw-1");
  });
});
