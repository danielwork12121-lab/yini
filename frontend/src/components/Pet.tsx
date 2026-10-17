'use client';
import type { PetState } from '@/contract';

/**
 * The pet. Layered transparent PNGs, animated with CSS transforms — no SVG
 * tracing, no generated art, no sprite sheets.
 *
 * Assets live at /pets/<species>/<layer>.png, every layer on the same 512x512
 * registration. Until they land, `hasArt` is false and we render a neutral
 * placeholder shape so the loop is demoable without blocking on art.
 *
 * Expression is a LAYER SWAP, never a redraw: one body, swapped eyes and mouth.
 */
export function Pet({ pet, hatching = false, hasArt = false }: {
  pet: PetState; hatching?: boolean; hasArt?: boolean;
}) {
  const eyes = pet.both_fed_today ? 'eyes-happy' : pet.you_fed_today ? 'eyes-normal' : 'eyes-sleepy';
  const mouth = pet.both_fed_today ? 'mouth-smile' : 'mouth-neutral';
  const src = (layer: string) => `/pets/${pet.species ?? 'egg'}/${layer}.png`;

  return (
    <div>
      <div className={`pet-stage ${hatching ? 'pet-hatching' : ''}`}>
        {pet.hatched && hasArt && pet.species ? (
          <div className="pet-bob" style={{ position: 'absolute', inset: 0 }}>
            <img className="pet-layer pet-breathe" src={src('body')} alt="" />
            <img className="pet-layer" src={src(eyes)} alt="" />
            <img className="pet-layer" src={src(mouth)} alt="" />
            {pet.both_fed_today && <img className="pet-layer" src={src('blush')} alt="" />}
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
