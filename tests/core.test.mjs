import test from 'node:test';
import assert from 'node:assert/strict';
import { tracks, artistLabel, isYoutubeId, isSpotifyId, searchUrl, youtubeUrl, spotifyUrl, appleMusicUrl } from '../catalog.js';
import { audioSources } from '../sources.js';
import { PREFERENCE_KEY, clampVolume, createPreferenceStore, createQueue, defaultPreferences, filterTracks, formatTime, nextTrack, parseSelection, permanentLink, previousTrack, sanitizePreferences, selectQueue, setQueueShuffle, shouldIgnoreShortcut } from '../player-core.js';

const ids = ['a', 'b', 'c', 'd'];

test('catalogue preserves original order and records matched provider pages separately from historical YouTube IDs', () => {
  assert.equal(tracks.length, 20);
  assert.equal(new Set(tracks.map(track => track.id)).size, 20);
  assert.equal(tracks[0].id, 'faguna-re-faguna');
  assert.equal(tracks[19].id, 'phulara-sahare-gharate-tolichi');
  for (const track of tracks) {
    assert.match(track.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(track.sourceStatus, audioSources[track.id]?.spotifyId ? 'matched' : audioSources[track.id]?.candidateUrl ? 'candidate' : 'unmatched');
    assert.equal(isYoutubeId(track.youtubeId), true);
    assert.match(youtubeUrl(track), /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
  }
  // This original ID has eleven characters, including its hyphen.
  assert.equal(tracks[3].youtubeId, '4towad-Ntvc');
  assert.equal(artistLabel(tracks[6]), 'Artist unknown');
  assert.equal(isYoutubeId('abc'), false);
  assert.equal(isYoutubeId('abcdefghij!'), false);
  assert.equal(youtubeUrl({ youtubeId: 'bad' }), null);
  assert.ok(searchUrl({ title: '<script>& x' }).includes('%3Cscript%3E%26%20x'));
  assert.equal(spotifyUrl(tracks[0]), 'https://open.spotify.com/track/4JFanZrSD5tDjDR2EKF7aq');
  assert.equal(isSpotifyId('too-short'), false);
  assert.equal(spotifyUrl({spotifyId: '<script>'}), null);
  assert.equal(appleMusicUrl({}), null);
  for (const source of Object.values(audioSources)) {
    if (source.spotifyId) assert.equal(isSpotifyId(source.spotifyId), true);
    assert.match(source.reference, /^https:\/\/(open\.spotify\.com|music\.apple\.com|www\.qobuz\.com)\//);
    assert.ok(source.matchNote);
  }
  for (const track of tracks.filter(track => track.sourceStatus === 'candidate')) {
    assert.equal(track.spotifyId, null, 'A possible recording must not become an automatic replacement');
    assert.ok(track.candidateUrl);
  }
  assert.equal(tracks[1].spotifyId, '3fufhbcrcSxpkhj0SPF26j');
});

test('strict permanent and legacy query parsing rejects ambiguous and partial values', () => {
  assert.deepEqual(parseSelection('', tracks), { id: null, error: null });
  assert.equal(parseSelection('?song=1', tracks).id, tracks[0].id);
  assert.equal(parseSelection('?song=20', tracks).id, tracks[19].id);
  assert.equal(parseSelection(`?track=${tracks[10].id}`, tracks).id, tracks[10].id);
  for (const query of ['?song=0', '?song=-1', '?song=21', '?song=1x', '?song=01', '?song=1.0', '?song=1e0', '?song=1&song=2', '?song=1&track=faguna-re-faguna', '?track=', '?track=FAGUNA-RE-FAGUNA', '?track=unknown', '?song=9007199254740993', '?foo=1']) {
    assert.equal(parseSelection(query, tracks).id, null, query);
    assert.ok(parseSelection(query, tracks).error, query);
  }
  assert.equal(permanentLink('https://example.com/music/?song=2#old', 'jhum-jhum'), 'https://example.com/music/?track=jhum-jhum');
});

test('sequential queue stops at end, repeat all wraps, repeat one only repeats automatic advance', () => {
  let queue = createQueue(ids, 'a');
  for (const id of ['b', 'c', 'd']) {
    const next = nextTrack(queue);
    assert.equal(next.id, id);
    queue = next.queue;
  }
  assert.equal(nextTrack(queue, { auto: true }).id, null);
  assert.equal(nextTrack(queue, { repeat: 'all', auto: true }).id, 'a');
  assert.equal(nextTrack(queue, { repeat: 'one', auto: true }).id, 'd');
  assert.equal(nextTrack(createQueue(ids), { repeat: 'one' }).id, 'b');
});

test('shuffle consumes each song once and previous/next traverse actual history', () => {
  let queue = createQueue(ids, 'a', true);
  const heard = ['a'];
  for (let count = 0; count < 3; count++) {
    const result = nextTrack(queue, { random: () => 0.9 });
    queue = result.queue;
    heard.push(result.id);
  }
  assert.equal(new Set(heard).size, ids.length);
  assert.equal(nextTrack(queue).id, null);
  const previous = previousTrack(queue);
  assert.equal(previous.id, heard[2]);
  const forward = nextTrack(previous.queue, { random: () => 0 });
  assert.equal(forward.id, heard[3]);
  const wrapped = nextTrack(queue, { repeat: 'all', random: () => 0 });
  assert.ok(wrapped.id);
  assert.notEqual(wrapped.id, queue.current);
  assert.equal(wrapped.queue.remaining.length, 2);
});

test('manual selection branches history without replaying consumed shuffle entries', () => {
  let queue = createQueue(ids, 'a', true);
  queue = nextTrack(queue, { random: () => 0 }).queue;
  queue = nextTrack(queue, { random: () => 0 }).queue;
  queue = previousTrack(queue).queue;
  queue = selectQueue(queue, 'd');
  assert.deepEqual(queue.history, ['a', 'b', 'd']);
  assert.deepEqual(queue.remaining, []);
  assert.equal(nextTrack(queue).id, null);
  assert.equal(selectQueue(queue, 'invalid'), queue);
  const sequential = setQueueShuffle(queue, false);
  assert.equal(sequential.shuffle, false);
  assert.deepEqual(sequential.remaining, ['a', 'b', 'c']);
});

test('empty and singleton queues have bounded repeat behavior', () => {
  assert.equal(nextTrack(createQueue([]), { repeat: 'all' }).id, null);
  assert.equal(previousTrack(createQueue([])).id, null);
  const singleton = createQueue(['a'], 'a', true);
  assert.equal(nextTrack(singleton).id, null);
  assert.equal(nextTrack(singleton, { repeat: 'all' }).id, 'a');
  assert.equal(previousTrack(singleton).id, null);
  assert.equal(nextTrack(createQueue(ids, 'a', true), { random: () => Number.NaN }).id, 'b');
});

test('preference validation limits values and strips foreign song IDs and positions', () => {
  const safe = sanitizePreferences({ favorites: ['a', 'bad', 'a'], recent: ['b', 'b', 'a'], volume: 500, lastVolume: 37, shuffle: 'true', repeat: 'forever', lastSelected: 'bad', position: 999 }, ids);
  assert.deepEqual(safe, { favorites: ['a'], recent: ['b', 'a'], volume: 100, lastVolume: 37, shuffle: false, repeat: 'none', lastSelected: 'a' });
  assert.equal(clampVolume(-20), 0);
  assert.equal(clampVolume(Number.NaN), 100);
  assert.equal(clampVolume(25.5), 26);
  assert.deepEqual(sanitizePreferences(null, ids), defaultPreferences(ids));
});

test('storage round trip persists only namespaced preferences; clear preserves unrelated keys', () => {
  const data = new Map([['other-app', 'keep']]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const store = createPreferenceStore(storage, ids);
  store.save({ ...defaultPreferences(ids), favorites: ['b'], volume: 0, lastVolume: 36, repeat: 'all', lastSelected: 'c' });
  const restored = createPreferenceStore(storage, ids).read();
  assert.equal(restored.persistent, true);
  assert.deepEqual(restored.preferences.favorites, ['b']);
  assert.equal(restored.preferences.volume, 0);
  assert.equal(restored.preferences.lastVolume, 36);
  assert.equal(restored.preferences.lastSelected, 'c');
  assert.deepEqual(store.clear().preferences, defaultPreferences(ids));
  assert.equal(data.has(PREFERENCE_KEY), false);
  assert.equal(data.get('other-app'), 'keep');
});

test('corrupt, blocked and quota-full storage retain working in-memory preferences', () => {
  for (const raw of ['{bad', 'null', '[]', '42']) {
    const corrupt = createPreferenceStore({ getItem: () => raw }, ids);
    assert.equal(corrupt.read().persistent, false);
    assert.deepEqual(corrupt.save({ ...defaultPreferences(ids), favorites: ['d'] }).preferences.favorites, ['d']);
  }
  const blocked = createPreferenceStore({ getItem() { throw new Error('blocked'); } }, ids);
  assert.equal(blocked.read().persistent, false);
  assert.equal(blocked.clear().persistent, false);
  const full = createPreferenceStore({ getItem: () => null, setItem() { throw new Error('quota'); } }, ids);
  assert.equal(full.save({ ...defaultPreferences(ids), volume: 35 }).persistent, false);
  assert.equal(full.read().preferences.volume, 35);
  assert.equal(createPreferenceStore(null, ids).read().persistent, false);
});

test('search is normalized and filters do not mutate the catalogue', () => {
  assert.equal(filterTracks(tracks, { query: '  SONU  ' }).length, 3);
  assert.equal(filterTracks(tracks, { filter: 'favorites', favorites: [tracks[0].id] })[0], tracks[0]);
  assert.deepEqual(filterTracks(tracks, { filter: 'recent', recent: [tracks[2].id, tracks[0].id] }).map(track => track.id), [tracks[2].id, tracks[0].id]);
  assert.equal(filterTracks(tracks, { query: '<script>' }).length, 0);
  assert.equal(tracks[0].id, 'faguna-re-faguna');
});

test('shortcuts leave interactive elements, editable content and nested controls alone', () => {
  for (const tagName of ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY']) assert.equal(shouldIgnoreShortcut({ tagName }), true);
  assert.equal(shouldIgnoreShortcut({ tagName: 'SPAN', closest: () => ({ tagName: 'BUTTON' }) }), true);
  assert.equal(shouldIgnoreShortcut({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(shouldIgnoreShortcut({ tagName: 'BODY' }), false);
  assert.equal(formatTime(125.9), '2:05');
  assert.equal(formatTime(Number.NaN), '—:—');
  assert.equal(formatTime(-1), '—:—');
});
