// tests/unit/equipo.service.test.ts — Pruebas unitarias T208–T218 (003-laboratorios-equipos)
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as equipoService from "@/lib/services/equipo.service";
import * as equipoRepository from "@/lib/repositories/equipo.repository";
import * as laboratorioRepository from "@/lib/repositories/laboratorio.repository";
import { DomainError } from "@/lib/errors/domain-error";

vi.mock("@/lib/repositories/equipo.repository");
vi.mock("@/lib/repositories/laboratorio.repository");

const mockedEquipoRepo = vi.mocked(equipoRepository);
const mockedLabRepo = vi.mocked(laboratorioRepository);

const labExistente = { id: "lab-1", nombre: "Lab Informática I", ubicacion: "Pabellón A", capacidad: 30 };
const equipoBase = { id: "eq-1", codigoInventario: "LAB01-PC01", laboratorioId: "lab-1", estado: "operativo" as const };

beforeEach(() => vi.clearAllMocks());

// ===========================================================================
// crear (T208–T210)
// ===========================================================================
describe("crear equipo", () => {
  it("T208 — código único y laboratorio existente → éxito", async () => {
    mockedLabRepo.buscarPorId.mockResolvedValue(labExistente as any);
    mockedEquipoRepo.buscarPorCodigo.mockResolvedValue(null);
    mockedEquipoRepo.crear.mockResolvedValue(equipoBase as any);

    const result = await equipoService.crear({ codigoInventario: "LAB01-PC01", laboratorioId: "lab-1" });
    expect(result).toMatchObject({ id: "eq-1" });
  });

  it("T209 — código duplicado → DomainError", async () => {
    mockedLabRepo.buscarPorId.mockResolvedValue(labExistente as any);
    mockedEquipoRepo.buscarPorCodigo.mockResolvedValue(equipoBase as any); // ya existe

    await expect(equipoService.crear({ codigoInventario: "LAB01-PC01", laboratorioId: "lab-1" }))
      .rejects.toThrow(DomainError);
    await expect(equipoService.crear({ codigoInventario: "LAB01-PC01", laboratorioId: "lab-1" }))
      .rejects.toThrow("ya está registrado");
  });

  it("T210 — laboratorio inexistente → DomainError", async () => {
    mockedLabRepo.buscarPorId.mockResolvedValue(null);

    await expect(equipoService.crear({ codigoInventario: "LAB01-PC99", laboratorioId: "lab-x" }))
      .rejects.toThrow(DomainError);
    await expect(equipoService.crear({ codigoInventario: "LAB01-PC99", laboratorioId: "lab-x" }))
      .rejects.toThrow("laboratorio no existe");
  });
});

// ===========================================================================
// editarEstado (T212–T213) — advertencia, NO bloqueo
// ===========================================================================
describe("editarEstado", () => {
  it("T212 — con tickets abiertos → success + warning", async () => {
    mockedEquipoRepo.contarTicketsAbiertos.mockResolvedValue(2);
    mockedEquipoRepo.editar.mockResolvedValue({ ...equipoBase, estado: "inoperativo" } as any);

    const res = await equipoService.editarEstado("eq-1", "inoperativo");
    expect(res.success).toBe(true);
    if (res.success) expect(res.warning).toBeTruthy();
  });

  it("T213 — sin tickets abiertos → success limpio sin warning", async () => {
    mockedEquipoRepo.contarTicketsAbiertos.mockResolvedValue(0);
    mockedEquipoRepo.editar.mockResolvedValue({ ...equipoBase, estado: "inoperativo" } as any);

    const res = await equipoService.editarEstado("eq-1", "inoperativo");
    expect(res.success).toBe(true);
    if (res.success) expect(res.warning).toBeUndefined();
  });
});

// ===========================================================================
// darDeBaja (T216–T217) — bloqueo real, distinto de editarEstado
// ===========================================================================
describe("darDeBaja", () => {
  it("T216 — con tickets abiertos → DomainError (BLOQUEO, no advertencia)", async () => {
    mockedEquipoRepo.contarTicketsAbiertos.mockResolvedValue(3);

    await expect(equipoService.darDeBaja("eq-1")).rejects.toThrow(DomainError);
    await expect(equipoService.darDeBaja("eq-1")).rejects.toThrow("tickets abiertos");
  });

  it("T217 — sin tickets abiertos → éxito, estado dado_de_baja", async () => {
    mockedEquipoRepo.contarTicketsAbiertos.mockResolvedValue(0);
    mockedEquipoRepo.actualizarEstado.mockResolvedValue({ ...equipoBase, estado: "dado_de_baja" } as any);

    await equipoService.darDeBaja("eq-1");
    expect(mockedEquipoRepo.actualizarEstado).toHaveBeenCalledWith("eq-1", "dado_de_baja");
  });
});
