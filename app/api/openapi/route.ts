import { NextResponse } from "next/server";

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Sistema de Mantenimiento de Laboratorios EPIS - UNSCH",
    description: "Especificación de API Abierta (OpenAPI) para el sistema de informes técnicos, incidencias y gestión de inventario de equipos y software en la EPIS-UNSCH. Esta especificación automatizada define los contratos de entrada/salida validados por esquemas de dominio (Zod y Prisma).",
    version: "1.0.0",
    contact: {
      name: "Soporte Técnico EPIS-UNSCH",
      email: "soporte@unsch.edu.pe"
    }
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Servidor de Desarrollo Local"
    }
  ],
  paths: {
    "/api/auth/signin": {
      post: {
        summary: "Iniciar sesión en la plataforma",
        description: "Valida las credenciales institucionales del usuario (@unsch.edu.pe) y establece la sesión segura. Implementa mitigación de fuerza bruta con bloqueo temporal de 15 minutos tras 5 intentos fallidos (Art. IV, punto 6).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  correo: {
                    type: "string",
                    format: "email",
                    example: "docente@unsch.edu.pe"
                  },
                  password: {
                    type: "string",
                    format: "password",
                    example: "********"
                  }
                },
                required: ["correo", "password"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Sesión iniciada exitosamente",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse"
                }
              }
            }
          },
          "401": {
            description: "Credenciales incorrectas (Mensaje genérico para evitar enumeración, HU-01)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/api/tickets": {
      get: {
        summary: "Listar tickets de soporte técnico",
        description: "Obtiene una lista paginada de tickets del sistema. Filtra por estado, tipo (incidencia o solicitud), categoría y laboratorio. Los docentes solo ven sus propios tickets; los técnicos y administradores ven todos (Art. IV, punto 1).",
        parameters: [
          {
            name: "estado",
            in: "query",
            schema: {
              type: "string",
              enum: ["pendiente", "en_proceso", "resuelto"]
            }
          },
          {
            name: "tipo",
            in: "query",
            schema: {
              type: "string",
              enum: ["incidencia", "solicitud"]
            }
          }
        ],
        responses: {
          "200": {
            description: "Listado de tickets",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/Ticket"
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: "Crear un nuevo ticket (Incidencia o Solicitud)",
        description: "Registra una nueva incidencia de hardware/red o solicita instalación de software en equipos de laboratorio. Valida la existencia del equipo mediante el código de inventario. Lanza advertencia si ya existe un ticket abierto en ese hardware (HU-01, Criterio 7).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CrearTicketInput"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Ticket registrado exitosamente",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Ticket"
                }
              }
            }
          },
          "400": {
            description: "Error de validación Zod o de dominio (DomainError)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/api/tickets/{ticketId}/assign": {
      post: {
        summary: "Asignarse o reasignar un ticket de soporte",
        description: "Asigna el ticket al técnico solicitante. Si el ticket ya tiene técnico, se bloquea la operación para técnicos comunes y solo se permite reasignar al rol Administrador (HU-03 Clarify #5).",
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Ticket asignado exitosamente",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse"
                }
              }
            }
          }
        }
      }
    },
    "/api/tickets/{ticketId}/status": {
      post: {
        summary: "Cambiar el estado de un ticket",
        description: "Transiciona el ciclo de vida del ticket de soporte. Si se cambia a 'resuelto', se exige un comentario de cierre. Si es incidencia de hardware, actualiza automáticamente el estado del equipo a operativo (Clarify #1). Si es software, lo añade al inventario del PC (Clarify #7).",
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nuevoEstado: {
                    type: "string",
                    enum: ["en_proceso", "resuelto"]
                  },
                  comentarioCierre: {
                    type: "string",
                    minLength: 5,
                    example: "Se reemplazó la fuente de alimentación dañada del CPU."
                  }
                },
                required: ["nuevoEstado"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Estado actualizado y efectos aplicados",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse"
                }
              }
            }
          }
        }
      }
    },
    "/api/tickets/{ticketId}/comments": {
      post: {
        summary: "Agregar comentario de seguimiento",
        description: "Permite al docente que reportó o al técnico asignado escribir comentarios para actualizar el avance. Bloqueado si el ticket ya está resuelto (HU-07, Criterio 2).",
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  contenido: {
                    type: "string",
                    minLength: 2,
                    example: "El equipo sigue dando pantalla azul ocasionalmente."
                  }
                },
                required: ["contenido"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Comentario guardado",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse"
                }
              }
            }
          }
        }
      }
    },
    "/api/admin/software": {
      post: {
        summary: "Registrar software en el catálogo",
        description: "Añade un programa al catálogo con nombre único, tipo de licencia y versión. Solo accesible para administradores (HU-01).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Software"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Software registrado"
          }
        }
      }
    },
    "/api/admin/software/{id}": {
      delete: {
        summary: "Eliminar software del catálogo",
        description: "Elimina físicamente el software del sistema. Se bloquea con error de dominio si el software está instalado en algún equipo o referenciado en un ticket de soporte técnico (HU-03).",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Software eliminado"
          },
          "400": {
            description: "Eliminación bloqueada por relaciones activas"
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Ticket: {
        type: "object",
        properties: {
          id: { type: "string" },
          tipo: { type: "string", enum: ["incidencia", "solicitud"] },
          categoria: { type: "string", enum: ["hardware", "software_licencia", "software_general", "red"] },
          descripcion: { type: "string" },
          estado: { type: "string", enum: ["pendiente", "en_proceso", "resuelto"] },
          fechaCreacion: { type: "string", format: "date-time" },
          equipoId: { type: "string" },
          usuarioReportaId: { type: "string" },
          tecnicoAsignadoId: { type: "string", nullable: true }
        }
      },
      CrearTicketInput: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["incidencia", "solicitud"] },
          categoria: { type: "string", enum: ["hardware", "software_licencia", "software_general", "red"] },
          descripcion: { type: "string", minLength: 10, maxLength: 500 },
          equipoId: { type: "string", description: "Código de inventario del equipo (ej. LAB1-PC-001)" },
          softwareId: { type: "string", description: "Opcional. ID de software del catálogo si es solicitud" },
          softwareTexto: { type: "string", description: "Opcional. Nombre de software en texto libre" },
          fechaLimite: { type: "string", format: "date-time", description: "Opcional. Plazo sugerido por el docente" }
        },
        required: ["tipo", "categoria", "descripcion", "equipoId"]
      },
      Software: {
        type: "object",
        properties: {
          id: { type: "string" },
          nombre: { type: "string", example: "SPSS Statistics" },
          tipo: { type: "string", enum: ["licenciado", "gratuito"] },
          version: { type: "string", example: "v29.0" }
        },
        required: ["nombre", "tipo"]
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
          warning: { type: "string", nullable: true }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Error de validación o de dominio." }
        }
      }
    }
  }
};

export async function GET() {
  return NextResponse.json(openApiSpec);
}
