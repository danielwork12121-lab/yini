'use client';
import { useState } from 'react';

const KINDS = ['Bug report', 'Feature idea', 'Other'];

/** Help & Feedback as drawn. Sending feedback is not connected to anything yet, so the button stays off. */
export function HelpForm() {
  const [kind, setKind] = useState<string | null>(null);
  const [text, setText] = useState('');
  return (
    <>
      <p className="field-label" style={{ marginTop: 0 }}>What’s it about?</p>
      <div className="feedback-opts" role="group" aria-label="What is it about">
        {KINDS.map((k) => <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      <label className="field-label" htmlFor="hf-text">Tell us more</label>
      <textarea id="hf-text" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="What happened, or what would make Yini better?" />
      <p className="field-note">At least a sentence helps us understand.</p>
      <p className="field-note" style={{ marginTop: 'calc(30 * var(--u))' }}>We never attach your journal or anything Yini remembers.</p>
      <div className="pad" />
      <div className="sub-foot">
        <button type="button" className="cta" disabled>Send feedback</button>
        <p className="fineprint" style={{ margin: 0 }}>Sending feedback is not switched on yet.</p>
      </div>
    </>
  );
}
