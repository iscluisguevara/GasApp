import {
  ensureAuthenticatedSession,
  isSupabaseConfigured,
  supabase,
} from '@/services/supabase';
import { CreateReviewInput, Review } from '@/types/database.types';

function normalizeReview(row: Review): Review {
  return {
    ...row,
    service_rating: Number(row.service_rating),
    liters_rating: Number(row.liters_rating),
    performance_rating: Number(row.performance_rating),
    overall_rating: Number(row.overall_rating),
  };
}

/**
 * Lee las reseñas más recientes de una gasolinera.
 */
export async function fetchReviewsByStation(stationId: string): Promise<Review[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase no está configurado en el archivo .env.');
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('station_id', stationId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`No se pudieron cargar las reseñas: ${error.message}`);
  }

  return (data ?? []).map(normalizeReview);
}

/**
 * Crea una nueva reseña para una gasolinera.
 * El trigger en PostgreSQL recalcula automáticamente `avg_rating` y `reviews_count`.
 */
export async function createReview(input: CreateReviewInput): Promise<Review> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase no está configurado en el archivo .env.');
  }

  const trimmedAuthor = input.author_name.trim() || 'Conductor de Matamoros';
  const trimmedComment = input.comment.trim();

  if (
    input.service_rating < 1 ||
    input.service_rating > 5 ||
    input.liters_rating < 1 ||
    input.liters_rating > 5 ||
    input.performance_rating < 1 ||
    input.performance_rating > 5
  ) {
    throw new Error('Las calificaciones deben estar entre 1 y 5 estrellas.');
  }

  const session = await ensureAuthenticatedSession();

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      station_id: input.station_id,
      user_id: session?.user.id ?? null,
      author_name: trimmedAuthor,
      service_rating: input.service_rating,
      liters_rating: input.liters_rating,
      performance_rating: input.performance_rating,
      comment: trimmedComment.length > 0 ? trimmedComment : null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`No se pudo publicar tu reseña: ${error?.message ?? 'Error desconocido'}`);
  }

  return normalizeReview(data);
}
