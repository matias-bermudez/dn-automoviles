// Datos del negocio. Los campos vacíos no se muestran en la web.
// Después de cambiar algo hay que publicar (push a main): el sitio se regenera solo.
//
// whatsapp: número de DN Automóviles (el de prueba de Matías era 59891969322 / 091 969 322).
window.DN_CONFIG = {
  whatsapp: '59898603518',      // código de país + número, sin 0 ni espacios
  whatsappLabel: '098 603 518',
  direccion: '',
  horario: '',                  // como se muestra en la web, ej: 'Lunes a viernes 9 a 18 h · Sábados 9 a 13 h'
  horarioSchema: '',            // el mismo horario para Google, ej: 'Mo-Fr 09:00-18:00, Sa 09:00-13:00'
  zonas: 'todo el país',
  tiktok: 'dnventascompras2',
  dolar: 40,                    // pesos por dólar, aproximado: solo para ordenar por precio autos en distintas monedas

  // Supabase: base compartida de la Plataforma Automotoras (~/Proyectos/plataforma-automotoras).
  // Vacíos = se usan los autos de js/autos.js. `concesionaria` = id de esta automotora en la base.
  // La clave es la pública (anon / publishable): puede ir en el código, los permisos los pone supabase/schema.sql.
  supabaseUrl: 'https://dfunhdfvtmsmjdzpnhas.supabase.co',
  supabaseKey: 'sb_publishable_4Q-GxNAtPB894PRurMLwkQ_2NRVIjWg',
  concesionaria: 'dn',

  // URL pública del sitio, con / al final. Si se compra dominio, cambiarla acá.
  sitio: 'https://matias-bermudez.github.io/dn-automoviles/',

  // false = Google no indexa la web (meta noindex). Pasar a true recién cuando
  // DN apruebe la propuesta y el número de WhatsApp sea el suyo.
  indexar: false
};
