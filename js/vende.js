(function () {
  var DN = window.DN;
  var form = document.getElementById('form');
  var preview = document.getElementById('preview');
  var enviar = document.getElementById('enviar');
  var falta = document.getElementById('falta');
  var REQUERIDOS = [['marca', 'marca'], ['modelo', 'modelo'], ['anio', 'año'], ['km', 'km']];
  var OBJETIVOS = {
    vender: 'quiero VENDER mi auto',
    permutar: 'quiero PERMUTAR mi auto',
    ambas: 'quiero vender o permutar mi auto'
  };

  // ?objetivo=permutar&auto=<id> viene del botón "Entregar mi auto en permuta" del detalle.
  var params = new URLSearchParams(location.search);
  var estado = { objetivo: OBJETIVOS[params.get('objetivo')] ? params.get('objetivo') : 'vender', deuda: 'no' };
  var interes = DN.buscar(params.get('auto'));
  if (interes) {
    var box = document.getElementById('interes');
    box.innerHTML = 'Auto que te interesa: <strong>' + DN.esc(DN.nombre(interes) + ' ' + interes.anio) + '</strong> · ' + DN.precio(interes);
    box.hidden = false;
  }

  function val(nombre) { return String(form.elements[nombre].value || '').trim(); }
  function km(v) {
    v = v.replace(/\s*km$/i, '');
    return /^\d+$/.test(v) ? DN.miles(Number(v)) : v;
  }

  function mensaje() {
    var ph = function (v, p) { return v || p; };
    var lineas = ['Hola DN Automóviles, ' + OBJETIVOS[estado.objetivo] + '.'];
    if (interes) lineas.push('*Me interesa:* ' + DN.nombre(interes) + ' ' + interes.anio + ' (' + DN.precio(interes) + ')');
    lineas.push(
      '',
      '*Auto:* ' + ph(val('marca'), '[Marca]') + ' ' + ph(val('modelo'), '[Modelo]') + ' ' + ph(val('anio'), '[Año]'),
      '*Kilometraje:* ' + (val('km') ? km(val('km')) + ' km' : '[km]'),
      '*Combustible:* ' + val('comb') + ' · *Caja:* ' + val('caja'),
      '*Estado:* ' + val('estado')
    );
    if (estado.deuda === 'si') {
      var detalle = [val('deudaMonto'), val('deudaTipo') && '(' + val('deudaTipo') + ')'].filter(Boolean).join(' ');
      lineas.push('*Deuda:* Sí' + (detalle ? ', ' + detalle : ''));
    } else {
      lineas.push('*Deuda:* No, al día');
    }
    if (val('precio')) lineas.push('*Precio pretendido:* ' + val('precio'));
    lineas.push('*Ubicación:* ' + ph(val('zona'), '[Zona]'));
    if (val('nombre')) lineas.push('*Nombre:* ' + val('nombre'));
    if (val('coment')) lineas.push('*Comentarios:* ' + val('coment'));
    lineas.push('', 'Te paso las fotos por acá.');
    return lineas.join('\n');
  }

  // Muestra las *negritas* como en WhatsApp.
  function aHtml(texto) {
    return DN.esc(texto).replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  }

  function faltantes() {
    return REQUERIDOS.filter(function (r) { return !val(r[0]); }).map(function (r) { return r[1]; });
  }

  function render() {
    var msg = mensaje();
    preview.innerHTML = aHtml(msg);
    var f = faltantes();
    enviar.hidden = f.length > 0;
    falta.hidden = f.length === 0;
    if (f.length) {
      falta.textContent = 'Completá ' + (f.length > 1 ? f.slice(0, -1).join(', ') + ' y ' + f[f.length - 1] : f[0]);
    }
    enviar.href = DN.waUrl(msg);
    document.getElementById('deuda-campos').hidden = estado.deuda !== 'si';
    marcar('objetivo', estado.objetivo);
    marcar('deuda', estado.deuda);
  }

  function marcar(grupo, valor) {
    document.querySelectorAll('#' + grupo + ' [data-v]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === valor));
    });
  }
  ['objetivo', 'deuda'].forEach(function (grupo) {
    document.getElementById(grupo).addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]');
      if (!b) return;
      estado[grupo] = b.getAttribute('data-v');
      render();
    });
  });

  form.addEventListener('input', render);
  form.addEventListener('change', render);
  // Enter en un campo: si está todo, envía; si no, lleva al primer campo que falta.
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var primero = REQUERIDOS.filter(function (r) { return !val(r[0]); })[0];
    if (primero) form.elements[primero[0]].focus();
    else enviar.click();
  });

  render();
})();
