
import { tracks, artistLabel, spotifyUrl, appleMusicUrl, candidateUrl, searchUrl } from './catalog.js';
import { createPreferenceStore, createQueue, filterTracks, nextTrack, parseSelection, permanentLink, previousTrack, selectQueue, setQueueShuffle, shouldIgnoreShortcut } from './player-core.js';

const byId = id => document.getElementById(id);
const ids = tracks.map(track => track.id);
let browserStorage = null;
try { browserStorage = window.localStorage; } catch { /* Privacy settings can block the getter. */ }
const store = createPreferenceStore(browserStorage, ids);
let preferences = store.read().preferences;
const linkSelection = parseSelection(window.location.search, tracks);
let selectedId = linkSelection.id || preferences.lastSelected || ids[0];
let queue = createQueue(ids, selectedId, preferences.shuffle);
let filter = 'all';
let player = null;
let playerReady = false;
let playerState = 'idle';
let loadedURI = null;
let playIntent = false;
let pendingPlayRequest = false;
let apiPromise = null;
let spotifyApi = null;
let apiScript = null;
let startupTimer = null;
let playbackTimer = null;
let toastTimer = null;
let statusDetail = '';
let requesting = false;
let initializationVersion = 0;
let manualShareInvoker = null;
const currentTrack = () => tracks.find(track => track.id === selectedId);
const trackURI = () => currentTrack().spotifyId ? `spotify:track:${currentTrack().spotifyId}` : null;

function notify(message) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 5000);
}

function savePreferences() {
  const snapshot = store.save(preferences);
  preferences = snapshot.preferences;
  byId('preferenceStatus').textContent = snapshot.message;
}

function setStatus(next, detail = '') {
  playerState = next;
  statusDetail = detail;
  document.body.dataset.playerState = next;
  renderControls();
}

function renderControls() {
  const track = currentTrack();
  const playing = playerState === 'playing';
  const messages = {
    idle: 'Ready when you are. Spotify loads only when you choose to listen.',
    loading: 'Loading Spotify audio…', ready: 'Spotify controls are ready. Press Play in the player to listen.',
    playing: 'Playing audio on Spotify.', paused: 'Audio paused.', buffering: 'Buffering audio on Spotify…',
    error: 'Spotify could not start audio. Retry or use an external listening link.',
    no_source: 'No matched audio source yet. Try an external listening link.'
  };
  byId('availability').textContent = !track.spotifyId ? messages.no_source : statusDetail || messages[playerState];
  byId('playButton').setAttribute('aria-label', playing || playerState === 'buffering' ? 'Pause' : playerReady ? 'Play' : 'Load and play audio');
  byId('playButton').disabled = !track.spotifyId;
  byId('playButton').classList.toggle('is-playing', playing);
  byId('shuffleButton').setAttribute('aria-pressed', String(preferences.shuffle));
  byId('shuffleButton').classList.toggle('is-active', preferences.shuffle);
  byId('currentFavorite').setAttribute('aria-pressed', String(preferences.favorites.includes(selectedId)));
  byId('currentFavorite').setAttribute('aria-label', preferences.favorites.includes(selectedId) ? 'Remove current song from favorites' : 'Favorite current song');
  byId('retryButton').hidden = playerState !== 'error' || !track.spotifyId;
  byId('loadAudioButton').hidden = playerReady || playerState === 'loading';
  byId('loadAudioButton').disabled = !track.spotifyId;
  byId('playerHint').textContent = !track.spotifyId
    ? track.candidateLabel ? `Possible recording: ${track.candidateLabel}. Open the possible match below to check it.` : 'No Spotify track has been matched for this song. Search by title and artist below.'
    : 'Use Spotify’s own playback controls. Full tracks, previews and availability depend on Spotify, your account and region.';
}

function sourceLink(label, href) {
  const link = document.createElement('a');
  link.className = 'source-link';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = label;
  return link;
}

