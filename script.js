const track = (title, artist, sources = {}) => ({
  title,
  artist,
  youtubeId: sources.youtubeId || '',
  youtubeUrl: sources.youtubeUrl || '',
  spotifyUrl: sources.spotifyUrl || '',
  youtubeMusicUrl: sources.youtubeMusicUrl || ''
});

const tracks = [
  track('Faguna Re Faguna', 'Babul Supriyo, Ira Mohanty', { youtubeId: 'OiJmJQefcu4' }),
  track('Jhum Jhum', 'Kabita Krishnamurthy, Prosan Jeet', { youtubeId: '5cXf1t57NqE' }),
  track('Sunara Chadheyi', 'Sonu Nigam, Kabita', { youtubeId: 'U46qaVIN5JU' }),
  track('Gori Jhumuru Jhumuru Tora Pada Paunji', 'Sonu Nigam', { youtubeId: '4towad-Ntvc' }),
  track('To Akhi Mo Aaina', 'Sonu Nigam / Pamela Jain', { youtubeId: '5LIC20f47Q0' }),
  track('Anamika Nayika Se Hela Mora Premika', 'Babul Supriyo', { youtubeId: 'U1qJfUyw31s' }),
  track('Sata Meghara Odhani', 'Odia romantic collection', { youtubeId: 'H86ELoqwrFM' }),
  track('Pritira Pahili Chitti', 'Odia romantic collection', { youtubeId: 'rXcbn53xPfM' }),
  track('Ajana Bate', 'Odia romantic collection', { youtubeId: 'B6HFhvXuxr0' }),
  track('Gabhare Gajara Jhulei', 'Odia romantic collection', { youtubeId: 'jSVH_nCbagY' }),
  track('Rupasi Mananku Namaste', 'Odia romantic collection', { youtubeId: 'oXnDXztLsmI' }),
  track('Janhare Tate', 'Udit Narayan', { youtubeId: 'tuw-QB2Ud7k' }),
  track('E Banara Chhai', 'Amit Kumar', { youtubeId: 'IeHoRrhbZnc' }),
  track('Tume Mo Phula Mu Tuma Phaguna', 'Odia romantic collection', { youtubeId: 'f7KAg85gnTE' }),
  track('Chandrama Ago Chandrama', 'Odia romantic collection', { youtubeId: 'Ce05KxJDkcU' }),
  track('Chhati Tale', 'Odia romantic collection', { youtubeId: '0z6AifAOSVk' }),
  track('Hela Ki Prema', 'Odia romantic collection', { youtubeId: 'x3rECnmVa5M' }),
  track('Matha Re Dei Pata Odhani', 'Odia romantic collection', { youtubeId: 'Y7de3k4q0bw' }),
  track('Basinda', 'Odia romantic collection', { youtubeId: 'RFq8_xfM5qg' }),
  track('Phulara Sahare Gharate Tolichi', 'Odia romantic collection', { youtubeId: 'jpDI0TEvxLA' })
];

// Track durations (fetched from YouTube API or fallback)
const trackDurations = {};

const state = {
  currentIndex: 0,
  player: null,
  playerReady: false,
  loadedVideoId: '',
  isPlaying: false,
  toastTimer: null,
  sourceError: false,
  hasStarted: false,
  shuffle: false,
  repeat: 'none', // none, one, all
  volume: 100,
  searchQuery: ''
};

const $ = (selector) => document.querySelector(selector);
const clock = $('#clock');
const trackNumber = $('#trackNumber');
const trackTitleText = $('#trackTitleText');
const trackArtist = $('#trackArtist');
const availability = $('#availability');
const elapsed = $('#elapsed');
const duration = $('#duration');
const seek = $('#seek');
const seekTooltip = $('#seekTooltip');
const playButton = $('#playButton');
const playGlyph = $('.play-glyph');
const playlistPanel = $('#playlistPanel');
const playlistList = $('#playlistList');
const playlistToggle = $('#playlistToggle');
const queueButton = $('#queueButton');
const topPlaylistButton = $('#topPlaylistButton');
const externalSources = $('#externalSources');
const toast = $('#toast');
const shuffleButton = $('#shuffleButton');
const repeatButton = $('#repeatButton');
const volumeButton = $('#volumeButton');
const volumeSlider = $('#volume');
const playlistSearch = $('#playlistSearch');
const shortcutsToggle = $('#shortcutsToggle');
const shortcutsOverlay = $('#shortcutsOverlay');
const shortcutsClose = $('#shortcutsClose');

