// Arma el sitio estático en _site/ a partir de src/ y los datos de los autos.
// Cada auto tiene su propia página (/autos/<id>/) con su título, descripción y datos
// estructurados para Google. GitHub Actions lo corre en cada push a main y cada 15 minutos.
//
// Los autos salen de Supabase si está configurado en js/config.js (los carga el dueño desde
// /admin/); si no, de js/autos.js. Con Supabase, las fotos se bajan y se publican junto con la
// web, así las visitas no consumen el plan de Supabase.
//
//   node scripts/generar.js                   → para publicar
//   node scripts/generar.js --local           → para probar: python3 -m http.server 8791 -d _site
//   SOLO_SI_CAMBIO=1 node scripts/generar.js  → no hace nada si los autos no cambiaron desde la última publicación
//
// Sin dependencias, solo Node 18+.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const SRC = path.join(RAIZ, 'src');
const SALIDA = path.join(RAIZ, '_site');
const ESTATICOS = ['css', 'js', 'img', 'fonts'];

// Se cargan los mismos archivos que usa el navegador.
const ctx = vm.createContext({ window: {} });
const correr = (f) => vm.runInContext(fs.readFileSync(path.join(RAIZ, f), 'utf8'), ctx, { filename: f });
correr('js/config.js');
const C = ctx.window.DN_CONFIG;
const SUPABASE = !!(C.supabaseUrl && C.supabaseKey);

const SITIO = C.sitio.replace(/\/?$/, '/');
const BASE = process.argv.includes('--local') ? '/' : new URL(SITIO).pathname;
const HOY = new Date().toISOString().slice(0, 10);
const TIPOS = ['auto', 'camioneta', 'utilitario'];

let DN, AUTOS, esc;

async function main() {
  // ---- Datos ----
  let filas = null;
  if (SUPABASE) {
    filas = await leerSupabase();
    ctx.window.DN_AUTOS = filas.map(deFila).filter(Boolean);
  } else {
    correr('js/autos.js');
  }
  correr('js/common.js');
  DN = ctx.window.DN;
  esc = DN.esc;
  if (!SUPABASE) validar(DN.autos);

  const hash = crypto.createHash('sha256').update(JSON.stringify(filas || DN.autos)).digest('hex').slice(0, 16);
  if (process.env.SOLO_SI_CAMBIO) {
    const anterior = await fetch(SITIO + 'estado.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (anterior && anterior.hash === hash) {
      console.log('Los autos no cambiaron desde la última publicación, no hay nada para publicar.');
      salida('cambio', 'false');
      return;
    }
  }

  fs.rmSync(SALIDA, { recursive: true, force: true });
  for (const dir of ESTATICOS) fs.cpSync(path.join(RAIZ, dir), path.join(SALIDA, dir), { recursive: true });
  if (SUPABASE) {
    await bajarFotos(DN.autos);
    // El navegador (filtros del stock, galería, formulario) usa estos mismos datos.
    escribir('js/autos.js', '// Generado por scripts/generar.js desde Supabase.\nwindow.DN_AUTOS = ' +
      JSON.stringify(DN.autos.map(({ _fotos, ...a }) => a), null, 1) + ';\n');
  }
  AUTOS = DN.recientes();

  generarPaginas();
  escribir('estado.json', JSON.stringify({ hash, generado: new Date().toISOString(), autos: AUTOS.length }) + '\n');
  salida('cambio', 'true');
  console.log(`Listo: ${AUTOS.length} autos (${SUPABASE ? 'Supabase' : 'js/autos.js'}). indexar=${C.indexar} → _site/`);
}

// ---- Supabase ----

async function leerSupabase() {
  // Las claves nuevas (sb_publishable_...) van solo en apikey; las viejas (anon, JWT) también en Authorization.
  const headers = { apikey: C.supabaseKey };
  if (!C.supabaseKey.startsWith('sb_')) headers.Authorization = 'Bearer ' + C.supabaseKey;
  const res = await fetch(`${C.supabaseUrl}/rest/v1/autos?select=*&order=created_at.desc`, { headers });
  if (!res.ok) throw new Error(`Supabase respondió ${res.status}: ${await res.text()}`);
  return res.json();
}

