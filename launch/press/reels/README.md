# Imago reels

Four vertical reels for the press kit. 1080x1920, H.264 MP4, 30 fps, no audio.
They are silent by design: the on-screen text carries everything, so they work
with the sound off. Each reel has a poster PNG with the same name.

Everything on screen is real Imago: the logo and Amigo come from `brand/kit`,
and the app screens were captured from https://imago.onslate.in on 26 Sep 2026
(Pokémon, Open Library, Thirukkural and the ISS endpoint). The screen
recording in `paste-to-page` is `launch/social/demo.mp4`. No weather data
appears, so no Open-Meteo credit is needed.

Source: `src/<reel>/index.html`, one HyperFrames project per reel. To re-render
one, run `npx hyperframes render --quality looks --output ../../<reel>.mp4` inside
`src/<reel>/`.

## amigo-intro.mp4

Length: 17.4 s. Poster: `amigo-intro.png`.

Amigo arrives, the word "imago" swaps two letters and becomes "amigo", then
a pasted Pokémon URL turns from raw JSON into the page Imago drew.

On-screen text:

> Swap two letters and imago becomes amigo, Spanish for friend.
>
> Paste an API URL. Get an interface, not JSON.
>
> imago.onslate.in

## paste-to-page.mp4

Length: 20.0 s. Poster: `paste-to-page.png`.

Pikachu's raw JSON, the real recording of pasting the URL, then the full page
Imago drew, followed by an Open Library search and a Thirukkural verse.

On-screen text:

> You found an API. Before you use it, you want to see what's in it.
>
> Paste the URL. Imago fetches it and draws.
>
> Imago draws the page the data deserves.
>
> imago.onslate.in

## watch-live.mp4

Length: 16.4 s. Poster: `watch-live.png`.

The ISS endpoint with Watch off, Watch switched on (marked Live), then the
re-fetch lands and the values that moved are marked CHANGED.

On-screen text:

> Turn on Watch. Imago re-fetches and marks exactly what moved.
>
> imago.onslate.in

## free-and-why.mp4

Length: 20.4 s. Poster: `free-and-why.png`.

Four short beats on why Imago costs nothing, each with its proof: the MIT
license, the direct browser-to-API request, the Settings line "Keys stay in
this browser", and a page drawn with no key.

On-screen text:

> Free. Open source.
>
> No server, so nothing to charge for. Runs in your browser. No account.
> (Diagram: Your browser, one request, straight there, The API.)
>
> Your key stays in your browser. It goes only to the provider you chose.
>
> No key? It still works. Without a key you get the basic layout, drawn in your browser.
>
> imago.onslate.in

## Caption to paste

For posts that want a single line with any of the reels:

> Imago: paste an API URL, get an interface. Free, open source, runs in your browser. imago.onslate.in
