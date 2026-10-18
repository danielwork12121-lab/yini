export type PetArtwork = { idle: string; blink: string; happy: string };
export type AvailablePet = { id: string; name: string; available: true; artwork: PetArtwork };
export type PetOption = AvailablePet | { id: string; name: string; available: false; symbol: string };

export const cat: AvailablePet = {
  id: 'cat', name: 'Cat', available: true,
  artwork: { idle: '/pets/cat/idle.png', blink: '/pets/cat/blink.png', happy: '/pets/cat/happy.png' },
};

// Add artwork and set available: true to enable a new species.
export const petCatalog: readonly PetOption[] = [
  cat,
  { id: 'dog', name: 'Dog', available: false, symbol: '🐶' },
  { id: 'bunny', name: 'Bunny', available: false, symbol: '🐰' },
];
