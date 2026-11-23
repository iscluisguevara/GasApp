import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreateReviewInput } from '@/types/database.types';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

interface ReviewFormProps {
  stationId: string;
  onSubmit: (input: CreateReviewInput) => Promise<void>;
}

interface StarRowProps {
  label: string;
  helper: string;
  value: number;
  onChange: (rating: number) => void;
}

function StarRatingRow({ label, helper, value, onChange }: StarRowProps) {
  return (
    <View style={styles.starRowContainer}>
      <View style={styles.starLabelGroup}>
        <Text style={styles.starLabel}>{label}</Text>
        <Text style={styles.starHelper}>{helper}</Text>
      </View>

      <View style={styles.starsGroup}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${star} de 5 estrellas`}
          >
            <Ionicons
              name={star <= value ? 'star' : 'star-outline'}
              size={24}
              color={star <= value ? colors.accent : colors.borderStrong}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * Formulario para calificar una gasolinera en 3 dimensiones:
 * 1) Trato / Atención
 * 2) Litros exactos
 * 3) Rendimiento de gasolina
 * + comentario opcional.
 */
export function ReviewForm({ stationId, onSubmit }: ReviewFormProps) {
  const [authorName, setAuthorName] = useState<string>('');
  const [serviceRating, setServiceRating] = useState<number>(5);
  const [litersRating, setLitersRating] = useState<number>(5);
  const [performanceRating, setPerformanceRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        station_id: stationId,
        author_name: authorName.trim() || 'Conductor de Matamoros',
        service_rating: serviceRating,
        liters_rating: litersRating,
        performance_rating: performanceRating,
        comment: comment.trim(),
      });

      setComment('');
      setSuccessMessage('¡Gracias! Tu calificación ya se publicó.');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'No pudimos guardar tu reseña. Intenta de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Califica esta gasolinera</Text>
      <Text style={styles.subtitle}>
        Ayuda a otros conductores en Matamoros compartiendo tu experiencia real.
      </Text>

      <View style={styles.ratingsList}>
        <StarRatingRow
          label="Trato y atención"
          helper="Amabilidad y rapidez del personal"
          value={serviceRating}
          onChange={setServiceRating}
        />
        <StarRatingRow
          label="Litros exactos"
          helper="Confianza en el despacho de combustible"
          value={litersRating}
          onChange={setLitersRating}
        />
        <StarRatingRow
          label="Rendimiento de gasolina"
          helper="Kilómetros por litro y calidad percibida"
          value={performanceRating}
          onChange={setPerformanceRating}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Tu nombre (opcional)</Text>
        <TextInput
          value={authorName}
          onChangeText={setAuthorName}
          placeholder="Ej. Carlos G."
          placeholderTextColor={colors.textMuted}
          maxLength={60}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Comentario (opcional)</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Cuéntanos sobre filas, pagos con tarjeta, bombas o rendimiento..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          maxLength={600}
          textAlignVertical="top"
          style={[styles.input, styles.textArea]}
        />
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled,
          pressed && !isSubmitting && styles.submitButtonPressed,
        ]}
        accessibilityRole="button"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.textInverse} size="small" />
        ) : (
          <>
            <Ionicons name="send" size={16} color={colors.textInverse} />
            <Text style={styles.submitButtonText}>Publicar calificación</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
  ratingsList: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  starRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  starLabelGroup: {
    flex: 1,
  },
  starLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  starHelper: {
    ...typography.micro,
    color: colors.textMuted,
    fontWeight: '400',
  },
  starsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.body,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 84,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  successText: {
    ...typography.caption,
    color: colors.success,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
