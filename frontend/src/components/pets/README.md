# Pet previews

Run `npm run dev` from `frontend`, then open `/dev/pet-selection` or
`/dev/pet-animation`. Neither page requires a Supabase login. Both return 404
outside development. The existing session-refresh middleware remains unchanged.

## Reuse

```tsx
const [requestId, setRequestId] = useState(0);

<AnimatedPet animation="feeding" requestId={requestId} onComplete={() => { /* finished */ }} />
<button onClick={() => setRequestId(id => id + 1)}>Feed</button>
```

`animation` defaults to `idle`; supported one-shot actions are `blink`, `happy`,
and `feeding`. Changing the pet ID starts a new session. During cat feeding, additional
action requests are ignored until completion, preventing accidental restarts. Cat feeding uses 16 extracted PNGs over 7450 ms and then returns directly to idle.
Other pets retain the 800 ms feeding and 1200 ms happiness sequence. Blinks last 150 ms with a randomized 3–6 second
idle interval. All timers are cleared on unmount. `onComplete` runs once per
requested non-idle action, not for automatic blinks.

All three expression images stay mounted and are preloaded. Idle breathing and
floating, the happy bounce, and heart movement use Motion for React. Reduced
motion disables transforms and keeps static hearts and expression changes.

`PetSelection` is controlled with `selectedId` and `onSelect`. Only available
entries can invoke `onSelect`; selection is local and is not persisted. Add an
available entry with `idle`, `blink`, and `happy` artwork in `catalog.ts` to enable
another animal, or supply a custom `pets` array. `AnimatedPet` also accepts an
available `pet` directly. Artwork should share the same dimensions and alignment.

The preview styling follows `prototype/index.html`; the prototype, existing
production pet component, authentication, and backend are unchanged.

## Eating v2

Original: repository-root `public/animations/cat/eating-v2.png`, copied byte for
byte from the supplied Desktop PNG (1536×1024). The visual 4×4 layout is not an
even grid: cats cross nominal 384×256 row boundaries. Runtime uses sixteen
independent RGBA PNGs in `frontend/public/animations/cat/eating-v2-frames/`.
Connected artwork and expression marks were isolated rather than clipping a
uniform cell. All outputs share a 560×360 canvas and the same unscaled source
pixel coordinate system; bowl centers/bottoms register at (220, 330).

Sequence stays row-major: wait → excited → eating → finish → lick/clean →
satisfied → stretch → lie down → rest. Food is visible through frame 10;
empty bowls appear only in frames 11–16. Durations (ms):
`500,400,400,400,350,350,350,350,400,500,500,500,500,600,650,700` (7450 total).
All images decode before playback; mounted images swap opacity without fades.
Reduced motion holds frame 1 for the same duration. Timers and async completion
are cancelled on unmount. The outer fixed stage and other animation states
are unchanged. The existing production Home/check-in feeding handler passes
`feeding` through Room into AnimatedPet, so no backend changes are needed.

Use `/dev/pet-animation`, `/dev/yini-preview`, or `/dev/style?fed=1` locally.
The extracted contact sheet was visually inspected, not live browser playback.
The art has slight colored/white edge residue and no in-between wake-up pose
between the final sleeping frame and the existing idle art. Static extraction
cannot invent missing poses. Original and earlier animation assets are retained.