const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const icons = {
  play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  pause: svg('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
  previous: svg('<path d="M19 5v14l-10-7z" fill="currentColor"/><path d="M5 5v14"/>'),
  next: svg('<path d="M5 5v14l10-7z" fill="currentColor"/><path d="M19 5v14"/>'),
  shuffle: svg('<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="m4 4 5 5"/>'),
  repeat: svg('<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  repeatOne: svg('<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/><path d="M11 10h1v4"/>'),
  volume: svg('<path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>'),
  volumeLow: svg('<path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>'),
  volumeMute: svg('<path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="m16 9 5 6M21 9l-5 6"/>'),
  external: svg('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>')
};
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icons[el.dataset.icon]; });

function updateClock() {
  clock.textContent = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date()).toLowerCase();
}

function formatTime(value) {
  if (!Number.isFinite(value)) return '—:—';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 5000);
}

toast.addEventListener('click', () => {
  toast.classList.remove('is-visible');
  clearTimeout(state.toastTimer);
});

function extractYoutubeId(item) {
  if (item.youtubeId && /^[A-Za-z0-9_-]{11}$/.test(item.youtubeId)) return item.youtubeId;
  if (!item.youtubeUrl) return '';
  try {
    const url = new URL(item.youtubeUrl);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0];
    if (url.hostname.endsWith('youtube.com')) return url.searchParams.get('v') || url.pathname.split('/').pop();
  } catch {
    return '';
  }
  return '';
}

function currentTrack() { return tracks[state.currentIndex]; }
function currentVideoId() { return extractYoutubeId(currentTrack()); }

function renderExternalSources() {
  const item = currentTrack();
  const links = [];
  const youtubeUrl = item.youtubeUrl || (item.youtubeId ? `https://www.youtube.com/watch?v=${item.youtubeId}` : '');
  if (youtubeUrl) links.push(`<a class="source-link" href="${youtubeUrl}" target="_blank" rel="noreferrer">YouTube ↗</a>`);
  if (item.spotifyUrl) links.push(`<a class="source-link" href="${item.spotifyUrl}" target="_blank" rel="noreferrer">Spotify ↗</a>`);
  if (item.youtubeMusicUrl) links.push(`<a class="source-link" href="${item.youtubeMusicUrl}" target="_blank" rel="noreferrer">YT Music ↗</a>`);
  externalSources.innerHTML = links.join('');
}

