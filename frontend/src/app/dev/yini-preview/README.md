# Local Yini prototype preview

Run `npm run dev` from `frontend` and visit `/dev/yini-preview`.
The route returns 404 outside development and does not require Supabase login.

Flow: original Yini welcome → choose Cat → Today / pet interaction.
Tap Cat for happiness; feed it for the heart → happy → idle sequence. Idle
breathing and automatic blinks come from the existing AnimatedPet component.
Dog and Bunny remain disabled. All animation respects reduced motion.

Today, Problems, Compliments, and a typed daily entry are local React screens.
Names are demo fixtures. Entries and selections are memory-only: no API calls,
account creation, microphone recording, AI replies, or persistence. Refreshing
or Start over clears the demo. Repeated feeds replay the animation without
incrementing daily progress again.

Welcome assets and the embedded Nunito font are copied from the prototype into
this route's assets directory. Welcome proportions, colors, copy, and typography
match its original artboard; the pet room is a React port of its SVG. Subsequent
screens use the prototype's Fraunces/Figtree fonts, 430px column, cream canvas,
white cards, terracotta buttons, spacing, progress bar, and bottom navigation.
Pet selection is an added step using the existing PetSelection component.
The original prototype and production routes remain unchanged.
