import { buildStarterRoute, defaultMode, suggestNearby, type Candidate } from './planner.logic';

const loc = (slug: string, lat: number, lng: number, extra: Partial<Candidate> = {}): Candidate => ({
  id: slug,
  slug,
  name: slug,
  category: 'heritage',
  region: 'south',
  tags: [],
  lat,
  lng,
  rating: 4.5,
  avgDurationMin: 120,
  ...extra,
});

const PLACES = [
  loc('colombo', 6.9271, 79.8612, { category: 'town', region: 'west' }),
  loc('kandy', 7.2906, 80.6337, { category: 'town', region: 'hill', tags: ['culture'] }),
  loc('temple-of-the-tooth', 7.2936, 80.6413, { region: 'hill', tags: ['culture'] }),
  loc('sigiriya', 7.957, 80.7603, { region: 'cultural', tags: ['culture'] }),
  loc('ella', 6.8667, 81.0466, { category: 'town', region: 'hill', tags: ['tea'] }),
  loc('little-adams-peak', 6.8702, 81.0617, { category: 'hike', region: 'hill', tags: ['adventure'] }),
  loc('mirissa', 5.9483, 80.4716, { category: 'beach', tags: ['beaches'] }),
  loc('galle-fort', 6.0269, 80.217, { tags: ['culture'] }),
  loc('arugam-bay', 6.84, 81.836, { category: 'beach', region: 'east', tags: ['beaches'] }),
];

describe('buildStarterRoute', () => {
  it('fills the requested number of days exactly', () => {
    const route = buildStarterRoute(PLACES, ['culture', 'beaches'], 9, 0);
    const nights = route.reduce((s, r) => s + r.nights, 0);
    expect(nights).toBe(8);
    expect(route[route.length - 1].nights).toBe(0);
  });

  it('starts at the airport city on week-long trips', () => {
    expect(buildStarterRoute(PLACES, ['culture'], 9, 0)[0].locationId).toBe('colombo');
  });

  it('never puts two overnight stops within walking distance of each other', () => {
    const ids = buildStarterRoute(PLACES, ['culture', 'tea', 'adventure'], 14, 0).map((r) => r.locationId);
    expect(ids.includes('kandy') && ids.includes('temple-of-the-tooth')).toBe(false);
  });

  it('sleeps in the base town rather than at the attraction', () => {
    const ids = buildStarterRoute(PLACES, ['culture', 'adventure'], 10, 0).map((r) => r.locationId);
    expect(ids).not.toContain('temple-of-the-tooth');
    expect(ids).not.toContain('little-adams-peak');
    expect(ids).toContain('kandy');
  });

  it('avoids the east coast during its January monsoon when interests tie', () => {
    const ids = buildStarterRoute(PLACES, ['beaches'], 5, 0).map((r) => r.locationId);
    expect(ids).toContain('mirissa');
    expect(ids).not.toContain('arugam-bay');
  });
});

describe('defaultMode', () => {
  it('uses the train between hill-line towns only', () => {
    expect(defaultMode('kandy', 'nuwara-eliya')).toBe('TRAIN');
    expect(defaultMode('kandy', 'ella')).toBe('TRAIN');
    expect(defaultMode('colombo', 'kandy')).toBe('CAR_DRIVER');
    expect(defaultMode('ella', 'mirissa')).toBe('CAR_DRIVER');
  });
});

describe('suggestNearby', () => {
  it('suggests Little Adam\'s Peak when Ella is on the route', () => {
    const ella = PLACES.find((p) => p.slug === 'ella')!;
    const [first] = suggestNearby([ella], PLACES, ['adventure']);
    expect(first.location.slug).toBe('little-adams-peak');
    expect(first.nearStopName).toBe('ella');
  });

  it('skips places already in the trip and towns', () => {
    const kandy = PLACES.find((p) => p.slug === 'kandy')!;
    const tooth = PLACES.find((p) => p.slug === 'temple-of-the-tooth')!;
    const slugs = suggestNearby([kandy, tooth], PLACES, []).map((s) => s.location.slug);
    expect(slugs).not.toContain('temple-of-the-tooth');
    expect(slugs).not.toContain('kandy');
  });
});
