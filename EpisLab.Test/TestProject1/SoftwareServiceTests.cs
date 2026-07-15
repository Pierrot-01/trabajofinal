// SoftwareServiceTests.cs
// Equivalente a: tests/unit/software.service.test.ts
using Moq;
using SistemaGestionLaboratorios.Errors;
using SistemaGestionLaboratorios.Models;
using SistemaGestionLaboratorios.Services;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{
    public class SoftwareServiceTests
    {
        private readonly Mock<ISoftwareRepository> _softwareRepoMock = new();
        private readonly SoftwareService _service;
        private readonly Software _swBase = new() { Id = "sw-1", Nombre = "SPSS", Tipo = TipoSoftware.Licenciado, Version = "29" };

        public SoftwareServiceTests()
        {
            _service = new SoftwareService(_softwareRepoMock.Object);
        }

        // T302–T303: Crear
        [Fact]
        public async Task T302_NombreUnico_Exito()
        {
            _softwareRepoMock.Setup(r => r.BuscarPorNombre("SPSS")).ReturnsAsync((Software?)null);
            _softwareRepoMock.Setup(r => r.Crear(It.IsAny<Software>())).ReturnsAsync(_swBase);

            var result = await _service.Crear("SPSS", TipoSoftware.Licenciado, "29");
            Assert.Equal("sw-1", result.Id);
        }

        [Fact]
        public async Task T303_NombreDuplicado_LanzaDomainError()
        {
            _softwareRepoMock.Setup(r => r.BuscarPorNombre("SPSS")).ReturnsAsync(_swBase);

            var ex = await Assert.ThrowsAsync<DomainError>(() => _service.Crear("SPSS", TipoSoftware.Licenciado));
            Assert.Contains("ya está en el catálogo", ex.Message);
        }

        // T306–T308: Eliminar
        [Fact]
        public async Task T306_ContarRelacionesDevuelveSumaCombinada()
        {
            _softwareRepoMock.Setup(r => r.ContarRelaciones("sw-1")).ReturnsAsync(5);
            var count = await _softwareRepoMock.Object.ContarRelaciones("sw-1");
            Assert.Equal(5, count);
        }

        [Fact]
        public async Task T307_SoftwareConRelaciones_LanzaDomainError()
        {
            _softwareRepoMock.Setup(r => r.ContarRelaciones("sw-1")).ReturnsAsync(2);

            var ex = await Assert.ThrowsAsync<DomainError>(() => _service.Eliminar("sw-1"));
            Assert.Contains("está en uso", ex.Message);
        }

        [Fact]
        public async Task T308_SoftwareSinRelaciones_EliminacionFisicaExitosa()
        {
            _softwareRepoMock.Setup(r => r.ContarRelaciones("sw-1")).ReturnsAsync(0);
            _softwareRepoMock.Setup(r => r.Eliminar("sw-1")).ReturnsAsync(_swBase);

            await _service.Eliminar("sw-1");
            _softwareRepoMock.Verify(r => r.Eliminar("sw-1"), Times.Once);
        }
    }
}
