import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfecoBadge } from '@/components/ProfecoBadge';
import { ReviewForm } from '@/components/ReviewForm';
import { useLocation } from '@/hooks/useLocation';
import { fetchStationById } from '@/services/stationsService';
import { createReview, fetchReviewsByStation } from '@/services/reviewsService';
import {
  CreateReviewInput,
  Review,
  StationWithPrices,
} from '@/types/database.types';
import {
  formatDistanceKm,
  formatPriceMXN,
} from '@/utils/distanceHelper';
import { getStationScheduleStatus } from '@/utils/scheduleHelper';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueRow}>
        <Ionicons name="star" size={14} color={colors.accent} />
        <Text style={styles.metricValue}>
          {value > 0 ? value.toFixed(1) : '--'}
        </Text>
      </View>
    </View>
  );
}

/**
 * Pantalla de detalle de gasolinera:
 * precios diarios de Magna/Premium/Diésel, estado Abierta/Cerrada en Matamoros,
 * insignia Profeco, botón "Cómo llegar", desglose de calificaciones y reseñas.
 */
export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { location } = useLocation();

  const [station, setStation] = useState<StationWithPrices | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadStationData = useCallback(
    async (refreshing = false) => {
      if (!id) {
        setError('Identificador de gasolinera inválido.');
        setIsLoading(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [stationData, reviewsData] = await Promise.all([
          fetchStationById(id, location),
          fetchReviewsByStation(id),
        ]);

        if (!stationData) {
          setError('No encontramos esta gasolinera en Matamoros.');
        } else {
          setStation(stationData);
          setReviews(reviewsData);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el detalle de la estación.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id, location]
  );

  useEffect(() => {
    loadStationData(false);
  }, [loadStationData]);

  const handleOpenDirections = () => {
    if (!station) return;
    const label = encodeURIComponent(station.name);
    const coords = `${station.latitude},${station.longitude}`;
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${label}@${coords}`
        : `geo:0,0?q=${coords}(${label})`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords}`);
    });
  };

  const handleCreateReview = async (input: CreateReviewInput) => {
    await createReview(input);
    await loadStationData(true);
  };

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateText}>Cargando información de la estación...</Text>
      </View>
    );
  }

  if (error || !station) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="alert-circle-outline" size={38} color={colors.danger} />
        <Text style={styles.errorTitle}>{error ?? 'Estación no encontrada'}</Text>
        <Pressable onPress={() => loadStationData(false)} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const schedule = getStationScheduleStatus(
    station.is_24_hours,
    station.opens_at,
    station.closes_at
  );

  return (
    <>
      <Stack.Screen options={{ title: station.brand }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadStationData(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Encabezado de estación */}
        <View style={styles.headerCard}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.stationName}>{station.name}</Text>
              <Text style={styles.stationAddress}>{station.address}</Text>
              {station.neighborhood ? (
                <Text style={styles.neighborhood}>
                  Col. {station.neighborhood}, {station.city}, {station.state}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.badgesRow}>
            <View
              style={[
                styles.statusBadge,
                schedule.isOpen ? styles.statusOpen : styles.statusClosed,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: schedule.isOpen ? colors.success : colors.danger },
                ]}
              >
                {schedule.label} · {schedule.scheduleText}
              </Text>
            </View>

            <ProfecoBadge
              certified={station.profeco_certified}
              verifiedAt={station.profeco_verified_at}
            />
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.distanceInfo}>
              <Ionicons name="navigate" size={16} color={colors.primary} />
              <Text style={styles.distanceLabel}>
                A {formatDistanceKm(station.distance_km)} de ti
              </Text>
            </View>

            <Pressable
              onPress={handleOpenDirections}
              style={({ pressed }) => [
                styles.directionsButton,
                pressed && styles.directionsButtonPressed,
              ]}
            >
              <Ionicons name="map-outline" size={16} color={colors.textInverse} />
              <Text style={styles.directionsButtonText}>Cómo llegar</Text>
            </Pressable>
          </View>

          {station.cre_permit ? (
            <Text style={styles.creText}>Permiso CRE: {station.cre_permit}</Text>
          ) : null}
        </View>

        {/* Precios diarios */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Precios diarios (MXN / Litro)</Text>
          <View style={styles.pricesGrid}>
            <View style={[styles.priceTile, { backgroundColor: colors.fuelRegularBg }]}>
              <Text style={[styles.fuelTitle, { color: colors.fuelRegular }]}>
                Regular
              </Text>
              <Text style={[styles.fuelPrice, { color: colors.fuelRegular }]}>
                {formatPriceMXN(station.regular_price)}
              </Text>
            </View>

            <View style={[styles.priceTile, { backgroundColor: colors.fuelPremiumBg }]}>
              <Text style={[styles.fuelTitle, { color: colors.fuelPremium }]}>
                Premium
              </Text>
              <Text style={[styles.fuelPrice, { color: colors.fuelPremium }]}>
                {formatPriceMXN(station.premium_price)}
              </Text>
            </View>

            <View style={[styles.priceTile, { backgroundColor: colors.fuelDieselBg }]}>
              <Text style={[styles.fuelTitle, { color: colors.fuelDiesel }]}>
                Diésel
              </Text>
              <Text style={[styles.fuelPrice, { color: colors.fuelDiesel }]}>
                {formatPriceMXN(station.diesel_price)}
              </Text>
            </View>
          </View>
        </View>

        {/* Resumen de calificaciones */}
        <View style={styles.sectionCard}>
          <View style={styles.ratingHeader}>
            <Text style={styles.sectionTitle}>Calificación de la comunidad</Text>
            <View style={styles.overallBadge}>
              <Ionicons name="star" size={16} color={colors.accent} />
              <Text style={styles.overallValue}>
                {station.avg_rating > 0 ? station.avg_rating.toFixed(1) : 'N/D'}
              </Text>
              <Text style={styles.overallCount}>({station.reviews_count})</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricPill label="Trato" value={station.avg_service_rating} />
            <MetricPill label="Litros exactos" value={station.avg_liters_rating} />
            <MetricPill label="Rendimiento" value={station.avg_performance_rating} />
          </View>
        </View>

        {/* Formulario para agregar reseña */}
        <ReviewForm stationId={station.id} onSubmit={handleCreateReview} />

        {/* Lista de reseñas */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Reseñas recientes ({reviews.length})
          </Text>

          {reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>
              Aún no hay reseñas. Sé el primero en calificar esta gasolinera.
            </Text>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.author_name}</Text>
                    <View style={styles.reviewStars}>
                      <Ionicons name="star" size={13} color={colors.accent} />
                      <Text style={styles.reviewScore}>
                        {review.overall_rating.toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reviewBreakdown}>
                    Trato {review.service_rating}/5 · Litros {review.liters_rating}/5 ·
                    Rendimiento {review.performance_rating}/5
                  </Text>

                  {review.comment ? (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  stationName: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  stationAddress: {
    ...typography.body,
    color: colors.textSecondary,
  },
  neighborhood: {
    ...typography.caption,
    color: colors.textMuted,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusOpen: {
    backgroundColor: colors.successBg,
  },
  statusClosed: {
    backgroundColor: colors.dangerBg,
  },
  statusText: {
    ...typography.micro,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceLabel: {
    ...typography.subtitle,
    color: colors.primaryDark,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  directionsButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  directionsButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  creText: {
    ...typography.micro,
    color: colors.textMuted,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  pricesGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priceTile: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  fuelTitle: {
    ...typography.caption,
    fontWeight: '700',
  },
  fuelPrice: {
    ...typography.priceMedium,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  overallValue: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  overallCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricPill: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  emptyReviews: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  reviewsList: {
    gap: spacing.md,
  },
  reviewItem: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
    gap: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewAuthor: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reviewScore: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reviewBreakdown: {
    ...typography.micro,
    color: colors.textMuted,
  },
  reviewComment: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