function renderSources() {
  const track = currentTrack();
  const fragment = document.createDocumentFragment();
  const url = spotifyUrl(track);
  const appleUrl = appleMusicUrl(track);
  if (url) fragment.append(sourceLink('Open on Spotify ↗', url));
  if (appleUrl) fragment.append(sourceLink('Open on Apple Music ↗', appleUrl));
  if (candidateUrl(track)) fragment.append(sourceLink('Possible match ↗', candidateUrl(track)));
  fragment.append(sourceLink('Search Spotify ↗', searchUrl(track)));
  byId('externalSources').replaceChildren(fragment);
}

function favorite(id) {
  preferences.favorites = preferences.favorites.includes(id) ? preferences.favorites.filter(item => item !== id) : [...preferences.favorites, id];
  savePreferences();
  renderControls();
  renderPlaylist();
}

function renderPlaylist() {
  const focused = document.activeElement;
  const focusedId = focused?.dataset?.track;
  const focusedAction = focused?.dataset?.action;
  const wasInList = Boolean(focused?.closest('#playlistList'));
  const results = filterTracks(tracks, { query: byId('playlistSearch').value, filter, ...preferences });
  const fragment = document.createDocumentFragment();
  for (const track of results) {
    const row = document.createElement('li');
    row.className = `song-row${track.id === selectedId ? ' is-current' : ''}`;
    row.dataset.track = track.id;
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'song-select';
    select.dataset.track = track.id;
    select.dataset.action = 'select';
    if (track.id === selectedId) select.setAttribute('aria-current', 'true');
    select.setAttribute('aria-label', `Play ${track.title}${track.spotifyId ? '' : ' (no matched audio source)'}`);
    const index = document.createElement('span');
    index.className = 'song-index';
    index.textContent = String(tracks.indexOf(track) + 1).padStart(2, '0');
    const details = document.createElement('span');
    details.className = 'song-details';
    const title = document.createElement('span');
    title.className = 'song-title';
    title.textContent = track.title;
    const meta = document.createElement('span');
    meta.className = 'song-meta';
    meta.textContent = `${artistLabel(track)} · ${track.spotifyId ? 'Spotify audio' : track.candidateUrl ? 'Possible recording found' : 'No matched audio source yet'}`;
    details.append(title, meta);
    select.append(index, details);
    select.addEventListener('click', () => selectTrack(track.id, true));
    const actions = document.createElement('div');
    actions.className = 'song-actions';
    const favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'song-favorite';
    favoriteButton.textContent = preferences.favorites.includes(track.id) ? '♥' : '♡';
    favoriteButton.setAttribute('aria-label', `Favorite ${track.title}`);
    favoriteButton.setAttribute('aria-pressed', String(preferences.favorites.includes(track.id)));
    favoriteButton.dataset.track = track.id;
    favoriteButton.dataset.action = 'favorite';
    favoriteButton.addEventListener('click', () => favorite(track.id));
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'song-share';
    share.textContent = 'Share';
    share.setAttribute('aria-label', `Share ${track.title}`);
    share.dataset.track = track.id;
    share.dataset.action = 'share';
    share.addEventListener('click', event => shareTrack(track, event.currentTarget));
    actions.append(favoriteButton, share);
    row.append(select, actions);
    fragment.append(row);
  }
  if (!results.length) {
    const empty = document.createElement('li');
    empty.className = 'playlist-empty';
    empty.textContent = filter === 'recent' ? 'No recently played songs match. Songs appear here after playback starts.' : filter === 'favorites' ? 'No favorites match. Use a heart to save a song.' : 'No songs match. Try another title or artist.';
    fragment.append(empty);
  }
  byId('playlistList').replaceChildren(fragment);
  byId('resultCount').textContent = `${results.length} of ${tracks.length} songs`;
  byId('clearFilters').hidden = !byId('playlistSearch').value && filter === 'all';
  for (const mode of ['all', 'favorites', 'recent']) byId(`filter${mode[0].toUpperCase()}${mode.slice(1)}`).setAttribute('aria-pressed', String(filter === mode));
  if (wasInList && focusedId && focusedAction) {
    const replacement = [...byId('playlistList').querySelectorAll('button')].find(button => button.dataset.track === focusedId && button.dataset.action === focusedAction);
    if (replacement) replacement.focus({ preventScroll: true });
    else byId(`filter${filter[0].toUpperCase()}${filter.slice(1)}`).focus({ preventScroll: true });
  }
}

