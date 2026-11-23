import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

interface ProfecoBadgeProps {
  certified: boolean;
  compact?: boolean;
  verifiedAt?: string | null;
}

/**
 * Insignia visual de certificación Profeco ("Litros de a Litro").
 */
export function ProfecoBadge({
  certified,
  compact = false,
  verifiedAt,
}: ProfecoBadgeProps) {
  if (!certified) {
    return null;
  }

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityRole="text"
      accessibilityLabel="Gasolinera verificada por Profeco"
    >
      <Ionicons
        name="shield-checkmark"
        size={compact ? 12 : 14}
        color={colors.profecoBlue}
      />
      <Text style={[styles.label, compact && styles.labelCompact]}>
        {compact ? 'PROFECO' : 'Verificada PROFECO'}
      </Text>
      {!compact && verifiedAt ? (
        <Text style={styles.dateText}>· {verifiedAt}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.profecoBg,
    borderColor: colors.profecoBorder,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 4,
  },
  containerCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    ...typography.micro,
    color: colors.profecoBlue,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 10,
  },
  dateText: {
    ...typography.micro,
    color: colors.profecoBlue,
    fontWeight: '500',
  },
});
