export const MATAMOROS_TIMEZONE = 'America/Matamoros';

export interface ScheduleStatus {
  isOpen: boolean;
  label: 'Abierta' | 'Cerrada ahora';
  scheduleText: string;
}

interface TimeParts {
  hours: number;
  minutes: number;
}

/**
 * Parsea una cadena de hora en formato "HH:MM" o "HH:MM:SS" a minutos desde medianoche.
 */
function parseTimeToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Obtiene la hora y minuto actual en la zona horaria oficial de Matamoros (America/Matamoros).
 */
export function getMatamorosTimeParts(referenceDate: Date = new Date()): TimeParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: MATAMOROS_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const formattedParts = formatter.formatToParts(referenceDate);
    const hourPart = formattedParts.find((part) => part.type === 'hour')?.value ?? '0';
    const minutePart = formattedParts.find((part) => part.type === 'minute')?.value ?? '0';

    const hours = Number(hourPart) % 24;
    const minutes = Number(minutePart);

    return { hours, minutes };
  } catch {
    // Fallback seguro si el motor JS del dispositivo carece de datos ICU completos
    return {
      hours: referenceDate.getHours(),
      minutes: referenceDate.getMinutes(),
    };
  }
}

/**
 * Formatea "06:00:00" en "6:00 AM" o "23:00:00" en "11:00 PM".
 */
export function formatTime12h(timeStr: string | null): string {
  if (!timeStr) return '--:--';
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;

  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const paddedMin = String(m).padStart(2, '0');
  return `${hour12}:${paddedMin} ${period}`;
}

/**
 * Determina si una gasolinera está "Abierta" o "Cerrada ahora"
 * utilizando la hora local de Matamoros, Tamaulipas (America/Matamoros).
 */
export function getStationScheduleStatus(
  is24Hours: boolean,
  opensAt: string | null,
  closesAt: string | null,
  referenceDate: Date = new Date()
): ScheduleStatus {
  if (is24Hours) {
    return {
      isOpen: true,
      label: 'Abierta',
      scheduleText: 'Abierto las 24 horas',
    };
  }

  const openMinutes = parseTimeToMinutes(opensAt);
  const closeMinutes = parseTimeToMinutes(closesAt);

  if (openMinutes === null || closeMinutes === null) {
    return {
      isOpen: false,
      label: 'Cerrada ahora',
      scheduleText: 'Horario no disponible',
    };
  }

  const { hours, minutes } = getMatamorosTimeParts(referenceDate);
  const nowMinutes = hours * 60 + minutes;

  // Soporta horarios que cruzan la medianoche (ej. 06:00 a 01:00)
  const isOpen =
    openMinutes <= closeMinutes
      ? nowMinutes >= openMinutes && nowMinutes < closeMinutes
      : nowMinutes >= openMinutes || nowMinutes < closeMinutes;

  return {
    isOpen,
    label: isOpen ? 'Abierta' : 'Cerrada ahora',
    scheduleText: `${formatTime12h(opensAt)} - ${formatTime12h(closesAt)}`,
  };
}
