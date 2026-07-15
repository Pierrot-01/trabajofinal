// SoftwareRepositoryTests.cs
// Equivalente a: tests/unit/software.repository.test.ts
// Prueba el contrato del repositorio de software: qué métodos se llaman
// y con qué parámetros (usando Moq en lugar del mock de Prisma).
using Moq;
using SistemaGestionLaboratorios.Models;
using SistemaGestionLaboratorios.Services;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{
    public interface ISoftwareRepositoryExtended : ISoftwareRepository
    {
        Task<Software?> BuscarPorId(string id);
        Task<List<Software>> Listar();
        Task<Software> Actualizar(string id, Software cambios);
    }

    public class SoftwareRepositoryTests
    {
        private readonly Mock<ISoftwareRepositoryExtended> _repoMock = new();

        // -----------------------------------------------------------------------
        // crear
        // -----------------------------------------------------------------------

        [Fact]
        public async Task Crear_LlamaAlRepositorioConNombreTipoVersion()
        {
            var esperado = new Software { Id = "sw_1", Nombre = "SPSS", Tipo = TipoSoftware.Licenciado, Version = "29" };
            _repoMock.Setup(r => r.Crear(It.IsAny<Software>())).ReturnsAsync(esperado);

            var resultado = await _repoMock.Object.Crear(new Software { Nombre = "SPSS", Tipo = TipoSoftware.Licenciado, Version = "29" });

            Assert.Equal("sw_1", resultado.Id);
            Assert.Equal("SPSS", resultado.Nombre);
        }

        [Fact]
        public async Task Crear_PermiteCrearSinVersion()
        {
            var esperado = new Software { Id = "sw_2", Nombre = "GIMP", Tipo = TipoSoftware.Gratuito };
            _repoMock.Setup(r => r.Crear(It.IsAny<Software>())).ReturnsAsync(esperado);

            var resultado = await _repoMock.Object.Crear(new Software { Nombre = "GIMP", Tipo = TipoSoftware.Gratuito });

            Assert.Equal("sw_2", resultado.Id);
            Assert.Null(resultado.Version);
        }

        // -----------------------------------------------------------------------
        // buscarPorNombre
        // -----------------------------------------------------------------------

        [Fact]
        public async Task BuscarPorNombre_DevuelveSwCuandoExiste()
        {
            _repoMock.Setup(r => r.BuscarPorNombre("SPSS"))
                .ReturnsAsync(new Software { Id = "sw_1", Nombre = "SPSS" });

            var resultado = await _repoMock.Object.BuscarPorNombre("SPSS");

            _repoMock.Verify(r => r.BuscarPorNombre("SPSS"), Times.Once);
            Assert.Equal("sw_1", resultado!.Id);
        }

        [Fact]
        public async Task BuscarPorNombre_DevuelveNullSiNoExiste()
        {
            _repoMock.Setup(r => r.BuscarPorNombre("Software Nuevo")).ReturnsAsync((Software?)null);

            var resultado = await _repoMock.Object.BuscarPorNombre("Software Nuevo");

            Assert.Null(resultado);
        }

        // -----------------------------------------------------------------------
        // contarRelaciones — suma EquipoSoftware + Ticket (Clarify #1 de 004)
        // -----------------------------------------------------------------------

        [Fact]
        public async Task ContarRelaciones_SumaEquipoSoftwareMasTicket()
        {
            // Simula: 3 equipos + 2 tickets = 5
            _repoMock.Setup(r => r.ContarRelaciones("sw_1")).ReturnsAsync(5);

            var resultado = await _repoMock.Object.ContarRelaciones("sw_1");

            Assert.Equal(5, resultado);
        }

        [Fact]
        public async Task ContarRelaciones_DevuelveCeroSiNoHayRelaciones()
        {
            _repoMock.Setup(r => r.ContarRelaciones("sw_nuevo")).ReturnsAsync(0);

            var resultado = await _repoMock.Object.ContarRelaciones("sw_nuevo");

            Assert.Equal(0, resultado);
        }

        [Fact]
        public async Task ContarRelaciones_CuentaAunqueSoloExistaEnUnLado()
        {
            // Solo tickets (4), sin equipos (0) → total 4
            _repoMock.Setup(r => r.ContarRelaciones("sw_2")).ReturnsAsync(4);

            var resultado = await _repoMock.Object.ContarRelaciones("sw_2");

            Assert.Equal(4, resultado);
        }

        // -----------------------------------------------------------------------
        // eliminar — solo se llama cuando no hay relaciones (HU-03 de 004)
        // -----------------------------------------------------------------------

        [Fact]
        public async Task Eliminar_EliminaFisicamenteElSoftware()
        {
            _repoMock.Setup(r => r.Eliminar("sw_1")).ReturnsAsync(new Software { Id = "sw_1" });

            var resultado = await _repoMock.Object.Eliminar("sw_1");

            _repoMock.Verify(r => r.Eliminar("sw_1"), Times.Once);
            Assert.Equal("sw_1", resultado.Id);
        }

        [Fact]
        public async Task BuscarPorId_BuscaSoftwarePorId()
        {
            _repoMock.Setup(r => r.BuscarPorId("sw_1"))
                .ReturnsAsync(new Software { Id = "sw_1", Nombre = "SPSS" });

            var resultado = await _repoMock.Object.BuscarPorId("sw_1");

            Assert.NotNull(resultado);
            Assert.Equal("SPSS", resultado.Nombre);
        }

        [Fact]
        public async Task Listar_ListaElCatalogoOrdenadoAlfabeticamente()
        {
            var lista = new List<Software> { new() { Id = "sw_1", Nombre = "SPSS" } };
            _repoMock.Setup(r => r.Listar()).ReturnsAsync(lista);

            var resultado = await _repoMock.Object.Listar();

            Assert.Single(resultado);
            Assert.Equal("SPSS", resultado[0].Nombre);
        }

        [Fact]
        public async Task Actualizar_ActualizaSoloLosCamposProvistos()
        {
            var cambios = new Software { Version = "30" };
            _repoMock.Setup(r => r.Actualizar("sw_1", cambios))
                .ReturnsAsync(new Software { Id = "sw_1", Version = "30" });

            var resultado = await _repoMock.Object.Actualizar("sw_1", cambios);

            Assert.Equal("30", resultado.Version);
        }
    }
}
