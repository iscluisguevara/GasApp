#!/usr/bin/env node
/**
 * Sincronizador oficial CNE/CRE -> Supabase para Heroica Matamoros, Tamaulipas.
 *
 * Descarga los feeds XML públicos de estaciones y precios de la CRE, filtra
 * únicamente las estaciones dentro del polígono de Matamoros, detecta su marca
 * comercial y realiza un upsert masivo en `public.stations` y `public.daily_prices`.
 *
 * Uso:
 *   npm run sync-prices
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { XMLParser } = require('fast-xml-parser');
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------
const CRE_PLACES_URL = 'https://publicacionexterna.azurewebsites.net/publicaciones/places';
const CRE_PRICES_URL = 'https://publicacionexterna.azurewebsites.net/publicaciones/prices';

// Polígono geográfico de Heroica Matamoros, Tamaulipas
const MATAMOROS_BOUNDS = {
  minLat: 25.70,
  maxLat: 26.05,
  minLng: -97.70,
  maxLng: -97.10,
};

const VALID_FUEL_TYPES = new Set(['regular', 'premium', 'diesel']);

// ---------------------------------------------------------------------------
// Carga de variables de entorno (.env) sin dependencias extra
// ---------------------------------------------------------------------------
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers de transformación
// ---------------------------------------------------------------------------
function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getMatamorosDateISO() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Matamoros',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // YYYY-MM-DD
}

/**
 * Detecta la marca comercial a partir del nombre o razón social reportada a la CRE.
 */
function detectBrand(rawName) {
  const normalized = String(rawName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const rules = [
    { brand: 'Petro Seven', patterns: ['PETRO SEVEN', 'PETROSEVEN', 'PETRO 7', 'PETRO7', '7-ELEVEN', '7 ELEVEN', 'SEVEN ELEVEN', 'ICONN'] },
    { brand: 'OXXO Gas', patterns: ['OXXO', 'SERVICIOS GASOLINEROS DE MEXICO', 'SGM '] },
    { brand: 'KarzoGas', patterns: ['KARZO', 'KARZOGAS'] },
    { brand: 'Mobil', patterns: ['MOBIL', 'EXXON', 'SYNERGY'] },
    { brand: 'Gulf', patterns: ['GULF'] },
    { brand: 'Orsan', patterns: ['ORSAN'] },
    { brand: 'BP', patterns: ['BP ', ' BP', 'BRITISH PETROLEUM', 'BP ESTACIONES'] },
    { brand: 'Shell', patterns: ['SHELL'] },
    { brand: 'Total', patterns: ['TOTALENERGIES', 'TOTAL GAS', 'TOTAL '] },
    { brand: 'Rendichicas', patterns: ['RENDICHICAS'] },
    { brand: 'Hidrosina', patterns: ['HIDROSINA'] },
    { brand: 'RedCo', patterns: ['REDCO'] },
    { brand: 'Valero', patterns: ['VALERO'] },
    { brand: 'G500', patterns: ['G500'] },
    { brand: 'Chevron', patterns: ['CHEVRON'] },
    { brand: 'Arco', patterns: ['ARCO'] },
    { brand: 'Pemex', patterns: ['PEMEX', 'ESTACION DE SERVICIO', 'GASOLINERA', 'SERVICIO ', 'COMBUSTIBLES', 'ENERGETICOS', 'AUTOSERVICIO'] },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((p) => normalized.includes(p))) {
      return rule.brand;
    }
  }

  return 'Pemex';
}

function cleanStationName(rawName) {
  const cleaned = String(rawName || '').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'Estación de Servicio Matamoros';
}

async function fetchXml(url, label) {
  console.log(`Descargando ${label} desde ${url}...`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'GasoMatamorosSync/1.0 (+https://github.com/gasomatamoros)',
      Accept: 'application/xml, text/xml, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al descargar ${label} (${url})`);
  }

  const text = await response.text();
  if (!text || text.trim().length === 0) {
    throw new Error(`El feed XML de ${label} llegó vacío.`);
  }

  return text;
}

