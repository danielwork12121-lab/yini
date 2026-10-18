'use client';

import Image from 'next/image';
import { petCatalog, type AvailablePet, type PetOption } from './catalog';

export function PetSelection({ selectedId, onSelect, pets = petCatalog }: {
  selectedId?: string;
  onSelect: (pet: AvailablePet) => void;
  pets?: readonly PetOption[];
}) {
  return (
    <div className="flex flex-col gap-3" role="group" aria-label="Choose your pet">
      {pets.map((pet) => (
        <button key={pet.id} type="button" disabled={!pet.available}
          aria-pressed={pet.available ? selectedId === pet.id : undefined}
          onClick={() => { if (pet.available) onSelect(pet); }}
          className={`flex min-h-24 items-center gap-4 rounded-[20px] border bg-white p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60 ${selectedId === pet.id && pet.available ? 'border-[var(--primary)]' : 'border-[var(--line)]'}`}>
          {pet.available ? <Image src={pet.artwork.idle} alt="" width={64} height={64} className="object-contain" />
            : <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-full bg-[var(--canvas-sunk)] text-3xl grayscale">{pet.symbol}</span>}
          <span className="flex-1"><span className="block font-semibold">{pet.name}</span>
            <span className="text-sm text-[var(--ink-muted)]">{pet.available ? 'Ready to meet you' : 'Coming soon'}</span></span>
          {pet.available && selectedId === pet.id && <span aria-hidden="true" className="text-[var(--primary)]">✓</span>}
        </button>
      ))}
    </div>
  );
}