// Fila de la base → mismo formato que js/autos.js. Si a un auto le falta algo, se saltea (no rompe la web).
function deFila(r) {
  const falta = ['slug', 'marca', 'modelo', 'anio', 'combustible', 'transmision'].filter((k) => r[k] === null || r[k] === '');
  if (falta.length || !TIPOS.includes(r.tipo)) {
    console.warn(`Aviso: se saltea el auto ${r.id} (${r.marca} ${r.modelo}), falta: ${falta.join(', ') || 'tipo'}`);
    return null;
  }
  const dir = `img/autos/${r.slug}/`;
  return {
    id: r.slug,
    marca: r.marca, modelo: r.modelo, anio: r.anio, km: r.km, tipo: r.tipo,
    combustible: r.combustible, transmision: r.transmision,
    traccion: r.traccion || null, motor: r.motor || null, color: r.color || null,
    puertas: r.puertas || null, duenos: r.duenos || null,
    precio: r.precio || null,
    etiqueta: r.estado === 'reservado' ? 'RESERVADO' : r.etiqueta || '',
    reservado: r.estado === 'reservado',
    destacado: r.destacado,
    ingreso: r.created_at.slice(0, 10),
    actualizado: r.updated_at.slice(0, 10),
    patenteAlDia: r.patente_al_dia, libreDeMultas: r.libre_de_multas, aceptaPermuta: r.acepta_permuta,
    descripcion: r.descripcion || '',
    fotos: [], miniaturas: [],
    // Rutas en el bucket; bajarFotos() completa fotos/miniaturas con las que se pudieron bajar.
    _fotos: (r.fotos || []).map((p) => ({ p, archivo: dir + path.posix.basename(p) }))
  };
}

async function bajarFotos(autos) {
  const url = (p) => `${C.supabaseUrl}/storage/v1/object/public/fotos/${p.split('/').map(encodeURIComponent).join('/')}`;
  const bajar = async (p, destino) => {
    const res = await fetch(url(p));
    if (!res.ok) return false;
    const f = path.join(SALIDA, destino);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(await res.arrayBuffer()));
    return true;
  };
  const tareas = autos.flatMap((a) => a._fotos.map((f) => async () => {
    const chica = f.archivo.replace(/\.jpg$/, '_m.jpg');
    f.ok = await bajar(f.p, f.archivo);
    f.chica = f.ok && (await bajar(f.p.replace(/\.jpg$/, '_m.jpg'), chica)) ? chica : f.archivo;
    if (!f.ok) console.warn(`Aviso: no se pudo bajar la foto ${f.p} de ${a.id}`);
  }));
  // De a 6 descargas a la vez.
  const cola = tareas.slice();
  await Promise.all(Array.from({ length: 6 }, async () => { while (cola.length) await cola.shift()(); }));
  for (const a of autos) {
    const ok = a._fotos.filter((f) => f.ok);
    a.fotos = ok.map((f) => f.archivo);
    a.miniaturas = ok.map((f) => f.chica);
  }
}

