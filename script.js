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
  shuffle: false,
  repeat: 'none', // none, one, all
  volume: 100,
  searchQuery: ''
};

const $ = (selector) => document.querySelector(selector);
const clock = $('#clock');
const onlineCount = $('#onlineCount');
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

function shareSong(index, event) {
  event.stopPropagation();
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
      ? `<a class="song-search" href="${youtubeUrl}" target="_blank" rel="noreferrer" aria-label="Open ${item.title} on YouTube">↗</a>`
      : '<span class="song-unavailable">Unavailable</span>';
    const duration = trackDurations[index] ? `<span class="song-duration">${trackDurations[index]}</span>` : '';
    const share = `<a class="song-share" href="javascript:void(0)" data-index="${index}" aria-label="Share ${item.title}" title="Copy share link">↗</a>`;

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
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(event); }
    });
  });

  playlistList.querySelectorAll('.song-share').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      shareSong(Number(btn.dataset.index), event);
    });
  });

  // Auto-scroll to current track
  const currentRow = playlistList.querySelector('.song-row.is-current');
  if (currentRow) {
    currentRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function updateTrackTitle(title) {
  trackTitleText.innerHTML = title;
  // Add marquee for long titles
  if (title.length > 25) {
    trackTitleText.innerHTML = `<span class="marquee">${title} &nbsp;&nbsp;&nbsp; ${title}</span>`;
  }
}

function updatePlayer() {
  const item = currentTrack();
  const videoId = currentVideoId();
  const sourceAvailable = Boolean(videoId);

  trackNumber.textContent = String(state.currentIndex + 1).padStart(2, '0');
  updateTrackTitle(item.title);
  trackArtist.textContent = item.artist;
  elapsed.textContent = '0:00';
  duration.textContent = '—:—';
  seek.value = 0;
  playGlyph.textContent = '▶';
  playButton.classList.toggle('is-unavailable', !sourceAvailable);
  playButton.setAttribute('aria-label', sourceAvailable ? `Play ${item.title}` : `${item.title} is unavailable`);
  availability.textContent = state.sourceError
    ? 'Unavailable here · YouTube could not play this source'
    : sourceAvailable
      ? state.playerReady ? 'Verified YouTube source · ready to play' : 'YouTube player loading…'
      : 'Unavailable here · no verified YouTube source';
  renderExternalSources();
  renderPlaylist();
}

function togglePlaylist(force) {
  const shouldOpen = typeof force === 'boolean' ? force : !playlistPanel.classList.contains('is-open');
  playlistPanel.classList.toggle('is-open', shouldOpen);
  playlistPanel.setAttribute('aria-hidden', String(!shouldOpen));
  playlistToggle.setAttribute('aria-expanded', String(shouldOpen));
  queueButton.setAttribute('aria-expanded', String(shouldOpen));
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
  state.isPlaying = true;
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

  if (currentVideoId()) showToast(`${currentTrack().title} is playing.`);
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

function fetchDurations() {
  // Fetch durations from YouTube iframe API
  tracks.forEach((track, index) => {
    const videoId = extractYoutubeId(track);
    if (videoId && state.playerReady && state.player) {
      // YouTube doesn't have a direct method, so we get it when the video loads
      // For now, we'll update durations as videos play
    }
  });
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

  playGlyph.textContent = state.isPlaying ? 'Ⅱ' : '▶';
  playButton.setAttribute('aria-label', state.isPlaying ? `Pause ${currentTrack().title}` : `Play ${currentTrack().title}`);
  availability.textContent = state.isPlaying ? 'Playing through YouTube' : 'Verified YouTube source · paused';
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

// Shuffle
shuffleButton.addEventListener('click', () => {
  state.shuffle = !state.shuffle;
  shuffleButton.classList.toggle('is-active', state.shuffle);
  showToast(state.shuffle ? 'Shuffle on' : 'Shuffle off');
});

// Repeat
repeatButton.addEventListener('click', () => {
  const modes = ['none', 'all', 'one'];
  const currentModeIndex = modes.indexOf(state.repeat);
  state.repeat = modes[(currentModeIndex + 1) % modes.length];
  repeatButton.classList.toggle('is-active', state.repeat !== 'none');
  const labels = { none: 'Repeat off', all: 'Repeat all', one: 'Repeat one' };
  repeatButton.textContent = state.repeat === 'one' ? '🔂' : '🔁';
  showToast(labels[state.repeat]);
});

// Volume
volumeSlider.addEventListener('input', () => {
  state.volume = Number(volumeSlider.value);
  if (state.playerReady && state.player) state.player.setVolume(state.volume);
  volumeButton.textContent = state.volume === 0 ? '🔇' : state.volume < 50 ? '🔉' : '🔊';
});

volumeButton.addEventListener('click', () => {
  if (state.volume > 0) {
    state.volume = 0;
  } else {
    state.volume = 100;
  }
  volumeSlider.value = String(state.volume);
  if (state.playerReady && state.player) state.player.setVolume(state.volume);
  volumeButton.textContent = state.volume === 0 ? '🔇' : state.volume < 50 ? '🔉' : '🔊';
});

// Playlist search
playlistSearch.addEventListener('input', () => {
  state.searchQuery = playlistSearch.value;
  renderPlaylist();
});

// Seek tooltip
seek.addEventListener('mouseover', () => {
  const total = state.player?.getDuration() || 0;
  if (total > 0) {
    const percent = Number(seek.value) / 100;
    seekTooltip.textContent = formatTime(percent * total);
  }
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
$('#playlistClose').addEventListener('click', () => togglePlaylist(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    togglePlaylist(false);
    toggleShortcuts(false);
  }
  if (event.key === ' ' && event.target.tagName !== 'INPUT') {
    event.preventDefault();
    togglePlayback();
  }
  if (event.key === 'ArrowRight' && event.ctrlKey) {
    event.preventDefault();
    setTrack(getNextIndex());
  }
  if (event.key === 'ArrowLeft' && event.ctrlKey) {
    event.preventDefault();
    setTrack(getPrevIndex());
  }
  if (event.key === 's' && event.target.tagName !== 'INPUT') {
    event.preventDefault();
    state.shuffle = !state.shuffle;
    shuffleButton.classList.toggle('is-active', state.shuffle);
    showToast(state.shuffle ? 'Shuffle on' : 'Shuffle off');
  }
  if (event.key === 'r' && event.target.tagName !== 'INPUT') {
    event.preventDefault();
    const modes = ['none', 'all', 'one'];
    const currentModeIndex = modes.indexOf(state.repeat);
    state.repeat = modes[(currentModeIndex + 1) % modes.length];
    repeatButton.classList.toggle('is-active', state.repeat !== 'none');
    const labels = { none: 'Repeat off', all: 'Repeat all', one: 'Repeat one' };
    repeatButton.textContent = state.repeat === 'one' ? '🔂' : '🔁';
    showToast(labels[state.repeat]);
  }
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

// Real-time visitor counter using countapi.xyz (free, no server needed)
function updateVisitorCounter() {
  fetch('https://api.countapi.xyz/hit/odia-romantic/visits')
    .then(r => r.json())
    .then(data => {
      onlineCount.textContent = String(data.value);
    })
    .catch(() => {
      onlineCount.textContent = '—';
    });
}
updateVisitorCounter();

// Check URL for song parameter
const urlParams = new URLSearchParams(window.location.search);
const songParam = urlParams.get('song');
if (songParam) {
  const songIndex = parseInt(songParam) - 1;
  if (songIndex >= 0 && songIndex < tracks.length) {
    setTrack(songIndex);
  }
}

updatePlayer();