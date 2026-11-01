// Helpers compartidos. Se usan en el navegador y también en scripts/generar.js,
// que arma las páginas en el servidor con estas mismas funciones.
// Todo se expone en window.DN.
(function () {
  var C = window.DN_CONFIG;
  var AUTOS = window.DN_AUTOS || [];
  var EN_NAVEGADOR = typeof document !== 'undefined';
  // Prefijo relativo hasta la raíz del sitio ('./', '../', '../../'), lo pone el generador en <body data-raiz>.
  var RAIZ = EN_NAVEGADOR && document.body ? document.body.getAttribute('data-raiz') || './' : './';
  var MSG_GENERICO = 'Hola DN Automóviles, te escribo desde la web.';
  var VISTAS = ['Frente', 'Lateral', 'Trasera', 'Interior', 'Motor'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function raiz(r) { return r == null ? RAIZ : r; }
  function miles(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  // moneda: 'USD' (por defecto) o 'UYU'.
  function precio(a) { return a.precio ? (a.moneda === 'UYU' ? '$ ' : 'U$S ') + miles(a.precio) : 'Consultar'; }
  // Para ordenar autos con precios en distintas monedas.
  function enDolares(a) { return a.precio ? (a.moneda === 'UYU' ? a.precio / ((C && C.dolar) || 40) : a.precio) : null; }
  function nombre(a) { return a.marca + ' ' + a.modelo; }
  function meta(a) { return [a.anio, miles(a.km) + ' km', a.combustible, a.transmision].join(' · '); }
  function autoUrl(a, r) { return raiz(r) + 'autos/' + encodeURIComponent(a.id) + '/'; }
  function waUrl(text) { return 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(text || MSG_GENERICO); }
  function buscar(id) { return AUTOS.filter(function (a) { return a.id === id; })[0]; }

  // Siluetas del diseño, se usan cuando el auto todavía no tiene fotos.
  var SILUETAS = {
    auto: '<path d="M8 58 L12 46 Q16 39 30 37 L60 34 L82 20 Q89 15 100 15 L136 15 Q147 15 155 23 L170 36 Q186 38 190 46 L192 58 L168 58 M144 58 L60 58 M36 58 L8 58"/><circle cx="48" cy="58" r="11"/><circle cx="156" cy="58" r="11"/><path d="M86 22 L84 34 M120 17 L120 34 M66 34 L164 34" class="silueta__det"/>',
    pickup: '<path d="M8 58 L12 44 Q14 38 26 37 L56 35 L74 20 Q80 16 90 16 L130 16 Q138 16 142 22 L150 35 L186 37 Q192 38 192 46 L192 58 L170 58 M146 58 L64 58 M40 58 L8 58"/><circle cx="52" cy="58" r="12"/><circle cx="158" cy="58" r="12"/><path d="M110 16 L110 35 M150 35 L150 58" class="silueta__det"/>',
    van: '<path d="M8 58 L10 44 Q12 38 22 36 L34 34 L54 17 Q58 14 66 14 L182 14 Q192 14 192 24 L192 58 L170 58 M146 58 L64 58 M40 58 L8 58"/><circle cx="52" cy="58" r="12"/><circle cx="158" cy="58" r="12"/><path d="M34 34 L150 34 M84 14 L84 34 M120 14 L120 58" class="silueta__det"/>'
  };
  function silueta(a, detalle) {
    var tipo = a.silueta || (a.tipo === 'camioneta' ? 'pickup' : a.tipo === 'utilitario' ? 'van' : 'auto');
    var svg = SILUETAS[tipo];
    if (!detalle) svg = svg.replace(/<path [^>]*class="silueta__det"\/>/, '');
    return '<svg class="silueta" viewBox="0 0 200 80" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + svg + '</svg>';
  }
  // Foto i del auto (o la silueta si no tiene). o: { detalle, raiz, alt, eager, chica (miniatura, para tarjetas) }
  function media(a, i, o) {
    o = o || {};
    var lista = o.chica && a.miniaturas && a.miniaturas.length ? a.miniaturas : a.fotos;
    var src = lista && lista[i || 0];
    if (!src) return silueta(a, o.detalle);
    return '<img class="media-fill" src="' + esc(raiz(o.raiz) + src) + '" alt="' + esc(o.alt || nombre(a)) + '"' +
      (o.eager ? ' fetchpriority="high"' : ' loading="lazy"') + '>';
  }

  function spec(l, v) {
    return '<div class="spec"><span class="spec__l">' + l + '</span><span class="spec__v">' + esc(v) + '</span></div>';
  }
  // Tarjeta del stock. o: { compacta (versión del inicio, una línea de datos), raiz }
  function card(a, o) {
    o = o || {};
    var tag = a.etiqueta ? '<span class="tag">' + esc(a.etiqueta) + '</span>' : '';
    var info = o.compacta
      ? '<div class="car-card__title"><strong class="car-card__name">' + esc(nombre(a)) + '</strong><span class="car-card__meta">' + esc(meta(a)) + '</span></div>'
      : '<strong class="car-card__name">' + esc(nombre(a)) + '</strong><div class="specs3">' + spec('AÑO', a.anio) + spec('KM', miles(a.km)) + spec('MOTOR', a.combustible) + '</div>';
    return '<a class="car-card" href="' + autoUrl(a, o.raiz) + '">' +
      '<div class="car-card__media">' + media(a, 0, { raiz: o.raiz, chica: true }) + tag + '</div>' +
      '<div class="car-card__body">' + info +
      '<div class="price-row"><span class="price">' + precio(a) + '</span><span class="price-row__cta">Ver detalle</span></div>' +
      '</div></a>';
  }

  // Más nuevos primero.
  function recientes() {
    return AUTOS.slice().sort(function (a, b) { return (b.ingreso || '').localeCompare(a.ingreso || ''); });
  }

  if (EN_NAVEGADOR) {
    var toggle = document.querySelector('.nav__toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = document.body.classList.toggle('menu-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      document.querySelectorAll('.nav__links a').forEach(function (a) {
        a.addEventListener('click', function () {
          document.body.classList.remove('menu-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  window.DN = {
    config: C, autos: AUTOS, VISTAS: VISTAS,
    esc: esc, miles: miles, precio: precio, enDolares: enDolares, nombre: nombre, meta: meta,
    autoUrl: autoUrl, waUrl: waUrl, buscar: buscar, recientes: recientes,
    silueta: silueta, media: media, card: card
  };
})();