function shareSong(index) {
  const track = tracks[index];
  const url = `${window.location.origin}${window.location.pathname}?song=${index + 1}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast(`Copied link to "${track.title}"`);
  }).catch(() => {
    showToast('Failed to copy link');
  });
}

function renderPlaylist() {
  const query = state.searchQuery.toLowerCase().trim();
  const filteredTracks = query
    ? tracks.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query))
    : tracks;

  if (filteredTracks.length === 0) {
    playlistList.innerHTML = '<div class="playlist-empty">No songs found</div>';
    return;
  }

  playlistList.innerHTML = filteredTracks.map((item) => {
    const index = tracks.indexOf(item);
    const youtubeUrl = item.youtubeUrl || (item.youtubeId ? `https://www.youtube.com/watch?v=${item.youtubeId}` : '');
    const source = youtubeUrl
      ? `<a class="song-search" href="${youtubeUrl}" target="_blank" rel="noreferrer" aria-label="Open ${item.title} on YouTube" title="Open on YouTube">${icons.external}</a>`
      : '<span class="song-unavailable">Unavailable</span>';
    const duration = trackDurations[index] ? `<span class="song-duration">${trackDurations[index]}</span>` : '';
    const share = `<button class="song-share" type="button" data-index="${index}" aria-label="Copy link to ${item.title}" title="Copy link">${icons.link}</button>`;

    return `
      <article class="song-row ${index === state.currentIndex ? 'is-current' : ''}" data-index="${index}" tabindex="0" role="button" aria-label="Select ${item.title}">
        <span class="song-index">${String(index + 1).padStart(2, '0')}</span>
        <div>
          <h3>${item.title}</h3>
          <p>${item.artist}</p>
        </div>
        ${duration}
        ${source}
        ${share}
      </article>
    `;
  }).join('');

  playlistList.querySelectorAll('.song-row').forEach((row) => {
    const select = (event) => {
      if (event.target.closest('.song-search') || event.target.closest('.song-share')) return;
      setTrack(Number(row.dataset.index));
    };
    row.addEventListener('click', select);
    row.addEventListener('keydown', (event) => {
      if (event.target !== row) return;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(event); }
    });
  });

  playlistList.querySelectorAll('.song-share').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      shareSong(Number(btn.dataset.index));
    });
  });

  // Auto-scroll to current track
  const currentRow = playlistList.querySelector('.song-row.is-current');
  if (currentRow) {
    currentRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function updateTrackTitle(title) {
  trackTitleText.textContent = title;
  // Scroll long titles: two copies so the loop is seamless
  if (title.length > 25) {
    trackTitleText.innerHTML = `<span class="marquee"><span>${title}</span><span aria-hidden="true">${title}</span></span>`;
  }
}

function updatePlayState() {
  const title = currentTrack().title;
  playGlyph.innerHTML = state.isPlaying ? icons.pause : icons.play;
  if (!currentVideoId()) {
    playButton.setAttribute('aria-label', `${title} is unavailable`);
    availability.textContent = 'Unavailable here · no verified YouTube source';
  } else if (state.sourceError) {
    playButton.setAttribute('aria-label', `Play ${title}`);
    availability.textContent = 'Unavailable here · YouTube could not play this source';
  } else if (!state.playerReady) {
    playButton.setAttribute('aria-label', `Play ${title}`);
    availability.textContent = 'YouTube player loading…';
  } else if (state.isPlaying) {
    playButton.setAttribute('aria-label', `Pause ${title}`);
    availability.textContent = 'Playing through YouTube';
  } else {
    playButton.setAttribute('aria-label', `Play ${title}`);
    availability.textContent = state.hasStarted ? 'Verified YouTube source · paused' : 'Verified YouTube source · ready to play';
  }
}

function updatePlayer() {
  const item = currentTrack();
  const sourceAvailable = Boolean(currentVideoId());

  trackNumber.textContent = String(state.currentIndex + 1).padStart(2, '0');
  updateTrackTitle(item.title);
  trackArtist.textContent = item.artist;
  elapsed.textContent = '0:00';
  duration.textContent = '—:—';
  seek.value = 0;
  playButton.classList.toggle('is-unavailable', !sourceAvailable);
  updatePlayState();
  renderExternalSources();
  renderPlaylist();
}

function togglePlaylist(force) {
  const shouldOpen = typeof force === 'boolean' ? force : !playlistPanel.classList.contains('is-open');
  playlistPanel.classList.toggle('is-open', shouldOpen);
  playlistPanel.setAttribute('aria-hidden', String(!shouldOpen));
  playlistToggle.setAttribute('aria-expanded', String(shouldOpen));
  queueButton.setAttribute('aria-expanded', String(shouldOpen));
  topPlaylistButton.setAttribute('aria-expanded', String(shouldOpen));
}

function toggleShortcuts(force) {
  const shouldOpen = typeof force === 'boolean' ? force : !shortcutsOverlay.classList.contains('is-visible');
  shortcutsOverlay.classList.toggle('is-visible', shouldOpen);
  shortcutsOverlay.setAttribute('aria-hidden', String(!shouldOpen));
}

function cueCurrentTrack() {
  if (!state.playerReady || !state.player) return;
  const videoId = currentVideoId();
  state.sourceError = false;
  state.hasStarted = false;
  state.loadedVideoId = videoId;
  if (videoId) state.player.cueVideoById(videoId);
  else state.player.stopVideo();
  updatePlayer();
}

function getNextIndex() {
  if (state.shuffle) {
    let next;
    do {
      next = Math.floor(Math.random() * tracks.length);
    } while (next === state.currentIndex && tracks.length > 1);
    return next;
  }
  return (state.currentIndex + 1) % tracks.length;
}

function getPrevIndex() {
  if (state.shuffle) {
    let prev;
    do {
      prev = Math.floor(Math.random() * tracks.length);
    } while (prev === state.currentIndex && tracks.length > 1);
    return prev;
  }
  return (state.currentIndex - 1 + tracks.length) % tracks.length;
}

function setTrack(index) {
  state.currentIndex = (index + tracks.length) % tracks.length;
  state.isPlaying = false;
  state.hasStarted = false;
  state.sourceError = false;
  if (!state.playerReady || !state.player) {
    cueCurrentTrack();
    updatePlayer();
    return;
  }
  const videoId = currentVideoId();
  if (videoId) {
    state.loadedVideoId = videoId;
    state.player.loadVideoById(videoId);
  } else {
    state.player.stopVideo();
    cueCurrentTrack();
  }
  updatePlayer();
  if (playlistPanel.classList.contains('is-open')) togglePlaylist(false);

  if (currentVideoId()) showToast(`Loading ${currentTrack().title}…`);
  else showToast(`${currentTrack().title} is unavailable until a verified YouTube source is added.`);
}

function togglePlayback() {
  const videoId = currentVideoId();
  if (!videoId) {
    showToast('This song is unavailable here because it has no verified YouTube source yet.');
    return;
  }
  if (!state.playerReady || !state.player) {
    showToast('The YouTube player is still loading. Try again in a moment.');
    return;
  }

  const playerState = state.player.getPlayerState();
  if (playerState === window.YT.PlayerState.PLAYING) state.player.pauseVideo();
  else if (state.loadedVideoId !== videoId) state.player.loadVideoById(videoId);
  else state.player.playVideo();
}

function updateProgress() {
  if (!state.playerReady || !state.player || !state.isPlaying) return;
  const current = state.player.getCurrentTime();
  const total = state.player.getDuration();
  if (!Number.isFinite(total) || total <= 0) return;
  elapsed.textContent = formatTime(current);
  duration.textContent = formatTime(total);
  seek.value = String((current / total) * 100);
}

function onYoutubeReady(event) {
  state.playerReady = true;
  state.player = event.target;
  state.player.setVolume(state.volume);
  document.querySelector('.player-dock').classList.remove('loading-pulse');
  updatePlayer();
  cueCurrentTrack();
}

function onYoutubeStateChange(event) {
  const states = window.YT.PlayerState;
  state.isPlaying = event.data === states.PLAYING;
  if (event.data === states.ENDED) {
    if (state.repeat === 'one') {
      state.player.loadVideoById(currentVideoId());
      return;
    }
    const nextIndex = getNextIndex();
    if (nextIndex === 0 && state.repeat === 'none' && !state.shuffle) {
      state.player.stopVideo();
      state.isPlaying = false;
      updatePlayer();
      return;
    }
    setTrack(nextIndex);
    return;
  }

  // Fetch duration when video starts playing
  if (event.data === states.PLAYING) {
    const total = state.player.getDuration();
    if (total > 0) {
      trackDurations[state.currentIndex] = formatTime(total);
      renderPlaylist();
    }
  }

  if (state.isPlaying) {
    state.hasStarted = true;
    state.sourceError = false;
  }
  updatePlayState();
}

function onYoutubeError() {
  state.isPlaying = false;
  state.sourceError = true;
  updatePlayer();
  showToast('YouTube could not play this source. Try the external link or another verified ID.');
}

function initYoutubePlayer() {
  if (state.player || !window.YT?.Player) return;
  const origin = /^https?:$/.test(window.location.protocol) ? window.location.origin : undefined;
  document.querySelector('.player-dock').classList.add('loading-pulse');
  state.player = new window.YT.Player('youtubePlayer', {
    width: '1',
    height: '1',
    playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, ...(origin ? { origin } : {}) },
    events: { onReady: onYoutubeReady, onStateChange: onYoutubeStateChange, onError: onYoutubeError }
  });
}

