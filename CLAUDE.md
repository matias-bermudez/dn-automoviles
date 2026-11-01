# DN Automóviles — web

Web para **DN Automóviles** (compra-venta de autos usados, Las Piedras, Canelones). Es una **propuesta**: el cliente todavía no la vio ni la pagó. La idea es tenerla publicada y mandársela para ver si le interesa.

- Repo: https://github.com/matias-bermudez/dn-automoviles (tiene que ser **público**: GitHub Pages en plan free no publica repos privados)
- Web: https://matias-bermudez.github.io/dn-automoviles/
- Seguimiento: issues del repo. Los commits cierran issues con `Closes #N`.

## Stack

Sitio estático generado por `scripts/generar.js` (Node 18+, sin dependencias) → `_site/` (no se commitea).
GitHub Actions (`.github/workflows/publicar.yml`) lo corre y publica en Pages en cada push a `main` y cada 15 min
(el programado solo publica si cambiaron los autos: compara un hash con `estado.json` de la web publicada).

Base de datos: **Supabase gratis**, solo como trastienda (autos, fotos, login del panel `/admin/`).
La web pública nunca lee Supabase en vivo: el generador baja autos y fotos y arma todo estático.
Sin `supabaseUrl`/`supabaseKey` en config.js usa `js/autos.js` (ejemplos). Esquema: `supabase/schema.sql`
(solo emails en la tabla `admins` pueden escribir). Ejemplos opcionales: `supabase/ejemplos.sql`.
Fotos: el panel sube `autos/<uuid>.jpg` (1600px) y `autos/<uuid>_m.jpg` (640px, para tarjetas).
Límites del plan gratis: 2 proyectos activos por cuenta; pausa a los 7 días sin uso (el cron lo evita).

Probar en local: `node scripts/generar.js --local && python3 -m http.server 8791 -d _site` → http://localhost:8791
(el 8765 lo usa otro proyecto de Matías).

| Archivo | Qué es |
|---|---|
| `js/config.js` | **Número de WhatsApp**, dirección, horario, zonas, TikTok, URL del sitio e interruptor `indexar` |
| `js/autos.js` | **Stock**. Un objeto por auto. Fotos en `img/autos/<id>/`. El generador valida ids, campos y que las fotos existan |
| `src/*.html` | Plantillas: `{{ dato }}` y `{{> parcial }}` (parciales en `src/_partials/`) |
| `scripts/generar.js` | Arma cada página, una por auto en `/autos/<id>/`, JSON-LD, sitemap.xml y robots.txt |
| `js/common.js` | Helpers compartidos entre navegador y generador (tarjetas, siluetas, links de WhatsApp) |
| `js/stock.js`, `detalle.js`, `vende.js` | Lo interactivo: filtros del stock, galería, formulario |
| `src/admin.html`, `js/admin.js` | Panel del dueño (supabase-js 2.45.4 desde jsdelivr) |
| `supabase/` | `schema.sql` (tablas, permisos, bucket) y `ejemplos.sql` |
| `css/styles.css`, `fonts/` | Estilos (tokens en `:root`) y fuentes alojadas (Archivo + Cinzel, OFL) |
| `diseno/` | Diseño original (Claude Design) y sus páginas desempaquetadas, de referencia |

URLs: `/`, `/autos/`, `/autos/<id>/`, `/vende-tu-auto/` (acepta `?objetivo=permutar&auto=<id>`), `404.html`.

## WhatsApp

No hay backend: todos los botones son links `https://wa.me/<numero>?text=...` con el mensaje armado.
**Ahora apunta al número de prueba de Matías (091 969 322).** El de DN es 098 603 518 (59898603518).

## SEO

- Título, descripción, canonical y og:image propios por página; h1 único con marca + modelo + año en cada auto.
- JSON-LD: `AutoDealer` + `WebSite` en el inicio, `Car` + `Offer` + `BreadcrumbList` en cada auto.
- `indexar: false` en config.js → todas las páginas llevan `noindex`. Se prende recién cuando DN acepte.
- Lo que más pesa para búsquedas locales está fuera del código: Google Business Profile, Search Console y dominio propio (issue #9).

## Verificación visual

Capturas con Playwright (no está instalado acá, se usa el de otro proyecto):
`require('/Users/matibermudez/Proyectos/TapStore-listas/node_modules/playwright')` con `devices['iPhone 13']` para mobile.
Chrome headless solo (`--screenshot`) no sirve para mobile: en Mac no baja de ~500px de ancho.

## Registro

- 2026-10-31: proyecto creado a partir del diseño. 4 páginas, responsive, publicado (issues #1–#7).
- 2026-10-31: Matías puso el repo privado → Pages se apagó (404). Se volvió a público.
- 2026-10-31: SEO (#10): generador estático, una página por auto, JSON-LD, sitemap, fuentes propias, deploy por Actions.
- 2026-10-31: #8 cerrado (Matías probó los mensajes en laptop y 2 celulares).
- 2026-10-31: #11 base de datos + panel con Supabase (misma arquitectura que KM39). Falta conectar el proyecto.
- Pendiente: #11 (conectar Supabase) y #9 (datos reales + lanzamiento SEO).
