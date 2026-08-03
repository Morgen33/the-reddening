/** Resolve a place name to coordinates for the Reddening globe. */

type Coords = { lat: number; lng: number };

const KNOWN_PLACES: Record<string, Coords> = {
  "new york": { lat: 40.7128, lng: -74.006 },
  "new york city": { lat: 40.7128, lng: -74.006 },
  nyc: { lat: 40.7128, lng: -74.006 },
  manhattan: { lat: 40.7831, lng: -73.9712 },
  brooklyn: { lat: 40.6782, lng: -73.9442 },
  prague: { lat: 50.0755, lng: 14.4378 },
  bohemia: { lat: 50.0755, lng: 14.4378 },
  vienna: { lat: 48.2082, lng: 16.3738 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  la: { lat: 34.0522, lng: -118.2437 },
  venice: { lat: 45.4408, lng: 12.3155 },
  paris: { lat: 48.8566, lng: 2.3522 },
  london: { lat: 51.5074, lng: -0.1278 },
  rome: { lat: 41.9028, lng: 12.4964 },
  berlin: { lat: 52.52, lng: 13.405 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  cairo: { lat: 30.0444, lng: 31.2357 },
  istanbul: { lat: 41.0082, lng: 28.9784 },
  moscow: { lat: 55.7558, lng: 37.6173 },
  mexico: { lat: 19.4326, lng: -99.1332 },
  "mexico city": { lat: 19.4326, lng: -99.1332 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  "new orleans": { lat: 29.9511, lng: -90.0715 },
  boston: { lat: 42.3601, lng: -71.0589 },
  philadelphia: { lat: 39.9526, lng: -75.1652 },
  miami: { lat: 25.7617, lng: -80.1918 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  barcelona: { lat: 41.3874, lng: 2.1686 },
  lisbon: { lat: 38.7223, lng: -9.1393 },
  dublin: { lat: 53.3498, lng: -6.2603 },
  edinburgh: { lat: 55.9533, lng: -3.1883 },
  budapest: { lat: 47.4979, lng: 19.0402 },
  athens: { lat: 37.9838, lng: 23.7275 },
  jerusalem: { lat: 31.7683, lng: 35.2137 },
  shanghai: { lat: 31.2304, lng: 121.4737 },
  beijing: { lat: 39.9042, lng: 116.4074 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  rio: { lat: -22.9068, lng: -43.1729 },
  "rio de janeiro": { lat: -22.9068, lng: -43.1729 },
  "buenos aires": { lat: -34.6037, lng: -58.3816 },
  montreal: { lat: 45.5017, lng: -73.5673 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  vancouver: { lat: 49.2827, lng: -123.1207 },
};

function normalizePlace(place: string) {
  return place
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ");
}

export async function geocodePlace(
  place: string | null | undefined
): Promise<Coords | null> {
  if (!place?.trim()) return null;

  const normalized = normalizePlace(place);
  if (KNOWN_PLACES[normalized]) return KNOWN_PLACES[normalized];

  // Partial match: "harbor of New York" → new york
  for (const [key, coords] of Object.entries(KNOWN_PLACES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", place.trim());
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "TheReddening/1.0 (chronicle globe)",
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data[0]) return null;
    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
    };
  } catch {
    return null;
  }
}

export async function resolveCoords(opts: {
  place?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<{ lat: number | null; lng: number | null }> {
  if (opts.lat != null && opts.lng != null && !Number.isNaN(opts.lat) && !Number.isNaN(opts.lng)) {
    return { lat: opts.lat, lng: opts.lng };
  }
  const geo = await geocodePlace(opts.place);
  return {
    lat: geo?.lat ?? opts.lat ?? null,
    lng: geo?.lng ?? opts.lng ?? null,
  };
}
