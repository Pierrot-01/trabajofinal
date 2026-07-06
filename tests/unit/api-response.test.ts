// tests/unit/api-response.test.ts
import { describe, it, expect } from "vitest";
import { ok, fail } from "@/lib/api-response";

describe("ok()", () => {
    it("devuelve success: true con los datos, sin warning", () => {
        const resultado = ok({ id: "tk_1" });
        expect(resultado).toEqual({ success: true, data: { id: "tk_1" } });
        // clave: cuando NO hay warning, la propiedad ni siquiera debe existir en el objeto
        expect(resultado).not.toHaveProperty("warning");
    });

    it("devuelve success: true con warning cuando se provee (Art. IX v1.3)", () => {
        const resultado = ok({ id: "tk_1" }, "Ya existe un ticket abierto para este equipo");
        expect(resultado).toEqual({
            success: true,
            data: { id: "tk_1" },
            warning: "Ya existe un ticket abierto para este equipo",
        });
    });

    it("funciona con distintos tipos de dato (arrays, primitivos)", () => {
        expect(ok([1, 2, 3])).toEqual({ success: true, data: [1, 2, 3] });
        expect(ok(null)).toEqual({ success: true, data: null });
        expect(ok(42)).toEqual({ success: true, data: 42 });
    });
});

describe("fail()", () => {
    it("devuelve success: false con el mensaje de error, sin campo data", () => {
        const resultado = fail("Este ticket ya fue asignado");
        expect(resultado).toEqual({ success: false, error: "Este ticket ya fue asignado" });
        expect(resultado).not.toHaveProperty("data");
    });

    it("nunca incluye stack traces ni detalles internos — solo el string que se le pasa (Art. X)", () => {
        const mensajeSeguro = "Ocurrió un error, intenta nuevamente.";
        const resultado = fail(mensajeSeguro);
        expect(resultado.success).toBe(false);
        if (!resultado.success) {
            expect(resultado.error).toBe(mensajeSeguro);
        }
    });
});