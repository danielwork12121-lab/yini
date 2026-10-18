import { describe, expect, it } from 'vitest';
import { fitQuests, normalizeQuest, questBudget, questOf } from './quest';

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

  it('scales the number of quests with how much was said', () => {
    expect(questBudget(null)).toBe(1);
    expect(questBudget('Rough day. Tired.')).toBe(1);
    expect(questBudget('word '.repeat(40))).toBe(2);
    expect(questBudget('word '.repeat(100))).toBe(3);
    expect(questBudget('word '.repeat(200))).toBe(4);
    expect(questBudget('word '.repeat(400))).toBe(5);
  });
  it('trims to the budget but keeps a notice quest when there is room for a pair', () => {
    const q = ['Do one', 'Do two', 'Do three', '[notice] Look back'];
    expect(fitQuests(q, 1)).toEqual(['Do one']);
    expect(fitQuests(q, 2)).toEqual(['Do one', '[notice] Look back']);
    expect(fitQuests(q, 3)).toEqual(['Do one', 'Do two', '[notice] Look back']);
    expect(fitQuests(q, 9)).toEqual(q);
  });
});
