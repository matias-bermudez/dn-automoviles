(function () {
  var DN = window.DN;
  var TIPOS = ['todos', 'auto', 'camioneta', 'utilitario'];
  var ORDENES = {
    recientes: function (a, b) { return (b.ingreso || '').localeCompare(a.ingreso || ''); },
    'precio-asc': function (a, b) { return (DN.enDolares(a) || Infinity) - (DN.enDolares(b) || Infinity); },
    'precio-desc': function (a, b) { return (DN.enDolares(b) || 0) - (DN.enDolares(a) || 0); },
    km: function (a, b) { return a.km - b.km; }
  };

  // Los filtros viven en la URL para poder compartir/volver (/autos/?tipo=camioneta).
  var params = new URLSearchParams(location.search);
  var estado = {
    tipo: TIPOS.indexOf(params.get('tipo')) >= 0 ? params.get('tipo') : 'todos',
    q: params.get('q') || '',
    orden: ORDENES[params.get('orden')] ? params.get('orden') : 'recientes'
  };

  var tabs = document.querySelectorAll('#tabs [data-tipo]');
  var q = document.getElementById('q');
  var orden = document.getElementById('orden');
  var grid = document.getElementById('grid');
  var count = document.getElementById('count');
  var empty = document.getElementById('empty');
  var emptyWa = document.getElementById('empty-wa');
  q.value = estado.q;
  orden.value = estado.orden;

  function normal(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function render() {
    var palabras = normal(estado.q).split(/\s+/).filter(Boolean);
    var lista = DN.autos
      .filter(function (a) { return estado.tipo === 'todos' || a.tipo === estado.tipo; })
      .filter(function (a) {
        var texto = normal(DN.nombre(a) + ' ' + a.anio);
        return palabras.every(function (p) { return texto.indexOf(p) >= 0; });
      })
      .sort(ORDENES[estado.orden]);

    grid.innerHTML = lista.map(function (a) { return DN.card(a); }).join('');
    count.textContent = lista.length === 1 ? '1 vehículo disponible' : lista.length + ' vehículos disponibles';
    empty.hidden = lista.length > 0;
    var buscado = estado.q.trim();
    emptyWa.href = DN.waUrl('Hola DN Automóviles, estoy buscando ' + (buscado ? 'un ' + buscado : 'un auto') + '. ¿Me avisan si les entra uno parecido?');
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-tipo') === estado.tipo)); });

    var p = new URLSearchParams();
    if (estado.tipo !== 'todos') p.set('tipo', estado.tipo);
    if (buscado) p.set('q', buscado);
    if (estado.orden !== 'recientes') p.set('orden', estado.orden);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { estado.tipo = t.getAttribute('data-tipo'); render(); });
  });
  q.addEventListener('input', function () { estado.q = q.value; render(); });
  orden.addEventListener('change', function () { estado.orden = orden.value; render(); });

  render();
})();
