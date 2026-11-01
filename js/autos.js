// Stock. Para agregar un auto, copiar un bloque y cambiar los datos.
//
// id          único, va en la URL (auto.html?id=...). Minúsculas y guiones.
// tipo        'auto' | 'camioneta' | 'utilitario' (filtros del stock)
// silueta     opcional, dibujo si no hay fotos: 'auto' | 'pickup' | 'van'
// precio      número en dólares, sin puntos. null = "Consultar"
// etiqueta    texto del cartelito naranja ('' = sin cartel)
// destacado   true = aparece grande en el inicio
// ingreso     fecha de ingreso (AAAA-MM-DD), para ordenar por "más recientes"
// fotos       rutas a las fotos, la primera es la principal.
//             Ej: ['img/autos/toyota-hilux-srv-2018/1.jpg', ...]
//
// Los 6 autos de abajo son de EJEMPLO (los del diseño), no el stock real.
window.DN_AUTOS = [
  {
    id: 'toyota-hilux-srv-2018',
    marca: 'Toyota', modelo: 'Hilux SRV 2.8 4x4', anio: 2018, km: 120000,
    tipo: 'camioneta', silueta: 'pickup',
    combustible: 'Diésel', transmision: 'Automática', traccion: '4x4', motor: '2.8 turbo diésel',
    color: 'Blanco', puertas: 4, duenos: 2,
    precio: 34900, etiqueta: 'DESTACADO', destacado: true, ingreso: '2026-10-24',
    patenteAlDia: true, libreDeMultas: true, aceptaPermuta: true,
    descripcion: 'Camioneta muy cuidada, con service al día. Cubiertas en buen estado, protector de caja y enganche. Ideal para trabajo o para la familia.',
    fotos: []
  },
  {
    id: 'chevrolet-onix-lt-2019',
    marca: 'Chevrolet', modelo: 'Onix LT 1.4', anio: 2019, km: 64000,
    tipo: 'auto',
    combustible: 'Nafta', transmision: 'Manual', motor: '1.4',
    color: 'Gris', puertas: 5, duenos: 1,
    precio: 14500, etiqueta: 'NUEVO INGRESO', ingreso: '2026-10-29',
    patenteAlDia: true, libreDeMultas: true, aceptaPermuta: true,
    descripcion: 'Único dueño, todos los services hechos. Aire acondicionado, dirección asistida, levantavidrios eléctricos y pantalla con Android Auto.',
    fotos: []
  },
  {
    id: 'volkswagen-gol-trend-2017',
    marca: 'Volkswagen', modelo: 'Gol Trend 1.6', anio: 2017, km: 98000,
    tipo: 'auto',
    combustible: 'Nafta', transmision: 'Manual', motor: '1.6',
    color: 'Rojo', puertas: 5, duenos: 2,
    precio: 11900, etiqueta: 'PERMUTA', ingreso: '2026-10-21',
    patenteAlDia: true, libreDeMultas: true, aceptaPermuta: true,
    descripcion: 'Ingresó por permuta. Mecánica impecable, aire acondicionado y dirección hidráulica. Algún detalle de chapa propio del año.',
    fotos: []
  },
  {
    id: 'fiat-strada-working-2016',
    marca: 'Fiat', modelo: 'Strada Working 1.4', anio: 2016, km: 135000,
    tipo: 'utilitario', silueta: 'pickup',
    combustible: 'Nafta', transmision: 'Manual', motor: '1.4',
    color: 'Blanco', puertas: 2, duenos: 2,
    precio: 12800, etiqueta: '', ingreso: '2026-10-15',
    patenteAlDia: true, libreDeMultas: true, aceptaPermuta: true,
    descripcion: 'Cabina simple, caja con cobertor. Ideal para trabajar: económica y fácil de mantener.',
    fotos: []
  },
  {
    id: 'peugeot-208-allure-2019',
    marca: 'Peugeot', modelo: '208 Allure 1.6', anio: 2019, km: 71000,
    tipo: 'auto',
    combustible: 'Nafta', transmision: 'Manual', motor: '1.6',
    color: 'Negro', puertas: 5, duenos: 1,
    precio: 15900, etiqueta: '', ingreso: '2026-10-18',
    patenteAlDia: true, libreDeMultas: true, aceptaPermuta: true,
    descripcion: 'Versión full: techo panorámico, pantalla táctil, sensores de estacionamiento y llantas de aleación.',
    fotos: []
  },
  {
    id: 'renault-kangoo-2015',
    marca: 'Renault', modelo: 'Kangoo 1.6', anio: 2015, km: 160000,
    tipo: 'utilitario', silueta: 'van',
    combustible: 'Nafta', transmision: 'Manual', motor: '1.6',
    color: 'Blanco', puertas: 5, duenos: 3,
    precio: 10500, etiqueta: 'OPORTUNIDAD', ingreso: '2026-10-10',
    patenteAlDia: false, libreDeMultas: true, aceptaPermuta: true,
    descripcion: 'Furgón con puerta lateral corrediza. Tiene deuda de patente, se descuenta del precio. Motor y caja sin problemas.',
    fotos: []
  }
];
