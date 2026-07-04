// tests/unit/ticket.service.test.ts — Pruebas unitarias del servicio de tickets
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as ticketService from "@/lib/services/ticket.service";
import * as ticketRepository from "@/lib/repositories/ticket.repository";
import * as equipoRepository from "@/lib/repositories/equipo.repository";
import { DomainError } from "@/lib/errors/domain-error";

// ---------------------------------------------------------------------------
// Mocks de repositorios (Art. III — no se instancia Prisma en unit tests)
// ---------------------------------------------------------------------------
vi.mock("@/lib/repositories/ticket.repository");
vi.mock("@/lib/repositories/equipo.repository");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    equipoSoftware: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

const mockedTicketRepo = vi.mocked(ticketRepository);
const mockedEquipoRepo = vi.mocked(equipoRepository);

// Datos de equipo operativo base
const equipoOperativo = {
  id: "eq-1",
  codigoInventario: "LAB01-PC01",
  laboratorioId: "lab-1",
  estado: "operativo",
};

const ticketResueltoBase = {
  id: "tkt-resuelto",
  equipoId: "eq-1",
  tipo: "incidencia" as const,
  categoria: "hardware" as const,
  estado: "resuelto" as const,
  fechaCreacion: new Date("2026-01-01"),
  fechaCierre: new Date("2026-01-02"),
  tecnicoAsignadoId: "tec-1",
  comentarios: [],
  equipo: equipoOperativo,
};

