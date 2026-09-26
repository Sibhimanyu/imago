// free-and-why: every cut sits on the 123 BPM grid of "Hella Bumps".
// B(n) is the time of beat n. Image coordinates are frame pixels of the
// 1080x1920 screenshots (see build.mjs).
const P = 60 / 123, O = 0.155;
const B = (n) => (n === 0 ? 0 : O + n * P);

// Real captures from https://imago.onslate.in and the GitHub repo, 26 Sep 2026.
// type-*: the landing paste bar while a URL is typed into it.
const typing = ['type-00', 'type-04', 'type-08', 'type-12', 'type-16', 'type-20', 'type-24', 'type-28', 'type-32', 'type-36', 'type-40', 'type-44', 'type-done'];
const Q = P / 4;
const typeShots = typing.map((img, i) => ({
  id: `s1t${i}`, img: `${img}.png`, start: i === 0 ? 0 : B(0.5) + i * Q, end: i === typing.length - 1 ? B(4) : B(0.5) + (i + 1) * Q,
  cam: [[i === 0 ? 0 : B(0.5) + i * Q, 1.15 + i * 0.008, 540, 960], [i === typing.length - 1 ? B(4) : B(0.5) + (i + 1) * Q, 1.158 + i * 0.008, 540, 960, 'none']],
  enter: i === 0 ? 'punch' : undefined,
}));

export default {
  duration: 16.74,
  endcard: { start: B(28), beat: P },
  music: { vol: 0.4, duck: 0.25 },
  shots: [
    ...typeShots,
    // No account: the landing line under the paste bar.
    { id: 's2', img: 'type-done.png', start: B(4), end: B(8), cam: [[B(4), 1.9, 540, 940], [B(6), 2.5, 640, 925, 'expo.inOut'], [B(8), 2.55, 640, 925, 'none']], enter: 'whip' },
    // No key: the basic-layout note, then the page it drew.
    { id: 's3', img: 'iss-basic.png', start: B(8), end: B(12), cam: [[B(8), 1.35, 440, 600], [B(10), 1.35, 440, 600], [B(10.6), 1.04, 540, 960, 'expo.inOut'], [B(12), 1.07, 540, 960, 'none']], enter: 'whip' },
    // Keys: Settings says where they live, then the provider switch.
    { id: 's4a', img: 'settings.png', start: B(12), end: B(15), cam: [[B(12), 1.7, 400, 1346], [B(15), 1.8, 400, 1346, 'none']], enter: 'whipup' },
    { id: 's4b', img: 'settings.png', start: B(15), end: B(16), cam: [[B(15), 1.8, 0, 470], [B(16), 1.85, 0, 470, 'none']], enter: 'punch' },
    { id: 's4c', img: 'settings-groq.png', start: B(16), end: B(18), cam: [[B(16), 1.85, 0, 470], [B(18), 1.95, 0, 470, 'none']], enter: 'punch' },
    // Share: the button, then the toast.
    { id: 's5a', img: 'iss-basic.png', start: B(18), end: B(19), cam: [[B(18), 2.2, 640, 0], [B(19), 2.35, 620, 0, 'none']], enter: 'whip' },
    { id: 's5b', img: 'share-2.png', start: B(19), end: B(22), cam: [[B(19), 2.35, 620, 0], [B(19.6), 1.3, 0, 1920, 'expo.inOut'], [B(22), 1.36, 0, 1920, 'none']], enter: 'punch' },
    // Free, open source: the MIT license on GitHub.
    { id: 's6', img: 'gh-license.png', start: B(22), end: B(26), cam: [[B(22), 1.25, 0, 1000], [B(24), 1.6, 0, 900, 'expo.inOut'], [B(26), 1.65, 0, 900, 'none']], enter: 'punch' },
  ],
  // The landing's live specimen (JSON + Forecast card) is Open-Meteo data, CC BY 4.0:
  // it is on screen through the hook and the "No account." beat, so it is credited there.
  credits: [{ start: 0, end: B(8), text: 'Weather data by Open-Meteo.com' }],
  captions: [
    { start: 0, end: B(4), y: 1090, hook: true, light: true, lines: ['An AI tool', 'that wants', 'nothing.'], lineTimes: [0, B(1), B(2)] },
    { start: B(4), end: B(8), y: 300, lines: ['No account.'] },
    { start: B(8), end: B(12), y: 250, lines: ['No key?', 'Still works.'], lineTimes: [B(8), B(10)] },
    { start: B(12), end: B(15), y: 280, lines: ['Your key stays', 'in your browser.'], lineTimes: [B(12), B(13)] },
    { start: B(15), end: B(18), y: 1080, lines: ['Goes only to', 'the provider', 'you chose.'], lineTimes: [B(15), B(15.5), B(16)] },
    { start: B(18), end: B(22), y: 280, lines: ['Share the page,', 'not your keys.'], lineTimes: [B(18), B(20)] },
    { start: B(22), end: B(26), y: 230, lines: ['Free.', 'Open source.'], lineTimes: [B(22), B(23)] },
    { start: B(26), end: B(28), y: 560, lines: ['Just paste a URL.'] },
  ],
  amigo: [
    // Top-right, on the paper: below y ~1130 the landing's dark JSON panel would hide him.
    { start: B(4) + 0.1, end: B(8), x: 830, y: 40, size: 240, from: -320, outY: -360, lean: -16, acts: [[B(5), 'lean'], [B(6), 'hop'], [B(6.5), 'squash'], [B(8) - 0.26, 'out']] },
    { start: B(26), end: B(28), x: 290, y: 860, size: 500, from: 600, acts: [[B(26.6), 'squash'], [B(27), 'hop'], [B(27.5), 'squash']] },
  ],
  sfx: [
    ['impact-bass-1', 0],
    ...typing.slice(1).map((_, i) => ['key-press', B(0.5) + (i + 1) * Q, 0.6]),
    ['whoosh', B(4)], ['pop', B(4) + 0.15], ['whoosh-short', B(6)],
    ['whoosh', B(8)], ['whoosh-short', B(10)], ['sparkle', B(10)],
    ['whoosh', B(12)], ['pop', B(13)], ['whoosh-short', B(15)], ['click', B(16)],
    ['whoosh', B(18)], ['click', B(19)], ['pop', B(19) + 0.25],
    ['riser', B(22)], ['impact-bass-1', B(22)], ['pop', B(23)], ['whoosh-short', B(24)],
    ['whoosh', B(26)], ['pop', B(26)], ['pop', B(27)],
    ['riser', B(28)], ['whoosh', B(28)], ['impact-bass-1', B(28)], ['key-press', B(29)], ['key-press', B(30)], ['pop', B(31)],
  ],
};