function toggleShuffle() {
  state.shuffle = !state.shuffle;
  shuffleButton.classList.toggle('is-active', state.shuffle);
  shuffleButton.setAttribute('aria-pressed', String(state.shuffle));
  showToast(state.shuffle ? 'Shuffle on' : 'Shuffle off');
}

function cycleRepeat() {
  const modes = ['none', 'all', 'one'];
  const labels = { none: 'Repeat off', all: 'Repeat all', one: 'Repeat one' };
  state.repeat = modes[(modes.indexOf(state.repeat) + 1) % modes.length];
  repeatButton.classList.toggle('is-active', state.repeat !== 'none');
  repeatButton.innerHTML = state.repeat === 'one' ? icons.repeatOne : icons.repeat;
  repeatButton.setAttribute('aria-label', labels[state.repeat]);
  showToast(labels[state.repeat]);
}

shuffleButton.addEventListener('click', toggleShuffle);
repeatButton.addEventListener('click', cycleRepeat);

// Volume
function setVolume(value) {
  state.volume = value;
  volumeSlider.value = String(value);
  if (state.playerReady && state.player) state.player.setVolume(value);
  volumeButton.innerHTML = value === 0 ? icons.volumeMute : value < 50 ? icons.volumeLow : icons.volume;
  volumeButton.setAttribute('aria-label', value === 0 ? 'Unmute' : 'Mute');
}

