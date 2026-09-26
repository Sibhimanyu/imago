// watch-live: every cut sits on the 128 BPM grid of "Funky House".
// B(n) is the time of beat n. Image coordinates are frame pixels of the
// 1080x1920 screenshots (see build.mjs).
const P = 60 / 128, O = 0.06;
const B = (n) => (n === 0 ? 0 : O + n * P);

// Real captures from https://imago.onslate.in, 26 Sep 2026, ISS endpoint with
// Watch at 10 s. iss-c1..c4 are four consecutive re-fetches.
const hookCam = (a, b) => [[B(a), 1.3, 440, 1080], [B(b), 1.37, 440, 1080, 'none']];
const changedCam = (a, b) => [[B(a), 1.25, 460, 1243], [B(b), 1.3, 460, 1243, 'none']];
const histCam = (a, b) => [[B(a), 1.1, 540, 560], [B(b), 1.14, 540, 560, 'none']];

export default {
  duration: 16.0,
  endcard: { start: B(28), beat: P },
  music: { vol: 0.36, duck: 0.22 },
  shots: [
    // Hook: the velocity on four real re-fetches, one per beat.
    { id: 's1a', img: 'iss-c1.png', start: B(0), end: B(1), cam: hookCam(0, 1), enter: 'punch' },
    { id: 's1b', img: 'iss-c2.png', start: B(1), end: B(2), cam: hookCam(1, 2), enter: 'punch' },
    { id: 's1c', img: 'iss-c3.png', start: B(2), end: B(3), cam: hookCam(2, 3), enter: 'punch' },
    { id: 's1d', img: 'iss-c4.png', start: B(3), end: B(4), cam: hookCam(3, 4), enter: 'punch' },
    // Watch goes on.
    { id: 's2a', img: 'iss-off.png', start: B(4), end: B(6), cam: [[B(4), 1.55, 370, 0], [B(6), 1.75, 330, 0]], enter: 'whip' },
    { id: 's2b', img: 'iss-on.png', start: B(6), end: B(8), cam: [[B(6), 1.75, 330, 0], [B(7), 1.6, 360, 0, 'expo.out'], [B(8), 1.63, 360, 0, 'none']], enter: 'punch' },
    // The re-fetch lands: CHANGED tags, amber rows, the change list.
    { id: 's3a', img: 'iss-pre.png', start: B(8), end: B(9), cam: [[B(8), 1.25, 460, 980], [B(9), 1.3, 460, 980, 'none']], enter: 'whipup' },
    { id: 's3b', img: 'iss-c1.png', start: B(9), end: B(11), cam: changedCam(9, 11), enter: 'punch',
      rings: [{ t: B(9), x: 674, y: 973, w: 161, h: 47 }, { t: B(10), x: 584, y: 1237, w: 161, h: 47 }] },
    { id: 's3c', img: 'iss-rows.png', start: B(11), end: B(13), cam: [[B(11), 1.25, 0, 860], [B(13), 1.25, 0, 1000]], enter: 'whip',
      rings: [{ t: B(11) + 0.05, x: 477, y: 725, w: 558, h: 54, hold: 0.4 }, { t: B(12), x: 477, y: 965, w: 558, h: 54, hold: 0.4 }] },
    { id: 's3d', img: 'iss-changes.png', start: B(13), end: B(14), cam: [[B(13), 1.3, 0, 560], [B(14), 1.34, 0, 600, 'none']], enter: 'punch' },
    // History strip: one more tick per beat.
    { id: 's4a', img: 'iss-c1.png', start: B(14), end: B(15), cam: histCam(14, 15), enter: 'whip' },
    { id: 's4b', img: 'iss-c2.png', start: B(15), end: B(16), cam: histCam(15, 16) },
    { id: 's4c', img: 'iss-c3.png', start: B(16), end: B(17), cam: histCam(16, 17) },
    { id: 's4d', img: 'iss-c4.png', start: B(17), end: B(18), cam: histCam(17, 18) },
    // Use cases.
    { id: 's5a', img: 'prices.png', start: B(18), end: B(20), cam: [[B(18), 1.5, 370, 700], [B(20), 1.6, 350, 720, 'none']], enter: 'whip' },
    { id: 's5b', img: 'rates.png', start: B(20), end: B(22), cam: [[B(20), 1.4, 400, 1300], [B(22), 1.5, 380, 1340, 'none']], enter: 'whip' },
    { id: 's6', img: 'iss-on.png', start: B(24), end: B(28), cam: [[B(24), 2.4, 520, 0], [B(28), 2.6, 520, 0]], enter: 'punch' },
    { id: 's5c', img: 'headers.png', start: B(22), end: B(24), cam: [[B(22), 1.6, 0, 0], [B(23.3), 1.65, 0, 0], [B(23.8), 1.9, 780, 1690, 'expo.inOut'], [B(24), 1.92, 780, 1690, 'none']], enter: 'whip' },
  ],
  captions: [
    { start: 0, end: B(4), y: 250, hook: true, lines: ['This number', 'is moving.'], lineTimes: [0, B(1)] },
    { start: B(4), end: B(8), y: 640, lines: ['Turn on Watch.'] },
    { start: B(8), end: B(11), y: 250, lines: ['It re-fetches.'] },
    { start: B(11), end: B(13), y: 1180, lines: ['It marks', 'exactly', 'what moved.'], lineTimes: [B(11), B(11.5), B(12)] },
    { start: B(14), end: B(18), y: 720, small: true, lines: ['Each fetch, a tick.'] },
    { start: B(18), end: B(20), y: 250, lines: ['Prices.'] },
    { start: B(20), end: B(22), y: 250, lines: ['Rates.'] },
    { start: B(22), end: B(24), y: 250, lines: ['Your own API.'] },
    { start: B(24), end: B(28), y: 860, lines: ['Every 10, 30', 'or 60 seconds.'], lineTimes: [B(24), B(25)] },
  ],
  amigo: [
    { start: B(4) + 0.1, end: B(8), x: 760, y: 1560, size: 280, lean: -16, acts: [[B(5), 'lean'], [B(6), 'hop'], [B(6.5), 'squash'], [B(8) - 0.26, 'out']] },
    { start: B(24), end: B(28), x: 290, y: 1240, size: 500, from: 700, acts: [[B(25), 'hop'], [B(25.7), 'squash'], [B(26), 'wiggle'], [B(27), 'hop'], [B(27.7), 'squash']] },
  ],
  sfx: [
    ['impact-bass-1', 0], ['key-press', B(1)], ['key-press', B(2)], ['key-press', B(3)],
    ['whoosh', B(4)], ['pop', B(4) + 0.15], ['click', B(6)], ['pop', B(6) + 0.18],
    ['whoosh-short', B(8)], ['riser', B(9)], ['ping', B(9)], ['ping', B(10)],
    ['whoosh-short', B(11)], ['ping', B(11) + 0.05], ['ping', B(12)], ['ping', B(13)],
    ['whoosh', B(14)], ['click-soft', B(15)], ['click-soft', B(16)], ['click-soft', B(17)],
    ['whoosh', B(18)], ['whoosh', B(20)], ['whoosh', B(22)], ['whoosh-short', B(23.3)], ['click-soft', B(23.8)],
    ['pop', B(24)], ['sparkle', B(24)], ['pop', B(25)], ['pop', B(27)],
    ['riser', B(28)], ['whoosh', B(28)], ['impact-bass-1', B(28)], ['key-press', B(29)], ['key-press', B(30)], ['pop', B(31)],
  ],
};
