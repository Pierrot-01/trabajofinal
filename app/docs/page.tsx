"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DocsPage() {
  useEffect(() => {
    // Cargar estilos de Swagger UI
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css";
    document.head.appendChild(link);

    // Cargar script de Swagger UI
    const script = document.createElement("script");
    script.src = "https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js";
    script.async = true;
    script.onload = () => {
      // Inicializar Swagger UI cargando nuestro endpoint /api/openapi
      // @ts-ignore
      window.SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          // @ts-ignore
          window.SwaggerUIBundle.presets.apis,
          // @ts-ignore
          window.SwaggerUIBundle.presets.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.head.removeChild(link);
        document.body.removeChild(script);
      } catch (e) {
        // Ignorar si ya se desmontaron
      }
    };
  }, []);

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-6">
      <div className="max-w-7xl mx-auto bg-slate-900 rounded-lg shadow-2xl overflow-hidden border border-slate-800 p-6">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-400">
              Documentación Interactiva de la API (OpenAPI 3.0)
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Especificación estructurada (Open Spec) de los endpoints de la EPIS-UNSCH.
            </p>
          </div>
          <Link
            href="/tickets"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-md transition border border-slate-700"
          >
            ← Volver al Panel
          </Link>
        </div>

        {/* Contenedor de Swagger UI con estilos neutrales */}
        <div className="bg-slate-50 rounded-lg shadow-inner overflow-hidden">
          <div id="swagger-ui" className="p-4" />
        </div>
      </div>
    </div>
  );
}
