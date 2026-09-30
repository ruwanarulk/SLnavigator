import type { BudgetLevel, StayTier, TransportMode } from './constants';

/**
 * Planning-grade price assumptions in USD. These are estimates for the budget
 * planner, not quotes; ops should review them each season.
 */
export const RATES = {
  /** Per room per night; rooms hold two travellers. */
  stayPerRoomNight: { guesthouse: 35, boutique: 95, luxury: 240 } satisfies Record<StayTier, number>,
  /** Per person per day. */
  foodPerPersonDay: { shoestring: 12, comfortable: 28, splurge: 60 } satisfies Record<BudgetLevel, number>,
  /** Per km. `perVehicle` modes are shared by the group; others are per person. */
  transportPerKm: {
    CAR_DRIVER: { rate: 0.55, perVehicle: true, minimum: 25 },
    SELF_DRIVE: { rate: 0.3, perVehicle: true, minimum: 30 },
    TUK_TUK: { rate: 0.4, perVehicle: true, minimum: 3 },
    BUS: { rate: 0.03, perVehicle: false, minimum: 1 },
    TRAIN: { rate: 0.08, perVehicle: false, minimum: 3 },
  } satisfies Record<TransportMode, { rate: number; perVehicle: boolean; minimum: number }>,
  /** Seats per car/van/tuk-tuk before a second vehicle is needed. */
  seatsPerVehicle: { CAR_DRIVER: 3, SELF_DRIVE: 4, TUK_TUK: 2 } as Partial<Record<TransportMode, number>>,
  /** Licensed guide day rate, used until real bids exist. */
  guidePerDay: 55,
};

export interface BudgetSettings {
  stayTier: StayTier;
  foodLevel: BudgetLevel;
  guideDays: number;
  bufferPct: number;
}

export const DEFAULT_BUDGET: BudgetSettings = {
  stayTier: 'boutique',
  foodLevel: 'comfortable',
  guideDays: 0,
  bufferPct: 10,
};

export interface BudgetLeg {
  mode: TransportMode;
  distanceKm: number;
}

export interface BudgetInput {
  travelers: number;
  /** Number of nights across the trip. */
  nights: number;
  /** Per-person entry fees of every stop, in USD. */
  entryFeesPerPerson: number[];
  legs: BudgetLeg[];
  settings: BudgetSettings;
}

export interface BudgetBreakdown {
  stays: number;
  transport: number;
  guide: number;
  food: number;
  entryFees: number;
  buffer: number;
  total: number;
  perPerson: number;
}

export function vehiclesNeeded(mode: TransportMode, travelers: number): number {
  const seats = RATES.seatsPerVehicle[mode];
  return seats ? Math.max(1, Math.ceil(travelers / seats)) : 1;
}

export function legCost(leg: BudgetLeg, travelers: number): number {
  const r = RATES.transportPerKm[leg.mode];
  const unit = Math.max(r.minimum, leg.distanceKm * r.rate);
  return unit * (r.perVehicle ? vehiclesNeeded(leg.mode, travelers) : travelers);
}

/** All outputs are whole USD. */
export function estimateBudget(input: BudgetInput): BudgetBreakdown {
  const travelers = Math.max(1, input.travelers);
  const nights = Math.max(0, input.nights);
  const days = nights + 1;
  const { settings } = input;

  const rooms = Math.ceil(travelers / 2);
  const stays = Math.round(RATES.stayPerRoomNight[settings.stayTier] * rooms * nights);
  const transport = Math.round(input.legs.reduce((sum, l) => sum + legCost(l, travelers), 0));
  const guide = Math.round(RATES.guidePerDay * Math.min(Math.max(0, settings.guideDays), days));
  const food = Math.round(RATES.foodPerPersonDay[settings.foodLevel] * travelers * days);
  const entryFees = Math.round(input.entryFeesPerPerson.reduce((s, f) => s + f, 0) * travelers);
  const subtotal = stays + transport + guide + food + entryFees;
  const buffer = Math.round((subtotal * Math.max(0, settings.bufferPct)) / 100);
  const total = subtotal + buffer;
  return { stays, transport, guide, food, entryFees, buffer, total, perPerson: Math.round(total / travelers) };
}

/** Converts whole USD to the display currency using units-per-USD rates. */
export function convert(usd: number, perUsd: number): number {
  return Math.round(usd * perUsd);
}

export function formatMoney(amount: number, currency: string, locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
