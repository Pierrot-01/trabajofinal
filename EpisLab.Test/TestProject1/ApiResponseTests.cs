// ApiResponseTests.cs
// Equivalente a: tests/unit/api-response.test.ts
using SistemaGestionLaboratorios.Services;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{
    public class ApiResponseTests
    {
        // ---------------------------------------------------------------
        // ok() — equivalente a describe("ok()")
        // ---------------------------------------------------------------

        [Fact]
        public void Ok_DevuelveSuccessTrueConDatos_SinWarning()
        {
            var resultado = ApiResponseHelper.Ok(new { id = "tk_1" });
            Assert.True(resultado.Success);
            Assert.NotNull(resultado.Data);
            Assert.Null(resultado.Warning);  // sin warning
        }

        [Fact]
        public void Ok_DevuelveSuccessTrueConWarning_CuandoSeProvee()
        {
            var resultado = ApiResponseHelper.Ok(
                new { id = "tk_1" },
                "Ya existe un ticket abierto para este equipo");

            Assert.True(resultado.Success);
            Assert.NotNull(resultado.Data);
            Assert.Equal("Ya existe un ticket abierto para este equipo", resultado.Warning);
        }

        [Fact]
        public void Ok_FuncionaConDistintosTiposDeDato()
        {
            var lista = ApiResponseHelper.Ok(new[] { 1, 2, 3 });
            Assert.True(lista.Success);

            var nulo = ApiResponseHelper.Ok<object?>(null);
            Assert.True(nulo.Success);

            var numero = ApiResponseHelper.Ok(42);
            Assert.True(numero.Success);
            Assert.Equal(42, numero.Data);
        }

        // ---------------------------------------------------------------
        // fail() — equivalente a describe("fail()")
        // ---------------------------------------------------------------

        [Fact]
        public void Fail_DevuelveSuccessFalseConMensajeDeError_SinData()
        {
            var resultado = ApiResponseHelper.Fail<object>("Este ticket ya fue asignado");
            Assert.False(resultado.Success);
            Assert.Equal("Este ticket ya fue asignado", resultado.Error);
            Assert.Null(resultado.Data);
        }

        [Fact]
        public void Fail_NuncaExponeMasQueElMensajeProvisto_ArtX()
        {
            var mensajeSeguro = "Ocurrió un error, intenta nuevamente.";
            var resultado = ApiResponseHelper.Fail<object>(mensajeSeguro);
            Assert.False(resultado.Success);
            Assert.Equal(mensajeSeguro, resultado.Error);
        }
    }
}
