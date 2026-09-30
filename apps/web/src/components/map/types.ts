import type { TransportMode } from "@sln/core";
import type { LocationCard } from "@/lib/types";

export interface TripMapProps {
  /** Every place that can be shown as a marker. */
  places: LocationCard[];
  /** Ordered stops drawn as the route. */
  route: { location: LocationCard; modeToNext: TransportMode }[];
  selectedId?: string | null;
  onSelect?: (place: LocationCard) => void;
  /** Places in these regions render faded (monsoon overlay). */
  fadedRegions?: Set<string>;
  /** Show only route stations, no other markers. */
  routeOnly?: boolean;
  /** Suggested add-on, drawn as a dashed "+ NAME" marker. */
  suggestion?: LocationCard | null;
  /** Static thumbnail: fit to the route, no controls. */
  compact?: boolean;
  className?: string;
}
