# Pet previews

Run `npm run dev` from `frontend`, then open `/dev/pet-selection` or
`/dev/pet-animation`. Neither page requires a Supabase login. Both return 404
outside development and Vercel preview deployments. The existing session-refresh middleware remains unchanged.

## Reuse

```tsx
const [requestId, setRequestId] = useState(0);

<AnimatedPet animation="feeding" requestId={requestId} onComplete={() => { /* finished */ }} />
<button onClick={() => setRequestId(id => id + 1)}>Feed</button>
```

`animation` defaults to `idle`; supported one-shot actions are `blink`, `happy`,
`feeding`, and `eating`. Cat feeding/eating requests play v3 once; additional
requests are ignored until completion (changing the pet still replaces it).
Other pets retain the original feeding/happy sequence. Blinks last 150 ms with
a randomized 3–6 second idle interval. Timers and pending preload callbacks are
cancelled on unmount. `onComplete` runs once per requested action.

## Cat eating v3

Source: `public/animations/cat/eating-v3.png` (1325×1187 RGBA).
Run `python3 scripts/extract-eating-v3.py` with Pillow installed to reproduce the
16 transparent 578×518 PNGs. Proportional rounded rectangles are recorded in
`eating-v3-manifest.json`, alongside refined boundaries placed in transparent
gaps so bowls and ears are preserved. All crops use the same 1:1 scale and bowl
anchor; no background removal or color filtering is applied to the artwork.
The manifest records each actual crop size and the source checksum.

`eatingV3.ts` supplies a cancellable per-frame controller. Frames 0–12 play in
order, with durations (ms):
`800, 700, 700, 1000, 600, 600, 600, 600, 600, 800, 1000, 1000, 1200`.
The 10.2-second sequence ends with a 150ms fade-out and 150ms idle fade-in:
**10.5 seconds total at 1×**. Frames 13–15 are extracted but excluded because
they depict stretching/resting/sleeping. No full-sequence looping occurs.

All 16 images stay mounted and must decode before playback. Images occupy the
existing fixed container with object-contain. A shared 1.76× display scale and
8.5% horizontal / −18% vertical translation align the feeding cat’s body height
and paw baseline with the initial idle artwork, without changing any PNG. Reduced motion shows static frame
0 for the action, disables fades/transforms, and returns to idle on completion.
The preview includes Feed, Replay, frame/stage indicators, four playback speeds,
and an expandable gallery of all extracted images. Existing production Room
feeding requests use this same AnimatedPet implementation; backend logic is
unchanged.

The source contains discrete poses rather than continuous motion: the excited
to lowered-head transition remains noticeable, and the original idle artwork
has different proportions and a tail on the opposite side. Bowl anchoring removes placement drift but cannot
remove differences drawn into the poses. No new intermediate artwork is generated.

`PetSelection` is controlled with `selectedId` and `onSelect`. Only available
entries can invoke `onSelect`; selection is local and is not persisted. Add an
available entry with `idle`, `blink`, and `happy` artwork in `catalog.ts` to enable
another animal, or supply a custom `pets` array. `AnimatedPet` also accepts an
available `pet` directly. Artwork should share the same dimensions and alignment.

The preview styling follows `prototype/index.html`; the prototype, existing
production pet component, authentication, and backend are unchanged.
