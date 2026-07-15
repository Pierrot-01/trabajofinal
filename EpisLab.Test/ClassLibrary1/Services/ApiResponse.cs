// Services/ApiResponse.cs
// Equivalente a: lib/api-response.ts
// Contrato de respuesta (Art. IX): { success, data?, error?, warning? }
namespace SistemaGestionLaboratorios.Services
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string? Error { get; set; }
        public string? Warning { get; set; }
        public bool HasWarning => Warning != null;
        public bool HasData => Data != null;
    }

    public static class ApiResponseHelper
    {
        /// <summary>Respuesta exitosa. Warning opcional, no bloquea (Art. IX v1.3).</summary>
        public static ApiResponse<T> Ok<T>(T data, string? warning = null)
        {
            return new ApiResponse<T>
            {
                Success = true,
                Data = data,
                Warning = warning
            };
        }

        /// <summary>Respuesta de error. Nunca expone detalles internos (Art. X).</summary>
        public static ApiResponse<T> Fail<T>(string error)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Error = error
            };
        }

        public static ApiResponse<object> Fail(string error)
            => Fail<object>(error);
    }
}
