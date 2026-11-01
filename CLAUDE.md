# DN Automóviles — web

Web para **DN Automóviles** (compra-venta de autos usados, Las Piedras, Canelones). Es una **propuesta**: el cliente todavía no la vio ni la pagó. La idea es tenerla publicada y mandársela para ver si le interesa.

- Repo: https://github.com/matias-bermudez/dn-automoviles (público, lo pide GitHub Pages en plan free)
- Web: https://matias-bermudez.github.io/dn-automoviles/
- Seguimiento: issues del repo. Los commits cierran issues con `Closes #N`.

## Stack

HTML + CSS + JS sin build ni dependencias. Se publica tal cual con GitHub Pages (rama `main`, raíz).
Para probar en local: `python3 -m http.server 8000` y abrir http://localhost:8000 (también funciona abriendo el .html con doble clic).

| Archivo | Qué es |
|---|---|
| `index.html` | Inicio |
| `autos.html` | Stock con filtros (tipo, búsqueda, orden). Los filtros quedan en la URL (`?tipo=camioneta`) |
| `auto.html?id=<id>` | Detalle de un auto |
| `vende.html` | Formulario "Vendé tu auto" → arma el mensaje y abre WhatsApp. Acepta `?objetivo=permutar&auto=<id>` |
| `js/config.js` | **Número de WhatsApp**, dirección, horario, zonas, TikTok. Si un campo está vacío no se muestra |
| `js/autos.js` | **Stock**. Un objeto por auto. Las fotos van en `img/autos/<id>/` |
| `js/common.js` | Helpers compartidos (links de WhatsApp, tarjetas, siluetas, menú mobile) |
| `css/styles.css` | Todos los estilos. Tokens de color en `:root` |
| `diseno/` | Diseño original (Claude Design) y sus páginas desempaquetadas, de referencia |

## Formularios / WhatsApp

No hay backend: todos los botones arman un link `https://wa.me/<numero>?text=...` y abren WhatsApp con el mensaje listo.
**Ahora apunta al número de prueba de Matías (091 969 322).** El de DN es 098 603 518 (59898603518).

## Pendiente antes de mandar al cliente

- [ ] Cambiar `whatsapp` y `whatsappLabel` en `js/config.js` al número de DN
- [ ] Dirección, horario y zonas reales en `js/config.js`
- [ ] Stock real con fotos (hoy son 6 autos de ejemplo del diseño)
- [ ] Al lanzar de verdad: sacar `<meta name="robots" content="noindex">` de los 4 HTML

## Registro

- 2026-10-31: proyecto creado a partir del diseño. Sitio estático completo, publicado en GitHub Pages.
