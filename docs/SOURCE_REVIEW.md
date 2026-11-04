# Source review — 4 November 2026

> Historical YouTube review. The current player is audio-only Spotify. See
> `AUDIO_SOURCE_RESEARCH.md` and `VERIFICATION.md` for replacement source matches
> and actual preview playback checks. YouTube is no longer loaded by the site.

The upgrade preserves the original twenty song entries and YouTube IDs from
commit `c651fd72ceef6619e32a2565eae412729d3c33bb`.

All twenty IDs pass the 11-character format check. An earlier planning statement
that `4towad-Ntvc` was malformed was incorrect; this ID also has eleven characters.

Live metadata requests were attempted for every entry through YouTube oEmbed.
All twenty requests failed certificate verification in this environment.
A separate Chromium request reported `net::ERR_CERT_AUTHORITY_INVALID`, and
the independent web fetch also could not retrieve the sampled YouTube pages.
TLS validation was not bypassed. These failures do not establish that the
videos are deleted or unavailable to visitors.

Therefore **no recording identity, embedding availability, singer, film, year,
duration or official Odia title is marked as independently verified**. Existing
specific artist credits remain inherited metadata; generic "Odia romantic
collection" artist fields are represented honestly as unknown. No replacement
recordings or guessed film/year data have been introduced.

| # | Title | Original source ID | Review |
|---|---|---|---|
| 1 | Faguna Re Faguna | OiJmJQefcu4 | Format valid; live verification pending |
| 2 | Jhum Jhum | 5cXf1t57NqE | Format valid; live verification pending |
| 3 | Sunara Chadheyi | U46qaVIN5JU | Format valid; live verification pending |
| 4 | Gori Jhumuru Jhumuru Tora Pada Paunji | 4towad-Ntvc | Format valid; live verification pending |
| 5 | To Akhi Mo Aaina | 5LIC20f47Q0 | Format valid; live verification pending |
| 6 | Anamika Nayika Se Hela Mora Premika | U1qJfUyw31s | Format valid; live verification pending |
| 7 | Sata Meghara Odhani | H86ELoqwrFM | Format valid; live verification pending |
| 8 | Pritira Pahili Chitti | rXcbn53xPfM | Format valid; live verification pending |
| 9 | Ajana Bate | B6HFhvXuxr0 | Format valid; live verification pending |
| 10 | Gabhare Gajara Jhulei | jSVH_nCbagY | Format valid; live verification pending |
| 11 | Rupasi Mananku Namaste | oXnDXztLsmI | Format valid; live verification pending |
| 12 | Janhare Tate | tuw-QB2Ud7k | Format valid; live verification pending |
| 13 | E Banara Chhai | IeHoRrhbZnc | Format valid; live verification pending |
| 14 | Tume Mo Phula Mu Tuma Phaguna | f7KAg85gnTE | Format valid; live verification pending |
| 15 | Chandrama Ago Chandrama | Ce05KxJDkcU | Format valid; live verification pending |
| 16 | Chhati Tale | 0z6AifAOSVk | Format valid; live verification pending |
| 17 | Hela Ki Prema | x3rECnmVa5M | Format valid; live verification pending |
| 18 | Matha Re Dei Pata Odhani | Y7de3k4q0bw | Format valid; live verification pending |
| 19 | Basinda | RFq8_xfM5qg | Format valid; live verification pending |
| 20 | Phulara Sahare Gharate Tolichi | jpDI0TEvxLA | Format valid; live verification pending |

## Manual follow-up before a public release

For each song, open its inherited YouTube link and confirm the recording title,
channel, artist credits and any proposed film/year/Odia-script information.
Check embedded playback on the intended phone and desktop browser. Record the
date and evidence URL alongside reviewed metadata. A successful embed at one
time/location does not promise future or worldwide availability.

Every song keeps Open on YouTube and Search YouTube fallbacks. The player reports
runtime errors without falsely marking a recording as verified, and does not
automatically skip through failures.