volumeSlider.addEventListener('input', () => setVolume(Number(volumeSlider.value)));
volumeButton.addEventListener('click', () => setVolume(state.volume > 0 ? 0 : 100));

// Playlist search
playlistSearch.addEventListener('input', () => {
  state.searchQuery = playlistSearch.value;
  renderPlaylist();
});

// Seek tooltip follows the pointer
seek.addEventListener('mousemove', (event) => {
  const rect = seek.getBoundingClientRect();
  const percent = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const total = state.player?.getDuration?.() || 0;
  seekTooltip.style.left = `${percent * 100}%`;
  seekTooltip.textContent = total > 0 ? formatTime(percent * total) : '—:—';
});

// Keyboard shortcuts overlay
shortcutsToggle.addEventListener('click', () => toggleShortcuts());
shortcutsClose.addEventListener('click', () => toggleShortcuts(false));
shortcutsOverlay.addEventListener('click', (event) => {
  if (event.target === shortcutsOverlay) toggleShortcuts(false);
});

// Controls
$('#previousButton').addEventListener('click', () => setTrack(getPrevIndex()));
$('#nextButton').addEventListener('click', () => setTrack(getNextIndex()));
playButton.addEventListener('click', togglePlayback);
playlistToggle.addEventListener('click', () => togglePlaylist());
queueButton.addEventListener('click', () => togglePlaylist());
topPlaylistButton.addEventListener('click', () => togglePlaylist());
$('#playlistClose').addEventListener('click', () => togglePlaylist(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    togglePlaylist(false);
    toggleShortcuts(false);
    return;
  }
  if (event.altKey || event.metaKey) return;
  if (event.ctrlKey) {
    if (event.key === 'ArrowRight') { event.preventDefault(); setTrack(getNextIndex()); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); setTrack(getPrevIndex()); }
    return;
  }
  // Leave typing and focused controls to the browser
  if (event.target.closest('input, textarea, select, button, a, [role="button"]')) return;
  if (event.key === ' ') { event.preventDefault(); togglePlayback(); }
  if (event.key.toLowerCase() === 's') toggleShuffle();
  if (event.key.toLowerCase() === 'r') cycleRepeat();
});

seek.addEventListener('input', () => {
  if (!state.playerReady || !state.player) return;
  const total = state.player.getDuration();
  if (Number.isFinite(total) && total > 0) state.player.seekTo((Number(seek.value) / 100) * total, true);
});

window.addEventListener('youtube-api-ready', initYoutubePlayer);
if (window.YT?.Player) initYoutubePlayer();

updateClock();
setInterval(updateClock, 30000);
setInterval(updateProgress, 500);

// Check URL for song parameter
const urlParams = new URLSearchParams(window.location.search);
const songParam = urlParams.get('song');
if (songParam) {
  const songIndex = parseInt(songParam, 10) - 1;
  if (songIndex >= 0 && songIndex < tracks.length) {
    setTrack(songIndex);
  }
}

updatePlayer();