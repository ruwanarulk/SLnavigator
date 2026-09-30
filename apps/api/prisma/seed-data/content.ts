type Mode = 'CAR_DRIVER' | 'SELF_DRIVE' | 'TUK_TUK' | 'BUS' | 'TRAIN';

export interface SeedItinerary {
  slug: string;
  title: string;
  summary: string;
  hue: string;
  tags: string[];
  /** [location slug, nights, mode to the next stop] */
  stops: [string, number, Mode?][];
}

export const ITINERARIES: SeedItinerary[] = [
  {
    slug: 'island-loop',
    title: 'Island Loop',
    summary: 'The classic first trip: rock fortress, sacred Kandy, the hill-country train and the south coast.',
    hue: 'sand',
    tags: ['culture', 'tea', 'beaches'],
    stops: [
      ['colombo', 1], ['sigiriya', 2], ['kandy', 1, 'TRAIN'], ['ella', 2], ['mirissa', 2], ['galle-fort', 0],
    ],
  },
  {
    slug: '7-day-cultural-triangle',
    title: '7-day Cultural Triangle',
    summary: 'Ancient capitals, cave temples and Sigiriya at sunrise.',
    hue: 'sand',
    tags: ['culture'],
    stops: [
      ['colombo', 1], ['anuradhapura', 1], ['sigiriya', 2], ['polonnaruwa', 1], ['kandy', 1], ['colombo', 0],
    ],
  },
  {
    slug: 'honeymoon-south-coast',
    title: 'Honeymoon South Coast',
    summary: 'Fort-town evenings, whale mornings, quiet bays and a leopard safari.',
    hue: 'sea',
    tags: ['beaches', 'wildlife'],
    stops: [
      ['galle-fort', 2], ['mirissa', 2], ['tangalle', 1], ['yala', 0],
    ],
  },
  {
    slug: 'tea-country-by-train',
    title: 'Tea Country by Train',
    summary: 'Ride the hill-country line one leg at a time and sleep among the estates.',
    hue: 'leaf',
    tags: ['tea', 'adventure'],
    stops: [
      ['kandy', 1, 'TRAIN'], ['nuwara-eliya', 1, 'TRAIN'], ['haputale', 1, 'TRAIN'], ['ella', 1],
    ],
  },
  {
    slug: 'east-coast-summer',
    title: 'East Coast Summer',
    summary: 'For May–September, when the east is dry: reefs, surf and lagoons.',
    hue: 'sea',
    tags: ['beaches', 'surfing'],
    stops: [
      ['kandy', 1], ['trincomalee', 1], ['nilaveli', 2], ['pasikudah', 1], ['arugam-bay', 3],
    ],
  },
];

/**
 * Sample providers for development and demos only. Every one is flagged
 * `isSample`, and the UI labels them so they are never mistaken for real businesses.
 */
export const SAMPLE_PROVIDERS = [
  {
    slug: 'kasun-perera', type: 'GUIDE', displayName: 'Kasun Perera', city: 'Kandy',
    bio: 'I grew up between Kandy and the Knuckles range and have guided birders and hikers for eight years. Slow mornings, early starts on the trail.',
    languages: ['English', 'German', 'Sinhala'], specialties: ['Birding', 'Hiking', 'Tea country'],
    areas: ['hill', 'cultural'], yearsActive: 8, verificationStatus: 'APPROVED',
    rating: 4.9, reviewCount: 86, responseTimeMin: 70, priceFromUsd: 60, priceToUsd: 110,
  },
  {
    slug: 'nadeesha-fernando', type: 'GUIDE', displayName: 'Nadeesha Fernando', city: 'Galle',
    bio: 'Fort walks, spice gardens and home-cooked rice and curry with my family. Licensed national guide.',
    languages: ['English', 'French', 'Sinhala'], specialties: ['Culture', 'Food'],
    areas: ['south', 'west'], yearsActive: 5, verificationStatus: 'APPROVED',
    rating: 4.8, reviewCount: 41, responseTimeMin: 95, priceFromUsd: 50, priceToUsd: 90,
  },
  {
    slug: 'tharindu-jayasinghe', type: 'GUIDE', displayName: 'Tharindu Jayasinghe', city: 'Tissamaharama',
    bio: 'Wildlife tracker and naturalist for Yala and Udawalawe. I plan safaris around animal behaviour, not the jeep queue.',
    languages: ['English', 'Sinhala'], specialties: ['Wildlife', 'Birding', 'Photography'],
    areas: ['south'], yearsActive: 11, verificationStatus: 'APPROVED',
    rating: 4.9, reviewCount: 132, responseTimeMin: 45, priceFromUsd: 70, priceToUsd: 140,
  },
  {
    slug: 'priya-sivakumar', type: 'GUIDE', displayName: 'Priya Sivakumar', city: 'Jaffna',
    bio: 'Temples, islands and the food of the north, told by someone who grew up here.',
    languages: ['English', 'Tamil'], specialties: ['Culture', 'Food'],
    areas: ['north', 'east'], yearsActive: 3, verificationStatus: 'APPROVED',
    rating: 4.7, reviewCount: 18, responseTimeMin: 120, priceFromUsd: 45, priceToUsd: 80,
  },
  {
    slug: 'palmyra-road-tours', type: 'COMPANY', displayName: 'Palmyra Road Tours', city: 'Colombo',
    bio: 'Round-island tours for families and small groups with our own air-conditioned fleet and a team of licensed chauffeur guides.',
    languages: ['English', 'German', 'Russian', 'Sinhala'], specialties: ['Family', 'Culture', 'Multi-day'],
    areas: ['west', 'cultural', 'hill', 'south'], yearsActive: 14, verificationStatus: 'APPROVED',
    rating: 4.6, reviewCount: 214, responseTimeMin: 60, priceFromUsd: 90, priceToUsd: 180,
  },
  {
    slug: 'hill-line-transfers', type: 'TRANSPORT', displayName: 'Hill Line Transfers', city: 'Negombo',
    bio: 'Airport pickups and point-to-point transfers in cars and vans with English-speaking drivers.',
    languages: ['English', 'Sinhala'], specialties: ['Airport transfer', 'Car & driver'],
    areas: ['west', 'hill', 'south'], yearsActive: 6, verificationStatus: 'APPROVED',
    rating: 4.5, reviewCount: 97, responseTimeMin: 30, priceFromUsd: 40, priceToUsd: 70,
  },
] as const;

/** Approximate units per USD; refresh from a rates provider before launch. */
export const FX_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.78, AUD: 1.52, INR: 84, CNY: 7.2, RUB: 92, LKR: 298,
};