function renderSelection() {
  const track = currentTrack();
  byId('trackTitleText').textContent = track.title;
  byId('trackArtist').textContent = artistLabel(track);
  byId('trackNumber').textContent = String(ids.indexOf(track.id) + 1).padStart(2, '0');
  renderSources();
  renderControls();
  renderPlaylist();
}

function resetPlayer() {
  initializationVersion += 1;
  clearTimeout(startupTimer);
  clearTimeout(playbackTimer);
  requesting = false;
  pendingPlayRequest = false;
  playerReady = false;
  loadedURI = null;
  const oldPlayer = player;
  player = null;
  try { oldPlayer?.pause(); } catch { /* A detached provider may already be closed. */ }
  try { oldPlayer?.destroy(); } catch { /* Remove the detached host below. */ }
  byId('audioPlayerFrame').querySelectorAll('iframe, #spotifyPlayer').forEach(element => element.remove());
  const host = document.createElement('div');
  host.id = 'spotifyPlayer';
  byId('audioPlayerFrame').append(host);
  byId('audioPlaceholder').hidden = false;
}

function fail(message) {
  playIntent = false;
  resetPlayer();
  setStatus('error', message);
}

function loadSpotifyApi() {
  if (spotifyApi) return Promise.resolve(spotifyApi);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    let settled = false;
    const previous = window.onSpotifyIframeApiReady;
    const finish = (api, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        apiPromise = null;
        apiScript?.remove();
        apiScript = null;
        reject(error);
      } else {
        spotifyApi = api;
        resolve(api);
      }
    };
    window.onSpotifyIframeApiReady = api => {
      // A timed-out script can still complete; cache it for a later explicit retry.
      if (api?.createController) spotifyApi = api;
      if (typeof previous === 'function') {
        try { previous(api); } catch { /* Other embeds cannot break this player. */ }
      }
      api?.createController ? finish(api) : finish(null, new Error('Spotify audio API is unavailable.'));
    };
    const timer = setTimeout(() => finish(null, new Error('Spotify took too long to load. Retry or use an external listening link.')), 15000);
    apiScript = document.createElement('script');
    apiScript.src = 'https://open.spotify.com/embed/iframe-api/v1';
    apiScript.async = true;
    apiScript.onerror = () => finish(null, new Error('Spotify could not load. Check your connection, then retry.'));
    document.head.append(apiScript);
  });
  return apiPromise;
}

function armPlaybackTimeout() {
  clearTimeout(playbackTimer);
  const attempt = initializationVersion;
  playbackTimer = setTimeout(() => {
    if (attempt === initializationVersion && playIntent && playerState !== 'playing') {
      fail('Audio did not start. Retry to reload Spotify’s controls, or use an external listening link.');
    }
  }, 15000);
}

function requestPlayback() {
  if (!playerReady || !player || loadedURI !== trackURI()) return;
  playIntent = true;
  pendingPlayRequest = true;
  setStatus('loading', 'Starting audio… Spotify may require you to press Play in its player.');
  armPlaybackTimeout();
  try { player.resume(); }
  catch { fail('Spotify could not start audio. Retry or use an external listening link.'); }
}

