'use client';
import type { PetState } from '@/contract';

/**
 * The pet. One finished illustration per buddy at /pets/<species>.png, animated with
 * CSS transforms only. Until the egg hatches (or if no art exists for the species) a
 * neutral placeholder shape is shown so the loop stays demoable.
 *
 * Expression is a filter, never a redraw: napping dims and desaturates the same art.
 */
export function Pet({ pet, hatching = false, hasArt = true }: {
  pet: PetState; hatching?: boolean; hasArt?: boolean;
}) {
  const napping = !pet.you_fed_today;

  return (
    <div>
      <div className={`pet-stage ${hatching ? 'pet-hatching' : ''}`}>
        {pet.hatched && hasArt && pet.species ? (
          <div className="pet-bob" style={{ position: 'absolute', inset: 0 }}>
            <img
              className="pet-layer pet-breathe"
              src={`/pets/${pet.species}.png`}
              alt=""
              style={napping ? { filter: 'grayscale(.45) brightness(.98)', opacity: 0.88 } : undefined}
            />
          </div>
        ) : (
          <Placeholder hatched={pet.hatched} fed={pet.you_fed_today} both={pet.both_fed_today} />
        )}
      </div>

      <p className="display h2" style={{ textAlign: 'center', margin: '14px 0 2px' }}>
        {pet.hatched ? pet.name : 'An egg, for now'}
      </p>
      <p className="caption" style={{ textAlign: 'center', margin: 0 }}>
        {pet.bond_name} · {pet.total_half_days} {pet.total_half_days === 1 ? 'half-day' : 'half-days'}
      </p>

      {pet.next_threshold !== null && (
        <div style={{ marginTop: 14 }}>
          <div className="bond-track">
            <div className="bond-fill" style={{ width: `${Math.min(100, (pet.total_half_days / pet.next_threshold) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Half-fed shows as half-fed. We never say who is missing. */}
      <p className="caption" style={{ textAlign: 'center', marginTop: 10 }}>
        {pet.both_fed_today ? 'Fully fed today.' : pet.you_fed_today ? 'Half fed today.' : 'Napping.'}
      </p>
    </div>
  );
}

/** Deliberately plain. A neutral stand-in, not artwork — the real asset replaces it. */
function Placeholder({ hatched, fed, both }: { hatched: boolean; fed: boolean; both: boolean }) {
  return (
    <div className="pet-bob" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <div
        className="pet-breathe"
        style={{
          width: 128, height: hatched ? 128 : 150,
          borderRadius: hatched ? '50%' : '50% 50% 46% 46% / 60% 60% 40% 40%',
          background: both ? 'var(--butter)' : fed ? 'var(--surface-warm)' : 'var(--canvas-sunk)',
          border: '3px solid var(--line-strong)',
          display: 'grid', placeItems: 'center', gap: 6,
        }}
      >
        <div style={{ display: 'flex', gap: 22, marginTop: 8 }}>
          <Eye closed={!fed} /><Eye closed={!fed} />
        </div>
        <div style={{
          width: both ? 26 : 16, height: both ? 13 : 3,
          borderBottom: '3px solid var(--ink)',
          borderRadius: both ? '0 0 26px 26px' : 0,
        }} />
      </div>
    </div>
  );
}

const Eye = ({ closed }: { closed: boolean }) =>
  closed
    ? <div style={{ width: 14, height: 3, background: 'var(--ink)', borderRadius: 2 }} />
    : <div style={{ width: 11, height: 13, background: 'var(--ink)', borderRadius: '50%' }} />;
