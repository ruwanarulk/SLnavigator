export const INTERESTS = [
  { id: 'culture', label: 'Culture & temples' },
  { id: 'beaches', label: 'Beaches' },
  { id: 'wildlife', label: 'Wildlife' },
  { id: 'tea', label: 'Tea country' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'food', label: 'Food' },
  { id: 'wellness', label: 'Wellness & Ayurveda' },
  { id: 'surfing', label: 'Surfing' },
  { id: 'birding', label: 'Birding' },
] as const;
export type Interest = (typeof INTERESTS)[number]['id'];

export const CATEGORIES = [
  { id: 'temple', label: 'Temples' },
  { id: 'heritage', label: 'Heritage' },
  { id: 'beach', label: 'Beaches' },
  { id: 'wildlife', label: 'Wildlife' },
  { id: 'waterfall', label: 'Waterfalls' },
  { id: 'viewpoint', label: 'Viewpoints' },
  { id: 'hike', label: 'Hikes' },
  { id: 'town', label: 'Towns' },
  { id: 'nature', label: 'Nature' },
] as const;
export type Category = (typeof CATEGORIES)[number]['id'];

/** Climate regions. Sri Lanka has two monsoons that hit different coasts. */
export const REGIONS = [
  { id: 'west', label: 'West coast' },
  { id: 'south', label: 'South coast' },
  { id: 'hill', label: 'Hill country' },
  { id: 'cultural', label: 'Cultural Triangle' },
  { id: 'east', label: 'East coast' },
  { id: 'north', label: 'North' },
] as const;
export type Region = (typeof REGIONS)[number]['id'];

export const TRANSPORT_MODES = [
  { id: 'CAR_DRIVER', label: 'Car & driver', short: 'Car' },
  { id: 'SELF_DRIVE', label: 'Self-drive', short: 'Drive' },
  { id: 'TUK_TUK', label: 'Tuk-tuk', short: 'Tuk-tuk' },
  { id: 'BUS', label: 'Bus', short: 'Bus' },
  { id: 'TRAIN', label: 'Train', short: 'Train' },
] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number]['id'];

export const STAY_TIERS = ['guesthouse', 'boutique', 'luxury'] as const;
export type StayTier = (typeof STAY_TIERS)[number];

export const BUDGET_LEVELS = ['shoestring', 'comfortable', 'splurge'] as const;
export type BudgetLevel = (typeof BUDGET_LEVELS)[number];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'INR', 'CNY', 'RUB', 'LKR'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** What a guide's bid price covers. */
export const BID_INCLUSIONS = [
  { id: 'CAR_DRIVER', label: 'Car & driver' },
  { id: 'GUIDE', label: 'Guide, all days' },
  { id: 'ENTRY_FEES', label: 'Entry fees' },
  { id: 'ACCOMMODATION', label: 'Accommodation' },
  { id: 'MEALS', label: 'Meals' },
  { id: 'AIRPORT_PICKUP', label: 'Airport pickup' },
] as const;
export type BidInclusion = (typeof BID_INCLUSIONS)[number]['id'];

export const SERVICE_NEEDS = [
  { id: 'GUIDE_AND_TRANSPORT', label: 'Guide and transport' },
  { id: 'GUIDE_ONLY', label: 'Guide only' },
  { id: 'TRANSPORT_ONLY', label: 'Transport only' },
] as const;
export type ServiceNeedId = (typeof SERVICE_NEEDS)[number]['id'];

/** Bidding windows a traveller can choose, in hours. */
export const BID_WINDOWS = [24, 48, 72] as const;