async function ensurePlayer(shouldPlay) {
  if (!trackURI()) return;
  playIntent = shouldPlay;
  if (playerReady && loadedURI === trackURI()) {
    if (shouldPlay) requestPlayback();
    return;
  }
  if (requesting) return;
  requesting = true;
  const attempt = ++initializationVersion;
  setStatus('loading');
  try {
    const api = await loadSpotifyApi();
    if (attempt !== initializationVersion || !requesting || !trackURI()) return;
    const uri = trackURI();
    loadedURI = uri;
    startupTimer = setTimeout(() => {
      if (attempt === initializationVersion) fail('The Spotify audio player did not become ready. Retry or use an external listening link.');
    }, 15000);
    // Spotify documents audio fallback below 150px. Keep the complete compact player visible.
    api.createController(byId('spotifyPlayer'), { uri, width: '100%', height: 80 }, controller => {
      if (attempt !== initializationVersion || uri !== trackURI()) {
        try { controller.destroy(); } catch { /* A stale initialization is discarded. */ }
        return;
      }
      player = controller;
      const valid = event => attempt === initializationVersion && player === controller && loadedURI === trackURI()
        && event?.data?.playingURI === loadedURI;
      controller.addListener('ready', () => {
        if (attempt !== initializationVersion || player !== controller || uri !== trackURI()) return;
        clearTimeout(startupTimer);
        requesting = false;
        playerReady = true;
        byId('audioPlaceholder').hidden = true;
        const iframe = byId('audioPlayerFrame').querySelector('iframe');
        if (iframe) {
          iframe.title = `Spotify audio player: ${currentTrack().title}`;
          iframe.height = '80';
          iframe.style.height = '80px';
          iframe.setAttribute('tabindex', '0');
        }
        setStatus('ready');
        if (playIntent) requestPlayback();
      });
      controller.addListener('playback_started', event => {
        if (!valid(event)) return;
        clearTimeout(playbackTimer);
        pendingPlayRequest = false;
        playIntent = true;
        setStatus('playing');
        preferences.recent = [selectedId, ...preferences.recent.filter(id => id !== selectedId)].slice(0, ids.length);
        savePreferences();
        renderPlaylist();
      });
      controller.addListener('playback_update', event => {
        if (!valid(event)) return;
        const data = event.data;
        if (data.isBuffering) {
          const wasBuffering = playerState === 'buffering';
          playIntent = true;
          setStatus('buffering');
          if (!wasBuffering) armPlaybackTimeout();
        } else if (data.isPaused === true) {
          // A paused initialization can precede a browser-blocked play request.
          if (!pendingPlayRequest) { playIntent = false; clearTimeout(playbackTimer); }
          setStatus(pendingPlayRequest ? 'ready' : 'paused', pendingPlayRequest ? 'Press Play in Spotify’s player to start audio.' : '');
        } else if (data.isPaused === false) {
          clearTimeout(playbackTimer);
          pendingPlayRequest = false;
          playIntent = true;
          setStatus('playing');
        }
        // No documented end event: a preview cutoff must never advance or repeat the queue.
      });
    });
  } catch (error) {
    if (attempt === initializationVersion) fail(error instanceof Error ? error.message : 'Spotify failed to load. Please retry.');
  }
}

function selectTrack(id, shouldPlay = false, updateQueue = true) {
  if (!ids.includes(id)) return;
  resetPlayer();
  selectedId = id;
  if (updateQueue) queue = selectQueue(queue, id);
  preferences.lastSelected = id;
  savePreferences();
  playIntent = shouldPlay;
  setStatus(trackURI() ? 'idle' : 'no_source');
  renderSelection();
  try { window.history.replaceState(null, '', permanentLink(window.location.href, id)); } catch { /* Privacy contexts may restrict history. */ }
  if (trackURI() && shouldPlay) void ensurePlayer(true);
  else if (!trackURI()) {
    playIntent = false;
    notify('No matched audio source yet. Use an external listening link or search Spotify.');
  }
}

function advance() {
  const result = nextTrack(queue, { repeat: 'none', auto: false });
  queue = result.queue;
  if (!result.id) { notify('You are at the end of the queue. Choose another song.'); return; }
  selectTrack(result.id, true, false);
}

function goPrevious() {
  const result = previousTrack(queue);
  queue = result.queue;
  if (result.id) selectTrack(result.id, true, false);
  else notify('You are at the start of the queue.');
}

function togglePlayback() {
  if (!trackURI()) return;
  if (playerReady && ['playing', 'buffering'].includes(playerState)) {
    playIntent = false;
    pendingPlayRequest = false;
    clearTimeout(playbackTimer);
    try { player.pause(); }
    catch { fail('Spotify could not pause audio. Retry or use an external listening link.'); }
  } else void ensurePlayer(true);
}

function toggleShuffle() {
  preferences.shuffle = !preferences.shuffle;
  queue = setQueueShuffle(queue, preferences.shuffle);
  savePreferences();
  renderControls();
  notify(preferences.shuffle ? 'Shuffle on. Next chooses an unvisited song.' : 'Shuffle off.');
}


