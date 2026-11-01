(function () {
  var DN = window.DN;
  var lista = DN.recientes();

  document.getElementById('recientes').innerHTML = lista.slice(0, 3).map(function (a) { return DN.card(a, true); }).join('');

  // Hero: el auto marcado como destacado (o el último que entró).
  var d = DN.autos.filter(function (a) { return a.destacado; })[0] || lista[0];
  if (!d) return;
  var box = document.getElementById('hero-destacado');
  box.href = DN.autoUrl(d);
  box.insertAdjacentHTML('afterbegin', DN.media(d, 0, true));
  if (d.fotos && d.fotos.length) box.classList.add('has-photo');
  box.querySelector('.hero__caption').textContent = DN.nombre(d) + ' · ' + DN.precio(d);
})();
