(function () {
  var DN = window.DN;
  var esc = DN.esc;
  var a = DN.buscar(new URLSearchParams(location.search).get('id'));

  if (!a) {
    document.getElementById('detalle').hidden = true;
    document.getElementById('no-encontrado').hidden = false;
    return;
  }

  var nombre = DN.nombre(a);
  document.title = nombre + ' ' + a.anio + ' · DN Automóviles';
  document.getElementById('crumb').textContent = nombre;
  document.getElementById('eyebrow').textContent = a.marca + ' · ' + a.anio;
  document.getElementById('titulo').textContent = a.modelo;
  document.getElementById('precio').textContent = DN.precio(a);

  // ---- Galería ----
  // Sin fotos se muestran 5 lugares con la silueta, como en el diseño.
  var VISTAS = ['Frente', 'Lateral', 'Trasera', 'Interior', 'Motor'];
  var fotos = a.fotos && a.fotos.length ? a.fotos : null;
  var total = fotos ? fotos.length : VISTAS.length;
  var actual = 0;
  var foto = document.getElementById('foto');
  var thumbs = document.getElementById('thumbs');

  if (a.etiqueta) {
    var tag = document.getElementById('foto-tag');
    tag.textContent = a.etiqueta;
    tag.hidden = false;
  }
  thumbs.innerHTML = Array.from({ length: total }, function (_, i) {
    var dentro = fotos
      ? '<img class="media-fill" src="' + esc(fotos[i]) + '" alt="" loading="lazy">'
      : VISTAS[i].toUpperCase();
    var label = fotos ? 'Ver foto ' + (i + 1) : 'Ver foto: ' + VISTAS[i];
    return '<button type="button" class="thumb" data-i="' + i + '" aria-label="' + label + '">' + dentro + '</button>';
  }).join('');
  if (total < 2) thumbs.hidden = true;

  function mostrar(i) {
    actual = (i + total) % total;
    var vieja = foto.querySelector('.silueta, .media-fill');
    if (vieja) vieja.remove();
    foto.insertAdjacentHTML('afterbegin', DN.media(a, actual, true));
    var img = foto.querySelector('.media-fill');
    if (img) { img.loading = 'eager'; img.alt = nombre + ', foto ' + (actual + 1); }
    document.getElementById('foto-label').textContent = fotos ? '' : 'FOTO · ' + VISTAS[actual].toUpperCase();
    foto.querySelector('.flare').hidden = !!fotos;
    document.getElementById('foto-counter').textContent = (actual + 1) + ' / ' + total;
    thumbs.querySelectorAll('.thumb').forEach(function (t, j) { t.setAttribute('aria-current', String(j === actual)); });
  }
  thumbs.addEventListener('click', function (e) {
    var t = e.target.closest('.thumb');
    if (t) mostrar(Number(t.getAttribute('data-i')));
  });
  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight') mostrar(actual + 1);
    if (e.key === 'ArrowLeft') mostrar(actual - 1);
  });
  var x0 = null;
  foto.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  foto.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) mostrar(actual + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  mostrar(0);

  // ---- Datos ----
  var km = DN.miles(a.km) + ' km';
  var claves = [
    ['KILOMETRAJE', km], ['COMBUSTIBLE', a.combustible], ['TRANSMISIÓN', a.transmision],
    a.traccion ? ['TRACCIÓN', a.traccion] : ['MOTOR', a.motor]
  ];
  document.getElementById('keyspecs').innerHTML = claves.map(function (k) {
    return '<div class="keyspec"><span class="keyspec__l">' + k[0] + '</span><span class="keyspec__v">' + esc(k[1]) + '</span></div>';
  }).join('');

  var ficha = [
    ['Marca', a.marca], ['Modelo', a.modelo], ['Año', a.anio], ['Kilometraje', km],
    ['Motor', a.motor], ['Combustible', a.combustible], ['Transmisión', a.transmision], ['Tracción', a.traccion],
    ['Color', a.color], ['Puertas', a.puertas], ['Dueños', a.duenos],
    ['Patente', a.patenteAlDia === false ? 'Con deuda' : a.patenteAlDia ? 'Al día' : '']
  ].filter(function (f) { return f[1] !== undefined && f[1] !== null && f[1] !== ''; });
  document.getElementById('ficha').innerHTML = ficha.map(function (f) {
    return '<div><dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd></div>';
  }).join('');

  if (a.descripcion) document.getElementById('desc').textContent = a.descripcion;
  else document.getElementById('desc').hidden = document.getElementById('desc-titulo').hidden = true;

  var chips = [];
  if (a.patenteAlDia === true) chips.push('<span class="chip chip--ok">Patente al día</span>');
  if (a.patenteAlDia === false) chips.push('<span class="chip chip--warn">Patente con deuda</span>');
  if (a.libreDeMultas === true) chips.push('<span class="chip chip--ok">Libre de multas</span>');
  if (a.libreDeMultas === false) chips.push('<span class="chip chip--warn">Tiene multas</span>');
  if (a.aceptaPermuta) chips.push('<span class="chip">Acepta permuta</span>');
  document.getElementById('chips').innerHTML = chips.join('') || '<span class="chip">Consultanos</span>';

  // ---- WhatsApp ----
  var msg = 'Hola DN Automóviles, me interesa este auto que vi en la web:\n' +
    '*' + nombre + ' ' + a.anio + '* (' + DN.precio(a) + ')\n' +
    '¿Sigue disponible? Quiero coordinar para verlo.\n' +
    DN.config.sitio + DN.autoUrl(a);
  document.getElementById('consultar').href = DN.waUrl(msg);
  document.querySelector('.wa-fab').href = DN.waUrl(msg);
  document.getElementById('permuta').href = 'vende.html?objetivo=permutar&auto=' + encodeURIComponent(a.id);

  // ---- Relacionados: primero los del mismo tipo ----
  var otros = DN.recientes().filter(function (o) { return o.id !== a.id; });
  otros.sort(function (x, y) { return (y.tipo === a.tipo) - (x.tipo === a.tipo); });
  document.getElementById('related').innerHTML = otros.slice(0, 3).map(function (o) {
    return '<a class="mini-card" href="' + DN.autoUrl(o) + '">' +
      '<div class="mini-card__media">' + DN.media(o, 0) + '</div>' +
      '<div class="mini-card__txt"><strong>' + esc(DN.nombre(o)) + '</strong>' +
      '<span>' + o.anio + ' · ' + DN.miles(o.km) + ' km</span><b>' + DN.precio(o) + '</b></div></a>';
  }).join('');
})();
