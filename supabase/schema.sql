-- =============================================================================
-- GasoMatamoros — Esquema PostgreSQL + PostGIS para Supabase
-- Ciudad objetivo: Matamoros, Tamaulipas, México (Zona horaria: America/Matamoros)
-- =============================================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Enumeraciones
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fuel_type') THEN
    CREATE TYPE public.fuel_type AS ENUM ('regular', 'premium', 'diesel');
  END IF;
END $$;

-- 3. Tabla principal de gasolineras (stations)
CREATE TABLE IF NOT EXISTS public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cre_permit TEXT UNIQUE,                                -- Número de permiso CRE (Comisión Reguladora de Energía)
  name TEXT NOT NULL,                                    -- Nombre comercial de la estación
  brand TEXT NOT NULL,                                   -- Marca (Pemex, Mobil, OXXO Gas, Petro Seven, BP, etc.)
  logo_url TEXT,                                         -- URL opcional del logotipo
  address TEXT NOT NULL,                                 -- Dirección completa en Matamoros
  neighborhood TEXT,                                     -- Colonia / Sector
  city TEXT NOT NULL DEFAULT 'Matamoros',
  state TEXT NOT NULL DEFAULT 'Tamaulipas',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  is_24_hours BOOLEAN NOT NULL DEFAULT FALSE,
  opens_at TIME,                                         -- Hora local de apertura (HH:MM:SS) si no es 24h
  closes_at TIME,                                        -- Hora local de cierre (HH:MM:SS) si no es 24h
  profeco_certified BOOLEAN NOT NULL DEFAULT FALSE,      -- Distintivo / verificación Profeco ("Litros de a Litro")
  profeco_verified_at DATE,
  avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,        -- Promedio general (calculado vía trigger)
  avg_service_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,-- Promedio de trato / atención
  avg_liters_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00, -- Promedio de litros exactos
  avg_performance_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00, -- Promedio de rendimiento
  reviews_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_valid_schedule CHECK (
    is_24_hours = TRUE OR (opens_at IS NOT NULL AND closes_at IS NOT NULL)
  ),
  CONSTRAINT chk_valid_coords CHECK (
    latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
  )
);

-- 4. Tabla de precios diarios (daily_prices)
CREATE TABLE IF NOT EXISTS public.daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type public.fuel_type NOT NULL,
  price_mxn NUMERIC(6, 2) NOT NULL CHECK (price_mxn > 0 AND price_mxn < 100),
  effective_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Matamoros')::DATE,
  source TEXT NOT NULL DEFAULT 'CRE',                    -- CRE | Comunidad | Verificado
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_station_fuel_date UNIQUE (station_id, fuel_type, effective_date)
);

