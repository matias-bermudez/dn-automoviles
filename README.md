# DN Automóviles — web

Sitio de DN Automóviles (Las Piedras, Canelones): stock de autos usados, ficha de cada auto y venta/permuta, todo coordinado por WhatsApp.

**Web:** https://matias-bermudez.github.io/dn-automoviles/

Sitio estático armado por `scripts/generar.js` (Node, sin dependencias). Cada push a `main` lo regenera y publica con GitHub Actions.

- Cambiar número de WhatsApp, dirección u horario: `js/config.js`
- Cargar o sacar autos del stock: `js/autos.js` (fotos en `img/autos/<id>/`)
- Dejar que Google indexe la web: `indexar: true` en `js/config.js`

Probar en local:

```sh
node scripts/generar.js --local
python3 -m http.server 8791 -d _site   # → http://localhost:8791
```
