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
and `feeding`. Changing `animation`, `requestId`, or the pet ID cancels the
current sequence and starts the new one. Feeding takes 800 ms, followed by
1200 ms of happiness, then idle. Blinks last 150 ms with a randomized 3–6 second
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
