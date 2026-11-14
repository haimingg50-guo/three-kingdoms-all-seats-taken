# Spectacle

[中文](spectacle.md) · [日本語](spectacle.ja.md) · [한국어](spectacle.ko.md)

The everyday picture stays 16-bit pixels. Three short pieces may appear only after the turn has already resolved. They do not change grain, troops, or the result. This repository does not run a public match.

## The three

| Id | Name | About | What exists now |
| --- | --- | --- | --- |
| blade-rain | Blade borrows rain | 8 s | Pixel storyboard only. No video. |
| grain-check | The lord checks the grain | 6 s | The pixel storyboard stays in the game. A separate AI concept sample exists and is not wired in. |
| hammer | The smith tests the hammer | 7 s | Pixel storyboard only. No video. |

Blade-borrows-rain needs rain that turn, and a snake spear, crescent blade, or sky halberd in the duel. The ending follows the result already written.

Grain-check is considered when grain is stored and the turn number divides by 4. A sack slips and covers the helmet. The clerk writes that the stores are full and the stack needs moving. Nobody is hurt. The piece does not remove more grain.

The hammer piece runs only on an ordinary forge. The first piece of a famous pattern does not use it. The hammer head flies off, hits the dinner gong, the apprentice takes the bowl and leaves, and the smith says the heat is right.

## The sample

[`examples/spectacle/grain-check-concept.mp4`](../examples/spectacle/grain-check-concept.mp4) is about 6 seconds. The cuts jump, an official appears abruptly, and the joke is thin. The author accepts this first cut and is not generating another. It is not an editable 3D project, and no separate license came with the file. See [examples/spectacle/README.en.md](../examples/spectacle/README.en.md).

The three addresses in `public/spectacle/manifest.json` are still empty. The game does not read files under `examples/`.

## Playback

If a finished film exists later, change only the matching manifest value to an `https://` address. The page fetches it when a player triggers it. Do not bundle the video into the first script.

The kit panel stores `tianxia-spectacle` in this browser:

- `on`: read the manifest. An empty address, a failed request, or a video that will not play stays on the pixel frames.
- `low`: do not request the manifest. Pixel frames only.
- `off`: show nothing.

The pixel frames are words and blocks of color. They are not a finished 3D film.
