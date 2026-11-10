# Pocket DJ

A personal AI DJ for your phone. Pick a vibe and it keeps a queue going, then mixes each song into the next on the beat. You can also press Next at any moment and it blends in the next song instead of cutting.

Live app: https://sid-goyal-projects.github.io/pocket-dj/

## What works today (v0.2)

- **Music source:** free, full-length songs from [Audius](https://audius.co) (search, trending by genre), plus your own audio files.
- **Vibes:** Chill, Warm-up, Party, Workout, Late night, Focus. Each vibe is a set of genres and a BPM range.
- **Auto DJ:** keeps 3 songs queued for the vibe. It picks the next song by closeness in tempo and musical key to the one before it, and avoids repeating the same artist.
- **Mixing engine:** detects tempo, beat grid, intro end and drop for every song in the browser. It matches tempo (up to ±8%), starts the next song on the next bar at the chosen point, and blends with a bass swap. Filter sweep, echo out and cut are also available.
- **Manual control:** Mix in now, Play next, reorder, tap the waveform to pick where a song comes in.
- **Phone:** add it to your home screen from Safari's share menu. The screen stays awake while playing.

## Known limits

- iPhone pauses web audio when the screen locks. The app keeps the screen awake as a workaround. A native iOS app is the real fix.
- Tempo matching changes speed, so pitch shifts slightly during a mix and then eases back.
- Audius is independent artists only. Mainstream catalogues need a licensed provider (see roadmap).

## Roadmap

1. **v0.3, learn from real DJs.** Build a transition model from public DJ mix research data (cue points, transition lengths, track order), so the Auto DJ picks entry and exit points the way DJs do.
2. **v0.4, smarter vibes.** Energy curves over time (warm-up, peak, cool-down), skip and like signals that tune future picks.
3. **v0.5, native iOS app.** Background playback on lock screen, offline library for owned files.
4. **Licensed catalogue.** Approach B2B providers (Tuned Global, Feed.fm) with a working demo.

## Files

- `index.html` is the whole app (UI, Audius client, Auto DJ, analysis, mixing engine).
- `manifest.json` and `icon-*.png` let it install to the home screen.

Music streams from Audius under its API guidelines. Artists are credited on every track.
