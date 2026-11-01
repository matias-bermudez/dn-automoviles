# DN Automóviles — web

Sitio de DN Automóviles (Las Piedras, Canelones): stock de autos usados, ficha de cada auto y venta/permuta, todo coordinado por WhatsApp. El dueño carga los autos desde un panel (`/admin/`).

**Web:** https://matias-bermudez.github.io/dn-automoviles/

## Cómo funciona

- La web es estática (GitHub Pages, gratis). `scripts/generar.js` (Node, sin dependencias) arma todas las páginas, una por auto, con SEO.
- Los autos y las fotos viven en [Supabase](https://supabase.com) (plan gratis). La web no lo consulta en vivo: GitHub Actions regenera y publica en cada push, cada vez que se guarda un auto en el panel (aviso desde Supabase) y, como respaldo, cada 15 minutos si hubo cambios.
- Sin Supabase configurado, usa los autos de ejemplo de `js/autos.js`.

## Configuración (`js/config.js`)

- `whatsapp` / `whatsappLabel`: número de todos los botones
- `direccion`, `horario`, `zonas`, `tiktok`: datos del negocio (vacío = no se muestra)
- `supabaseUrl`, `supabaseKey`: conexión a Supabase (la clave pública anon / publishable)
- `sitio`: URL pública con `/` al final
- `indexar`: `true` para que Google indexe la web

## Conectar Supabase (una vez)

1. Proyecto nuevo en supabase.com (Free, región São Paulo).
2. **SQL Editor** → pegar `supabase/schema.sql` → **Run**. Opcional: `supabase/ejemplos.sql` para arrancar con los autos de ejemplo.
3. **Authentication → Users → Add user**: email y contraseña del dueño, con *Auto Confirm User*.
4. En el SQL Editor, darle permiso de edición: `insert into public.admins (email) values ('email-del-dueño');`
5. **Authentication → Sign In / Providers**: desactivar *Allow new users to sign up*.
6. **Project Settings → API Keys**: *Project URL* y la clave pública → `js/config.js`.
7. Publicación al instante (recomendado): seguir los pasos de `supabase/publicar.sql`. Sin eso, los cambios del panel dependen de la revisión programada de GitHub (cada 15 min en teoría, en la práctica se atrasa).

La clave pública puede ir en el código: los permisos de `schema.sql` hacen que la web solo pueda leer autos publicados, y que editar requiera estar logueado con un email de la tabla `admins`.

## Probar en local

```sh
node scripts/generar.js --local
python3 -m http.server 8791 -d _site   # → http://localhost:8791
```
