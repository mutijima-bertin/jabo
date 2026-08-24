import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Track a Production — Creative Sound Studio",
  description: "Track the status of your production — from booking confirmation to final delivery.",
};

export default function TrackHomePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <Logo className="mx-auto h-14 w-auto" />
      <h1 className="mt-10 font-serif text-3xl font-semibold leading-tight">Track a production</h1>
      <p className="mt-4 text-ink/60">
        Use the personal tracking link you received by email or WhatsApp. If you lost it, contact us and we&apos;ll send a new one.
      </p>
      <p className="mt-8 text-sm text-ink/45">hello@creativesoundstudio.rw · +250 700 000 000</p>
    </div>
  );
}