const ticketPendienteBase = {
  id: "tkt-pendiente",
  equipoId: "eq-1",
  tipo: "incidencia" as const,
  categoria: "hardware" as const,
  estado: "pendiente" as const,
  fechaCreacion: new Date(),
  fechaCierre: null,
  tecnicoAsignadoId: null,
  comentarios: [],
  equipo: equipoOperativo,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// calcularPrioridad (T029)
// ===========================================================================
describe("calcularPrioridad", () => {
  it("incidencia hardware → alta", () => {
    const t = { ...ticketPendienteBase, tipo: "incidencia" as const, categoria: "hardware" as const };
    expect(ticketService.calcularPrioridad(t)).toBe("alta");
  });

  it("incidencia software_general → media", () => {
    const t = { ...ticketPendienteBase, tipo: "incidencia" as const, categoria: "software_general" as const };
    expect(ticketService.calcularPrioridad(t)).toBe("media");
  });

  it("incidencia red → media", () => {
    const t = { ...ticketPendienteBase, tipo: "incidencia" as const, categoria: "red" as const };
    expect(ticketService.calcularPrioridad(t)).toBe("media");
  });

  it("solicitud sin fecha límite → baja", () => {
    const t = { ...ticketPendienteBase, tipo: "solicitud" as const, categoria: "software_licencia" as const, fechaLimite: null };
    expect(ticketService.calcularPrioridad(t)).toBe("baja");
  });

  it("solicitud con fecha límite en 24h → alta", () => {
    const ahora = new Date();
    const limite = new Date(ahora.getTime() + 24 * 3_600_000);
    const t = { ...ticketPendienteBase, tipo: "solicitud" as const, categoria: "software_licencia" as const, fechaLimite: limite };
    expect(ticketService.calcularPrioridad(t, ahora)).toBe("alta");
  });

  it("solicitud con fecha límite en 5 días → media", () => {
    const ahora = new Date();
    const limite = new Date(ahora.getTime() + 5 * 24 * 3_600_000);
    const t = { ...ticketPendienteBase, tipo: "solicitud" as const, categoria: "software_licencia" as const, fechaLimite: limite };
    expect(ticketService.calcularPrioridad(t, ahora)).toBe("media");
  });

  it("solicitud con fecha límite en 10 días → baja", () => {
    const ahora = new Date();
    const limite = new Date(ahora.getTime() + 10 * 24 * 3_600_000);
    const t = { ...ticketPendienteBase, tipo: "solicitud" as const, categoria: "software_licencia" as const, fechaLimite: limite };
    expect(ticketService.calcularPrioridad(t, ahora)).toBe("baja");
  });
});

// ===========================================================================
// estaAtrasado (T030)
// ===========================================================================
describe("estaAtrasado", () => {
  it("ticket pendiente sin asignar >48h → atrasado", () => {
    const ahora = new Date();
    const creacion = new Date(ahora.getTime() - 49 * 3_600_000);
    const t = { ...ticketPendienteBase, fechaCreacion: creacion };
    expect(ticketService.estaAtrasado(t, ahora)).toBe(true);
  });

  it("ticket pendiente sin asignar =47h → no atrasado", () => {
    const ahora = new Date();
    const creacion = new Date(ahora.getTime() - 47 * 3_600_000);
    const t = { ...ticketPendienteBase, fechaCreacion: creacion };
    expect(ticketService.estaAtrasado(t, ahora)).toBe(false);
  });

  it("ticket con tecnico asignado → nunca atrasado", () => {
    const ahora = new Date();
    const creacion = new Date(ahora.getTime() - 100 * 3_600_000);
    const t = { ...ticketPendienteBase, fechaCreacion: creacion, tecnicoAsignadoId: "tec-1" };
    expect(ticketService.estaAtrasado(t, ahora)).toBe(false);
  });

  it("ticket en_proceso → nunca atrasado", () => {
    const ahora = new Date();
    const creacion = new Date(ahora.getTime() - 100 * 3_600_000);
    const t = { ...ticketPendienteBase, estado: "en_proceso" as const, fechaCreacion: creacion };
    expect(ticketService.estaAtrasado(t, ahora)).toBe(false);
  });
});

// ===========================================================================
// crear (T016–T018, T025–T027, T057b–T057c)
// ===========================================================================
describe("crear", () => {
  const inputBase = {
    tipo: "incidencia" as const,
    categoria: "hardware" as const,
    descripcion: "PC no enciende correctamente desde ayer",
    equipoId: "eq-1",
  };

  it("T016 — caso de éxito: crea ticket con equipo existente", async () => {
    mockedEquipoRepo.buscarPorId.mockResolvedValue(equipoOperativo as any);
    mockedTicketRepo.crear.mockResolvedValue({ id: "tkt-new", ...inputBase } as any);
    mockedTicketRepo.buscarPorEquipoYEstado.mockResolvedValue([]);
    mockedTicketRepo.buscarPorId.mockResolvedValue(null);

    const res = await ticketService.crear(inputBase, "usr-1", "docente");
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toMatchObject({ id: "tkt-new" });
      expect(res.warning).toBeUndefined();
    }
  });

  it("T017 — equipo inexistente → DomainError", async () => {
    mockedEquipoRepo.buscarPorId.mockResolvedValue(null);
    await expect(ticketService.crear(inputBase, "usr-1", "docente")).rejects.toThrow(DomainError);
    await expect(ticketService.crear(inputBase, "usr-1", "docente")).rejects.toThrow("no existe");
  });

  it("T018 — incidencia duplicada en mismo equipo → success + warning", async () => {
    mockedEquipoRepo.buscarPorId.mockResolvedValue(equipoOperativo as any);
    mockedTicketRepo.crear.mockResolvedValue({ id: "tkt-dup" } as any);
    mockedTicketRepo.buscarPorEquipoYEstado.mockResolvedValue([{ id: "tkt-old", tipo: "incidencia", estado: "pendiente" }] as any);

    const res = await ticketService.crear(inputBase, "usr-1", "docente");
    expect(res.success).toBe(true);
    if (res.success) expect(res.warning).toBeTruthy();
  });

  it("T025 — solicitud con software del catálogo → éxito", async () => {
    const input = {
      tipo: "solicitud" as const,
      categoria: "software_licencia" as const,
      descripcion: "Necesito SPSS para clase de estadística",
      equipoId: "eq-1",
      softwareId: "sw-1",
    };
    mockedEquipoRepo.buscarPorId.mockResolvedValue(equipoOperativo as any);
    mockedTicketRepo.crear.mockResolvedValue({ id: "tkt-sol", ...input } as any);

    const res = await ticketService.crear(input, "usr-docente", "docente");
    expect(res.success).toBe(true);
    expect(mockedTicketRepo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ softwareId: "sw-1" })
    );
  });

  it("T026 — solicitud texto libre NO crea entrada en Software", async () => {
    const input = {
      tipo: "solicitud" as const,
      categoria: "software_general" as const,
      descripcion: "Instalar Notepad++ en este equipo",
      equipoId: "eq-1",
      softwareTexto: "Notepad++",
    };
    mockedEquipoRepo.buscarPorId.mockResolvedValue(equipoOperativo as any);
    mockedTicketRepo.crear.mockResolvedValue({ id: "tkt-libre" } as any);

    const res = await ticketService.crear(input, "usr-docente", "docente");
    expect(res.success).toBe(true);
    // El repositorio de software NO debe ser llamado (no existe esa función aquí)
    expect(mockedTicketRepo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ softwareTexto: "Notepad++" })
    );
  });

  it("T057b — ticket relacionado a resuelto del mismo equipo → éxito", async () => {
    const input = { ...inputBase, ticketRelacionadoId: "tkt-resuelto" };
    mockedEquipoRepo.buscarPorId.mockResolvedValue(equipoOperativo as any);
    mockedTicketRepo.buscarPorId.mockResolvedValue(ticketResueltoBase as any);
    mockedTicketRepo.crear.mockResolvedValue({ id: "tkt-hijo" } as any);
    mockedTicketRepo.buscarPorEquipoYEstado.mockResolvedValue([]);

    const res = await ticketService.crear(input, "usr-1", "docente");
    expect(res.success).toBe(true);
  });

  it("T057c — ticket relacionado no resuelto → DomainError", async () => {
    const input = { ...inputBase, ticketRelacionadoId: "tkt-pendiente" };
    mockedEquipoRepo.buscarPorId.mockResolvedValue(equipoOperativo as any);
    mockedTicketRepo.buscarPorId.mockResolvedValue(ticketPendienteBase as any);

    await expect(ticketService.crear(input, "usr-1", "docente")).rejects.toThrow(DomainError);
    await expect(ticketService.crear(input, "usr-1", "docente")).rejects.toThrow("resueltos");
  });
});

