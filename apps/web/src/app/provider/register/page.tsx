import type { Metadata } from "next";
import { RegisterProvider } from "./register-provider";

export const metadata: Metadata = {
  title: "Register as a guide or company",
  description: "Join Sri Lanka Navigator as a verified guide, tour company or driver and bid on trip plans from international travellers.",
};

export default function RegisterProviderPage() {
  return <RegisterProvider />;
}
