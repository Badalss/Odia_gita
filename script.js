
import { tracks, artistLabel, youtubeUrl, searchUrl } from './catalog.js';
import { REPEAT_MODES, clampVolume, createPreferenceStore, createQueue, filterTracks, formatTime, nextTrack, parseSelection, permanentLink, previousTrack, selectQueue, setQueueShuffle, shouldIgnoreShortcut } from './player-core.js';

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
let loadedVideoId = null;
let playIntent = false;
let apiPromise = null;
let apiScript = null;
let startupTimer = null;
let playbackTimer = null;
let toastTimer = null;
let statusDetail = '';
let requesting = false;
let initializationVersion = 0;
let manualShareInvoker = null;
const durations = new Map();
const currentTrack = () => tracks.find(track => track.id === selectedId);
const validVideoEvent = event => event.target === player && loadedVideoId === currentTrack().youtubeId && player.getVideoData?.().video_id === loadedVideoId;

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
    idle: 'Ready when you are. YouTube loads only when you choose to play.',
    loading: 'Loading YouTube…', ready: 'Ready. Press Play to listen.', playing: 'Playing on YouTube.',
    paused: 'Paused.', buffering: 'Buffering on YouTube…', ended: 'Queue finished. Choose a song or press Play.',
    error: 'YouTube could not play this source. Retry or use an external link.'
  };
  byId('availability').textContent = !track.youtubeId ? 'Unavailable here: the original source ID is incomplete. Search YouTube below.' : statusDetail || messages[playerState];
  byId('playButton').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  byId('playButton').disabled = !track.youtubeId;
  const glyph = byId('playButton').querySelector('.play-glyph');
  if (glyph) glyph.textContent = playing ? 'Ⅱ' : '▶';
  byId('playButton').classList.toggle('is-playing', playing);
  byId('shuffleButton').setAttribute('aria-pressed', String(preferences.shuffle));
  byId('shuffleButton').classList.toggle('is-active', preferences.shuffle);
  byId('repeatButton').setAttribute('aria-pressed', String(preferences.repeat !== 'none'));
  byId('repeatButton').setAttribute('aria-label', `Repeat: ${preferences.repeat === 'none' ? 'off' : preferences.repeat}. Change repeat mode`);
  byId('repeatButton').setAttribute('title', `Repeat ${preferences.repeat === 'none' ? 'off' : preferences.repeat}`);
  byId('repeatButton').dataset.mode = preferences.repeat;
  byId('repeatButton').classList.toggle('is-active', preferences.repeat !== 'none');
  byId('volume').value = String(preferences.volume);
  byId('volumeButton').setAttribute('aria-label', preferences.volume === 0 ? 'Unmute' : 'Mute');
  byId('volumeButton').setAttribute('aria-pressed', String(preferences.volume === 0));
  byId('currentFavorite').setAttribute('aria-pressed', String(preferences.favorites.includes(selectedId)));
  byId('currentFavorite').setAttribute('aria-label', preferences.favorites.includes(selectedId) ? 'Remove current song from favorites' : 'Favorite current song');
  byId('retryButton').hidden = playerState !== 'error' || !track.youtubeId;
  byId('loadPlayerButton').hidden = playerReady || playerState === 'loading';
  byId('loadPlayerButton').disabled = !track.youtubeId;
  byId('seek').disabled = !playerReady || !Number.isFinite(durations.get(selectedId));
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
  const url = youtubeUrl(track);
  if (url) fragment.append(sourceLink('Open on YouTube ↗', url));
  fragment.append(sourceLink('Search YouTube ↗', searchUrl(track)));
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
    select.setAttribute('aria-label', `Play ${track.title}${track.youtubeId ? '' : ' (source unavailable)'}`);
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
    meta.textContent = `${artistLabel(track)} · ${track.youtubeId ? 'Unverified source' : 'Source unavailable'}`;
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
  byId('elapsed').textContent = '0:00';
  byId('duration').textContent = formatTime(durations.get(selectedId));
  byId('seek').value = '0';
  renderSources();
  renderControls();
  renderPlaylist();
}

function fail(message) {
  clearTimeout(startupTimer);
  clearTimeout(playbackTimer);
  playIntent = false;
  requesting = false;
  initializationVersion += 1;
  setStatus('error', message);
  if (playerReady) player.pauseVideo();
}

function revealVideo() {
  // Intentional controls bring the actual video into view before starting it.
  byId('videoFrame').scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
}

function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) { apiPromise = null; apiScript?.remove(); apiScript = null; reject(error); }
      else resolve();
    };
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      window.YT?.Player ? finish() : finish(new Error('YouTube API unavailable'));
    };
    const timer = setTimeout(() => finish(new Error('YouTube took too long to load. Check your connection, then retry.')), 15000);
    apiScript = document.createElement('script');
    apiScript.src = 'https://www.youtube.com/iframe_api';
    apiScript.async = true;
    apiScript.onerror = () => finish(new Error('YouTube could not load. Check your connection, then retry.'));
    document.head.append(apiScript);
  });
  return apiPromise;
}

