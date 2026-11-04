import { audioSources } from './sources.js';

const entries = [
  ['faguna-re-faguna', 'Faguna Re Faguna', 'Babul Supriyo, Ira Mohanty', 'OiJmJQefcu4'],
  ['jhum-jhum', 'Jhum Jhum', 'Kabita Krishnamurthy, Prosan Jeet', '5cXf1t57NqE'],
  ['sunara-chadheyi', 'Sunara Chadheyi', 'Sonu Nigam, Kabita', 'U46qaVIN5JU'],
  ['gori-jhumuru-jhumuru-tora-pada-paunji', 'Gori Jhumuru Jhumuru Tora Pada Paunji', 'Sonu Nigam', '4towad-Ntvc'],
  ['to-akhi-mo-aaina', 'To Akhi Mo Aaina', 'Sonu Nigam / Pamela Jain', '5LIC20f47Q0'],
  ['anamika-nayika-se-hela-mora-premika', 'Anamika Nayika Se Hela Mora Premika', 'Babul Supriyo', 'U1qJfUyw31s'],
  ['sata-meghara-odhani', 'Sata Meghara Odhani', null, 'H86ELoqwrFM'],
  ['pritira-pahili-chitti', 'Pritira Pahili Chitti', null, 'rXcbn53xPfM'],
  ['ajana-bate', 'Ajana Bate', null, 'B6HFhvXuxr0'],
  ['gabhare-gajara-jhulei', 'Gabhare Gajara Jhulei', null, 'jSVH_nCbagY'],
  ['rupasi-mananku-namaste', 'Rupasi Mananku Namaste', null, 'oXnDXztLsmI'],
  ['janhare-tate', 'Janhare Tate', 'Udit Narayan', 'tuw-QB2Ud7k'],
  ['e-banara-chhai', 'E Banara Chhai', 'Amit Kumar', 'IeHoRrhbZnc'],
  ['tume-mo-phula-mu-tuma-phaguna', 'Tume Mo Phula Mu Tuma Phaguna', null, 'f7KAg85gnTE'],
  ['chandrama-ago-chandrama', 'Chandrama Ago Chandrama', null, 'Ce05KxJDkcU'],
  ['chhati-tale', 'Chhati Tale', null, '0z6AifAOSVk'],
  ['hela-ki-prema', 'Hela Ki Prema', null, 'x3rECnmVa5M'],
  ['matha-re-dei-pata-odhani', 'Matha Re Dei Pata Odhani', null, 'Y7de3k4q0bw'],
  ['basinda', 'Basinda', null, 'RFq8_xfM5qg'],
  ['phulara-sahare-gharate-tolichi', 'Phulara Sahare Gharate Tolichi', null, 'jpDI0TEvxLA']
];

export const isYoutubeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);
export const isSpotifyId = value => typeof value === 'string' && /^[A-Za-z0-9]{22}$/.test(value);
// Original credits and source IDs are retained as unverified collection metadata.
// A structurally valid ID is not evidence that a video is available or correctly credited.
export const tracks = Object.freeze(entries.map(([id, title, artist, youtubeId]) => {
  const source = audioSources[id];
  return Object.freeze({
    id, title, artist: source?.artists?.join(', ') || artist, youtubeId: isYoutubeId(youtubeId) ? youtubeId : null,
    spotifyId: isSpotifyId(source?.spotifyId) ? source.spotifyId : null,
    appleMusic: source?.appleMusic || null,
    candidateUrl: source?.candidateUrl || null,
    candidateLabel: source?.candidateLabel || null,
    sourceStatus: source?.spotifyId ? 'matched' : source?.candidateUrl ? 'candidate' : 'unmatched',
    matchNote: source?.matchNote || null
  });
}));
export const TRACKS = tracks;
export const artistLabel = track => track.artist || 'Artist unknown';
export const youtubeUrl = track => isYoutubeId(track.youtubeId) ? `https://www.youtube.com/watch?v=${track.youtubeId}` : null;
export const spotifyUrl = track => isSpotifyId(track.spotifyId) ? `https://open.spotify.com/track/${track.spotifyId}` : null;
export const appleMusicUrl = track => track.appleMusic || null;
export const candidateUrl = track => track.candidateUrl || null;
export const searchUrl = track => `https://open.spotify.com/search/${encodeURIComponent(`${track.title} ${track.artist || 'Odia'}`)}`;

export const youtubeSearchUrl = track => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.title} ${track.artist || 'Odia'}`)}`;
