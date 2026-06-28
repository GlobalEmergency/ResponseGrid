# Casos de uso capturados de REDH — backlog de features (ResponseGrid)

> Origen: análisis de **REDH (Red de Ayuda Hospitalaria)** — plataforma de coordinación de emergencias del sector salud desplegada para el sismo de Venezuela (Caracas/La Guaira/Miranda). Cada feature es un **entregable independiente y abordable por separado**, agrupado por dominio.
>
> Plantilla común de cada ficha: **Origen (qué hace REDH) · Problema/valor · Propuesta (DDD + API + Atomic + encaje con ResponseGrid) · Alcance (MVP/futuro) · Dependencias · Privacidad/GDPR · Esfuerzo · Decisiones abiertas**.

## Dominio 1 — Personas
| # | Feature | Resumen | Prioridad | Estado |
|---|---------|---------|-----------|--------|
| [02](02-necesidades-nominales-beneficiario.md) | **Necesidades nominales (beneficiario concreto)** | Necesidad ligada a una persona albergada y su medicación, con privacidad | 🟡 Media | ⏳ Pendiente |

## Dominio 2 — Vertical sanitario
| # | Feature | Resumen | Prioridad | Estado |
|---|---------|---------|-----------|--------|
| [04](04-plantilla-y-categorias-sanitarias.md) | **Plantilla y categorías sanitarias** | Plantilla "Sismo/Sanitario" con categorías médicas (medicamentos, equipos, personal) y "qué NO llevar" sanitario | 🔴 Alta | ✅ Hecho |
| [05](05-personal-como-necesidad-y-voluntarios.md) | **Personal como necesidad ↔ voluntarios** | Una necesidad de "personal con skill X" se casa con el roster de voluntarios | 🟡 Media | ✅ Hecho |

## Dominio 3 — Núcleo de necesidades y ofertas
| # | Feature | Resumen | Prioridad | Estado |
|---|---------|---------|-----------|--------|
| [06](06-caducidad-frescura-necesidades.md) | **Caducidad / frescura de necesidades** | Vigencia (p. ej. 48 h), aviso "verifica antes de actuar" y auto-archivado | 🔴 Alta | ✅ Hecho |
| [07](07-oferta-compromiso-entrega.md) | **Oferta como compromiso de entrega** | La oferta evoluciona a "promesa" con fecha/método de entrega y seguimiento | 🟡 Media | ⏳ Pendiente |
| [14](14-destinatarios-finales.md) | **Destinatarios finales (ficha · peticiones 1‑a‑N · recepciones)** | Receptor final genérico con tipo extensible (empresa/organización/particular/hospital…); vertical sanitario como primer caso. EPIC #59 | 🔴 Alta | ✅ Hecho |

## Dominio 4 — Mapa y geolocalización
| # | Feature | Resumen | Prioridad | Estado |
|---|---------|---------|-----------|--------|
| [08](08-cercania-y-rutas.md) | **Cercanía y rutas** | Ordenar puntos/necesidades por distancia al usuario (`/nearby` ✅) + enlace a ruta/isócrona ⏳ | 🟡 Media | ⏳ Parcial |
| [09](09-privacidad-de-ubicacion.md) | **Privacidad de ubicación** | Coordenadas aproximadas en puntos sensibles, "no publicamos tu ubicación", "verifica por teléfono" | 🔴 Alta | ✅ Hecho |
| [15](15-reporte-validez-de-puntos.md) | **Reporte ciudadano de validez de puntos** | El usuario marca un punto como cerrado/inexistente/mudado/desactualizado; tras N reportes se marca "dudoso" (sigue visible) y coordinación confirma o descarta. EPIC #120 | 🟡 Media | ⏳ Pendiente |

## Dominio 5 — Plataforma y acceso
| # | Feature | Resumen | Prioridad | Estado |
|---|---------|---------|-----------|--------|
| [10](10-cola-offline-real.md) | **Cola offline real (IndexedDB + sync)** | Enviar formularios sin conexión y sincronizar al volver la señal (completa la PWA) | 🟡 Media | ⏳ Pendiente |
| [11](11-directorio-servicios-gratis.md) | **Directorio de servicios gratis** | Jornadas/exámenes/servicios gratuitos validados, filtrables por ciudad/cercanía | 🟢 Baja | ⏳ Pendiente |
| [12](12-cta-emergencia-nacional.md) | **CTA de emergencia nacional** | Número de emergencia por país/emergencia siempre visible (banner + llamar) | 🟢 Baja | ⏳ Pendiente |
| [13](13-roles-permisos-y-autenticacion.md) | **Roles, permisos y autenticación** | Rediseño fundacional de autorización: principal/permiso/rol/grant + jerarquía de scopes, delegación con atenuación, grupos/managers, API keys | 🔴 Alta | ✅ Hecho |

---

**Orden sugerido de abordaje:** 04 (plantilla sanitaria), 05 (personal↔voluntarios), 06 (caducidad), 09 (privacidad de ubicación), 13 (roles/permisos) y 14 (destinatarios finales) ya están implementados ✅. Próximos de alto valor: 07 (oferta-compromiso) y la parte de rutas/isócronas de 08 (la cercanía puntual ya está vía `/nearby`).