function armPlaybackTimeout() {
  clearTimeout(playbackTimer);
  playbackTimer = setTimeout(() => {
    if (playIntent && ['loading', 'buffering'].includes(playerState)) fail('Playback did not start. Press Retry or open this song on YouTube.');
  }, 18000);
}

function playCurrent() {
  if (!playerReady || !player || !playIntent) return;
  const videoId = currentTrack().youtubeId;
  if (!videoId) { player.stopVideo(); loadedVideoId = null; setStatus('idle'); return; }
  loadedVideoId = videoId;
  setStatus('loading', 'Starting the selected song…');
  armPlaybackTimeout();
  if (player.getVideoData?.().video_id === videoId && player.getPlayerState?.() !== 0) player.playVideo();
  else player.loadVideoById(videoId);
}

async function ensurePlayer(shouldPlay) {
  if (!currentTrack().youtubeId) return;
  playIntent = shouldPlay;
  if (playerReady) {
    if (shouldPlay) playCurrent();
    return;
  }
  if (requesting) return;
  requesting = true;
  const attempt = ++initializationVersion;
  setStatus('loading');
  try {
    await loadYoutubeApi();
    if (!requesting || attempt !== initializationVersion) return;
    // Always read the latest selection and intent in onReady.
    startupTimer = setTimeout(() => fail('The YouTube player did not become ready. Press Retry or use an external link.'), 15000);
    // Once an iframe exists, no app artwork or controls cover its own controls.
    byId('videoPlaceholder').hidden = true;
    player = new window.YT.Player('youtubePlayer', {
      width: '100%', height: '100%',
      playerVars: { autoplay: 0, controls: 1, playsinline: 1, rel: 0, ...(window.location.protocol.startsWith('http') ? { origin: window.location.origin } : {}) },
      events: {
        onReady(event) {
          if (event.target !== player || attempt !== initializationVersion) return;
          clearTimeout(startupTimer);
          requesting = false;
          playerReady = true;
          player.setVolume(preferences.volume);
          byId('videoPlaceholder').hidden = true;
          const iframe = player.getIframe();
          iframe.title = 'YouTube video player';
          iframe.setAttribute('tabindex', '0');
          if (playIntent) playCurrent();
          else {
            playIntent = false;
            const pausedDetail = playerState === 'paused' ? statusDetail : '';
            loadedVideoId = currentTrack().youtubeId;
            if (loadedVideoId) player.cueVideoById(loadedVideoId);
            setStatus(pausedDetail ? 'paused' : 'ready', pausedDetail);
          }
        },
        onStateChange(event) {
          if (!validVideoEvent(event)) return;
          // The iframe may deliver queued events after a newer load request.
          if (typeof player.getPlayerState === 'function' && player.getPlayerState() !== event.data) return;
          const states = window.YT.PlayerState;
          if (playerState === 'error') {
            if (event.data === states.PLAYING || event.data === states.BUFFERING) player.pauseVideo();
            return;
          }
          if (event.data === states.PLAYING) {
            clearTimeout(playbackTimer);
            playIntent = true;
            setStatus('playing');
            preferences.recent = [selectedId, ...preferences.recent.filter(id => id !== selectedId)].slice(0, ids.length);
            savePreferences();
            const total = player.getDuration();
            if (Number.isFinite(total) && total > 0) durations.set(selectedId, total);
            renderPlaylist();
            updateProgress();
          } else if (event.data === states.PAUSED) {
            clearTimeout(playbackTimer);
            playIntent = false;
            setStatus('paused', playerState === 'paused' ? statusDetail : '');
          } else if (event.data === states.BUFFERING) {
            setStatus('buffering');
            armPlaybackTimeout();
          } else if (event.data === states.CUED) {
            if (!playIntent && playerState !== 'paused') setStatus('ready');
          } else if (event.data === states.ENDED) {
            clearTimeout(playbackTimer);
            playIntent = false;
            advance(true);
          }
        },
        onError(event) {
          if (event.target !== player || loadedVideoId !== currentTrack().youtubeId) return;
          const observed = player.getVideoData?.().video_id;
          if (observed && observed !== loadedVideoId) return;
          fail('This source is unavailable, restricted, or cannot be embedded. Retry or open it on YouTube.');
        },
        onAutoplayBlocked() {
          if (playerState === 'error') return;
          clearTimeout(playbackTimer);
          playIntent = false;
          setStatus('ready', 'Your browser blocked playback. Press Play again or use the video controls.');
        }
      }
    });
  } catch (error) {
    if (attempt === initializationVersion) fail(error instanceof Error ? error.message : 'YouTube failed to load. Please retry.');
  }
}