function salida(clave, valor) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${clave}=${valor}\n`);
}

// ---- Plantillas: {{ clave.sub }} y {{> parcial }} ----

const parciales = {};
for (const f of fs.readdirSync(path.join(SRC, '_partials'))) {
  parciales[path.basename(f, '.html')] = fs.readFileSync(path.join(SRC, '_partials', f), 'utf8');
}

function render(tpl, datos) {
  return tpl.replace(/\{\{\s*(>\s*)?([\w.-]+)\s*\}\}/g, (_, parcial, clave) => {
    if (parcial) {
      if (!(clave in parciales)) throw new Error(`No existe el parcial ${clave}`);
      return render(parciales[clave], datos);
    }
    const v = clave.split('.').reduce((o, k) => (o == null ? undefined : o[k]), datos);
    if (v === undefined) throw new Error(`Falta el dato {{${clave}}}`);
    return String(v);
  });
}

function jsonld(...objs) {
  return objs.map((o) => '<script type="application/ld+json">' +
    JSON.stringify(o).replace(/</g, '\\u003c') + '</script>').join('\n');
}

// ?v=<hash del archivo>: cuando cambia un css/js, el navegador no usa la copia vieja (Pages cachea 10 min).
const versiones = {};
function v(rel) {
  versiones[rel] = versiones[rel] || crypto.createHash('sha1').update(fs.readFileSync(path.join(SALIDA, rel))).digest('hex').slice(0, 8);
  return versiones[rel];
}

function scripts(raiz, nombres) {
  return nombres.map((n) => `<script src="${raiz}js/${n}.js?v=${v(`js/${n}.js`)}" defer></script>`).join('\n');
}

// ruta: '' (inicio), 'autos/', 'autos/<id>/', '404.html'...
function pagina(plantilla, ruta, datos) {
  const prof = ruta.endsWith('/') ? ruta.split('/').length - 1 : 0;
  // El 404 se sirve en cualquier URL, por eso usa rutas absolutas.
  const raiz = ruta === '404.html' ? BASE : prof ? '../'.repeat(prof) : './';
  const generico = esc(DN.waUrl());
  const d = Object.assign({
    raiz,
    v: { css: v('css/styles.css'), admin: v('js/admin.js') },
    canonical: SITIO + ruta,
    robots: C.indexar ? '<meta name="robots" content="index, follow, max-image-preview:large">' : '<meta name="robots" content="noindex">',
    ogTipo: 'website',
    ogImagen: SITIO + 'img/og.jpg',
    jsonld: '',
    nav: { autos: '', vende: '' },
    wa: { href: generico, label: esc(C.whatsappLabel) },
    fab: generico,
    anio: new Date().getFullYear(),
    negocio: {
      direccion: C.direccion ? `<span>${esc(C.direccion)}</span>` : '',
      horario: C.horario ? `<span>${esc(C.horario)}</span>` : '',
      zonas: C.zonas ? `<span class="delivery__zonas">Zonas de entrega: ${esc(C.zonas)}</span>` : '',
      tiktok: C.tiktok ? `<a href="https://www.tiktok.com/@${esc(C.tiktok)}" target="_blank" rel="noopener">TikTok @${esc(C.tiktok)}</a>` : ''
    }
  }, datos);
  d.scripts = scripts(raiz, d.js || ['config', 'autos', 'common']);
  const html = render(fs.readFileSync(path.join(SRC, plantilla), 'utf8'), d);
  escribir(ruta === '' || ruta.endsWith('/') ? ruta + 'index.html' : ruta, html);
}

function escribir(rel, contenido) {
  const f = path.join(SALIDA, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, contenido);
}

// ---- Datos estructurados (schema.org) ----

const NEGOCIO_ID = SITIO + '#negocio';
const negocioLd = {
  '@context': 'https://schema.org',
  '@type': 'AutoDealer',
  '@id': NEGOCIO_ID,
  name: 'DN Automóviles',
  description: 'Automotora en Las Piedras, Canelones. Compra, venta y permuta de autos usados, al día o con deuda, con entrega a domicilio.',
  url: SITIO,
  logo: SITIO + 'img/logo.png',
  image: SITIO + 'img/og.jpg',
  telephone: '+' + C.whatsapp,
  address: {
    '@type': 'PostalAddress',
    streetAddress: C.direccion || undefined,
    addressLocality: 'Las Piedras',
    addressRegion: 'Canelones',
    addressCountry: 'UY'
  },
  areaServed: { '@type': 'City', name: 'Las Piedras' },
  openingHours: C.horarioSchema ? C.horarioSchema.split(',').map((h) => h.trim()) : undefined,
  sameAs: C.tiktok ? ['https://www.tiktok.com/@' + C.tiktok] : undefined
};

function migas(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item }))
  };
}

function autoLd(a, url) {
  const fotos = (a.fotos || []).map((f) => SITIO + f);
  return {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${DN.nombre(a)} ${a.anio}`,
    url,
    image: fotos.length ? fotos : undefined,
    description: a.descripcion || undefined,
    brand: { '@type': 'Brand', name: a.marca },
    model: a.modelo,
    vehicleModelDate: String(a.anio),
    itemCondition: 'https://schema.org/UsedCondition',
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: a.km, unitCode: 'KMT' },
    fuelType: a.combustible,
    vehicleTransmission: a.transmision,
    vehicleEngine: a.motor ? { '@type': 'EngineSpecification', name: a.motor } : undefined,
    driveWheelConfiguration: /4x4|awd/i.test(a.traccion || '') ? 'https://schema.org/FourWheelDriveConfiguration' : undefined,
    color: a.color || undefined,
    numberOfDoors: a.puertas || undefined,
    numberOfPreviousOwners: a.duenos || undefined,
    offers: a.precio ? {
      '@type': 'Offer',
      price: a.precio,
      priceCurrency: 'USD',
      availability: a.reservado ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
      url,
      seller: { '@type': 'AutoDealer', '@id': NEGOCIO_ID, name: 'DN Automóviles', url: SITIO }
    } : undefined
  };
}

