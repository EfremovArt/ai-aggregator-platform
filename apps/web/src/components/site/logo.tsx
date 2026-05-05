export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C5CFF" />
          <stop offset="0.5" stopColor="#22E3FF" />
          <stop offset="1" stopColor="#A0FF00" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="26" height="26" rx="7" stroke="url(#lg)" strokeWidth="2" />
      <path
        d="M10 20 L16 8 L22 20 M12 16 H20"
        stroke="url(#lg)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
