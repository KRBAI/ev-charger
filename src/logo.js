/**
 * Orel EV Brand Logo Vector Component
 * Supports Adaptive Light & Dark mode rendering
 */
export function getLogoSvg(isDark = false) {
  const orelColor = isDark ? '#FFFFFF' : '#0F172A';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const badgeTextColor = isDark ? '#34D399' : '#059669';
  const hubBgColor = isDark ? '#041f17' : '#E6FDF4';

  return `
<svg viewBox="0 0 440 100" class="h-9 w-auto select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="orelGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="50%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Left Emblem: Circular Charging Hub Icon -->
  <g transform="translate(10, 10)">
    <!-- Outer Glow Ring -->
    <circle cx="40" cy="40" r="38" stroke="url(#orelGreenGrad)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="190 25" fill="${hubBgColor}" fill-opacity="0.9"/>
    <!-- Inner Accent Ring -->
    <circle cx="40" cy="40" r="28" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.4" fill="none" />
    <!-- Dynamic Lightning Bolt Symbol -->
    <path d="M43 18 L24 43 L37 43 L31 62 L54 35 L40 35 Z" fill="url(#boltGrad)" filter="url(#glowGreen)" />
  </g>

  <!-- Brand Typography -->
  <g transform="translate(100, 64)">
    <!-- "OREL" in Bold Sans -->
    <text font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-weight="900" font-size="46" fill="${orelColor}" letter-spacing="-0.04em">OREL</text>
    
    <!-- "EV" in Vibrant Emerald -->
    <text x="136" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-weight="900" font-size="46" fill="#10B981" letter-spacing="-0.03em">EV</text>
    
    <!-- Subtitle Badge: "NETWORK ADMIN" -->
    <text x="210" y="-30" font-family="'JetBrains Mono', monospace" font-weight="700" font-size="11" fill="${badgeTextColor}" letter-spacing="0.18em">ADMIN CONSOLE</text>
    <text x="210" y="-14" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="12" fill="${subtextColor}" letter-spacing="0.02em">OCPP 1.6-J Cloud</text>
  </g>
</svg>
`;
}

export const OREL_EV_LOGO_SVG = getLogoSvg(false);
