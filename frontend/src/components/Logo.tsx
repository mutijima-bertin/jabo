import type { SVGProps } from "react";

/**
 * Creative Sound Studio logo — "CSS" monogram in a brass badge with a
 * soundwave motif, paired with a letter-spaced serif wordmark.
 * Self-contained SVG: the wordmark uses currentColor so it adapts to
 * cream (light) or photo (dark) backgrounds; the badge is fixed brass.
 */
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 264 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Creative Sound Studio"
      {...props}
    >
      <title>Creative Sound Studio</title>

      {/* Badge ring */}
      <circle cx="32" cy="32" r="25.5" stroke="url(#logo-brass)" strokeWidth="1.5" opacity="0.9" />
      {/* Badge face */}
      <circle cx="32" cy="32" r="21.5" fill="url(#logo-badge)" />
      {/* Soundwave motif */}
      <g fill="#FAF6EF">
        <rect x="19" y="37" width="2.6" height="4" rx="1.3" opacity="0.85" />
        <rect x="24.2" y="34.5" width="2.6" height="6.5" rx="1.3" />
        <rect x="29.4" y="31.5" width="2.6" height="9.5" rx="1.3" />
        <rect x="34.6" y="34.5" width="2.6" height="6.5" rx="1.3" opacity="0.85" />
        <rect x="39.8" y="37" width="2.6" height="4" rx="1.3" opacity="0.6" />
      </g>
      {/* CSS monogram */}
      <text
        x="29"
        y="27.5"
        textAnchor="middle"
        fontFamily="var(--font-fraunces), Georgia, serif"
        fontWeight="600"
        fontSize="14"
        letterSpacing="2.2"
        fill="#FAF6EF"
      >
        CSS
      </text>

      {/* Divider rule */}
      <rect x="74" y="33" width="46" height="1.5" rx="0.75" fill="url(#logo-brass)" />

      {/* Wordmark */}
      <text
        x="74"
        y="24"
        fontFamily="var(--font-fraunces), Georgia, serif"
        fontWeight="500"
        fontSize="15"
        letterSpacing="4.2"
        fill="currentColor"
      >
        CREATIVE SOUND
      </text>
      <text
        x="74"
        y="45"
        fontFamily="var(--font-fraunces), Georgia, serif"
        fontWeight="600"
        fontSize="17"
        letterSpacing="6.4"
        fill="currentColor"
      >
        STUDIO
      </text>

      <defs>
        <linearGradient id="logo-badge" x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BC9A63" />
          <stop offset="1" stopColor="#96743F" />
        </linearGradient>
        <linearGradient id="logo-brass" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B08D57" />
          <stop offset="1" stopColor="#8F6F3E" />
        </linearGradient>
      </defs>
    </svg>
  );
}
