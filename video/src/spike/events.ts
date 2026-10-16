/**
 * Spike test events. Values are copied verbatim from the M1 USGS fixtures in
 * quake-news-agent/src/workflows/quake_news/__fixtures__/ (not imported, to keep the packages decoupled).
 */
export type SpikeEvent = {
  id: string;
  source: string;
  magnitude: number;
  magType: string;
  place: string;
  latitude: number;
  longitude: number;
  /** Which side the globe approach starts from. 'east' makes the Kamchatka camera cross the antimeridian. */
  approachFrom: 'west' | 'east';
};

export const EVENTS = {
  noto: {
    id: 'us6000m0xl',
    source: 'event_us6000m0xl.json',
    magnitude: 7.5,
    magType: 'mww',
    place: 'Noto Peninsula, Japan', // USGS label: "2024 Noto Peninsula, Japan Earthquake"
    latitude: 37.4874,
    longitude: 137.271,
    approachFrom: 'west'
  },
  kamchatka: {
    id: 'us6000qw60',
    source: 'query_strongest.json',
    magnitude: 8.8,
    magType: 'mww',
    place: 'Kamchatka Peninsula, Russia', // USGS label: "2025 Kamchatka Peninsula, Russia Earthquake"
    latitude: 52.4948,
    longitude: 160.2395,
    approachFrom: 'east'
  }
} satisfies Record<string, SpikeEvent>;

export type EventKey = keyof typeof EVENTS;
