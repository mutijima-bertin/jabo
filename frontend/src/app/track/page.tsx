import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { Logo } from "@/components/shared/Logo";
import { PageHeading } from "@/components/shared/PageHeading";

export const metadata: Metadata = {
  title: `Track a Production — ${BRAND}`,
  description: "Track the status of your production — from booking confirmation to final delivery.",
};

export default function TrackHomePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <Logo className="mx-auto h-14 w-auto" />
      <PageHeading title="track_page_title" sub="track_page_sub" titleCls="mt-10 font-serif text-3xl font-semibold leading-tight" />
      <p className="mt-8 text-sm text-ink/45">hello@creativesoundstudio.rw · +250 700 000 000</p>
    </div>
  );
}