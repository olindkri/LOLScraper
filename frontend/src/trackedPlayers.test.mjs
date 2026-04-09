import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TRACKED_PLAYERS,
  TRACKED_GAMERTAGS,
  GAMERTAGS_BY_ID,
} from './trackedPlayers.js';

test('tracked player metadata includes the three new players', () => {
  assert.equal(TRACKED_PLAYERS.length, 14);
  assert.ok(TRACKED_GAMERTAGS.has('Requiem#9749'));
  assert.ok(TRACKED_GAMERTAGS.has('Mr Naess#EUW'));
  assert.ok(TRACKED_GAMERTAGS.has('Hotdogmaster64#EUW'));
  assert.equal(GAMERTAGS_BY_ID.adrian, 'Requiem#9749');
  assert.equal(GAMERTAGS_BY_ID.sigurdn, 'Mr Naess#EUW');
  assert.equal(GAMERTAGS_BY_ID.elias, 'Hotdogmaster64#EUW');
});

test('tracked player metadata stays internally consistent', () => {
  assert.deepEqual(
    TRACKED_PLAYERS.slice(-3).map((player) => player.id),
    ['adrian', 'sigurdn', 'elias'],
  );
  assert.equal(TRACKED_GAMERTAGS.size, TRACKED_PLAYERS.length);
  assert.equal(Object.keys(GAMERTAGS_BY_ID).length, TRACKED_PLAYERS.length);
});
