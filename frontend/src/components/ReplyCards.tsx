import type { CheckinResponse } from '@/contract';

/** What Yini says back after a check-in. Shown on Home once the AI is done. */
export function ReplyCards({ reply }: { reply: CheckinResponse }) {
  return (
    <>
      {reply.safety && (
        <div className="reply-card reply-card-warm">
          <p>{reply.reply.for_you}</p>
          {reply.safety.resources.map((r) => (
            <p key={r.label}><strong>{r.label}</strong><br />{r.detail}</p>
          ))}
        </div>
      )}
      {!reply.safety && (
        <>
          <div className="reply-card">
            <p style={{ color: 'var(--ink)', fontWeight: 700 }}>{reply.reply.acknowledgement}</p>
            <p>{reply.reply.for_you}</p>
          </div>
          {reply.reply.reveal && (
            <div className="reply-card reply-card-warm">
              <p className="kick">While you were under</p>
              <p>{reply.reply.reveal}</p>
            </div>
          )}
          {reply.reply.partner_item && (
            <div className="reply-card">
              <p className="kick">One thing, if you have it in you</p>
              <p>{reply.reply.partner_item}</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
