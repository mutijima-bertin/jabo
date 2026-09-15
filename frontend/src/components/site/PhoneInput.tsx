"use client";

import { useState } from "react";
import { AsYouType, parsePhoneNumberFromString, type CountryCode, type PhoneNumber } from "libphonenumber-js";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cx, inputCls, inputErrorCls, labelCls } from "@/lib/ui";

interface CountryOption {
  /** ISO 3166-1 alpha-2 code used when formatting national numbers. */
  iso: CountryCode;
  /** E.164 calling code — also the <select> value. */
  code: string;
  /** Option label — flag emoji + dial code (flags inline, no assets). */
  label: string;
}

/**
 * Curated calling-code list: Rwanda first (default), then East African
 * neighbors, then the most common internationals. Google-show-as-you-type
 * style — typing an international prefix flips the select to match.
 */
const COUNTRIES: CountryOption[] = [
  { iso: "RW", code: "+250", label: "🇷🇼 +250" },
  { iso: "CD", code: "+243", label: "🇨🇩 +243" },
  { iso: "KE", code: "+254", label: "🇰🇪 +254" },
  { iso: "UG", code: "+256", label: "🇺🇬 +256" },
  { iso: "BI", code: "+257", label: "🇧🇮 +257" },
  { iso: "TZ", code: "+255", label: "🇹🇿 +255" },
  { iso: "NG", code: "+234", label: "🇳🇬 +234" },
  { iso: "ZA", code: "+27", label: "🇿🇦 +27" },
  { iso: "GH", code: "+233", label: "🇬🇭 +233" },
  { iso: "US", code: "+1", label: "🇺🇸/🇨🇦 +1" },
  { iso: "GB", code: "+44", label: "🇬🇧 +44" },
  { iso: "FR", code: "+33", label: "🇫🇷 +33" },
  { iso: "BE", code: "+32", label: "🇧🇪 +32" },
  { iso: "NL", code: "+31", label: "🇳🇱 +31" },
  { iso: "DE", code: "+49", label: "🇩🇪 +49" },
];

const DEFAULT_CODE = "+250";

const ISO_BY_CODE: Record<string, CountryCode> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c.iso]),
);

function codeForNumber(n: PhoneNumber): string {
  return `+${n.countryCallingCode}`;
}

/** Dial code to preselect from an E.164 value (unknown codes keep Rwanda). */
function initCode(value: string): string {
  if (!value) return DEFAULT_CODE;
  const n = parsePhoneNumberFromString(value);
  if (!n) return DEFAULT_CODE;
  const code = codeForNumber(n);
  return code in ISO_BY_CODE ? code : DEFAULT_CODE;
}

/** Display text for an E.164 value, in national format when the calling code
 *  is on the curated list (e.g. "0788 123 456"), international otherwise. */
function initText(value: string): string {
  if (!value) return "";
  const n = parsePhoneNumberFromString(value);
  if (!n) return "";
  const dial = codeForNumber(n);
  const inList = dial in ISO_BY_CODE;
  const iso = (n.country ?? (inList ? ISO_BY_CODE[dial] : undefined)) as CountryCode | undefined;
  const at = iso ? new AsYouType(iso) : new AsYouType();
  // AsYouType round-trips the canonical national/international format back into
  // its own as-you-type spacing, so the initial text matches live typing output.
  return at.input(inList ? n.formatNational() : n.formatInternational());
}

interface Props {
  id?: string;
  /** Optional label rendered above the field (BookingForm supplies its own). */
  label?: string;
  /** Controlled value — E.164 ("+250788123456") or "" while incomplete/invalid. */
  value: string;
  /** Emits "" while the number is incomplete or invalid, E.164 once valid. */
  onChange: (value: string) => void;
  /** True paints the red error ring on both the select and the input. */
  error?: boolean;
  autoComplete?: string;
}

/**
 * Google-style country-coded phone input. Formats as you type with
 * `AsYouType` from libphonenumber-js: national numbers space themselves per
 * the selected country ("0788 123 456"), and typing an international prefix
 * ("+1416…") auto-detects the country and flips the select to match.
 */
export function PhoneInput({ id, label, value, onChange, error = false, autoComplete = "tel" }: Props) {
  const { t } = useI18n();
  const [countryCode, setCountryCode] = useState(() => initCode(value));
  const [text, setText] = useState(() => initText(value));

  function handlePhoneChange(raw: string) {
    // A fresh AsYouType per keystroke is required: its `input()` APPENDS
    // text to its internal state, so reusing an instance would corrupt the
    // format once a value grows. Pass the full raw value each time instead.
    const international = raw.startsWith("+");
    const at = international ? new AsYouType() : new AsYouType(ISO_BY_CODE[countryCode]);
    const formatted = at.input(raw);
    setText(formatted);

    const n = at.getNumber();
    // International typing auto-detects the country from the calling code —
    // covers "+1" for both US and Canada (country stays US/CA once complete).
    if (international && n?.countryCallingCode) {
      const dial = `+${n.countryCallingCode}`;
      if (dial !== countryCode && dial in ISO_BY_CODE) {
        setCountryCode(dial);
      }
    }
    onChange(n?.isValid() ? n.number : "");
  }

  function handleCountryChange(nextCode: string) {
    setCountryCode(nextCode);
    if (!text) return;
    // Re-format whatever is typed under the newly selected country;
    // an international "+…" text keeps its international spacing.
    const at = new AsYouType(ISO_BY_CODE[nextCode]);
    const formatted = at.input(text);
    setText(formatted);
    const n = at.getNumber();
    onChange(n?.isValid() ? n.number : "");
  }

  return (
    <div>
      {label && (
        <label htmlFor={id} className={labelCls}>
          {label}
        </label>
      )}
      <div className="flex gap-2">
        {/* Country code select — flag emoji + dial code, chevron like the
            admin select pattern (selectWrap/selectChevron in lib/ui). */}
        <div className="relative shrink-0">
          <select
            aria-label={t("book_country_label")}
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            className={cx(
              "cursor-pointer appearance-none rounded-xl border bg-white/80 py-3 pl-3 pr-8 text-sm text-ink outline-none transition focus:border-brass",
              error ? "border-red-400 focus:border-red-500" : "border-ink/15",
            )}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        </div>

        <div className="min-w-0 flex-1">
          <input
            id={id}
            type="tel"
            inputMode="tel"
            value={text}
            onChange={(e) => handlePhoneChange(e.target.value)}
            autoComplete={autoComplete}
            aria-invalid={error || undefined}
            className={error ? inputErrorCls : inputCls}
          />
        </div>
      </div>
    </div>
  );
}