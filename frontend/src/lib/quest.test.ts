import { describe, expect, it } from 'vitest';
import { normalizeQuest, questOf } from './quest';

describe('quests: do and notice', () => {
  it('treats an unmarked bullet, including every older one, as something to do', () => {
    expect(questOf('Tell her you are sorry you went quiet.')).toEqual({ kind: 'do', text: 'Tell her you are sorry you went quiet.' });
  });
  it('reads the notice mark however the model wrote it, and strips it from what is shown', () => {
    for (const raw of ['[notice] Think back over the week.', '[Notice]: Think back over the week.', 'Notice: Think back over the week.']) {
      expect(questOf(raw)).toEqual({ kind: 'notice', text: 'Think back over the week.' });
    }
  });
  it('does not mistake a sentence that merely starts with the word', () => {
    expect(questOf('Noticing her tired eyes, offer to cook.').kind).toBe('do');
  });
  it('stores notice quests with one canonical prefix and leaves the rest alone', () => {
    expect(normalizeQuest('Notice: Look back.')).toBe('[notice] Look back.');
    expect(normalizeQuest('[notice] Look back.')).toBe('[notice] Look back.');
    expect(normalizeQuest('Cook dinner.')).toBe('Cook dinner.');
  });
});
