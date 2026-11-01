// Panel del dueño (/admin/): login, lista de autos, alta/edición/baja y fotos.
// Los permisos los pone supabase/schema.sql: solo los emails de la tabla admins pueden escribir.
// La web pública no lee de acá en vivo: scripts/generar.js la regenera cada 15 minutos si hubo cambios.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const C = window.DN_CONFIG;
const DN = window.DN;
const BUCKET = 'fotos';
// Base compartida: esta web solo ve y edita los autos de su automotora.
const CONCESIONARIA = C.concesionaria;
const $ = (s) => document.querySelector(s);
const esc = DN.esc;

const form = $('#f-auto');
let sb;
let autos = [];
let filtro = 'todos';
// Editor: auto que se edita (null = nuevo), fotos actuales (rutas en el bucket),
// las subidas en esta edición (se borran si se cancela) y las quitadas (se borran al guardar).
let actual = null;
let fotos = [];
let nuevas = [];
let quitadas = [];
let subiendo = 0;

if (!C.supabaseUrl || !C.supabaseKey) {
  $('#cargando').hidden = true;
  $('#sin-config').hidden = false;
} else {
  sb = createClient(C.supabaseUrl, C.supabaseKey);
  iniciar();
}

async function iniciar() {
  const { data } = await sb.auth.getSession();
  $('#cargando').hidden = true;
  if (data.session) await entrar();
  else vista('login');
}

// GitHub Pages deja que el navegador guarde cada página 10 minutos: desde el panel,
// los links a la web agregan ?v=<hora> para abrir siempre lo recién publicado.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-fresco]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  url.searchParams.set('v', Date.now());
  a.href = url.toString();
});

function vista(nombre) {
  for (const v of ['login', 'lista', 'editor', 'negocio']) $('#v-' + v).hidden = v !== nombre;
  $('#admin-nav').hidden = nombre === 'login';
  window.scrollTo(0, 0);
}

function aviso(texto) {
  const t = $('#toast');
  t.textContent = texto;
  t.hidden = false;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => { t.hidden = true; }, 5000);
}

function error(el, texto) {
  el.textContent = texto || '';
  el.hidden = !texto;
}

// ---- Login ----

$('#f-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  error($('#login-error'));
  const { error: err } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
  if (err) return error($('#login-error'), 'Email o contraseña incorrectos.');
  await entrar();
});

async function entrar() {
  const { data: esAdmin } = await sb.rpc('puede_editar', { c: CONCESIONARIA });
  if (!esAdmin) {
    await sb.auth.signOut();
    vista('login');
    return error($('#login-error'), 'Este usuario no tiene permiso para editar esta automotora. Hay que agregarlo en la tabla admins de Supabase.');
  }
  await cargarLista();
}

$('#salir').addEventListener('click', async () => {
  await sb.auth.signOut();
  vista('login');
});

// ---- Lista ----

async function cargarLista() {
  const [{ data, error: err }] = await Promise.all([
    sb.from('autos').select('*').eq('concesionaria', CONCESIONARIA).order('created_at', { ascending: false }),
    leerPublicacion()
  ]);
  if (err) return aviso('No se pudo cargar la lista: ' + err.message);
  autos = data;
  pintarLista();
  vista('lista');
}

// Cuándo se generó la web publicada (estado.json lo escribe scripts/generar.js).
// Un auto modificado después de eso todavía no se ve en la web.
let publicadoEn = null;
async function leerPublicacion() {
  try {
    const r = await fetch(C.sitio + 'estado.json?t=' + Date.now(), { cache: 'no-store' });
    publicadoEn = r.ok ? new Date((await r.json()).generado) : null;
  } catch {
    publicadoEn = null;
  }
}
const pendiente = (a) => publicadoEn && new Date(a.updated_at) > publicadoEn;

// Mientras haya cambios sin publicar, se vuelve a mirar cada 20 segundos.
let revision;
function revisarPublicacion() {
  clearTimeout(revision);
  if (!autos.some(pendiente)) return;
  revision = setTimeout(async () => {
    await leerPublicacion();
    if (!$('#v-lista').hidden) pintarLista();
    else revisarPublicacion();
  }, 20000);
}

