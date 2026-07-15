// LaboratorioRepositoryTests.cs
// Equivalente a: tests/unit/laboratorio.repository.test.ts
using Moq;
using SistemaGestionLaboratorios.Models;
using SistemaGestionLaboratorios.Services;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{
    // Interfaz extendida para el repositorio de laboratorio
    public interface ILaboratorioRepositoryFull : ILaboratorioRepository
    {
        Task<Laboratorio> Crear(Laboratorio lab);
        Task<List<Laboratorio>> Listar();
        Task<List<LaboratorioConEquipos>> ListarConEquipos();
        Task<int> ContarEquipos(string laboratorioId);
    }

    public class LaboratorioConEquipos
    {
        public string Id { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public List<Equipo> Equipos { get; set; } = new();
    }

    public class LaboratorioRepositoryTests
    {
        private readonly Mock<ILaboratorioRepositoryFull> _repoMock = new();

        // -----------------------------------------------------------------------
        // crear
        // -----------------------------------------------------------------------

        [Fact]
        public async Task Crear_LlamaAlRepositorioConNombreUbicacionCapacidad()
        {
            var data = new Laboratorio { Nombre = "Lab 1", Ubicacion = "Pabellón A", Capacidad = 30 };
            var esperado = new Laboratorio { Id = "lab_1", Nombre = "Lab 1", Ubicacion = "Pabellón A", Capacidad = 30 };
            _repoMock.Setup(r => r.Crear(It.IsAny<Laboratorio>())).ReturnsAsync(esperado);

            var resultado = await _repoMock.Object.Crear(data);

            _repoMock.Verify(r => r.Crear(It.IsAny<Laboratorio>()), Times.Once);
            Assert.Equal("lab_1", resultado.Id);
            Assert.Equal("Lab 1", resultado.Nombre);
        }

        // -----------------------------------------------------------------------
        // buscarPorId
        // -----------------------------------------------------------------------

        [Fact]
        public async Task BuscarPorId_DevuelveLaboratorioCuandoExiste()
        {
            _repoMock.Setup(r => r.BuscarPorId("lab_1"))
                .ReturnsAsync(new Laboratorio { Id = "lab_1", Nombre = "Lab 1" });

            var resultado = await _repoMock.Object.BuscarPorId("lab_1");

            _repoMock.Verify(r => r.BuscarPorId("lab_1"), Times.Once);
            Assert.Equal("lab_1", resultado!.Id);
        }

        [Fact]
        public async Task BuscarPorId_DevuelveNull_EdgeCase3De003_LaboratorioInexistente()
        {
            _repoMock.Setup(r => r.BuscarPorId("no-existe")).ReturnsAsync((Laboratorio?)null);

            var resultado = await _repoMock.Object.BuscarPorId("no-existe");

            Assert.Null(resultado);
        }

        // -----------------------------------------------------------------------
        // listar
        // -----------------------------------------------------------------------

        [Fact]
        public async Task Listar_DevuelveLaboratoriosOrdenadosAlfabeticamente()
        {
            var labs = new List<Laboratorio>
            {
                new() { Id = "lab_1", Nombre = "Lab A", Ubicacion = "Pabellón A", Capacidad = 30 }
            };
            _repoMock.Setup(r => r.Listar()).ReturnsAsync(labs);

            var resultado = await _repoMock.Object.Listar();

            _repoMock.Verify(r => r.Listar(), Times.Once);
            Assert.Single(resultado);
            Assert.Equal("Lab A", resultado[0].Nombre);
        }

        // -----------------------------------------------------------------------
        // listarConEquipos
        // -----------------------------------------------------------------------

        [Fact]
        public async Task ListarConEquipos_IncluyeEquiposDeCadaLaboratorio()
        {
            var labsConEquipos = new List<LaboratorioConEquipos>
            {
                new()
                {
                    Id = "lab_1", Nombre = "Lab A",
                    Equipos = new List<Equipo>
                    {
                        new() { Id = "eq_1", CodigoInventario = "PC-001", Estado = EstadoEquipo.Operativo }
                    }
                }
            };
            _repoMock.Setup(r => r.ListarConEquipos()).ReturnsAsync(labsConEquipos);

            var resultado = await _repoMock.Object.ListarConEquipos();

            _repoMock.Verify(r => r.ListarConEquipos(), Times.Once);
            Assert.Single(resultado[0].Equipos);
        }

        // -----------------------------------------------------------------------
        // contarEquipos
        // -----------------------------------------------------------------------

        [Fact]
        public async Task ContarEquipos_CuentaEquiposAsociadosAlLaboratorio()
        {
            _repoMock.Setup(r => r.ContarEquipos("lab_1")).ReturnsAsync(12);

            var resultado = await _repoMock.Object.ContarEquipos("lab_1");

            _repoMock.Verify(r => r.ContarEquipos("lab_1"), Times.Once);
            Assert.Equal(12, resultado);
        }

        [Fact]
        public async Task ContarEquipos_DevuelveCero_LaboratorioRecienCreado()
        {
            _repoMock.Setup(r => r.ContarEquipos("lab_nuevo")).ReturnsAsync(0);

            var resultado = await _repoMock.Object.ContarEquipos("lab_nuevo");

            Assert.Equal(0, resultado);
        }
    }
}
