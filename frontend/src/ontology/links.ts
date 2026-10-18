/**
 * Yini — link types. Every relationship between object types, with the column
 * that backs it. `ontology.test.ts` checks each foreign key exists on the schema.
 */
import { defineLink } from './define';

export const links = [
  defineLink({ apiName: 'profileMemberships', from: 'profile', to: 'connectionMember', cardinality: 'many', foreignKey: 'user_id',
    description: 'Every connection a person belongs to.' }),
  defineLink({ apiName: 'connectionMembers', from: 'connection', to: 'connectionMember', cardinality: 'many', foreignKey: 'connection_id',
    description: 'The two people in a connection. Never more than two.' }),
  defineLink({ apiName: 'profileDefaultConnection', from: 'profile', to: 'connection', cardinality: 'one', foreignKey: 'default_connection_id',
    description: 'The connection the daily log opens on.' }),
  defineLink({ apiName: 'connectionPeers', from: 'connection', to: 'connectionPeer', cardinality: 'many', foreignKey: 'connection_id',
    description: 'Names of the people in a connection, one column wide.' }),

  defineLink({ apiName: 'entryAuthor', from: 'journalEntry', to: 'profile', cardinality: 'one', foreignKey: 'author_id',
    description: 'Who wrote it. The only person who may read it.' }),
  defineLink({ apiName: 'entryConnection', from: 'journalEntry', to: 'connection', cardinality: 'one', foreignKey: 'connection_id',
    description: 'Which relationship the entry is about.' }),

  defineLink({ apiName: 'concernSourceEntry', from: 'concern', to: 'journalEntry', cardinality: 'one', foreignKey: 'source_entry_id',
    description: 'SERVER ONLY. The entry a concern was distilled from.' }),
  defineLink({ apiName: 'concernAuthor', from: 'concern', to: 'profile', cardinality: 'one', foreignKey: 'author_id',
    description: 'Who needs this.' }),
  defineLink({ apiName: 'nudgeConcern', from: 'nudge', to: 'concern', cardinality: 'one', foreignKey: 'concern_id',
    description: 'The concern a partner_need nudge delivers, if any.' }),
  defineLink({ apiName: 'nudgeRecipient', from: 'nudge', to: 'profile', cardinality: 'one', foreignKey: 'recipient_id',
    description: 'Who the nudge is for.' }),
  defineLink({ apiName: 'nudgeMessages', from: 'nudge', to: 'nudgeMessage', cardinality: 'many', foreignKey: 'nudge_id',
    description: 'The private coaching thread under a nudge.' }),

  defineLink({ apiName: 'kindWordSourceEntry', from: 'kindWord', to: 'journalEntry', cardinality: 'one', foreignKey: 'source_entry_id',
    description: 'SERVER ONLY. The entry the words were lifted from verbatim.' }),
  defineLink({ apiName: 'kindWordRecipient', from: 'kindWord', to: 'profile', cardinality: 'one', foreignKey: 'recipient_id',
    description: 'Who the kind words are about.' }),
  defineLink({ apiName: 'careActSourceEntry', from: 'careAct', to: 'journalEntry', cardinality: 'one', foreignKey: 'source_entry_id',
    description: 'SERVER ONLY. The entry holding the evidence span.' }),
  defineLink({ apiName: 'careActBeneficiary', from: 'careAct', to: 'profile', cardinality: 'one', foreignKey: 'beneficiary_id',
    description: 'Who the act was for; the person the reveal is shown to.' }),
  defineLink({ apiName: 'questAuthor', from: 'quest', to: 'profile', cardinality: 'one', foreignKey: 'author_id',
    description: 'Whose quest it is.' }),

  defineLink({ apiName: 'connectionPet', from: 'connection', to: 'pet', cardinality: 'many', foreignKey: 'connection_id',
    description: 'The shared pet (exactly one per connection; keyed by connection_id).' }),
  defineLink({ apiName: 'connectionFeedings', from: 'connection', to: 'petFeeding', cardinality: 'many', foreignKey: 'connection_id',
    description: 'Attendance rows that grow the pet.' }),
  defineLink({ apiName: 'moodDayAuthor', from: 'moodDay', to: 'profile', cardinality: 'one', foreignKey: 'author_id',
    description: 'Whose calendar the day belongs to.' }),
  defineLink({ apiName: 'safetyEventEntry', from: 'safetyEvent', to: 'journalEntry', cardinality: 'one', foreignKey: 'entry_id',
    description: 'The entry that tripped the flag.' }),

  defineLink({ apiName: 'connectionRuns', from: 'connection', to: 'analysisRun', cardinality: 'many', foreignKey: 'connection_id',
    description: 'One nightly run per day. The latest done run holds the rolling pair_summary.' }),
  defineLink({ apiName: 'runFeedback', from: 'analysisRun', to: 'dailyFeedback', cardinality: 'many', foreignKey: 'run_id',
    description: 'The two feedback rows a run produced, one per person.' }),
  defineLink({ apiName: 'feedbackRecipient', from: 'dailyFeedback', to: 'profile', cardinality: 'one', foreignKey: 'recipient_id',
    description: 'The one person who may read it.' }),
] as const;
