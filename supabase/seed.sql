-- =============================================================================
-- GasoMatamoros — Datos de prueba reales en Matamoros, Tamaulipas, México
-- 6 estaciones distribuidas estratégicamente por la ciudad (Centro, Av. Álvaro
-- Obregón, Periférico, Av. Pedro Cárdenas, Sendero Nacional y Lauro Villar).
-- =============================================================================

-- Limpieza opcional para re-ejecución idempotente en entorno de desarrollo
DELETE FROM public.reviews;
DELETE FROM public.daily_prices;
DELETE FROM public.stations;

INSERT INTO public.stations (
  id,
  cre_permit,
  name,
  brand,
  logo_url,
  address,
  neighborhood,
  latitude,
  longitude,
  is_24_hours,
  opens_at,
  closes_at,
  profeco_certified,
  profeco_verified_at
) VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    'PL/4821/EXP/ES/2015',
    'Mobil Álvaro Obregón',
    'Mobil',
    NULL,
    'Av. Álvaro Obregón #142, entre Primera y Segunda',
    'Jardín',
    25.8819,
    -97.5038,
    TRUE,
    NULL,
    NULL,
    TRUE,
    CURRENT_DATE - INTERVAL '12 days'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'PL/7310/EXP/ES/2016',
    'OXXO Gas Pedro Cárdenas',
    'OXXO Gas',
    NULL,
    'Av. Pedro Cárdenas #2850, esq. Calle 12',
    'Victoria',
    25.8542,
    -97.5094,
    TRUE,
    NULL,
    NULL,
    TRUE,
    CURRENT_DATE - INTERVAL '20 days'
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'PL/1904/EXP/ES/2015',
    'Pemex Puente Viejo Centro',
    'Pemex',
    NULL,
    'Calle González #104, Zona Centro',
    'Zona Centro',
    25.8794,
    -97.5067,
    FALSE,
    '06:00:00',
    '23:00:00',
    FALSE,
    NULL
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    'PL/9052/EXP/ES/2017',
    'Petro Seven Periférico',
    'Petro Seven',
    NULL,
    'Av. Manuel Cavazos Lerma (Periférico) #1890',
    'San Francisco',
    25.8671,
    -97.5236,
    TRUE,
    NULL,
    NULL,
    TRUE,
    CURRENT_DATE - INTERVAL '7 days'
  ),
  (
    '11111111-1111-4111-8111-111111111105',
    'PL/6418/EXP/ES/2016',
    'Pemex Av. Lauro Villar',
    'Pemex',
    NULL,
    'Av. Lauro Villar #1240, rumbo a Playa Bagdad',
    'Las Palmas',
    25.8758,
    -97.4795,
    FALSE,
    '05:30:00',
    '22:30:00',
    TRUE,
    CURRENT_DATE - INTERVAL '30 days'
  ),
  (
    '11111111-1111-4111-8111-111111111106',
    'PL/11205/EXP/ES/2018',
    'BP Sendero Nacional',
    'BP',
    NULL,
    'Carretera a Reynosa Km 4.5, Plaza Sendero',
    'Sendero Nacional',
    25.8629,
    -97.5412,
    FALSE,
    '06:00:00',
    '23:30:00',
    FALSE,
    NULL
  );

-- Precios diarios vigentes (zona fronteriza norte — Matamoros, MXN por litro)
INSERT INTO public.daily_prices (station_id, fuel_type, price_mxn, source) VALUES
  -- Mobil Álvaro Obregón
  ('11111111-1111-4111-8111-111111111101', 'regular', 20.19, 'CRE'),
  ('11111111-1111-4111-8111-111111111101', 'premium', 22.89, 'CRE'),
  ('11111111-1111-4111-8111-111111111101', 'diesel',  23.45, 'CRE'),

  -- OXXO Gas Pedro Cárdenas
  ('11111111-1111-4111-8111-111111111102', 'regular', 19.89, 'CRE'),
  ('11111111-1111-4111-8111-111111111102', 'premium', 22.59, 'CRE'),
  ('11111111-1111-4111-8111-111111111102', 'diesel',  23.10, 'CRE'),

  -- Pemex Puente Viejo Centro
  ('11111111-1111-4111-8111-111111111103', 'regular', 19.65, 'CRE'),
  ('11111111-1111-4111-8111-111111111103', 'premium', 22.35, 'CRE'),
  ('11111111-1111-4111-8111-111111111103', 'diesel',  22.95, 'CRE'),

  -- Petro Seven Periférico
  ('11111111-1111-4111-8111-111111111104', 'regular', 20.05, 'CRE'),
  ('11111111-1111-4111-8111-111111111104', 'premium', 22.75, 'CRE'),
  ('11111111-1111-4111-8111-111111111104', 'diesel',  23.25, 'CRE'),

  -- Pemex Av. Lauro Villar
  ('11111111-1111-4111-8111-111111111105', 'regular', 19.79, 'CRE'),
  ('11111111-1111-4111-8111-111111111105', 'premium', 22.49, 'CRE'),
  ('11111111-1111-4111-8111-111111111105', 'diesel',  22.99, 'CRE'),

  -- BP Sendero Nacional
  ('11111111-1111-4111-8111-111111111106', 'regular', 20.39, 'CRE'),
  ('11111111-1111-4111-8111-111111111106', 'premium', 23.09, 'CRE'),
  ('11111111-1111-4111-8111-111111111106', 'diesel',  23.60, 'CRE');

-- Reseñas iniciales (el trigger recalcula automáticamente avg_rating y reviews_count)
INSERT INTO public.reviews (station_id, author_name, service_rating, liters_rating, performance_rating, comment) VALUES
  ('11111111-1111-4111-8111-111111111101', 'Carlos Garza', 5, 5, 5, 'Excelente atención en Álvaro Obregón, siempre rinde muy bien la gasolina y aceptan tarjeta sin problemas.'),
  ('11111111-1111-4111-8111-111111111101', 'Mariana Treviño', 5, 5, 4, 'Muy rápido el servicio incluso en hora pico antes de cruzar el puente.'),
  ('11111111-1111-4111-8111-111111111102', 'Roberto Salinas', 4, 5, 5, 'Buen precio sobre Pedro Cárdenas y los litros salen exactos.'),
  ('11111111-1111-4111-8111-111111111102', 'Ana Lucía Pérez', 5, 4, 4, 'Limpia, bien iluminada de noche y con OXXO al lado.'),
  ('11111111-1111-4111-8111-111111111103', 'Jorge Cantú', 3, 4, 4, 'Es la más barata del centro, aunque a veces hay fila en las mañanas.'),
  ('11111111-1111-4111-8111-111111111104', 'Fernanda Ríos', 5, 5, 5, 'Siempre cargo aquí camino al trabajo en Periférico. Litros completos y personal amable.'),
  ('11111111-1111-4111-8111-111111111105', 'Luis Eduardo Mora', 4, 4, 4, 'Buena opción saliendo por Lauro Villar, precios competitivos.'),
  ('11111111-1111-4111-8111-111111111106', 'Sofía Villarreal', 4, 4, 5, 'Muy buen rendimiento en carretera a Reynosa, aunque un poco más cara.');
