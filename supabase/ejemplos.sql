-- Los 6 autos de ejemplo del diseño (sin fotos), para que la web no quede vacía al conectar Supabase.
-- Opcional: pegar en SQL Editor → Run. Después se editan o borran desde el panel.
insert into public.autos
  (slug, marca, modelo, anio, km, tipo, combustible, transmision, traccion, motor, color, puertas, duenos,
   precio, etiqueta, destacado, patente_al_dia, libre_de_multas, acepta_permuta, descripcion, created_at)
values
  ('toyota-hilux-srv-2018', 'Toyota', 'Hilux SRV 2.8 4x4', 2018, 120000, 'camioneta', 'Diésel', 'Automática', '4x4', '2.8 turbo diésel', 'Blanco', 4, 2,
   34900, 'DESTACADO', true, true, true, true, 'Camioneta muy cuidada, con service al día. Cubiertas en buen estado, protector de caja y enganche. Ideal para trabajo o para la familia.', '2026-10-24'),
  ('chevrolet-onix-lt-2019', 'Chevrolet', 'Onix LT 1.4', 2019, 64000, 'auto', 'Nafta', 'Manual', null, '1.4', 'Gris', 5, 1,
   14500, 'NUEVO INGRESO', false, true, true, true, 'Único dueño, todos los services hechos. Aire acondicionado, dirección asistida, levantavidrios eléctricos y pantalla con Android Auto.', '2026-10-29'),
  ('volkswagen-gol-trend-2017', 'Volkswagen', 'Gol Trend 1.6', 2017, 98000, 'auto', 'Nafta', 'Manual', null, '1.6', 'Rojo', 5, 2,
   11900, 'PERMUTA', false, true, true, true, 'Ingresó por permuta. Mecánica impecable, aire acondicionado y dirección hidráulica. Algún detalle de chapa propio del año.', '2026-10-21'),
  ('fiat-strada-working-2016', 'Fiat', 'Strada Working 1.4', 2016, 135000, 'utilitario', 'Nafta', 'Manual', null, '1.4', 'Blanco', 2, 2,
   12800, null, false, true, true, true, 'Cabina simple, caja con cobertor. Ideal para trabajar: económica y fácil de mantener.', '2026-10-15'),
  ('peugeot-208-allure-2019', 'Peugeot', '208 Allure 1.6', 2019, 71000, 'auto', 'Nafta', 'Manual', null, '1.6', 'Negro', 5, 1,
   15900, null, false, true, true, true, 'Versión full: techo panorámico, pantalla táctil, sensores de estacionamiento y llantas de aleación.', '2026-10-18'),
  ('renault-kangoo-2015', 'Renault', 'Kangoo 1.6', 2015, 160000, 'utilitario', 'Nafta', 'Manual', null, '1.6', 'Blanco', 5, 3,
   10500, 'OPORTUNIDAD', false, false, true, true, 'Furgón con puerta lateral corrediza. Tiene deuda de patente, se descuenta del precio. Motor y caja sin problemas.', '2026-10-10')
on conflict (slug) do nothing;
