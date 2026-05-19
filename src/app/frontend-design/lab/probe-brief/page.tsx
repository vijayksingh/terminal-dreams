import type { Metadata } from "next";
import { ProbeTriagePage } from "@/components/sdp/requirement-lab/ProbeTriagePage";

export const metadata: Metadata = {
  title: "Triage the brief — Requirement Lab",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ProbeTriagePage />;
}
