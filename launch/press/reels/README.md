# Imago reels

Four vertical reels for the press kit and social: 1080x1920, H.264 + AAC,
30 fps, 14–17 s each, normalised to -14 LUFS. Each opens on a hook within the
first second, cuts on the music's beat, has sound effects on every action and
big captions that also work with the sound off. Each has a poster PNG with the
same name. Music and sound credits: [AUDIO-CREDITS.md](AUDIO-CREDITS.md).

| Reel | Hook | Feature |
|---|---|---|
| `stop-reading-json.mp4` | "Stop reading raw JSON." | Paste a URL, get a page |
| `paste-curl.mp4` | "Copied as cURL? Paste it." | curl import: headers, Basic auth |
| `watch-live.mp4` | "This number is moving." | Watch marks exactly what changed |
| `free-and-why.mp4` | "An AI tool that wants nothing." | No account, no key needed, keys stay in your browser, share without keys |

Everything on screen is real Imago, captured from https://imago.onslate.in on
26 Sep 2026, except the dev-tools panel in `paste-curl`, which is labelled on
screen as a generic mock. Any frame showing Open-Meteo's forecast carries
"Weather data by Open-Meteo.com".

Sources are in `src/<reel>/`, one HyperFrames project each; see each reel's
section below for how to rebuild it.

## stop-reading-json.mp4 (the hero reel)

Length: 16.0 s, with music and sound effects (mixed to -14 LUFS). Poster:
`stop-reading-json.png`. Music: "Fireworks" by Alexander Nakarada (CC0), see
`AUDIO-CREDITS.md`.

Hook (0 s): "Stop reading raw JSON." slams in over Pikachu's real response
scrolling past in Imago's Response pane, then a punch-in on the pane's own
footer, "… 14008 more lines". The URL is typed into Imago's bar (typing
sound, one real capture per character), the send button is tapped, a riser
climbs through the fetch, and on the beat drop the Pikachu page snaps in
(impact). Punch-ins on the sprite, the stat bars (Speed 90 ringed, a ding) and
the "electric" type tag, then four more pages, one every two beats: Open
Library, the Open-Meteo forecast (with "Weather data by Open-Meteo.com"
on screen), a Thirukkural verse and the ISS position. Amigo pops in, then the
end card. Cuts sit on the track's 117 BPM grid; the drop is at 5.0 s. All
screens are real captures of https://imago.onslate.in/#app at phone size on
26 Sep 2026; the pages are the no-key basic layout, and they say so.

On-screen text:

> Stop reading raw JSON.
>
> …and 14,008 more lines.
>
> Paste the URL.
>
> It's a page now.
>
> The sprite. / Stats as bars. / Types as tags.
>
> Any public API.
>
> No key. No account.
>
> Imago · imago.onslate.in · Free · Open source

Caption to paste:

> Stop reading raw JSON. Paste an API URL into Imago and it draws the response as a page: headline numbers, stats as bars, tables, charts. Works with no key; add a free Gemini or Groq key for a designed layout. Free, open source, no account. imago.onslate.in

Source: `src/stop-reading-json/`. Captures: `node capture/capture.mjs` and
`node capture/strip.mjs`. Edit `index.template`, run `python3 build.py`, render
with `npx hyperframes render --quality looks --output renders/raw.mp4`, then
normalize: two-pass `ffmpeg loudnorm=I=-14:TP=-1.5:LRA=11` with the video
stream copied, written to `../../stop-reading-json.mp4`.

## paste-curl.mp4

Length: 14.0 s, with music and sound effects (mixed to -14 LUFS). Poster:
`paste-curl.png`. Music: "Favorite" by Alexander Nakarada (CC0), see
`AUDIO-CREDITS.md`.

