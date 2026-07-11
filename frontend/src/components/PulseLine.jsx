// The one bold signature element in this app: a calm ECG-style waveform that
// stands in for "a system actively watching your vitals." Amplitude and
// color shift with the health band so it stays meaningful, not decorative.
export default function PulseLine({ band = "unknown" }) {
  const color =
    band === "good"
      ? "var(--color-good)"
      : band === "warn"
      ? "var(--color-warn)"
      : band === "alert"
      ? "var(--color-alert)"
      : "var(--color-text-faint)";

  const path =
    band === "alert"
      ? "M0,30 L40,30 L52,8 L64,52 L76,4 L88,30 L110,30 L122,14 L134,44 L146,30 L400,30"
      : band === "warn"
      ? "M0,30 L60,30 L72,16 L84,40 L96,30 L400,30"
      : "M0,30 L120,30 L128,22 L136,30 L400,30";

  return (
    <svg
      viewBox="0 0 400 60"
      className="pulse-line w-full h-12"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}
