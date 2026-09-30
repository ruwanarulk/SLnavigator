import { estimateBudget, legCost, DEFAULT_BUDGET, vehiclesNeeded } from './budget';
import { estimateLeg, haversineKm, legTerrain, orderByNearest, planRoute } from './geo';
import { seasonFor } from './season';
import { dayLabels, formatDuration, tripDays } from './format';

const COLOMBO = { lat: 6.9271, lng: 79.8612 };
const KANDY = { lat: 7.2906, lng: 80.6337 };
const GALLE = { lat: 6.0329, lng: 80.2168 };

describe('geo', () => {
  it('measures Colombo–Kandy at roughly 94 km as the crow flies', () => {
    expect(haversineKm(COLOMBO, KANDY)).toBeGreaterThan(90);
    expect(haversineKm(COLOMBO, KANDY)).toBeLessThan(98);
  });

  it('knows the hill railway is slow and the lowland line is not', () => {
    const ELLA = { lat: 6.8667, lng: 81.0466 };
    const hillTrain = estimateLeg(KANDY, ELLA, 'TRAIN', legTerrain('hill', 'hill'));
    // Real timetable: roughly 6.5–7.5 h for ~140 km.
    expect(hillTrain.durationMin).toBeGreaterThanOrEqual(360);
    expect(hillTrain.durationMin).toBeLessThanOrEqual(480);
    const lowland = estimateLeg(COLOMBO, KANDY, 'TRAIN', legTerrain('west', 'hill'));
    // Real timetable: roughly 2.5–3.5 h.
    expect(lowland.durationMin).toBeGreaterThanOrEqual(150);
    expect(lowland.durationMin).toBeLessThanOrEqual(240);
    expect(lowland.durationMin % 5).toBe(0);
  });

  it('orders stops by nearest neighbour', () => {
    const ordered = orderByNearest(COLOMBO, [
      { id: 'kandy', ...KANDY },
      { id: 'galle', ...GALLE },
      { id: 'negombo', lat: 7.2008, lng: 79.8737 },
    ]);
    expect(ordered.map((p) => p.id)).toEqual(['negombo', 'kandy', 'galle']);
  });

  it('untangles zig-zags and loops back towards the start', () => {
    const ella = { id: 'ella', lat: 6.8667, lng: 81.0466 };
    const mirissa = { id: 'mirissa', lat: 5.9483, lng: 80.4716 };
    const sigiriya = { id: 'sigiriya', lat: 7.957, lng: 80.7603 };
    const ids = planRoute(COLOMBO, [
      { id: 'galle', ...GALLE },
      sigiriya,
      { id: 'kandy', ...KANDY },
      mirissa,
      ella,
    ], true).map((p) => p.id);
    // Either direction round the island is fine; it must not criss-cross.
    const loop = ['sigiriya', 'kandy', 'ella', 'mirissa', 'galle'];
    expect([loop, [...loop].reverse()]).toContainEqual(ids);
  });
});

describe('budget', () => {
  it('splits vehicles by seats', () => {
    expect(vehiclesNeeded('CAR_DRIVER', 3)).toBe(1);
    expect(vehiclesNeeded('CAR_DRIVER', 4)).toBe(2);
    expect(vehiclesNeeded('TRAIN', 6)).toBe(1);
  });

  it('charges trains per person and cars per vehicle', () => {
    expect(legCost({ mode: 'TRAIN', distanceKm: 100 }, 2)).toBeCloseTo(16);
    expect(legCost({ mode: 'CAR_DRIVER', distanceKm: 100 }, 2)).toBeCloseTo(55);
    expect(legCost({ mode: 'TUK_TUK', distanceKm: 1 }, 1)).toBe(3);
  });

  it('adds the buffer on top of every line item', () => {
    const b = estimateBudget({
      travelers: 2,
      nights: 2,
      entryFeesPerPerson: [30, 0],
      legs: [{ mode: 'CAR_DRIVER', distanceKm: 100 }],
      settings: { ...DEFAULT_BUDGET, guideDays: 1 },
    });
    expect(b.stays).toBe(190);
    expect(b.food).toBe(168);
    expect(b.entryFees).toBe(60);
    expect(b.guide).toBe(55);
    expect(b.transport).toBe(55);
    expect(b.buffer).toBe(53);
    expect(b.total).toBe(581);
    expect(b.perPerson).toBe(291);
  });

  it('never goes negative on odd input', () => {
    const b = estimateBudget({
      travelers: 0,
      nights: -3,
      entryFeesPerPerson: [],
      legs: [],
      settings: { ...DEFAULT_BUDGET, guideDays: -2, bufferPct: -5 },
    });
    expect(b.total).toBeGreaterThanOrEqual(0);
    expect(b.stays).toBe(0);
  });
});

describe('season', () => {
  it('knows the two monsoons', () => {
    expect(seasonFor('south', 0)).toBe('dry');
    expect(seasonFor('east', 0)).toBe('monsoon');
    expect(seasonFor('south', 5)).toBe('monsoon');
    expect(seasonFor('east', 6)).toBe('dry');
  });
});

describe('format', () => {
  it('formats durations like the route rail', () => {
    expect(formatDuration(250)).toBe('4 h 10 m');
    expect(formatDuration(45)).toBe('45 m');
    expect(formatDuration(120)).toBe('2 h');
  });

  it('labels multi-night stops as day ranges', () => {
    expect(dayLabels([1, 2, 1])).toEqual(['Day 1', 'Day 2–3', 'Day 4']);
  });

  it('puts a zero-night final stop on the departure day', () => {
    const nights = [1, 2, 1, 2, 2, 0];
    expect(dayLabels(nights)).toEqual(['Day 1', 'Day 2–3', 'Day 4', 'Day 5–6', 'Day 7–8', 'Day 9']);
    expect(tripDays(nights)).toBe(9);
  });
});