function urlFoto(ruta, chica) {
  return sb.storage.from(BUCKET).getPublicUrl(chica ? ruta.replace(/\.jpg$/, '_m.jpg') : ruta).data.publicUrl;
}

function pintarLista() {
  const lista = autos.filter((a) => filtro === 'todos' || (filtro === 'oculto' ? !a.publicado : a.estado === filtro));
  $('#lista').innerHTML = lista.map((a) => {
    const media = a.fotos.length
      ? `<img class="media-fill" src="${esc(urlFoto(a.fotos[0], true))}" alt="" loading="lazy">`
      : DN.silueta({ tipo: a.tipo });
    const chips = [
      pendiente(a) && '<span class="chip chip--warn">Publicándose en la web…</span>',
      a.estado === 'reservado' && '<span class="chip chip--warn">Reservado</span>',
      a.estado === 'vendido' && '<span class="chip">Vendido</span>',
      a.estado === 'disponible' && '<span class="chip chip--ok">Disponible</span>',
      !a.publicado && '<span class="chip">Oculto</span>',
      a.destacado && '<span class="chip">En el inicio</span>',
      !a.fotos.length && '<span class="chip chip--warn">Sin fotos</span>'
    ].filter(Boolean).join('');
    return `<button type="button" class="admin-item" data-id="${a.id}">
      <span class="admin-item__media">${media}</span>
      <span class="admin-item__txt">
        <strong>${esc(a.marca + ' ' + a.modelo + ' ' + a.anio)}</strong>
        <span>${DN.precio(a)} · ${DN.miles(a.km)} km</span>
        <span class="chips">${chips}</span>
      </span></button>`;
  }).join('') || '<p class="admin-nota">No hay autos acá todavía.</p>';
  revisarPublicacion();
}

$('#filtro').addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]');
  if (!b) return;
  filtro = b.dataset.f;
  document.querySelectorAll('#filtro [data-f]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  pintarLista();
});

$('#lista').addEventListener('click', (e) => {
  const b = e.target.closest('.admin-item');
  if (b) abrir(autos.find((a) => String(a.id) === b.dataset.id));
});

$('#nuevo').addEventListener('click', () => abrir(null));

// ---- Datos del negocio ----
// Se guardan en la tabla `negocios`; al publicar pisan a config.js en toda la web.

const CAMPOS_NEGOCIO = ['direccion', 'horario', 'zonas', 'tiktok'];
const fNegocio = $('#f-negocio');

$('#abrir-negocio').addEventListener('click', async () => {
  error($('#neg-error'));
  const { data } = await sb.from('negocios').select('*').eq('concesionaria', CONCESIONARIA).maybeSingle();
  // Sin fila todavía: se muestra lo que hoy publica la web (config.js).
  fNegocio.whatsapp.value = (data && data.telefono) || C.whatsappLabel || '';
  for (const k of CAMPOS_NEGOCIO) fNegocio[k].value = (data ? data[k] : C[k]) || '';
  vista('negocio');
});

document.querySelectorAll('[data-volver]').forEach((b) => b.addEventListener('click', () => vista('lista')));

