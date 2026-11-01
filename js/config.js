// Datos del negocio. Los campos vacíos no se muestran en la web.
// Después de cambiar algo hay que publicar (push a main): el sitio se regenera solo.
//
// OJO: whatsapp apunta al número de prueba (Matías). Antes de mandarle la
// propuesta a DN cambiar a: whatsapp '59898603518', whatsappLabel '098 603 518'.
window.DN_CONFIG = {
  whatsapp: '59891969322',      // código de país + número, sin 0 ni espacios
  whatsappLabel: '091 969 322',
  direccion: '',
  horario: '',                  // como se muestra en la web, ej: 'Lunes a viernes 9 a 18 h · Sábados 9 a 13 h'
  horarioSchema: '',            // el mismo horario para Google, ej: 'Mo-Fr 09:00-18:00, Sa 09:00-13:00'
  zonas: 'Las Piedras y alrededores',
  tiktok: 'dnventascompras2',

  // URL pública del sitio, con / al final. Si se compra dominio, cambiarla acá.
  sitio: 'https://matias-bermudez.github.io/dn-automoviles/',

  // false = Google no indexa la web (meta noindex). Pasar a true recién cuando
  // DN apruebe la propuesta y el número de WhatsApp sea el suyo.
  indexar: false
};
