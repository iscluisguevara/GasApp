import { isSupabaseConfigured, supabase } from '@/services/supabase';
import {
  Coordinates,
  FuelType,
  StationSortOption,
  StationWithPrices,
} from '@/types/database.types';

export interface FetchStationsParams {
  userLocation?: Coordinates | null;
  sortBy: StationSortOption;
  fuelType: FuelType;
}

/**
 * Normaliza valores NUMERIC de PostgreSQL que a veces llegan serializados como string.
 */
function normalizeStationRow(row: StationWithPrices): StationWithPrices {
  return {
    ...row,
    avg_rating: Number(row.avg_rating ?? 0),
    avg_service_rating: Number(row.avg_service_rating ?? 0),
    avg_liters_rating: Number(row.avg_liters_rating ?? 0),
    avg_performance_rating: Number(row.avg_performance_rating ?? 0),
    reviews_count: Number(row.reviews_count ?? 0),
    regular_price: row.regular_price !== null ? Number(row.regular_price) : null,
    premium_price: row.premium_price !== null ? Number(row.premium_price) : null,
    diesel_price: row.diesel_price !== null ? Number(row.diesel_price) : null,
    distance_km: row.distance_km !== null ? Number(row.distance_km) : null,
  };
}

/**
 * Obtiene la lista de gasolineras en Matamoros con precios más recientes
 * y distancia exacta en km calculada en PostGIS vía RPC `get_stations_with_prices`.
 */
export async function fetchStations({
  userLocation,
  sortBy,
  fuelType,
}: FetchStationsParams): Promise<StationWithPrices[]> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env para conectar con Supabase.'
    );
  }

  const { data, error } = await supabase.rpc('get_stations_with_prices', {
    user_lat: userLocation?.latitude ?? null,
    user_lng: userLocation?.longitude ?? null,
    sort_by: sortBy,
    target_fuel: fuelType,
  });

  if (error) {
    throw new Error(`No se pudieron cargar las gasolineras: ${error.message}`);
  }

  return (data ?? []).map(normalizeStationRow);
}

/**
 * Obtiene el detalle completo de una sola gasolinera incluyendo precios y distancia.
 */
export async function fetchStationById(
  stationId: string,
  userLocation?: Coordinates | null
): Promise<StationWithPrices | null> {
  const stations = await fetchStations({
    userLocation,
    sortBy: 'price',
    fuelType: 'regular',
  });

  return stations.find((station) => station.id === stationId) ?? null;
}