function showManualShare(url, invoker) {
  const dialog = byId('manualShareDialog');
  manualShareInvoker = invoker;
  byId('manualShareUrl').value = url;
  if (!dialog.open) dialog.showModal();
  byId('manualShareUrl').focus();
  byId('manualShareUrl').select();
}

async function shareTrack(track, invoker) {
  const url = permanentLink(window.location.href, track.id);
  if (typeof navigator.share === 'function') {
    try { await navigator.share({ title: track.title, text: `Listen to ${track.title} on Odia Gita`, url }); return; }
    catch (error) { if (error?.name === 'AbortError') return; }
  }
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(url); notify('Song link copied.'); return; } catch { /* Use a selectable link. */ }
  }
  showManualShare(url, invoker);
}

byId('playButton').addEventListener('click', togglePlayback);
byId('loadAudioButton').addEventListener('click', () => { void ensurePlayer(false); });
byId('retryButton').addEventListener('click', () => {
  resetPlayer();
  void ensurePlayer(true);
});
byId('previousButton').addEventListener('click', goPrevious);
byId('nextButton').addEventListener('click', () => advance());
byId('shuffleButton').addEventListener('click', toggleShuffle);
byId('currentFavorite').addEventListener('click', () => favorite(selectedId));
byId('shareButton').addEventListener('click', event => shareTrack(currentTrack(), event.currentTarget));
byId('playlistSearch').addEventListener('input', renderPlaylist);
for (const mode of ['all', 'favorites', 'recent']) {
  byId(`filter${mode[0].toUpperCase()}${mode.slice(1)}`).addEventListener('click', () => { filter = mode; renderPlaylist(); });
}
byId('clearFilters').addEventListener('click', () => { filter = 'all'; byId('playlistSearch').value = ''; renderPlaylist(); byId('playlistSearch').focus(); });
byId('clearPreferences').addEventListener('click', () => {
  const snapshot = store.clear();
  preferences = { ...snapshot.preferences, lastSelected: selectedId };
  queue = createQueue(ids, selectedId, false);
  filter = 'all';
  byId('playlistSearch').value = '';
  byId('preferenceStatus').textContent = snapshot.message;
  renderControls(); renderPlaylist(); notify('Preferences reset.');
});
const shortcutsDialog = byId('shortcutsDialog');
function openShortcuts() {
  if (shortcutsDialog.open) return;
  shortcutsDialog.showModal();
  byId('shortcutsClose').focus();
}
byId('shortcutsToggle').addEventListener('click', openShortcuts);
byId('shortcutsClose').addEventListener('click', () => shortcutsDialog.close());
shortcutsDialog.addEventListener('close', () => byId('shortcutsToggle').focus({ preventScroll: true }));
byId('manualShareClose').addEventListener('click', () => byId('manualShareDialog').close());
byId('manualShareDialog').addEventListener('close', () => {
  const invoker = manualShareInvoker;
  const replacement = invoker?.isConnected ? invoker : [...byId('playlistList').querySelectorAll('button')].find(button => button.dataset.action === 'share' && button.dataset.track === invoker?.dataset?.track);
  (replacement || byId('shareButton')).focus({ preventScroll: true });
  manualShareInvoker = null;
});
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.altKey || event.metaKey || event.repeat || shortcutsDialog.open || byId('manualShareDialog').open || shouldIgnoreShortcut(event.target)) return;
  let action;
  if (event.key === ' ' && !event.ctrlKey) action = togglePlayback;
  else if (event.key === 'ArrowRight' && event.ctrlKey) action = () => advance();
  else if (event.key === 'ArrowLeft' && event.ctrlKey) action = goPrevious;
  else if (event.key.toLowerCase() === 's' && !event.ctrlKey) action = toggleShuffle;
  else if (event.key === '?' && !event.ctrlKey) action = openShortcuts;
  if (action) { event.preventDefault(); action(); }
});
window.addEventListener('offline', () => {
  if (['playing', 'loading', 'buffering'].includes(playerState)) fail('You are offline. Reconnect, then press Retry or use an external listening link.');
});
byId('preferenceStatus').textContent = store.read().message;
if (byId('catalogCount')) byId('catalogCount').textContent = String(tracks.length);
if (!trackURI()) setStatus('no_source');
renderSelection();
if (linkSelection.error) notify(linkSelection.error);