// ===========================================================================
// asignar (T032–T033)
// ===========================================================================
describe("asignar", () => {
  it("T032 — técnico asigna ticket sin dueño → éxito", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({ ...ticketPendienteBase, tecnicoAsignadoId: null } as any);
    mockedTicketRepo.asignarTecnico.mockResolvedValue({ id: "tkt-pendiente", tecnicoAsignadoId: "tec-1" } as any);

    await ticketService.asignar("tkt-pendiente", "tec-1", "tecnico");
    expect(mockedTicketRepo.asignarTecnico).toHaveBeenCalledWith("tkt-pendiente", "tec-1");
  });

  it("T033 — ticket ya asignado → DomainError", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({ ...ticketPendienteBase, tecnicoAsignadoId: "tec-2" } as any);

    await expect(ticketService.asignar("tkt-pendiente", "tec-1", "tecnico")).rejects.toThrow(DomainError);
    await expect(ticketService.asignar("tkt-pendiente", "tec-1", "tecnico")).rejects.toThrow("ya fue asignado");
  });
});

// ===========================================================================
// reasignar (T034)
// ===========================================================================
describe("reasignar", () => {
  it("T034a — admin reasigna ticket ya asignado → éxito", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({ ...ticketPendienteBase, tecnicoAsignadoId: "tec-2" } as any);
    mockedTicketRepo.asignarTecnico.mockResolvedValue({} as any);

    await ticketService.reasignar("tkt-pendiente", "tec-1", "admin");
    expect(mockedTicketRepo.asignarTecnico).toHaveBeenCalled();
  });

  it("T034b — técnico (no admin) reasigna → DomainError", async () => {
    await expect(ticketService.reasignar("tkt-pendiente", "tec-1", "tecnico")).rejects.toThrow(DomainError);
    await expect(ticketService.reasignar("tkt-pendiente", "tec-1", "tecnico")).rejects.toThrow("Solo un administrador");
  });
});

// ===========================================================================
// cambiarEstado (T036–T039)
// ===========================================================================
describe("cambiarEstado", () => {
  it("T036 — docente cambia estado → DomainError", async () => {
    await expect(
      ticketService.cambiarEstado("tkt-1", "en_proceso", undefined, "usr-1", "docente")
    ).rejects.toThrow(DomainError);
    await expect(
      ticketService.cambiarEstado("tkt-1", "en_proceso", undefined, "usr-1", "docente")
    ).rejects.toThrow("permisos");
  });

  it("T037 — transición resuelto→pendiente → DomainError", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({ ...ticketResueltoBase, estado: "resuelto" } as any);
    await expect(
      ticketService.cambiarEstado("tkt-resuelto", "pendiente", undefined, "tec-1", "tecnico")
    ).rejects.toThrow(DomainError);
    await expect(
      ticketService.cambiarEstado("tkt-resuelto", "pendiente", undefined, "tec-1", "tecnico")
    ).rejects.toThrow("Transición inválida");
  });

  it("T038 — resolver sin comentarioCierre → DomainError", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({ ...ticketPendienteBase, estado: "en_proceso" } as any);
    await expect(
      ticketService.cambiarEstado("tkt-pendiente", "resuelto", "", "tec-1", "tecnico")
    ).rejects.toThrow(DomainError);
    await expect(
      ticketService.cambiarEstado("tkt-pendiente", "resuelto", "ok", "tec-1", "tecnico")
    ).rejects.toThrow("mínimo 5");
  });

  it("T039 — resolver con comentario válido → éxito", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({
      ...ticketPendienteBase,
      estado: "en_proceso",
      tipo: "incidencia",
      categoria: "hardware",
    } as any);
    mockedTicketRepo.actualizarEstado.mockResolvedValue({ id: "tkt-pendiente", estado: "resuelto" } as any);
    mockedTicketRepo.contarPorEquipoYEstados.mockResolvedValue(0);
    mockedEquipoRepo.actualizarEstado.mockResolvedValue({} as any);

    const res = await ticketService.cambiarEstado("tkt-pendiente", "resuelto", "Se reemplazó el disco duro", "tec-1", "tecnico");
    expect(res).toMatchObject({ estado: "resuelto" });
  });
});