function isInsideMatamoros(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= MATAMOROS_BOUNDS.minLat &&
    lat <= MATAMOROS_BOUNDS.maxLat &&
    lng >= MATAMOROS_BOUNDS.minLng &&
    lng <= MATAMOROS_BOUNDS.maxLng
  );
}

// ---------------------------------------------------------------------------
// Flujo principal
// ---------------------------------------------------------------------------
async function main() {
  loadEnvFile(path.resolve(__dirname, '..', '.env'));

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseKey = serviceRoleKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Faltan credenciales de Supabase en .env (EXPO_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY o EXPO_PUBLIC_SUPABASE_ANON_KEY).'
    );
  }

  if (!serviceRoleKey) {
    console.warn(
      '⚠️  SUPABASE_SERVICE_ROLE_KEY no está definida en .env; usando EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Si las políticas RLS bloquean INSERT/UPDATE en stations o daily_prices, agrega SUPABASE_SERVICE_ROLE_KEY a tu archivo .env.'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Descargar ambos feeds XML en paralelo
  const [placesXml, pricesXml] = await Promise.all([
    fetchXml(CRE_PLACES_URL, 'estaciones (places)'),
    fetchXml(CRE_PRICES_URL, 'precios (prices)'),
  ]);

  // 2. Parsear ambos XML con fast-xml-parser
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
    trimValues: true,
  });

  const parsedPlaces = parser.parse(placesXml);
  const parsedPrices = parser.parse(pricesXml);

  const rawPlaces = toArray(parsedPlaces?.places?.place);
  const rawPricePlaces = toArray(parsedPrices?.places?.place);

  console.log(
    `XML parseado: ${rawPlaces.length} estaciones totales en México, ${rawPricePlaces.length} registros de precios.`
  );

  // 3. Indexar precios por place_id
  const pricesByPlaceId = new Map();
  for (const placeEntry of rawPricePlaces) {
    const placeId = String(placeEntry?.['@_place_id'] ?? '').trim();
    if (!placeId) continue;

    const gasPrices = toArray(placeEntry.gas_price);
    const fuelMap = pricesByPlaceId.get(placeId) ?? {};

    for (const gp of gasPrices) {
      const fuelType = String(gp?.['@_type'] ?? '').toLowerCase().trim();
      const rawVal = typeof gp === 'object' && gp !== null ? gp['#text'] : gp;
      const numericPrice = Number(rawVal);

      if (
        VALID_FUEL_TYPES.has(fuelType) &&
        Number.isFinite(numericPrice) &&
        numericPrice > 0 &&
        numericPrice < 100
      ) {
        fuelMap[fuelType] = Number(numericPrice.toFixed(2));
      }
    }

    if (Object.keys(fuelMap).length > 0) {
      pricesByPlaceId.set(placeId, fuelMap);
    }
  }

  // 4. Filtrar estaciones dentro del polígono de Heroica Matamoros
  const matamorosStations = [];
  const seenPermits = new Set();

  for (const place of rawPlaces) {
    const placeId = String(place?.['@_place_id'] ?? '').trim();
    const loc = place?.location ?? {};
    const lat = Number(loc.y);
    const lng = Number(loc.x);

    if (!isInsideMatamoros(lat, lng)) continue;

    const crePermit = String(place?.cre_id ?? '').trim() || `CRE-PLACE-${placeId}`;
    if (seenPermits.has(crePermit)) continue;
    seenPermits.add(crePermit);

    const name = cleanStationName(place?.name);
    const brand = detectBrand(name);
    const address =
      String(place?.address ?? '').trim() ||
      `Heroica Matamoros, Tamaulipas (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    matamorosStations.push({
      placeId,
      stationRow: {
        cre_permit: crePermit,
        name,
        brand,
        address,
        city: 'Matamoros',
        state: 'Tamaulipas',
        latitude: lat,
        longitude: lng,
        is_24_hours: true,
        opens_at: null,
        closes_at: null,
        is_active: true,
      },
      prices: pricesByPlaceId.get(placeId) ?? {},
    });
  }

  console.log(
    `Estaciones encontradas dentro de Heroica Matamoros: ${matamorosStations.length}`
  );

  if (matamorosStations.length === 0) {
    console.warn('No se encontraron estaciones en el rango de coordenadas de Matamoros.');
    return;
  }

  // Resumen rápido de marcas detectadas
  const brandCounts = matamorosStations.reduce((acc, item) => {
    acc[item.stationRow.brand] = (acc[item.stationRow.brand] || 0) + 1;
    return acc;
  }, {});
  console.log('Distribución por marca detectada:', brandCounts);

  // 5. Upsert masivo de estaciones en `public.stations` usando `cre_permit`
  const stationRows = matamorosStations.map((item) => item.stationRow);
  const { data: upsertedStations, error: stationsError } = await supabase
    .from('stations')
    .upsert(stationRows, { onConflict: 'cre_permit' })
    .select('id, cre_permit');

  if (stationsError) {
    if (stationsError.code === '42501') {
      throw new Error(
        `RLS bloqueó el upsert en public.stations (${stationsError.message}). ` +
          'Agrega SUPABASE_SERVICE_ROLE_KEY en tu archivo .env (Supabase Dashboard → Project Settings → API → service_role).'
      );
    }
    throw new Error(`Error al hacer upsert de estaciones: ${stationsError.message}`);
  }

  const stationIdByPermit = new Map(
    (upsertedStations ?? []).map((row) => [row.cre_permit, row.id])
  );
  console.log(`✅ Estaciones sincronizadas en public.stations: ${stationIdByPermit.size}`);

  // 6. Construir y hacer upsert masivo de precios del día en `public.daily_prices`
  const effectiveDate = getMatamorosDateISO();
  const priceRows = [];

  for (const item of matamorosStations) {
    const stationId = stationIdByPermit.get(item.stationRow.cre_permit);
    if (!stationId) continue;

    for (const [fuelType, priceMxn] of Object.entries(item.prices)) {
      priceRows.push({
        station_id: stationId,
        fuel_type: fuelType,
        price_mxn: priceMxn,
        effective_date: effectiveDate,
        source: 'CRE',
      });
    }
  }

  if (priceRows.length === 0) {
    console.warn('⚠️  Ninguna estación de Matamoros tuvo precios vigentes en el feed XML.');
    return;
  }

  // Upsert en lotes de 200 registros para evitar límites de payload
  const BATCH_SIZE = 200;
  let totalPricesUpserted = 0;

  for (let i = 0; i < priceRows.length; i += BATCH_SIZE) {
    const batch = priceRows.slice(i, i + BATCH_SIZE);
    const { error: pricesError } = await supabase
      .from('daily_prices')
      .upsert(batch, { onConflict: 'station_id,fuel_type,effective_date' });

    if (pricesError) {
      if (pricesError.code === '42501') {
        throw new Error(
          `RLS bloqueó el upsert en public.daily_prices (${pricesError.message}). ` +
            'Agrega SUPABASE_SERVICE_ROLE_KEY en tu archivo .env.'
        );
      }
      throw new Error(`Error al hacer upsert de precios: ${pricesError.message}`);
    }

    totalPricesUpserted += batch.length;
  }

  console.log(
    `✅ Precios del día (${effectiveDate}) sincronizados en public.daily_prices: ${totalPricesUpserted} registros.`
  );
  console.log('🎉 Sincronización completada con éxito.');
}

main().catch((err) => {
  console.error('❌ Error en la sincronización de Matamoros:', err.message);
  process.exit(1);
});