Hook (0 s): "Copied as cURL? Paste it." over a clean, generic dev-tools
Network panel (a mock, labelled on screen "Browser dev tools · Network panel
(generic mock)"): right-click, "Copy as cURL" (click), "Copied to clipboard".
The copied command,
`curl 'https://pokeapi.co/api/v2/pokemon/pikachu' -H 'Accept: application/json' -H 'X-Demo: imago'`,
with its two `-H` lines lit, drops into Imago's bar (pop): the real result is
the URL in the bar, a "2 headers" chip (ringed, a ding) and the toast
"Imported from curl: 2 headers." Inspect → Headers shows `Accept` and
`X-Demo`, a riser, and on the drop the Pikachu page snaps in (impact). Then
`curl 'https://httpbin.org/basic-auth/imago/demo' -u imago:demo` is pasted:
"1 header", Inspect → Headers shows `Authorization: Basic aW1hZ286ZGVtbw==`,
and the page httpbin returns says Authenticated: Yes, User: imago. Amigo pops
in, then the end card. Every Imago frame is a real capture of
https://imago.onslate.in/#app on 26 Sep 2026.

On-screen text:

> Copied as cURL? Paste it.
>
> Paste it.
>
> Headers picked up.
>
> One paste. One page.
>
> Basic auth too.  (chip: -u imago:demo → Authorization: Basic)
>
> Straight to a page.
>
> Share links skip your headers.
>
> Imago · imago.onslate.in · Free · Open source

Caption to paste:

> Copied a request as cURL from dev tools? Paste it into Imago. The headers go to Inspect → Headers, -u becomes Basic auth, and the response is drawn as a page. Share links never carry your headers or keys. Free, open source, runs in your browser. imago.onslate.in

Source: `src/paste-curl/`. Captures: `node capture/capture.mjs`. Edit
`index.html`, render and normalize as for stop-reading-json.

## watch-live.mp4

Length: 16.0 s, with music and sound effects (mixed to -14 LUFS). Poster:
`watch-live.png`. Music: "Funky House" (CC0), see `AUDIO-CREDITS.md`.

Hook (0 s): "This number is moving." over a tight zoom on the ISS velocity,
which changes on each beat across four real re-fetches. Then Watch is switched
on (click, green Live pill), the re-fetch lands with CHANGED tags and amber rows
(a ding on each), the "9 paths changed" list, the history strip gaining a tick
per beat, three use-case beats (CoinGecko prices, Frankfurter rates, a request
with an Authorization header), Amigo, and the end card. Every cut is on the
128 BPM grid. All screens are real captures of https://imago.onslate.in on
26 Sep 2026 (ISS endpoint with Watch at 10 s, CoinGecko, Frankfurter).

On-screen text:

> This number is moving.
>
> Turn on Watch.
>
> It re-fetches.
>
> It marks exactly what moved.
>
> Each fetch, a tick.
>
> Prices. / Rates. / Your own API.
>
> Every 10, 30 or 60 seconds.
>
> Imago · imago.onslate.in · Free · Open source

Caption to paste:

> Watch any JSON API change. Imago re-fetches every 10, 30 or 60 seconds and marks exactly what moved. Free, open source, no account. imago.onslate.in

Source: `src/watch-live/` (edit `scenes.mjs`, run `node build.mjs`, then
`npx hyperframes render --output renders/raw.mp4` and loudness-normalize to
-14 LUFS, as in the free-and-why note below).

## free-and-why.mp4

Length: 16.8 s, with music and sound effects (mixed to -14 LUFS). Poster:
`free-and-why.png`. Music: "Hella Bumps" by The Cynic Project (CC0), see
`AUDIO-CREDITS.md`.

Hook (0 s): "An AI tool that wants nothing." punched in word-line by
word-line while a URL is typed into the landing paste bar. Then each claim with
its proof on screen: the landing line "Runs in your browser. No account.", the
ISS page drawn with the note "No Google Gemini key, so this is the basic
layout.", the Settings line "Keys stay in this browser." and the provider
switch (Gemini to Groq), the Share button and its "Link copied." toast, the MIT
license on github.com/Sibhimanyu/imago, Amigo, and the end card. Every cut is
on the 123 BPM grid. Captured 26 Sep 2026.

On-screen text:

> An AI tool that wants nothing.
>
> No account.
>
> No key? Still works.
>
> Your key stays in your browser.
>
> Goes only to the provider you chose.
>
> Share the page, not your keys.
>
> Free. Open source.
>
> Just paste a URL.
>
> Imago · imago.onslate.in · Free · Open source

Caption to paste:

> No sign-up, no key needed. Paste an API URL and Imago draws it as a page. Add a free Gemini or Groq key if you want; it stays in your browser and goes only to the provider you chose. Share sends the page, never your headers or keys. MIT licensed. imago.onslate.in

Source: `src/free-and-why/`. Edit `scenes.mjs`, run `node build.mjs`, render
with `npx hyperframes render --quality looks --output renders/raw.mp4`, then
normalize: two-pass `ffmpeg loudnorm=I=-14:TP=-1.5:LRA=11` with the video
stream copied, written to `../../free-and-why.mp4`.

## Caption to paste

For posts that want a single line with any of the reels:

> Imago: paste an API URL, get an interface. Free, open source, runs in your browser. imago.onslate.in