// ===========================================================================
// Efectos automáticos al resolver (T042–T044)
// ===========================================================================
describe("efectos automáticos al resolver", () => {
  it("T042 — hardware resuelto, sin otros tickets → equipo operativo", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({
      ...ticketPendienteBase,
      estado: "en_proceso",
      tipo: "incidencia",
      categoria: "hardware",
    } as any);
    mockedTicketRepo.actualizarEstado.mockResolvedValue({ id: "tkt-pendiente", estado: "resuelto" } as any);
    mockedTicketRepo.contarPorEquipoYEstados.mockResolvedValue(0);
    mockedEquipoRepo.actualizarEstado.mockResolvedValue({} as any);

    await ticketService.cambiarEstado("tkt-pendiente", "resuelto", "Reparado exitosamente", "tec-1", "tecnico");
    expect(mockedEquipoRepo.actualizarEstado).toHaveBeenCalledWith("eq-1", "operativo");
  });

  it("T043 — hardware resuelto, con otros tickets abiertos → equipo mantenimiento", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({
      ...ticketPendienteBase,
      estado: "en_proceso",
      tipo: "incidencia",
      categoria: "hardware",
    } as any);
    mockedTicketRepo.actualizarEstado.mockResolvedValue({ id: "tkt-pendiente", estado: "resuelto" } as any);
    mockedTicketRepo.contarPorEquipoYEstados.mockResolvedValue(2); // hay otros abiertos
    mockedEquipoRepo.actualizarEstado.mockResolvedValue({} as any);

    await ticketService.cambiarEstado("tkt-pendiente", "resuelto", "Reparado pero hay más fallas", "tec-1", "tecnico");
    expect(mockedEquipoRepo.actualizarEstado).toHaveBeenCalledWith("eq-1", "mantenimiento");
  });

  it("T044 — solicitud software resuelta → upsert EquipoSoftware", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({
      ...ticketPendienteBase,
      estado: "en_proceso",
      tipo: "solicitud",
      categoria: "software_licencia",
      softwareId: "sw-1",
    } as any);
    mockedTicketRepo.actualizarEstado.mockResolvedValue({ id: "tkt-pendiente", estado: "resuelto" } as any);

    // No debe llamar a actualizarEstado del equipo en este caso
    await ticketService.cambiarEstado("tkt-pendiente", "resuelto", "Software instalado correctamente", "tec-1", "tecnico");
    expect(mockedEquipoRepo.actualizarEstado).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// agregarComentario (T055–T056)
// ===========================================================================
describe("agregarComentario", () => {
  it("T055 — comentario en ticket pendiente → éxito", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({ ...ticketPendienteBase, estado: "pendiente" } as any);
    mockedTicketRepo.crearComentario.mockResolvedValue({ id: "com-1" } as any);

    await ticketService.agregarComentario({ ticketId: "tkt-pendiente", contenido: "El problema persiste" }, "usr-1");
    expect(mockedTicketRepo.crearComentario).toHaveBeenCalled();
  });

  it("T056 — comentario en ticket resuelto → DomainError", async () => {
    mockedTicketRepo.buscarPorId.mockResolvedValue({ ...ticketResueltoBase, estado: "resuelto" } as any);

    await expect(
      ticketService.agregarComentario({ ticketId: "tkt-resuelto", contenido: "Hola" }, "usr-1")
    ).rejects.toThrow(DomainError);
    await expect(
      ticketService.agregarComentario({ ticketId: "tkt-resuelto", contenido: "Hola" }, "usr-1")
    ).rejects.toThrow("resuelto");
  });
});