function selectTrack(id, shouldPlay = false, updateQueue = true, reveal = true) {
  if (!ids.includes(id)) return;
  selectedId = id;
  if (updateQueue) queue = selectQueue(queue, id);
  preferences.lastSelected = id;
  savePreferences();
  playIntent = shouldPlay;
  clearTimeout(playbackTimer);
  loadedVideoId = null;
  if (playerReady) player.stopVideo();
  setStatus('idle');
  renderSelection();
  try { window.history.replaceState(null, '', permanentLink(window.location.href, id)); } catch { /* Local-file/privacy contexts may restrict history. */ }
  if (currentTrack().youtubeId) {
    if (shouldPlay) {
      if (reveal) revealVideo();
      void ensurePlayer(true);
    }
  } else {
    playIntent = false;
    notify('This source ID is incomplete. Use Search YouTube to find the song.');
  }
}

function advance(auto = false) {
  const result = nextTrack(queue, { repeat: preferences.repeat, auto });
  queue = result.queue;
  if (!result.id) { playIntent = false; setStatus('ended'); return; }
  selectTrack(result.id, true, false, !auto);
}

function goPrevious() {
  const result = previousTrack(queue);
  queue = result.queue;
  if (result.id) selectTrack(result.id, true, false);
  else notify('You are at the start of the queue.');
}

function togglePlayback() {
  if (!currentTrack().youtubeId) return;
  if (playerReady && playerState === 'playing') { playIntent = false; player.pauseVideo(); }
  else { revealVideo(); void ensurePlayer(true); }
}

function updateProgress() {
  if (!playerReady || loadedVideoId !== currentTrack().youtubeId || player.getVideoData?.().video_id !== loadedVideoId) return;
  const current = player.getCurrentTime();
  const total = player.getDuration();
  if (!Number.isFinite(total) || total <= 0) return;
  durations.set(selectedId, total);
  byId('elapsed').textContent = formatTime(current);
  byId('duration').textContent = formatTime(total);
  byId('seek').disabled = false;
  if (document.activeElement !== byId('seek')) byId('seek').value = String(Math.min(100, Math.max(0, current / total * 100)));
  byId('seek').setAttribute('aria-valuetext', `${formatTime(current)} of ${formatTime(total)}`);
}

function setVolume(value) {
  preferences.volume = clampVolume(value);
  if (preferences.volume > 0) preferences.lastVolume = preferences.volume;
  if (playerReady) { player.unMute(); player.setVolume(preferences.volume); }
  savePreferences();
  renderControls();
}

function toggleShuffle() {
  preferences.shuffle = !preferences.shuffle;
  queue = setQueueShuffle(queue, preferences.shuffle);
  savePreferences();
  renderControls();
  notify(preferences.shuffle ? 'Shuffle on. Each song plays once per queue.' : 'Shuffle off.');
}

function cycleRepeat() {
  preferences.repeat = REPEAT_MODES[(REPEAT_MODES.indexOf(preferences.repeat) + 1) % REPEAT_MODES.length];
  savePreferences();
  renderControls();
  notify(`Repeat ${preferences.repeat === 'none' ? 'off' : preferences.repeat}.`);
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
byId('loadPlayerButton').addEventListener('click', () => { revealVideo(); void ensurePlayer(false); });
byId('retryButton').addEventListener('click', () => {
  clearTimeout(startupTimer);
  clearTimeout(playbackTimer);
  if (player && !playerReady) {
    player.destroy?.(); player = null;
    if (!byId('youtubePlayer')) {
      const host = document.createElement('div'); host.id = 'youtubePlayer'; byId('videoFrame').append(host);
    }
  }
  requesting = false;
  revealVideo();
  void ensurePlayer(true);
});
byId('previousButton').addEventListener('click', goPrevious);
byId('nextButton').addEventListener('click', () => advance());
byId('shuffleButton').addEventListener('click', toggleShuffle);
byId('repeatButton').addEventListener('click', cycleRepeat);
byId('volume').addEventListener('input', event => setVolume(Number(event.target.value)));
byId('volumeButton').addEventListener('click', () => setVolume(preferences.volume > 0 ? 0 : preferences.lastVolume));
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
  if (playerReady) { player.unMute(); player.setVolume(preferences.volume); }
  renderControls(); renderPlaylist(); notify('Preferences reset.');
});
byId('seek').addEventListener('input', event => {
  if (!playerReady || loadedVideoId !== currentTrack().youtubeId) return;
  const total = player.getDuration();
  const value = Number(event.target.value);
  if (Number.isFinite(total) && total > 0 && Number.isFinite(value)) {
    player.seekTo(Math.min(100, Math.max(0, value)) / 100 * total, true);
    byId('elapsed').textContent = formatTime(value / 100 * total);
  }
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
  else if (event.key.toLowerCase() === 'r' && !event.ctrlKey) action = cycleRepeat;
  else if (event.key === '?' && !event.ctrlKey) action = openShortcuts;
  if (action) { event.preventDefault(); action(); }
});
window.addEventListener('offline', () => {
  if (['playing', 'loading', 'buffering'].includes(playerState)) { if (playerReady) player.pauseVideo(); fail('You are offline. Reconnect, then press Retry or use an external link.'); }
});
byId('preferenceStatus').textContent = store.read().message;
if (byId('catalogCount')) byId('catalogCount').textContent = String(tracks.length);
renderSelection();
if (linkSelection.error) notify(linkSelection.error);
setInterval(updateProgress, 500);
