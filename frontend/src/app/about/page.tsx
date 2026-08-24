import type { Metadata } from "next";
import { MapPin, Mail, Phone } from "lucide-react";
import { fetchSettings, s } from "@/lib/content";

export const metadata: Metadata = {
  title: "About — Creative Sound Studio",
  description: "Creative Sound Studio is a Kigali-based media production company by video journalist Nkurunziza Jabo, working with FAO, The New Times, Kigali Today and Radio 10.",
};

export default async function AboutPage() {
  const settings = await fetchSettings();

  return (
    <div className="mx-auto max-w-4xl px-4 py-20">
      <h1 className="font-serif text-3xl font-semibold leading-tight md:text-5xl">About the studio</h1>
      <p className="mt-8 leading-relaxed text-ink/70">{s(settings, "about_story", "en")}</p>
      <p className="mt-6 leading-relaxed text-ink/60">
        Every production — a wedding, a documentary, a live congress, a corporate film — is treated as a story worth telling
        properly. We plan, shoot, edit and deliver on time, and we keep our clients informed at every step with a personal
        tracking link, from the moment a booking is confirmed to final delivery.
      </p>

      <h2 className="mt-16 font-serif text-2xl font-semibold">Contact</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/70 p-5 shadow-sm">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
          <div>
            <p className="text-sm font-semibold">Location</p>
            <p className="mt-1 text-sm text-ink/60">{s(settings, "contact_location", "en")}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/70 p-5 shadow-sm">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
          <div>
            <p className="text-sm font-semibold">Email</p>
            <p className="mt-1 text-sm text-ink/60">{s(settings, "contact_email", "en")}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/70 p-5 shadow-sm">
          <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
          <div>
            <p className="text-sm font-semibold">Phone / WhatsApp</p>
            <p className="mt-1 text-sm text-ink/60">{s(settings, "contact_phone", "en")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}