// ---- Páginas ----

function generarPaginas() {
  // Inicio
  const destacado = AUTOS.find((a) => a.destacado) || AUTOS[0];
  pagina('index.html', '', {
    titulo: 'Autos usados en Las Piedras, Canelones | DN Automóviles',
    descripcion: 'Automotora en Las Piedras, Canelones: autos usados, camionetas y utilitarios. Compramos tu auto al día o con deuda, permutas y entrega a domicilio.',
    jsonld: jsonld(negocioLd, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'DN Automóviles', url: SITIO, inLanguage: 'es-UY' }),
    js: ['common'],
    destacado: destacado ? {
      href: DN.autoUrl(destacado, './'),
      media: DN.media(destacado, 0, { detalle: true, raiz: './', eager: true }),
      clase: destacado.fotos && destacado.fotos.length ? ' has-photo' : '',
      caption: esc(DN.nombre(destacado) + ' · ' + DN.precio(destacado))
    } : { href: './autos/', media: '', clase: '', caption: 'Stock destacado' },
    recientes: AUTOS.slice(0, 3).map((a) => DN.card(a, { compacta: true, raiz: './' })).join('')
  });

  // Stock
  pagina('autos.html', 'autos/', {
    titulo: 'Autos usados en venta en Las Piedras | DN Automóviles',
    descripcion: 'Stock actualizado de autos usados, camionetas y utilitarios en Las Piedras, Canelones. Precios en dólares, permutas y entrega a domicilio.',
    jsonld: jsonld(migas([['Inicio', SITIO], ['Autos disponibles', SITIO + 'autos/']])),
    nav: { autos: ' aria-current="page"', vende: '' },
    js: ['config', 'autos', 'common', 'stock'],
    conteo: AUTOS.length === 1 ? '1 vehículo disponible' : AUTOS.length + ' vehículos disponibles',
    grilla: AUTOS.map((a) => DN.card(a, { raiz: '../' })).join('')
  });

  // Un detalle por auto
  for (const a of AUTOS) generarAuto(a);

  // Vendé tu auto
  pagina('vende.html', 'vende-tu-auto/', {
    titulo: 'Vendé o permutá tu auto, al día o con deuda | DN Automóviles',
    descripcion: 'Compramos autos usados en Las Piedras y Canelones, al día o con deuda. Completá los datos y recibí por WhatsApp una propuesta de compra o permuta.',
    jsonld: jsonld(migas([['Inicio', SITIO], ['Vendé tu auto', SITIO + 'vende-tu-auto/']])),
    nav: { autos: '', vende: ' aria-current="page"' },
    js: ['config', 'autos', 'common', 'vende']
  });

  // 404 (GitHub Pages lo sirve para cualquier URL que no exista, ej. un auto vendido)
  pagina('404.html', '404.html', {
    titulo: 'Página no encontrada | DN Automóviles',
    descripcion: 'La página que buscás no existe. Mirá el stock de autos usados de DN Automóviles en Las Piedras.',
    robots: '<meta name="robots" content="noindex">',
    js: ['common']
  });

  // Panel del dueño
  pagina('admin.html', 'admin/', {
    titulo: 'Panel · DN Automóviles',
    descripcion: 'Panel de administración de DN Automóviles.',
    robots: '<meta name="robots" content="noindex, nofollow">',
    js: ['config', 'common']
  });

  // sitemap.xml y robots.txt
  const urls = [
    [SITIO, HOY, '1.0'],
    [SITIO + 'autos/', HOY, '0.9'],
    ...AUTOS.map((a) => [SITIO + `autos/${a.id}/`, a.actualizado || a.ingreso || HOY, '0.8']),
    [SITIO + 'vende-tu-auto/', HOY, '0.7']
  ];
  escribir('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(([loc, lastmod, prio]) => `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><priority>${prio}</priority></url>`).join('\n') +
    '\n</urlset>\n');
  escribir('robots.txt', `User-agent: *\nAllow: /\nDisallow: ${BASE}admin/\n\nSitemap: ${SITIO}sitemap.xml\n`);
}