// "095 407 252", "+598 95 407 252" o "2303 6119" → { whatsapp: '59895407252', telefono: '095 407 252' }.
function telefonoUY(texto) {
  let d = texto.replace(/\D/g, '');
  if (d.startsWith('598')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  if (!/^[0-9]{8}$/.test(d)) return null;
  const telefono = d.startsWith('9') ? `0${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` : `${d.slice(0, 4)} ${d.slice(4)}`;
  return { whatsapp: '598' + d, telefono };
}

fNegocio.addEventListener('submit', async (e) => {
  e.preventDefault();
  error($('#neg-error'));
  const tel = telefonoUY(fNegocio.whatsapp.value);
  if (!tel) return error($('#neg-error'), 'El WhatsApp tiene que ser un número de Uruguay, por ejemplo 095 407 252.');
  const fila = { concesionaria: CONCESIONARIA, ...tel };
  for (const k of CAMPOS_NEGOCIO) fila[k] = fNegocio[k].value.trim().replace(/^@/, '') || null;
  $('#guardar-negocio').disabled = true;
  const { error: err } = await sb.from('negocios').upsert(fila, { onConflict: 'concesionaria' });
  $('#guardar-negocio').disabled = false;
  if (err) return error($('#neg-error'), 'No se pudo guardar: ' + err.message);
  Object.assign(C, { whatsapp: tel.whatsapp, whatsappLabel: tel.telefono });
  aviso('Guardado. En un par de minutos se actualiza en toda la web.');
  vista('lista');
});

// ---- Editor ----

const BOOLEANOS = ['publicado', 'destacado', 'acepta_permuta'];
const TRIESTADO = ['patente_al_dia', 'libre_de_multas'];
const NUMEROS = ['anio', 'puertas', 'duenos'];
// Se escriben como en Uruguay ("64.000", "U$S 14.500"): se toman solo los dígitos.
const MONTOS = ['km', 'precio'];

function abrir(a) {
  actual = a;
  form.reset();
  error($('#ed-error'));
  fotos = a ? a.fotos.slice() : [];
  nuevas = [];
  quitadas = [];
  if (a) {
    for (const el of form.elements) {
      if (!el.name || !(el.name in a)) continue;
      const v = a[el.name];
      if (el.type === 'checkbox') el.checked = !!v;
      else if (MONTOS.includes(el.name)) el.value = v ? DN.miles(v) : '';
      else el.value = v === null || v === undefined ? '' : String(v);
    }
  }
  $('#ed-titulo').textContent = a ? `${a.marca} ${a.modelo} ${a.anio}` : 'Cargar auto';
  $('#ed-ver').hidden = !a || !a.publicado || a.estado === 'vendido';
  if (a) $('#ed-ver').href = C.sitio + 'autos/' + a.slug + '/';
  $('#borrar').hidden = !a;
  pintarFotos();
  vista('editor');
}

function datosDelForm() {
  const fila = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (BOOLEANOS.includes(el.name)) fila[el.name] = el.checked;
    else if (TRIESTADO.includes(el.name)) fila[el.name] = el.value === '' ? null : el.value === 'true';
    else if (NUMEROS.includes(el.name)) fila[el.name] = el.value === '' ? null : Math.round(Number(el.value));
    else if (MONTOS.includes(el.name)) fila[el.name] = el.value.replace(/\D/g, '') ? Number(el.value.replace(/\D/g, '')) : null;
    else fila[el.name] = el.value.trim() || null;
  }
  if (fila.etiqueta) fila.etiqueta = fila.etiqueta.toUpperCase();
  if (fila.km === null) fila.km = 0;
  fila.fotos = fotos;
  return fila;
}

function slugDe(f) {
  return `${f.marca} ${f.modelo} ${f.anio}`.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  error($('#ed-error'));
  if (subiendo) return error($('#ed-error'), 'Esperá a que terminen de subir las fotos.');
  const fila = datosDelForm();
  const falta = ['marca', 'modelo', 'anio'].filter((k) => !fila[k]);
  if (falta.length) return error($('#ed-error'), 'Completá: ' + falta.join(', ') + '.');

  $('#guardar').disabled = true;
  // El slug es la URL del auto (/autos/<slug>/): marca-modelo-año. Se mantiene mientras no cambien
  // esos datos; si cambian, se actualiza. Si ya existe otro igual, se le agrega -2, -3...
  const base = slugDe(fila);
  const mismo = actual && (actual.slug === base || actual.slug.startsWith(base + '-'));
  let err;
  for (let n = 1; n < 20; n++) {
    const slug = mismo ? actual.slug : n === 1 ? base : `${base}-${n}`;
    ({ error: err } = actual
      ? await sb.from('autos').update({ ...fila, slug }).eq('id', actual.id)
      : await sb.from('autos').insert({ ...fila, slug, concesionaria: CONCESIONARIA }));
    if (!err || err.code !== '23505' || mismo) break;
  }
  $('#guardar').disabled = false;
  if (err) return error($('#ed-error'), 'No se pudo guardar: ' + err.message);

  await borrarArchivos(quitadas);
  nuevas = [];
  aviso('Guardado. En un par de minutos se ve en la web.');
  await cargarLista();
});