-- 5. Tabla de reseñas de usuarios (reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Conductor de Matamoros',
  service_rating SMALLINT NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
  liters_rating SMALLINT NOT NULL CHECK (liters_rating BETWEEN 1 AND 5),
  performance_rating SMALLINT NOT NULL CHECK (performance_rating BETWEEN 1 AND 5),
  overall_rating NUMERIC(3, 2) GENERATED ALWAYS AS (
    ROUND(((service_rating + liters_rating + performance_rating)::NUMERIC / 3.0), 2)
  ) STORED,
  comment TEXT CHECK (char_length(comment) <= 600),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Índices de alto rendimiento (Espacial GIST + B-Tree)
CREATE INDEX IF NOT EXISTS idx_stations_location_gist
  ON public.stations USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_stations_active_rating
  ON public.stations (is_active, avg_rating DESC);

CREATE INDEX IF NOT EXISTS idx_daily_prices_station_fuel_date
  ON public.daily_prices (station_id, fuel_type, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_station_created
  ON public.reviews (station_id, created_at DESC);

-- 7. Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stations_updated_at ON public.stations;
CREATE TRIGGER trg_stations_updated_at
  BEFORE UPDATE ON public.stations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_daily_prices_updated_at ON public.daily_prices;
CREATE TRIGGER trg_daily_prices_updated_at
  BEFORE UPDATE ON public.daily_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. Trigger: recalcular métricas de calificación en stations al insertar/actualizar/eliminar reseñas
CREATE OR REPLACE FUNCTION public.recalculate_station_ratings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_station_id UUID;
BEGIN
  target_station_id := COALESCE(NEW.station_id, OLD.station_id);

  UPDATE public.stations s
  SET
    avg_rating = COALESCE(agg.avg_overall, 0.00),
    avg_service_rating = COALESCE(agg.avg_service, 0.00),
    avg_liters_rating = COALESCE(agg.avg_liters, 0.00),
    avg_performance_rating = COALESCE(agg.avg_performance, 0.00),
    reviews_count = COALESCE(agg.total_count, 0)
  FROM (
    SELECT
      ROUND(AVG(overall_rating)::NUMERIC, 2) AS avg_overall,
      ROUND(AVG(service_rating)::NUMERIC, 2) AS avg_service,
      ROUND(AVG(liters_rating)::NUMERIC, 2) AS avg_liters,
      ROUND(AVG(performance_rating)::NUMERIC, 2) AS avg_performance,
      COUNT(*)::INTEGER AS total_count
    FROM public.reviews
    WHERE station_id = target_station_id
  ) agg
  WHERE s.id = target_station_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_recalculate_station ON public.reviews;
CREATE TRIGGER trg_reviews_recalculate_station
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_station_ratings();

-- 9. Función RPC con PostGIS: obtener gasolineras con precios más recientes y distancia en km
CREATE OR REPLACE FUNCTION public.get_stations_with_prices(
  user_lat DOUBLE PRECISION DEFAULT NULL,
  user_lng DOUBLE PRECISION DEFAULT NULL,
  sort_by TEXT DEFAULT 'price',          -- 'price' | 'rating' | 'distance'
  target_fuel public.fuel_type DEFAULT 'regular'
)
RETURNS TABLE (
  id UUID,
  cre_permit TEXT,
  name TEXT,
  brand TEXT,
  logo_url TEXT,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_24_hours BOOLEAN,
  opens_at TIME,
  closes_at TIME,
  profeco_certified BOOLEAN,
  profeco_verified_at DATE,
  avg_rating NUMERIC,
  avg_service_rating NUMERIC,
  avg_liters_rating NUMERIC,
  avg_performance_rating NUMERIC,
  reviews_count INTEGER,
  regular_price NUMERIC,
  premium_price NUMERIC,
  diesel_price NUMERIC,
  price_updated_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH latest_prices AS (
    SELECT DISTINCT ON (dp.station_id, dp.fuel_type)
      dp.station_id,
      dp.fuel_type,
      dp.price_mxn,
      dp.updated_at
    FROM public.daily_prices dp
    ORDER BY dp.station_id, dp.fuel_type, dp.effective_date DESC, dp.updated_at DESC
  ),
  pivoted_prices AS (
    SELECT
      lp.station_id,
      MAX(CASE WHEN lp.fuel_type = 'regular' THEN lp.price_mxn END) AS regular_price,
      MAX(CASE WHEN lp.fuel_type = 'premium' THEN lp.price_mxn END) AS premium_price,
      MAX(CASE WHEN lp.fuel_type = 'diesel' THEN lp.price_mxn END) AS diesel_price,
      MAX(lp.updated_at) AS price_updated_at
    FROM latest_prices lp
    GROUP BY lp.station_id
  ),
  enriched AS (
    SELECT
      s.id,
      s.cre_permit,
      s.name,
      s.brand,
      s.logo_url,
      s.address,
      s.neighborhood,
      s.city,
      s.state,
      s.latitude,
      s.longitude,
      s.is_24_hours,
      s.opens_at,
      s.closes_at,
      s.profeco_certified,
      s.profeco_verified_at,
      s.avg_rating,
      s.avg_service_rating,
      s.avg_liters_rating,
      s.avg_performance_rating,
      s.reviews_count,
      pp.regular_price,
      pp.premium_price,
      pp.diesel_price,
      pp.price_updated_at,
      CASE
        WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL THEN
          ROUND(
            (ST_Distance(
              s.location,
              ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
            ) / 1000.0)::NUMERIC,
            2
          )::DOUBLE PRECISION
        ELSE NULL
      END AS distance_km
    FROM public.stations s
    LEFT JOIN pivoted_prices pp ON pp.station_id = s.id
    WHERE s.is_active = TRUE
  )
  SELECT *
  FROM enriched e
  ORDER BY
    CASE WHEN sort_by = 'price' THEN
      CASE target_fuel
        WHEN 'regular' THEN COALESCE(e.regular_price, 999.99)
        WHEN 'premium' THEN COALESCE(e.premium_price, 999.99)
        WHEN 'diesel'  THEN COALESCE(e.diesel_price, 999.99)
      END
    END ASC NULLS LAST,
    CASE WHEN sort_by = 'rating' THEN e.avg_rating END DESC NULLS LAST,
    CASE WHEN sort_by = 'distance' THEN COALESCE(e.distance_km, 999999.0) END ASC NULLS LAST,
    e.avg_rating DESC,
    e.name ASC;
$$;

-- 10. Row Level Security (RLS)
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Lectura pública para estaciones, precios y reseñas
DROP POLICY IF EXISTS "Public read stations" ON public.stations;
CREATE POLICY "Public read stations"
  ON public.stations FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read daily_prices" ON public.daily_prices;
CREATE POLICY "Public read daily_prices"
  ON public.daily_prices FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews"
  ON public.reviews FOR SELECT
  USING (TRUE);

-- Inserción de reseñas: usuarios autenticados (incluye Supabase Anonymous Auth)
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
CREATE POLICY "Authenticated users can insert reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Permite a cada usuario editar o borrar únicamente sus propias reseñas
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Permisos de ejecución para el RPC
GRANT EXECUTE ON FUNCTION public.get_stations_with_prices(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, public.fuel_type)
  TO anon, authenticated;
