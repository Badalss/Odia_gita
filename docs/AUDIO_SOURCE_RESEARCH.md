# Audio source research

Checked 2026-11-04 against the original 20 entries in `catalog.js`. **7 metadata matches; 13 ambiguous or unresolved originals. No full-song playback was tested.** See `artifacts/audio-source-matches.json` for structured observations, IDs and notes.

`verified_match` means the main title and known catalog singer credit match opened official provider metadata. It does not verify a particular historical master, regional availability, a free full song, or audible playback. Unknown-artist titles stay `ambiguous`, even where a distinctive candidate exists. Keep candidates as clearly labelled links until their identity is confirmed.

## Recording evidence

Spotify rows were checked by opening the individual official public track HTML with PowerShell Invoke-WebRequest and reading only its og:title/og:description. Official linked album pages supplied some IDs. Web search was discovery only; third-party stats pages were not treated as metadata authority. Apple pages were opened with the web tool; failed opens were retried or corroborated using Spotify. No music streams, unofficial Saavn APIs, downloads or media extraction were used.

| Catalog ID | Confidence | Observed provider title / artists / album | Opened official evidence |
|---|---|---|---|
| faguna-re-faguna | verified_match | Faguna Re Faguna / Babul Supriyo, Ira Mohanty / Santana | [Spotify](https://open.spotify.com/track/4JFanZrSD5tDjDR2EKF7aq); [Apple Music](https://music.apple.com/us/song/1773907805) |
| jhum-jhum | verified_match | Jhum Jhum / Kabita Krishna Murrti, Prosan Jeet / Suna Punjuri | [Spotify](https://open.spotify.com/track/3fufhbcrcSxpkhj0SPF26j); [Apple Music](https://music.apple.com/us/song/1438316700) |
| sunara-chadheyi | verified_match | Sunara Chadheyi / Sonu Nigam, Kabita / Suna Punjuri | [Spotify](https://open.spotify.com/track/2nGoJ91wawDNOWbhSTwtiN) |
| gori-jhumuru-jhumuru-tora-pada-paunji | verified_match | Gori Jhumuru Jhumuru Tora Pada Paunji (From "To Akhi Mo Aaina") / Sonu Nigam, Pamela Jain / To Akhi Mo Aaina | [Spotify](https://open.spotify.com/track/3xyAd0StrWSpQxVI6FaMgW); [Apple Music](https://music.apple.com/us/song/1699230718) |
| to-akhi-mo-aaina | verified_match | To Akhi Mo Aaina (From "To Akhi Mo Aaina") / Sonu Nigam, Pamela Jain / To Akhi Mo Aaina | [Spotify](https://open.spotify.com/track/1c3QXUosxiVuwEOr6exMHB); [Apple Music](https://music.apple.com/us/song/1783956556) |
| anamika-nayika-se-hela-mora-premika | verified_match | Anamika Nayika / Babul Supriyo / Anamika Nayika | [Spotify](https://open.spotify.com/track/7MTG96hC9Q3MJecphZ6hqd); [Apple Music](https://music.apple.com/us/album/anamika-nayika-single/1812404119) |
| sata-meghara-odhani | ambiguous | Sata Meghara Odhani / Humane Sagar, Aseema Panda / Sata Meghara Odhani - Single | [Apple Music](https://music.apple.com/us/album/sata-meghara-odhani-single/1667557867) |
| pritira-pahili-chitti | ambiguous | Pritira Pahili Chitti / Namita Agrawal / Namita Agrawal Golden Album Songs Vol 2 | [Spotify](https://open.spotify.com/track/7qUQzZ4Urem3e7vvUl3D3i); [Apple Music](https://music.apple.com/us/album/pritira-pahili-chithi-single/1728262711) |
| ajana-bate | ambiguous | Ajana Bate M / Babul Supriyo / Babul Supriyo Odia Romantic Hits | [Spotify](https://open.spotify.com/track/6XaJRJxMgWYdtmcsZL92hI) |
| gabhare-gajara-jhulei | ambiguous | Gabhare Gajara Jhulei / Shakti Mishra / Biswa Sundari | [Spotify](https://open.spotify.com/track/6Eb1KMOWaHWt76CIcGDlGo) |
| rupasi-mananku-namaste | ambiguous | Rupasi Mananku Namaste / Kumar Sanu / Jiban Sathi | [Spotify](https://open.spotify.com/track/636h6ooTb8mn9SZUVGbHrj) |
| janhare-tate | verified_match | Janhare Tate / Udit Narayan / Janha Tate Punei Rana | [Spotify](https://open.spotify.com/track/6tx3OHTUoxNdqnmINNbtMU); [Apple Music](https://music.apple.com/us/song/1633138596) |
| e-banara-chhai | ambiguous | No matching recording resolved | See rejected candidate below |
| tume-mo-phula-mu-tuma-phaguna | ambiguous | Tume Mo Phula Mu Tuma Phaguna / Sonu Nigam / Pabitra Bandhana | [Qobuz](https://www.qobuz.com/nz-en/album/pabitra-bandhana-various-artists/kc4xd49vdm9db) |
| chandrama-ago-chandrama | ambiguous | Chandrama Ago Chandrama / Abhijeet, Sadhana Sargam / Sagar Ganga (Original Motion Picture Soundtrack) - EP | [Apple Music](https://music.apple.com/us/song/1428684823) |
| chhati-tale | ambiguous | Chhati Tale - From "Love You Hamesha" / Humane Sagar, Ira Mohanty / Odia New Year Special | [Spotify](https://open.spotify.com/track/0efGpgmvDjBDpyVMc7jHy0) |
| hela-ki-prema | ambiguous | Hela Ki Prema / Humane Sagar, Aseema Panda / Romantic Melodies by Humane Sagar | [Spotify](https://open.spotify.com/track/11UWz4fej9tciwiFnX2BaA); [Apple Music](https://music.apple.com/us/song/1562952030) |
| matha-re-dei-pata-odhani | ambiguous | Matha Re Dei Pata Odhani / Mohammed Aziz, Ira Mohanty / Santana | [Spotify](https://open.spotify.com/track/1E1h5MaKdbFa0dBegKDj3u); [Apple Music](https://music.apple.com/us/song/1772033573) |
| basinda | ambiguous | Basinda - From "Charidham" / Satyajeet Jena, Ananya Sritam Nanda, Somesh Satpathy, Jp Wordsmith / Basinda (From "Charidham") | [Spotify](https://open.spotify.com/track/45zBv5q7RZRA7DalGbuHSZ); [Apple Music](https://music.apple.com/us/song/1843849859) |
| phulara-sahare-gharate-tolichi | ambiguous | Phulara Sahare / Udit Narayan / Banaa Harini | [Apple Music](https://music.apple.com/in/song/1613999724) |

## Identity cautions

- Faguna Re Faguna: Spotify credits Babul Supriyo and Ira Mohanty; Apple additionally credits Malay Mishra. Both identify Santana.
- Jhum Jhum and Sunara Chadheyi are linked from the official [Suna Punjuri album](https://open.spotify.com/album/2j7j6qqbiYft4BXLCheLs3). Kabita Krishna Murrti is the provider spelling for the Jhum Jhum credit.
- Gori Jhumuru and To Akhi both credit Sonu Nigam and Pamela Jain. The catalog's Gori credit omits Pamela Jain. The official [To Akhi Mo Aaina album](https://open.spotify.com/album/04c1TlYNPTycRqJBXkL0mP) also has separate soundtrack-release IDs; the selected single-release IDs above are explicit matches.
- Anamika Nayika uses the shorter provider title; the catalog continues the lyric. Babul Supriyo matches. Janhare Tate also has a longer Apple title and different reissue year. Neither was auditioned for master equivalence.
- Sata Meghara Odhani, Ajana Bate, Chandrama Ago Chandrama, Chhati Tale, Hela Ki Prema and Basinda need original artist/album confirmation. Male/female, 2.0, solo, remix or film versions cannot be interchanged by title alone.
- Gabhare Gajara Jhulei: an unrelated artist-page recommendation surfaced the title, but the individual Spotify track explicitly credits Shakti Mishra. Only the individual recording metadata was recorded.
- E Banara Chhai: the opened [2024 Apple track](https://music.apple.com/us/song/1728448101) credits Goutam Giri and Shreejata Upadhyay. This conflicts with catalog singer Amit Kumar and is rejected as a replacement. No matching original provider page was resolved.
- Tume Mo Phula Mu Tuma Phaguna: Qobuz lists Sonu Nigam, track 6, 4:38, Pabitra Bandhana. No exact Spotify/Apple/JioSaavn URL was resolved; original catalog artist is unknown.
- Phulara Sahare: Apple lists Udit Narayan / Banaa Harini. The catalog uses a longer title and lacks a singer, so this remains a candidate. The separately discovered Kumar Bapi/Sital Kabi 2.0 is not a substitute.

## Audio-only integration and playback limits

Use the provider's official Embed or link. Metadata pages do not grant permission to copy, rehost or extract the audio. Direct-audio rights remain unknown.

Spotify documents an official audio Embed. Its [creation guide](https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed) describes the 80px legacy compact player and says eligible video switches to audio when the iframe is below 150px high, or offers a Spotify link if audio is unavailable. Keep the iframe at least 280px wide to avoid clipping; do not crop or overlay provider controls. The provider chooses the available experience for the listener.

Spotify's [troubleshooting guide](https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting) warns that encrypted-media or browser problems can limit playback to previews shorter than 30 seconds. Preserve encrypted-media permission. Its public song pages also prompt listeners to sign in for the full track. Do not describe metadata matches or a loaded iframe as confirmed playable full songs; login, account, browser, regional and provider restrictions may apply. Apple song pages observed here show Preview, not proof of unrestricted full playback.

Official [Embed overview](https://developer.spotify.com/documentation/embeds) documents the supported embedding mechanism. Availability should be judged from an actual user-initiated playback check in the target browser/account. Network or TLS failures alone do not prove a recording is unavailable. This research did not retest YouTube playback.
