// Galería del detalle. El resto de la página ya viene armado por scripts/generar.js.
(function () {
  var DN = window.DN;
  var foto = document.getElementById('foto');
  var a = DN.buscar(foto.getAttribute('data-auto'));
  if (!a) return;

  var nombre = DN.nombre(a);
  var fotos = a.fotos && a.fotos.length ? a.fotos : null;
  var total = fotos ? fotos.length : DN.VISTAS.length;
  var actual = 0;
  var thumbs = document.getElementById('thumbs');

  function mostrar(i) {
    actual = (i + total) % total;
    var vieja = foto.querySelector('.silueta, .media-fill');
    if (vieja) vieja.remove();
    foto.insertAdjacentHTML('afterbegin', DN.media(a, actual, { detalle: true, eager: true, alt: nombre + ', foto ' + (actual + 1) }));
    document.getElementById('foto-label').textContent = fotos ? '' : 'FOTO · ' + DN.VISTAS[actual].toUpperCase();
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
})();
