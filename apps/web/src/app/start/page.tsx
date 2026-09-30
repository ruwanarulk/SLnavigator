import type { Metadata } from "next";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Start planning" };

export default function StartPage() {
  return <Onboarding />;
}
