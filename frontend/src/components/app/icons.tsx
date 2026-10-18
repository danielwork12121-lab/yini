/** Icons drawn in the design files. Colours are the design's own, so they carry no props. */
const base = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const BellIcon = () => (
  <svg viewBox="0 0 46 50" stroke="#3A2418" strokeWidth="3.4" {...base}>
    <path d="M23 4 V7" /><path d="M9 36 V22 a14 14 0 0 1 28 0 V36 L41 40 H5 Z" /><path d="M18 44 a5 5 0 0 0 10 0" />
  </svg>
);
export const GearIcon = () => (
  <svg viewBox="0 0 24 24" stroke="#3A2418" strokeWidth="1.7" {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
export const HomeTabIcon = () => (
  <svg viewBox="0 0 66 62" stroke="#3A2418" strokeWidth="3.6" {...base}>
    <path d="M6 30 L33 6 L60 30" /><path d="M13 25 V56 H53 V25" /><path d="M27 56 V40 H39 V56" />
  </svg>
);
export const GrowTabIcon = () => (
  <svg viewBox="0 0 66 62" stroke="#3A2418" strokeWidth="3.6" {...base}>
    <path d="M31 58 V30" /><path d="M31 32 C30 18 20 12 6 14 C6 28 16 34 31 32 Z" fill="#B9C29B" /><path d="M31 28 C34 12 46 4 62 6 C60 22 48 30 31 28 Z" fill="#B9C29B" />
  </svg>
);
export const GlowTabIcon = () => (
  <svg viewBox="0 0 66 62" stroke="#3A2418" strokeWidth="3.6" {...base}>
    <path d="M33 56 C14 42 5 32 5 20 A13 13 0 0 1 33 14 A13 13 0 0 1 61 20 C61 32 52 42 33 56 Z" fill="#FBE6DC" />
  </svg>
);
export const CalendarTabIcon = ({ fill }: { fill?: string }) => (
  <svg viewBox="0 0 66 62" stroke="#3A2418" strokeWidth="3.6" {...base}>
    <rect x="5" y="9" width="56" height="49" rx="8" fill={fill ?? 'none'} /><path d="M5 22 H61" /><path d="M20 3 V14" /><path d="M46 3 V14" />
    <path d="M33 50 C25 44 22 41 22 36.5 A5 5 0 0 1 33 34 A5 5 0 0 1 44 36.5 C44 41 41 44 33 50 Z" fill="#F0857A" stroke="none" />
  </svg>
);
export const SproutBig = () => (
  <svg viewBox="0 0 160 110" stroke="#3A2418" strokeWidth="5" {...base}>
    <path d="M80 106 V48" /><path d="M78 50 C70 26 52 18 28 22 C32 44 50 56 78 50 Z" fill="#B9C29B" /><path d="M82 46 C88 22 108 10 134 12 C130 38 110 50 82 46 Z" fill="#B9C29B" /><path d="M10 40 L22 52" /><path d="M150 40 L138 52" />
  </svg>
);
export const GlowBig = () => (
  <svg viewBox="0 0 120 104" stroke="#3A2418" strokeWidth="5" {...base}>
    <path d="M60 92 C34 74 22 60 22 44 A18 18 0 0 1 60 34 A18 18 0 0 1 98 44 C98 60 86 74 60 92 Z" fill="#FBE6DC" />
  </svg>
);
export const CalendarBig = () => <CalendarTabIcon fill="#FFFCF7" />;
export const SproutSmall = () => (
  <svg viewBox="0 0 96 80" stroke="#3A2418" strokeWidth="4" {...base}>
    <path d="M48 76 V38" /><path d="M47 40 C42 24 30 18 14 21 C17 35 29 43 47 40 Z" fill="#B9C29B" /><path d="M49 36 C53 20 66 12 83 14 C80 31 67 38 49 36 Z" fill="#B9C29B" />
  </svg>
);
export const HeartSmall = () => (
  <svg viewBox="0 0 84 74" stroke="#3A2418" strokeWidth="4" {...base}>
    <path d="M42 66 C20 51 8 39 8 25 A15 15 0 0 1 42 16 A15 15 0 0 1 76 25 C76 39 64 51 42 66 Z" fill="#FBE6DC" />
  </svg>
);
export const MicBig = () => (
  <svg viewBox="0 0 320 220" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="122" y="2" width="76" height="142" rx="38" fill="#FFFFFF" strokeWidth="0" />
    <path d="M90 98 a70 70 0 0 0 140 0" strokeWidth="13" /><path d="M160 168 V200" strokeWidth="13" /><path d="M128 206 H192" strokeWidth="13" />
    <path d="M24 84 L46 104" strokeWidth="10" /><path d="M6 126 L36 134" strokeWidth="10" /><path d="M296 84 L274 104" strokeWidth="10" /><path d="M314 126 L284 134" strokeWidth="10" />
  </svg>
);
export const MicSmall = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v4" />
  </svg>
);
export const WaveIcon = () => (
  <svg viewBox="0 0 150 42" fill="none" stroke="#F0857A" strokeWidth="5" strokeLinecap="round" aria-hidden="true">
    <path d="M4 17 V25 M26 8 V34 M48 3 V39 M70 11 V31 M92 5 V37 M114 13 V29 M136 17 V25" />
  </svg>
);
export const KeyboardIcon = () => (
  <svg width="22" height="16" viewBox="0 0 22 16" fill="none" stroke="#7D6D63" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="1" y="1" width="20" height="14" rx="3" /><path d="M5 5.5 H5.01 M9 5.5 H9.01 M13 5.5 H13.01 M17 5.5 H17.01 M6 11 H16" />
  </svg>
);
export const ChevLeft = () => (
  <svg viewBox="0 0 18 30" fill="none" stroke="#3A2418" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3 L4 15 L14 27" /></svg>
);
export const ChevRight = () => (
  <svg viewBox="0 0 18 30" fill="none" stroke="#3A2418" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 3 L14 15 L4 27" /></svg>
);
export const BackArrow = () => (
  <svg viewBox="0 0 28 42" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 4 L6 21 L22 38" /></svg>
);
export const RowChev = () => (
  <svg className="chev" viewBox="0 0 18 32" fill="none" stroke="#9A8A7F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3 L15 16 L3 29" /></svg>
);
export const CheckIcon = () => (
  <svg viewBox="0 0 26 22" fill="none" stroke="#56663F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12 L10 19 L23 4" /></svg>
);
export const SparkIcon = () => (
  <svg viewBox="0 0 18 18" fill="#56663F" aria-hidden="true"><path d="M9 1 L10.8 7.2 L17 9 L10.8 10.8 L9 17 L7.2 10.8 L1 9 L7.2 7.2 Z" /></svg>
);
export const PersonIcon = ({ stroke = '#3A2418' }: { stroke?: string }) => (
  <svg viewBox="0 0 42 46" fill="none" stroke={stroke} strokeWidth="3.6" strokeLinecap="round" aria-hidden="true"><circle cx="21" cy="13" r="10" /><path d="M3 44 V40 a10 10 0 0 1 10 -10 H29 a10 10 0 0 1 10 10 V44 Z" /></svg>
);
export const PawIcon = () => (
  <svg viewBox="0 0 48 42" fill="#3A2418" aria-hidden="true"><ellipse cx="24" cy="30" rx="11" ry="9" /><circle cx="9" cy="18" r="5" /><circle cx="18" cy="8" r="5" /><circle cx="30" cy="8" r="5" /><circle cx="39" cy="18" r="5" /></svg>
);
export const LockIcon = () => (
  <svg viewBox="0 0 38 46" fill="none" stroke="#3A2418" strokeWidth="4" strokeLinecap="round" aria-hidden="true"><rect x="3" y="19" width="32" height="24" rx="5" /><path d="M10 19 V12 a9 9 0 0 1 18 0 V19" /></svg>
);
export const BookIcon = () => (
  <svg viewBox="0 0 46 40" fill="none" stroke="#3A2418" strokeWidth="3.6" strokeLinejoin="round" aria-hidden="true"><path d="M4 6 H20 a4 4 0 0 1 3 2 a4 4 0 0 1 3 -2 H42 V34 H26 a3 3 0 0 0 -3 3 a3 3 0 0 0 -3 -3 H4 Z" fill="#FFFCF7" /><path d="M23 8 V36" /></svg>
);
export const ShieldIcon = () => (
  <svg viewBox="0 0 40 46" fill="none" stroke="#3A2418" strokeWidth="3.6" strokeLinejoin="round" aria-hidden="true"><path d="M20 3 L36 9 V22 C36 33 28 40 20 43 C12 40 4 33 4 22 V9 Z" fill="#FFFCF7" /><path d="M13 23 L18 28 L28 17" strokeLinecap="round" /></svg>
);
export const TrashIcon = () => (
  <svg viewBox="0 0 36 42" fill="none" stroke="#C9483A" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9 H33" /><path d="M12 9 V4 H24 V9" /><path d="M7 9 L9 38 H27 L29 9" /></svg>
);
export const ChatIcon = () => (
  <svg viewBox="0 0 44 40" fill="none" stroke="#3A2418" strokeWidth="3.6" strokeLinejoin="round" aria-hidden="true"><path d="M4 6 H40 V28 H18 L9 36 V28 H4 Z" fill="#FFFCF7" /><path d="M14 16 H30" strokeLinecap="round" /></svg>
);
export const MailIcon = () => (
  <svg viewBox="0 0 74 58" fill="none" stroke="#3A2418" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><rect x="4" y="6" width="66" height="46" rx="8" fill="#FFFCF7" /><path d="M6 9 L37 32 L68 9" /><path d="M37 46 C30 41 27 38 27 34 A5 5 0 0 1 37 31.5 A5 5 0 0 1 47 34 C47 38 44 41 37 46 Z" fill="#F0857A" stroke="none" /></svg>
);
export const CheckinMic = () => (
  <svg viewBox="0 0 70 100" fill="none" stroke="#C9483A" strokeWidth="8" strokeLinecap="round" aria-hidden="true"><rect x="19" y="4" width="32" height="56" rx="16" fill="#F0857A" stroke="none" /><path d="M6 44 a29 29 0 0 0 58 0" /><path d="M35 76 V94" /></svg>
);
export const PlantIcon = () => (
  <svg viewBox="0 0 140 186" fill="none" stroke="#3E2E25" strokeWidth="6" strokeLinejoin="round" aria-hidden="true">
    <path d="M60 98 C30 80 20 50 30 6 C62 22 70 60 60 98 Z" fill="#9DB089" />
    <path d="M62 98 C78 66 104 54 134 56 C122 88 96 102 62 98 Z" fill="#9DB089" />
    <path d="M30 100 H100 L92 183 H38 Z" fill="#E1A283" />
  </svg>
);
