// SoftwareServiceAdditionalTests.cs — VERSIÓN AUTÓNOMA
using Moq;
using SistemaGestionLaboratorios.Errors;
using SistemaGestionLaboratorios.Models;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{
    // ── Interfaz propia con TODOS los métodos necesarios ─────────────────────
    public interface ISoftwareRepo
    {
        Task<Software?> BuscarPorNombre(string nombre);
        Task<Software> Crear(Software software);
        Task<Software> Editar(string softwareId, Software cambios);
        Task<Software> Eliminar(string softwareId);
        Task<int> ContarRelaciones(string softwareId);
        Task<List<Software>> Listar();
    }

    // ── Servicio extendido (incluye editar y listar) ──────────────────────────
    public class SoftwareServiceExt
    {
        private readonly ISoftwareRepo _repo;

        public SoftwareServiceExt(ISoftwareRepo repo)
        {
            _repo = repo;
        }

        public async Task<Software> Crear(string nombre, TipoSoftware tipo)
        {
            var existente = await _repo.BuscarPorNombre(nombre);
            if (existente != null)
                throw new DomainError("Este software ya está en el catálogo.");
            return await _repo.Crear(new Software { Nombre = nombre, Tipo = tipo });
        }

        public async Task<Software> Editar(string softwareId, string? nuevoNombre, string? nuevaVersion)
        {
            if (nuevoNombre != null)
            {
                var existente = await _repo.BuscarPorNombre(nuevoNombre);
                if (existente != null && existente.Id != softwareId)
                    throw new DomainError("Este nombre de software ya está en el catálogo.");
            }
            return await _repo.Editar(softwareId, new Software { Version = nuevaVersion });
        }

        public async Task<Software> Eliminar(string softwareId)
        {
            var relaciones = await _repo.ContarRelaciones(softwareId);
            if (relaciones > 0)
                throw new DomainError(
                    "Este software está en uso (instalado en algún equipo o referenciado por un ticket) y no se puede eliminar.");
            return await _repo.Eliminar(softwareId);
        }

        public async Task<List<Software>> Listar()
        {
            return await _repo.Listar();
        }
    }

    // ── Tests ─────────────────────────────────────────────────────────────────
    public class SoftwareServiceAdditionalTests
    {
        private readonly Mock<ISoftwareRepo> _repoMock = new();
        private readonly SoftwareServiceExt _service;

        public SoftwareServiceAdditionalTests()
        {
            _service = new SoftwareServiceExt(_repoMock.Object);
        }

        // ===================================================================
        // softwareService.crear
        // ===================================================================

        [Fact]
        public async Task Crear_NombreYaExiste_LanzaDomainError_EdgeCase1De004()
        {
            _repoMock.Setup(r => r.BuscarPorNombre("SPSS"))
                .ReturnsAsync(new Software { Id = "sw_existente" });

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.Crear("SPSS", TipoSoftware.Licenciado));

            Assert.Equal("Este software ya está en el catálogo.", ex.Message);
            _repoMock.Verify(r => r.Crear(It.IsAny<Software>()), Times.Never);
        }

        [Fact]
        public async Task Crear_NombreUnico_CreaExitosamente()
        {
            _repoMock.Setup(r => r.BuscarPorNombre("MATLAB")).ReturnsAsync((Software?)null);
            _repoMock.Setup(r => r.Crear(It.IsAny<Software>()))
                .ReturnsAsync(new Software { Id = "sw_new", Nombre = "MATLAB" });

            var resultado = await _service.Crear("MATLAB", TipoSoftware.Licenciado);

            _repoMock.Verify(r => r.Crear(It.IsAny<Software>()), Times.Once);
            Assert.Equal("sw_new", resultado.Id);
        }

        // ===================================================================
        // softwareService.editar
        // ===================================================================

        [Fact]
        public async Task Editar_NuevoNombreYaLoTieneOtroSoftware_LanzaDomainError()
        {
            _repoMock.Setup(r => r.BuscarPorNombre("SPSS"))
                .ReturnsAsync(new Software { Id = "sw_otro" }); // id diferente

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.Editar("sw_1", "SPSS", null));

            Assert.Contains("ya está en el catálogo", ex.Message);
            _repoMock.Verify(r => r.Editar(It.IsAny<string>(), It.IsAny<Software>()), Times.Never);
        }

        [Fact]
        public async Task Editar_NombrePerteneceMismoSoftware_PermiteEditar()
        {
            _repoMock.Setup(r => r.BuscarPorNombre("SPSS"))
                .ReturnsAsync(new Software { Id = "sw_1" }); // mismo id → no es duplicado
            _repoMock.Setup(r => r.Editar("sw_1", It.IsAny<Software>()))
                .ReturnsAsync(new Software { Id = "sw_1", Version = "30" });

            var resultado = await _service.Editar("sw_1", "SPSS", "30");

            Assert.Equal("sw_1", resultado.Id);
        }

        [Fact]
        public async Task Editar_SinCambiarNombre_NoValidaDuplicados()
        {
            _repoMock.Setup(r => r.Editar("sw_1", It.IsAny<Software>()))
                .ReturnsAsync(new Software { Id = "sw_1", Version = "31" });

            var resultado = await _service.Editar("sw_1", null, "31");

            // BuscarPorNombre NO se debe llamar cuando no cambia el nombre
            _repoMock.Verify(r => r.BuscarPorNombre(It.IsAny<string>()), Times.Never);
            Assert.Equal("31", resultado.Version);
        }

        // ===================================================================
        // softwareService.eliminar
        // ===================================================================

        [Fact]
        public async Task Eliminar_SoftwareConRelaciones_LanzaDomainError_EdgeCase2De004()
        {
            _repoMock.Setup(r => r.ContarRelaciones("sw_1")).ReturnsAsync(3);

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.Eliminar("sw_1"));

            Assert.Contains("está en uso", ex.Message);
            _repoMock.Verify(r => r.Eliminar(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task Eliminar_SoftwareSinRelaciones_EliminaFisicamente()
        {
            _repoMock.Setup(r => r.ContarRelaciones("sw_1")).ReturnsAsync(0);
            _repoMock.Setup(r => r.Eliminar("sw_1"))
                .ReturnsAsync(new Software { Id = "sw_1" });

            var resultado = await _service.Eliminar("sw_1");

            _repoMock.Verify(r => r.Eliminar("sw_1"), Times.Once);
            Assert.Equal("sw_1", resultado.Id);
        }

        // ===================================================================
        // softwareService.listar
        // ===================================================================

        [Fact]
        public async Task Listar_DelegaDirectamenteAlRepository()
        {
            var swList = new List<Software>
            {
                new() { Id = "sw_1", Nombre = "SPSS" }
            };
            _repoMock.Setup(r => r.Listar()).ReturnsAsync(swList);

            var resultado = await _service.Listar();

            _repoMock.Verify(r => r.Listar(), Times.Once);
            Assert.Single(resultado);
            Assert.Equal("SPSS", resultado[0].Nombre);
        }
    }
}
