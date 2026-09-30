import type { Region } from './constants';

export type Season = 'dry' | 'shoulder' | 'monsoon';

/**
 * Month-by-month outlook per region (index 0 = January).
 * South-west monsoon (Yala) hits the west, south and hill country May–Sep;
 * north-east monsoon (Maha) hits the east and north roughly Oct–Jan.
 */
const TABLE: Record<Region, Season[]> = {
  west:     ['dry', 'dry', 'dry', 'shoulder', 'monsoon', 'monsoon', 'shoulder', 'shoulder', 'monsoon', 'monsoon', 'shoulder', 'dry'],
  south:    ['dry', 'dry', 'dry', 'shoulder', 'monsoon', 'monsoon', 'shoulder', 'shoulder', 'shoulder', 'monsoon', 'shoulder', 'dry'],
  hill:     ['dry', 'dry', 'dry', 'shoulder', 'monsoon', 'monsoon', 'monsoon', 'shoulder', 'shoulder', 'monsoon', 'monsoon', 'shoulder'],
  cultural: ['shoulder', 'dry', 'dry', 'dry', 'shoulder', 'dry', 'dry', 'dry', 'dry', 'shoulder', 'monsoon', 'monsoon'],
  east:     ['monsoon', 'shoulder', 'shoulder', 'dry', 'dry', 'dry', 'dry', 'dry', 'dry', 'shoulder', 'monsoon', 'monsoon'],
  north:    ['shoulder', 'dry', 'dry', 'dry', 'dry', 'dry', 'dry', 'dry', 'dry', 'shoulder', 'monsoon', 'monsoon'],
};

export function seasonFor(region: Region, month: number): Season {
  return TABLE[region][((month % 12) + 12) % 12];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** One-line advice for the Explore banner, e.g. "January is dry season in the south and west." */
export function seasonHeadline(month: number): string {
  const m = MONTHS[month];
  const dryWestSouth = seasonFor('south', month) === 'dry';
  const dryEast = seasonFor('east', month) === 'dry';
  if (dryWestSouth && !dryEast) {
    return `${m} is dry season in the south and west. The east coast has its monsoon now, so beach picks lean to Mirissa and Galle.`;
  }
  if (dryEast && !dryWestSouth) {
    return `${m} is the east coast's best stretch. The south-west monsoon brings rain to Galle and the hills, so beach picks lean to Trincomalee and Arugam Bay.`;
  }
  return `${m} is a shoulder month: expect some showers on most coasts, with fewer crowds and lower prices.`;
}
