export type FuelType = 'regular' | 'premium' | 'diesel';

export type StationSortOption = 'price' | 'rating' | 'distance';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Representa una gasolinera en la tabla `public.stations`.
 */
export interface Station {
  id: string;
  cre_permit: string | null;
  name: string;
  brand: string;
  logo_url: string | null;
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  is_24_hours: boolean;
  opens_at: string | null;   // Formato HH:MM:SS
  closes_at: string | null;  // Formato HH:MM:SS
  profeco_certified: boolean;
  profeco_verified_at: string | null;
  avg_rating: number;
  avg_service_rating: number;
  avg_liters_rating: number;
  avg_performance_rating: number;
  reviews_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Representa un precio diario en la tabla `public.daily_prices`.
 */
export interface DailyPrice {
  id: string;
  station_id: string;
  fuel_type: FuelType;
  price_mxn: number;
  effective_date: string;
  source: string;
  reported_by: string | null;
  updated_at: string;
}

/**
 * Representa una reseña de usuario en la tabla `public.reviews`.
 */
export interface Review {
  id: string;
  station_id: string;
  user_id: string | null;
  author_name: string;
  service_rating: number;
  liters_rating: number;
  performance_rating: number;
  overall_rating: number;
  comment: string | null;
  created_at: string;
}

/**
 * Resultado enriquecido devuelto por el RPC `get_stations_with_prices` (incluye precios y distancia PostGIS).
 */
export interface StationWithPrices {
  id: string;
  cre_permit: string | null;
  name: string;
  brand: string;
  logo_url: string | null;
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  is_24_hours: boolean;
  opens_at: string | null;
  closes_at: string | null;
  profeco_certified: boolean;
  profeco_verified_at: string | null;
  avg_rating: number;
  avg_service_rating: number;
  avg_liters_rating: number;
  avg_performance_rating: number;
  reviews_count: number;
  regular_price: number | null;
  premium_price: number | null;
  diesel_price: number | null;
  price_updated_at: string | null;
  distance_km: number | null;
}

/**
 * Payload para registrar una nueva reseña.
 */
export interface CreateReviewInput {
  station_id: string;
  author_name: string;
  service_rating: number;
  liters_rating: number;
  performance_rating: number;
  comment: string;
}

/**
 * Definición tipada del esquema de Supabase para el cliente oficial.
 */
export interface Database {
  public: {
    Tables: {
      stations: {
        Row: Station;
        Insert: Omit<
          Station,
          'id' | 'avg_rating' | 'avg_service_rating' | 'avg_liters_rating' | 'avg_performance_rating' | 'reviews_count' | 'created_at' | 'updated_at'
        > & { id?: string };
        Update: Partial<Station>;
      };
      daily_prices: {
        Row: DailyPrice;
        Insert: Omit<DailyPrice, 'id' | 'updated_at'> & { id?: string };
        Update: Partial<DailyPrice>;
      };
      reviews: {
        Row: Review;
        Insert: {
          station_id: string;
          user_id?: string | null;
          author_name: string;
          service_rating: number;
          liters_rating: number;
          performance_rating: number;
          comment?: string | null;
        };
        Update: Partial<Omit<Review, 'id' | 'overall_rating' | 'created_at'>>;
      };
    };
    Functions: {
      get_stations_with_prices: {
        Args: {
          user_lat?: number | null;
          user_lng?: number | null;
          sort_by?: StationSortOption;
          target_fuel?: FuelType;
        };
        Returns: StationWithPrices[];
      };
    };
    Enums: {
      fuel_type: FuelType;
    };
  };
}
