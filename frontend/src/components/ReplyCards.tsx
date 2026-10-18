import type { CheckinResponse } from '@/contract';

/** What Yini says back after a check-in. Shown on Home once the AI is done. */
export function ReplyCards({ reply, partner }: { reply: CheckinResponse; partner: string }) {
  return (
    <div className="yhome-reply">
      {reply.safety && (
        <div className="card" style={{ borderColor: '#D6C9B0', background: 'var(--surface-warm)' }}>
          <p className="body" style={{ marginTop: 0 }}>{reply.reply.for_you}</p>
          {reply.safety.resources.map((r) => (
            <p key={r.label} className="small" style={{ margin: '8px 0' }}>
              <strong style={{ color: 'var(--ink)' }}>{r.label}</strong><br />{r.detail}
            </p>
          ))}
        </div>
      )}
      {!reply.safety && (
        <>
          <div className="card">
            <p className="body" style={{ marginTop: 0 }}>{reply.reply.acknowledgement}</p>
            <p className="body" style={{ marginBottom: 0, color: 'var(--ink-muted)' }}>{reply.reply.for_you}</p>
          </div>
          {reply.reply.reveal && (
            <div className="card card-warm">
              <p className="caption" style={{ marginTop: 0, textTransform: 'uppercase', letterSpacing: '.06em' }}>While you were under</p>
              <p className="body" style={{ marginBottom: 0 }}>{reply.reply.reveal}</p>
            </div>
          )}
          {reply.reply.partner_item && (
            <div className="card">
              <p className="caption" style={{ marginTop: 0, textTransform: 'uppercase', letterSpacing: '.06em' }}>One thing, if you have it in you</p>
              <p className="body" style={{ marginBottom: 0 }}>{reply.reply.partner_item}</p>
            </div>
          )}
        </>
      )}
      {reply.pet_hatched_now && <p className="body" style={{ textAlign: 'center' }}>You both showed up. Your egg hatched.</p>}
      <p className="caption" style={{ textAlign: 'center', margin: '4px 0 0' }}>{partner} will never see what you wrote.</p>
    </div>
  );
}