function generarAuto(a) {
  const ruta = `autos/${a.id}/`;
  const url = SITIO + ruta;
  const raiz = '../../';
  const nombre = DN.nombre(a);
  const km = DN.miles(a.km) + ' km';
  const fotos = a.fotos || [];
  const chicas = a.miniaturas || fotos;
  const total = fotos.length || DN.VISTAS.length;

  const thumbs = Array.from({ length: total }, (_, i) => {
    const dentro = fotos.length
      ? `<img class="media-fill" src="${esc(raiz + (chicas[i] || fotos[i]))}" alt="" loading="lazy">`
      : DN.VISTAS[i].toUpperCase();
    const label = fotos.length ? `Ver foto ${i + 1}` : `Ver foto: ${DN.VISTAS[i]}`;
    return `<button type="button" class="thumb" data-i="${i}" aria-label="${label}" aria-current="${i === 0}">${dentro}</button>`;
  }).join('');

  const claves = [
    ['KILOMETRAJE', km], ['COMBUSTIBLE', a.combustible], ['TRANSMISIÓN', a.transmision],
    a.traccion ? ['TRACCIÓN', a.traccion] : ['MOTOR', a.motor || '—']
  ].map(([l, v]) => `<div class="keyspec"><span class="keyspec__l">${l}</span><span class="keyspec__v">${esc(v)}</span></div>`).join('');

  const ficha = [
    ['Marca', a.marca], ['Modelo', a.modelo], ['Año', a.anio], ['Kilometraje', km],
    ['Motor', a.motor], ['Combustible', a.combustible], ['Transmisión', a.transmision], ['Tracción', a.traccion],
    ['Color', a.color], ['Puertas', a.puertas], ['Dueños', a.duenos],
    ['Patente', a.patenteAlDia === false ? 'Con deuda' : a.patenteAlDia ? 'Al día' : '']
  ].filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([l, v]) => `<div><dt>${l}</dt><dd>${esc(v)}</dd></div>`).join('');

  const chips = [
    a.reservado && '<span class="chip chip--warn">Reservado</span>',
    a.patenteAlDia === true && '<span class="chip chip--ok">Patente al día</span>',
    a.patenteAlDia === false && '<span class="chip chip--warn">Patente con deuda</span>',
    a.libreDeMultas === true && '<span class="chip chip--ok">Libre de multas</span>',
    a.libreDeMultas === false && '<span class="chip chip--warn">Tiene multas</span>',
    a.aceptaPermuta && '<span class="chip">Acepta permuta</span>'
  ].filter(Boolean).join('') || '<span class="chip">Consultanos</span>';

  // Relacionados: primero los del mismo tipo.
  const otros = AUTOS.filter((o) => o.id !== a.id)
    .sort((x, y) => (y.tipo === a.tipo) - (x.tipo === a.tipo))
    .slice(0, 3)
    .map((o) => `<a class="mini-card" href="${DN.autoUrl(o, raiz)}">` +
      `<div class="mini-card__media">${DN.media(o, 0, { raiz, chica: true })}</div>` +
      `<div class="mini-card__txt"><strong>${esc(DN.nombre(o))}</strong>` +
      `<span>${o.anio} · ${DN.miles(o.km)} km</span><b>${DN.precio(o)}</b></div></a>`).join('');

  const consulta = DN.waUrl('Hola DN Automóviles, me interesa este auto que vi en la web:\n' +
    `*${nombre} ${a.anio}* (${DN.precio(a)})\n` +
    '¿Sigue disponible? Quiero coordinar para verlo.\n' + url);

  pagina('auto.html', ruta, {
    titulo: esc(`${nombre} ${a.anio} · ${DN.precio(a)} | DN Automóviles`),
    descripcion: esc(`${nombre} ${a.anio} en venta en Las Piedras: ${km}, ${a.combustible}, ${a.transmision}. ` +
      `${DN.precio(a)}. Aceptamos permuta y te lo llevamos a domicilio.`),
    ogTipo: 'product',
    ogImagen: fotos.length ? SITIO + fotos[0] : SITIO + 'img/og.jpg',
    jsonld: jsonld(autoLd(a, url), migas([['Inicio', SITIO], ['Autos disponibles', SITIO + 'autos/'], [`${nombre} ${a.anio}`, url]])),
    nav: { autos: ' aria-current="page"', vende: '' },
    js: ['config', 'autos', 'common', 'detalle'],
    fab: esc(consulta),
    consulta: esc(consulta),
    a: {
      id: esc(a.id), nombre: esc(nombre), marca: esc(a.marca), modelo: esc(a.modelo),
      anio: a.anio, precio: DN.precio(a)
    },
    galeria: {
      principal: DN.media(a, 0, { detalle: true, raiz, eager: true, alt: nombre + ', foto 1' }),
      label: fotos.length ? '' : 'FOTO · ' + DN.VISTAS[0].toUpperCase(),
      flare: fotos.length ? '' : '<span class="flare"></span>',
      tag: a.etiqueta ? `<span class="tag">${esc(a.etiqueta)}</span>` : '',
      total,
      thumbs,
      thumbsOcultas: total < 2 ? ' hidden' : ''
    },
    claves,
    ficha,
    textoDescripcion: a.descripcion ? `<h2 class="h3" style="margin-top: 24px">Descripción</h2>\n    <p class="desc">${esc(a.descripcion)}</p>` : '',
    chips,
    relacionados: otros
  });
}

// ---- Validación de js/autos.js: mejor que falle acá y no que se publique roto ----

function validar(autos) {
  const ids = new Set();
  for (const a of autos) {
    const quien = a.id || `${a.marca} ${a.modelo}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.id || '')) throw new Error(`${quien}: el id tiene que ser minúsculas y guiones (ej. toyota-hilux-2018)`);
    if (ids.has(a.id)) throw new Error(`${a.id}: id repetido`);
    ids.add(a.id);
    for (const campo of ['marca', 'modelo', 'anio', 'km', 'combustible', 'transmision']) {
      if (a[campo] === undefined || a[campo] === '') throw new Error(`${a.id}: falta "${campo}"`);
    }
    if (!TIPOS.includes(a.tipo)) throw new Error(`${a.id}: tipo tiene que ser ${TIPOS.join(', ')}`);
    for (const f of a.fotos || []) {
      if (!fs.existsSync(path.join(RAIZ, f))) throw new Error(`${a.id}: no existe la foto ${f}`);
    }
  }
}

main().catch((e) => {
  console.error('Error: ' + e.message);
  process.exit(1);
});
