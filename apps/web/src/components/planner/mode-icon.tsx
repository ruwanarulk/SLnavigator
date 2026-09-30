import type { TransportMode } from "@sln/core";
import { Bus, Car, CarFront, TrainFront, Zap } from "lucide-react";

const ICONS: Record<TransportMode, typeof Car> = {
  CAR_DRIVER: CarFront,
  SELF_DRIVE: Car,
  TUK_TUK: Zap,
  BUS: Bus,
  TRAIN: TrainFront,
};

export function ModeIcon({ mode, className = "size-4" }: { mode: TransportMode; className?: string }) {
  const Icon = ICONS[mode];
  return <Icon aria-hidden className={className} />;
}