$('#cancelar').addEventListener('click', cancelar);
$('#volver').addEventListener('click', cancelar);

async function cancelar() {
  // Las fotos subidas en esta edición no quedaron en ningún auto: se borran.
  await borrarArchivos(nuevas);
  nuevas = [];
  vista('lista');
}

$('#borrar').addEventListener('click', async () => {
  if (!confirm(`¿Borrar ${actual.marca} ${actual.modelo} ${actual.anio}? No se puede deshacer.\n\nSi se vendió, mejor cambiá el estado a "Vendido".`)) return;
  const { error: err } = await sb.from('autos').delete().eq('id', actual.id);
  if (err) return error($('#ed-error'), 'No se pudo borrar: ' + err.message);
  await borrarArchivos([...actual.fotos, ...nuevas]);
  aviso('Auto borrado.');
  await cargarLista();
});

// ---- Fotos ----

function pintarFotos() {
  $('#fotos').innerHTML = fotos.map((ruta, i) => `
    <div class="foto">
      <img src="${esc(urlFoto(ruta, true))}" alt="Foto ${i + 1}">
      ${i === 0 ? '<span class="foto__portada">PORTADA</span>' : ''}
      <div class="foto__acciones">
        <button type="button" data-accion="izq" data-i="${i}" aria-label="Mover a la izquierda"${i === 0 ? ' disabled' : ''}>←</button>
        <button type="button" data-accion="quitar" data-i="${i}" aria-label="Quitar foto">✕</button>
        <button type="button" data-accion="der" data-i="${i}" aria-label="Mover a la derecha"${i === fotos.length - 1 ? ' disabled' : ''}>→</button>
      </div>
    </div>`).join('');
}

$('#fotos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-accion]');
  if (!b) return;
  const i = Number(b.dataset.i);
  if (b.dataset.accion === 'quitar') quitadas.push(...fotos.splice(i, 1));
  else {
    const j = b.dataset.accion === 'izq' ? i - 1 : i + 1;
    [fotos[i], fotos[j]] = [fotos[j], fotos[i]];
  }
  pintarFotos();
});

// Dos entradas: la galería (varias a la vez) y la cámara del celular (una por vez, se sube al sacarla).
for (const id of ['#f-fotos', '#f-camara']) {
  $(id).addEventListener('change', (e) => {
    const archivos = [...e.target.files];
    e.target.value = '';
    subirFotos(archivos);
  });
}

async function subirFotos(archivos) {
  const estado = $('#subiendo');
  subiendo += archivos.length;
  let hechas = 0;
  for (const archivo of archivos) {
    estado.hidden = false;
    estado.textContent = `Subiendo foto ${++hechas} de ${archivos.length}…`;
    try {
      const ruta = `${CONCESIONARIA}/${crypto.randomUUID()}.jpg`;
      const [grande, chica] = await Promise.all([achicar(archivo, 1600, 0.82), achicar(archivo, 640, 0.78)]);
      for (const [r, blob] of [[ruta, grande], [ruta.replace(/\.jpg$/, '_m.jpg'), chica]]) {
        const { error: err } = await sb.storage.from(BUCKET).upload(r, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (err) throw err;
      }
      fotos.push(ruta);
      nuevas.push(ruta);
      pintarFotos();
    } catch (err) {
      aviso(`No se pudo subir ${archivo.name}: ${err.message || err}`);
    }
    subiendo--;
  }
  estado.hidden = true;
}

// Achica la foto del celular (3–10 MB) a JPG de ~200 KB, respetando la orientación.
async function achicar(archivo, max, calidad) {
  const img = await decodificar(archivo);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', calidad));
  if (!blob) throw new Error('formato de imagen no soportado');
  return blob;
}

// createImageBitmap con orientación no anda en todos los Safari: si falla, se usa un <img>
// (los navegadores ya lo giran según la foto).
async function decodificar(archivo) {
  try {
    return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(archivo);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function borrarArchivos(rutas) {
  if (!rutas.length) return;
  await sb.storage.from(BUCKET).remove(rutas.flatMap((r) => [r, r.replace(/\.jpg$/, '_m.jpg')]));
}
