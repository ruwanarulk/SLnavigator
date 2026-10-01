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

export type ReviewDirection = 'TRAVELLER_TO_PROVIDER' | 'PROVIDER_TO_TRAVELLER';

/** What each side is asked to score, 1 to 5. Travellers' scores are public; providers' stay between providers. */
export const REVIEW_CRITERIA: Record<ReviewDirection, readonly { id: string; label: string }[]> = {
  TRAVELLER_TO_PROVIDER: [
    { id: 'punctuality', label: 'Punctuality' },
    { id: 'knowledge', label: 'Knowledge & communication' },
    { id: 'value', label: 'Value for money' },
    { id: 'safety', label: 'Safety' },
  ],
  PROVIDER_TO_TRAVELLER: [
    { id: 'clarity', label: 'Clarity of requirements' },
    { id: 'respect', label: 'Respectfulness' },
    { id: 'reliability', label: 'Reliability' },
  ],
};

/** Reviews open this many days after the trip's last day, to reflect the real experience. */
export const REVIEW_OPENS_AFTER_DAYS = 3;
/** Both reviews are revealed once both are in, or this many days after the window opens. */
export const REVIEW_REVEAL_AFTER_DAYS = 14;
/** Last day a review can be submitted, counted from when the window opens. */
export const REVIEW_CLOSES_AFTER_DAYS = 30;

export const DISPUTE_REASONS = [
  { id: 'NO_SHOW', label: 'Someone did not show up' },
  { id: 'SAFETY', label: 'A safety concern' },
  { id: 'SERVICE', label: 'The service was not as agreed' },
  { id: 'PRICE', label: 'A disagreement about price or payment' },
  { id: 'OTHER', label: 'Something else' },
] as const;
export type DisputeReasonId = (typeof DISPUTE_REASONS)[number]['id'];
