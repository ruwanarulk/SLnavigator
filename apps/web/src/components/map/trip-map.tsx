"use client";

import clsx from "clsx";
import { Component, type ReactNode } from "react";
import { GoogleTripMap } from "./google-map";
import { markGoogleFailed, useGoogleFailed } from "./google-status";
import { IslandMap } from "./island-map";
import type { TripMapProps } from "./types";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Any error inside the Google map switches to the island map instead of crashing the page. */
class GoogleErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch() {
    markGoogleFailed();
  }

  render() {
    return this.state.crashed ? null : this.props.children;
  }
}

/** Google Maps when a browser key is configured and working, otherwise the built-in island map. */
export function TripMap({ className, ...props }: TripMapProps) {
  const failed = useGoogleFailed();
  if (!KEY) return <IslandMap className={className} {...props} />;
  // The Google map stays mounted even after it fails: unmounting it while
  // Google is in an error state makes its marker cleanup throw.
  return (
    <div className={clsx("relative overflow-hidden", className)}>
      <GoogleErrorBoundary>
        <GoogleTripMap apiKey={KEY} className={clsx("absolute inset-0", failed && "invisible")} {...props} />
      </GoogleErrorBoundary>
      {failed && <IslandMap className="absolute inset-0" {...props} />}
    </div>
  );
}
