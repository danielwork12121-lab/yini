const INK = '#3A2418';

/**
 * The room behind the cat, drawn to feel like the cat: a soft brown ink line that is a
 * little uneven, warm flat colour, and a few things that move (the sun, a cloud, the
 * plant, a ray of light with dust in it). One SVG in the room's own 870 × 700 units.
 */
export function RoomArt() {
  return (
    <svg className="room-art" viewBox="0 0 870 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ra-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF6E4" /><stop offset="1" stopColor="#FCEBCF" /></linearGradient>
        <linearGradient id="ra-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BFE3F2" /><stop offset="1" stopColor="#EAF6F0" /></linearGradient>
        <linearGradient id="ra-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF3BF" stopOpacity=".7" /><stop offset="1" stopColor="#FFF3BF" stopOpacity="0" /></linearGradient>
        <pattern id="ra-dots" width="64" height="64" patternUnits="userSpaceOnUse"><circle cx="32" cy="32" r="2.4" fill="#F3D9C0" /><path d="M8 10 h6 M11 7 v6" stroke="#F3D9C0" strokeWidth="2" strokeLinecap="round" /></pattern>
        <clipPath id="ra-glass"><rect x="8" y="8" width="234" height="234" rx="24" /></clipPath>
      </defs>

      {/* wall */}
      <rect width="870" height="700" fill="url(#ra-wall)" />
      <rect width="870" height="560" fill="url(#ra-dots)" opacity=".7" />

      {/* floor */}
      <g filter="url(#hd-wobble)">
        <path d="M-10 548 C190 543 430 552 880 545 V710 H-10 Z" fill="#F4DDB8" />
        <g stroke={INK} strokeOpacity=".13" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M70 552 L-10 700" /><path d="M200 551 L160 700" /><path d="M330 552 L316 700" /><path d="M460 553 L460 700" /><path d="M590 552 L606 700" /><path d="M720 549 L760 700" /><path d="M846 547 L910 700" />
        </g>
        <path d="M-10 548 C190 543 430 552 880 545" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      </g>
      <rect y="500" width="870" height="46" fill={INK} opacity=".035" />

      {/* a framed heart on the wall */}
      <g transform="translate(96 108)"><g className="ra-frame" filter="url(#hd-wobble)">
        <path d="M32 8 L62 -22 L92 8" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect width="124" height="152" rx="12" fill="#FFFDF7" stroke={INK} strokeWidth="6" />
        <rect x="16" y="16" width="92" height="120" rx="6" fill="#FCE5DA" />
        <path d="M62 110 C36 92 28 76 34 62 A16 16 0 0 1 62 58 A16 16 0 0 1 90 62 C96 76 88 92 62 110 Z" fill="#F28D80" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M44 66 q4 -6 10 -4" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
      </g></g>

      {/* the window */}
      <g transform="translate(560 58)">
        <g filter="url(#hd-wobble)">
          <rect width="250" height="250" rx="30" fill="url(#ra-sky)" />
          <g clipPath="url(#ra-glass)">
            <path d="M0 196 C60 168 130 184 190 194 C220 199 240 195 250 190 V250 H0 Z" fill="#CFE4B7" />
            <path d="M0 222 C70 204 150 214 250 206 V250 H0 Z" fill="#B7D49C" />
            <g className="ra-cloud">
              <path d="M0 40 a15 15 0 0 1 15 -15 a19 19 0 0 1 36 -4 a15 15 0 0 1 23 15 a11 11 0 0 1 -4 19 H9 a11 11 0 0 1 -9 -15 z" fill="#fff" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            </g>
            <g className="ra-sun" transform="translate(76 78)">
              <g className="ra-rays" stroke="#F4B73E" strokeWidth="7" strokeLinecap="round">
                {Array.from({ length: 10 }, (_, i) => {
                  const a = (i * Math.PI * 2) / 10;
                  return <path key={i} d={`M${(Math.cos(a) * 46).toFixed(1)} ${(Math.sin(a) * 46).toFixed(1)} L${(Math.cos(a) * 62).toFixed(1)} ${(Math.sin(a) * 62).toFixed(1)}`} />;
                })}
              </g>
              <circle r="34" fill="#FFD567" stroke={INK} strokeWidth="4.5" />
              <path d="M-14 -4 q5 -6 10 0 M4 -4 q5 -6 10 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="-20" cy="8" rx="6" ry="4" fill="#F6A58F" opacity=".8" /><ellipse cx="20" cy="8" rx="6" ry="4" fill="#F6A58F" opacity=".8" />
              <path d="M-5 8 q5 5 10 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            </g>
            <path d="M30 20 L96 8 M20 60 L120 30" stroke="#fff" strokeOpacity=".22" strokeWidth="18" strokeLinecap="round" />
          </g>
          <path d="M125 8 V242 M8 125 H242" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          <rect width="250" height="250" rx="30" fill="none" stroke={INK} strokeWidth="7.5" />
          <rect x="-16" y="244" width="282" height="22" rx="9" fill="#EBCB9D" stroke={INK} strokeWidth="5.5" />
        </g>
        {/* curtains */}
        <g filter="url(#hd-wobble)">
          <path d="M-34 -8 C-22 70 -36 160 -24 262 H20 C26 160 18 70 44 -8 Z" fill="#F7C9BE" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M-14 4 C-8 80 -16 160 -10 250 M8 0 C12 80 6 160 12 250" fill="none" stroke="#E9A99C" strokeWidth="3" strokeLinecap="round" />
          <path d="M284 -8 C272 70 286 160 274 262 H230 C224 160 232 70 206 -8 Z" fill="#F7C9BE" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M264 4 C258 80 266 160 260 250 M242 0 C238 80 244 160 238 250" fill="none" stroke="#E9A99C" strokeWidth="3" strokeLinecap="round" />
          <path d="M-46 -10 H296" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <circle cx="-48" cy="-10" r="8" fill="#EBCB9D" stroke={INK} strokeWidth="4" /><circle cx="298" cy="-10" r="8" fill="#EBCB9D" stroke={INK} strokeWidth="4" />
        </g>
      </g>

      {/* a ray of light, and dust in it */}
      <polygon className="ra-beam" points="590,330 790,330 660,640 360,640" fill="url(#ra-beam)" />
      <g fill="#fff">
        <circle className="ra-mote m1" cx="560" cy="470" r="3" /><circle className="ra-mote m2" cx="640" cy="420" r="2.4" />
        <circle className="ra-mote m3" cx="520" cy="540" r="2.8" /><circle className="ra-mote m4" cx="700" cy="500" r="2.2" /><circle className="ra-mote m5" cx="610" cy="560" r="2" />
      </g>

      {/* the plant */}
      <g transform="translate(66 404)" filter="url(#hd-wobble)">
        <ellipse cx="85" cy="196" rx="74" ry="9" fill={INK} opacity=".12" />
        <g strokeLinejoin="round" stroke={INK} strokeWidth="5">
          <path className="leaf lf3" d="M85 104 C60 96 30 94 6 74 C28 58 66 68 85 104 Z" fill="#B5C9A1" />
          <path className="leaf lf4" d="M85 104 C80 74 86 46 98 26 C112 56 104 86 85 104 Z" fill="#86A272" />
          <path className="leaf lf1" d="M85 104 C50 84 38 44 52 4 C84 26 98 66 85 104 Z" fill="#9DB089" />
          <path className="leaf lf2" d="M85 104 C100 64 130 44 168 48 C156 88 122 110 85 104 Z" fill="#8AA676" />
        </g>
        <g fill="none" stroke={INK} strokeOpacity=".5" strokeWidth="2.6" strokeLinecap="round">
          <path d="M84 100 C72 72 62 42 54 10" /><path d="M88 100 C106 76 128 60 160 54" /><path d="M84 102 C60 94 36 84 16 74" />
        </g>
        <path d="M22 104 H148 a8 8 0 0 1 8 8 v14 H14 v-14 a8 8 0 0 1 8 -8 Z" fill="#E8A888" stroke={INK} strokeWidth="5.5" strokeLinejoin="round" />
        <path d="M24 126 L36 192 H134 L146 126 Z" fill="#E1A283" stroke={INK} strokeWidth="5.5" strokeLinejoin="round" />
        <path d="M44 138 L50 178" stroke="#F4C9AE" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M30 150 H140" stroke="#C98667" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <circle cx="86" cy="166" r="0" />
      </g>

      {/* the rug, with its stitching */}
      <g filter="url(#hd-wobble)">
        <ellipse cx="435" cy="650" rx="312" ry="64" fill="#F8D6CB" stroke={INK} strokeWidth="5.5" />
        <ellipse cx="435" cy="650" rx="268" ry="46" fill="none" stroke="#EFA597" strokeWidth="4" strokeDasharray="2 15" strokeLinecap="round" />
      </g>
      <ellipse cx="435" cy="640" rx="150" ry="15" fill={INK} opacity=".13" />

      {/* hand-inked edge of the room */}
      <rect x="3" y="3" width="864" height="694" rx="46" fill="none" stroke={INK} strokeWidth="6" filter="url(#hd-wobble)" />
    </svg>
  );
}
