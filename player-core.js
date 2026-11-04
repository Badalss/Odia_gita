export const PREFERENCE_KEY = 'odia-gita.preferences.v1';
export const REPEAT_MODES = ['none', 'all', 'one'];
export const formatTime = value => Number.isFinite(value) && value >= 0
  ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '—:—';
export const clampVolume = value => typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(0, Math.min(100, value))) : 100;

export function parseSelection(search, tracks) {
  const params = new URLSearchParams(search);
  if (!params.size) return { id: null, error: null };
  if ([...params.keys()].some(key => key !== 'track' && key !== 'song') || params.size !== 1) {
    return { id: null, error: 'Invalid song link. Choose a song from the collection.' };
  }
  if (params.has('track')) {
    const id = params.get('track');
    return tracks.some(track => track.id === id) ? { id, error: null } : { id: null, error: 'This song link is unknown.' };
  }
  const value = params.get('song');
  const index = /^[1-9]\d*$/.test(value || '') ? Number(value) - 1 : -1;
  return Number.isSafeInteger(index) && tracks[index] ? { id: tracks[index].id, error: null } : { id: null, error: 'This legacy song link is invalid.' };
}

export function permanentLink(location, id) {
  const url = new URL(location);
  url.search = '';
  url.hash = '';
  url.searchParams.set('track', id);
  return url.href;
}

export function defaultPreferences(ids) {
  return { favorites: [], recent: [], volume: 100, lastVolume: 100, shuffle: false, repeat: 'none', lastSelected: ids[0] || null };
}

export function sanitizePreferences(value, ids) {
  const defaults = defaultPreferences(ids);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const validIds = list => Array.isArray(list) ? [...new Set(list.filter(id => typeof id === 'string' && ids.includes(id)))].slice(0, ids.length) : [];
  return {
    favorites: validIds(value.favorites), recent: validIds(value.recent),
    volume: clampVolume(value.volume),
    lastVolume: typeof value.lastVolume === 'number' && value.lastVolume > 0 ? Math.max(1, clampVolume(value.lastVolume)) : 100,
    shuffle: value.shuffle === true,
    repeat: REPEAT_MODES.includes(value.repeat) ? value.repeat : 'none',
    lastSelected: ids.includes(value.lastSelected) ? value.lastSelected : defaults.lastSelected
  };
}

export function createPreferenceStore(storage, ids) {
  let preferences = defaultPreferences(ids);
  let persistent = Boolean(storage);
  let message = persistent ? 'Preferences are saved on this device.' : 'Storage unavailable. Preferences last for this visit.';
  if (persistent) {
    try {
      const raw = storage.getItem(PREFERENCE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid preferences');
        preferences = sanitizePreferences(parsed, ids);
      }
    } catch {
      persistent = false;
      message = 'Saved preferences could not be read. Using temporary preferences for this visit.';
    }
  }
  const snapshot = () => ({ preferences: structuredClone(preferences), persistent, message });
  return {
    read: snapshot,
    save(value) {
      preferences = sanitizePreferences(value, ids);
      if (persistent) {
        try { storage.setItem(PREFERENCE_KEY, JSON.stringify(preferences)); }
        catch { persistent = false; message = 'Storage unavailable. Preferences last for this visit.'; }
      }
      return snapshot();
    },
    clear() {
      preferences = defaultPreferences(ids);
      try {
        if (!storage) throw new Error('No storage');
        storage.removeItem(PREFERENCE_KEY);
        persistent = true;
        message = 'Preferences cleared on this device.';
      } catch {
        persistent = false;
        message = 'Temporary preferences reset. Browser storage could not be cleared.';
      }
      return snapshot();
    }
  };
}

export function createQueue(ids, current = ids[0], shuffle = false) {
  const unique = [...new Set(ids)];
  const selected = unique.includes(current) ? current : unique[0] || null;
  return { ids: unique, current: selected, history: selected ? [selected] : [], pointer: selected ? 0 : -1, remaining: unique.filter(id => id !== selected), shuffle };
}

export function selectQueue(queue, id) {
  if (!queue.ids.includes(id) || id === queue.current) return queue;
  const history = [...queue.history.slice(0, queue.pointer + 1), id];
  return { ...queue, current: id, history, pointer: history.length - 1, remaining: queue.remaining.filter(item => item !== id) };
}

export function setQueueShuffle(queue, shuffle) {
  return { ...queue, shuffle, remaining: queue.ids.filter(id => id !== queue.current) };
}

export function nextTrack(queue, { repeat = 'none', auto = false, random = Math.random } = {}) {
  if (!queue.current) return { queue, id: null };
  if (auto && repeat === 'one') return { queue, id: queue.current };
  if (queue.pointer < queue.history.length - 1) {
    const pointer = queue.pointer + 1;
    return { queue: { ...queue, pointer, current: queue.history[pointer] }, id: queue.history[pointer] };
  }
  let id;
  let next = queue;
  if (queue.shuffle) {
    let remaining = queue.remaining;
    if (!remaining.length) {
      if (repeat !== 'all') return { queue, id: null };
      remaining = queue.ids.filter(item => item !== queue.current);
      if (!remaining.length) return { queue, id: queue.current };
    }
    const sample = random();
    const index = Math.min(remaining.length - 1, Math.max(0, Math.floor((Number.isFinite(sample) ? sample : 0) * remaining.length)));
    id = remaining[index];
    next = { ...queue, remaining };
  } else {
    const index = queue.ids.indexOf(queue.current) + 1;
    id = queue.ids[index] || (repeat === 'all' ? queue.ids[0] : null);
  }
  return id ? { queue: selectQueue(next, id), id } : { queue, id: null };
}

export function previousTrack(queue) {
  if (queue.pointer > 0) {
    const pointer = queue.pointer - 1;
    return { queue: { ...queue, pointer, current: queue.history[pointer] }, id: queue.history[pointer] };
  }
  if (queue.shuffle) return { queue, id: null };
  const id = queue.ids[queue.ids.indexOf(queue.current) - 1];
  return id ? { queue: createQueue(queue.ids, id, false), id } : { queue, id: null };
}

export function shouldIgnoreShortcut(target) {
  return Boolean(target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(target?.tagName || '') || target?.closest?.('[contenteditable],button,a,input,textarea,select,summary,[role="button"],dialog[open]'));
}

export function filterTracks(tracks, { query = '', filter = 'all', favorites = [], recent = [] } = {}) {
  const normalized = query.trim().normalize('NFC').toLocaleLowerCase();
  let result = tracks.filter(track => `${track.title} ${track.titleOdia || ''} ${track.artist || 'Artist unknown'}`.normalize('NFC').toLocaleLowerCase().includes(normalized));
  if (filter === 'favorites') result = result.filter(track => favorites.includes(track.id));
  if (filter === 'recent') result = result.filter(track => recent.includes(track.id)).sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id));
  return result;
}
