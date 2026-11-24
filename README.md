# Pocket Maine - Air and Sea

A cozy pixel-art transport game set in Maine. You run a small outfit moving people and freight around the state by bush plane, floatplane, ferry and lobster boat, in real time, in the spirit of Pocket Planes.

**Play it:** https://jamesccupps.github.io/PocketMaine/

The whole game is one self-contained `index.html`. It runs in any modern browser, on a phone or a desktop, with nothing to install. It saves in the browser, and keeps running while it is closed.

| Map | Port | Hangar |
|---|---|---|
| ![The map on a phone](docs/phone-map.png) | ![A port's job board](docs/phone-port.png) | ![A hangar and boatyard](docs/phone-yard.png) |

![The port screen on a desktop](docs/desktop-port.png)

## How it plays

1. Open a craft, hit **LOAD** on the jobs you want, then **FLY** (or **CAST OFF** for a boat) and tap where to go on the map.
2. Trips take a few minutes of real time. When a craft shows **ARRIVED**, open it to collect the fare and the XP.
3. Fill a craft with jobs for one destination for a 25% bonus.
4. Spend what you earn on new ports, fleet slots and craft. Planes go from a hangar town, boats from a boatyard town.

A guided tutorial walks a new player through the first run. It can be skipped, and replayed from the Almanac.

### What unlocks as you level

XP comes from fares, catches, contracts, new ports, new craft types and first landings. Each level pays a bonus and a parts crate, and levels 2 to 8 each open something new:

| Level | Unlocks |
|---|---|
| 2 | VIPs and special freight: gold jobs that pay three to four times the fare and bring a tip, XP, a parts crate or a good word at both ports. Also names and paint: rename a craft, pick its colors |
| 3 | Events: festivals and harvests, a cruise ship or freighter in port, bean suppers, fuel price wars, parts swap meets, urgent medical runs |
| 4 | Wear and overhaul: craft wear with use and are fixed at a yard |
| 5 | Catch and traps: sell the catch where the price is best, set lobster trap strings |
| 6 | Crew: hire one hand per craft, each with one skill |
| 7 | Port works: fuel dock, lobster pound, inn |
| 8 | Standing runs: a craft shuttles between two ports by itself |

Also in the game: 23 ports on a hand-drawn map of Maine, 14 craft, hangars and boatyards that sell parts (three parts build a craft), storage for spare craft, contracts, a fish market, weather that holds craft on the ground, and four seasons that freeze lakes and close grass strips in mud season.

**Holidays** follow the real calendar. For New Year, Valentine's Day, Independence Day, Halloween, Thanksgiving and Christmas the ports are decorated, holiday passengers and freight turn up on the boards and pay 25% more, and holiday VIPs come by. The Almanac has a switch to turn this off or preview a holiday.

What comes next is in the [roadmap](ROADMAP.md): ships you own, the rest of New England, more holidays.

## Design choices

- **Real time, no energy.** Trips take real minutes and the game runs while closed, capped at twelve hours. There are no energy timers, no premium currency and nothing to buy.
- **One job, one slot.** Every passenger or parcel takes one seat or one cargo slot, and jobs arrive in same-destination groups, so a bigger craft is still quick to fill. Standing runs take over the repetitive routes late in the game.
- **You choose where to go.** Nothing picks a destination for you. The ports your load is bound for flash on the map.
- **Boats follow the water.** Sea routes are found on a one-kilometre grid of the coast, so a boat goes around a peninsula, not over it.
- **Features arrive one at a time.** A new game is only load, send, collect. Each system is hidden until its level.
- **Original art only.** The map, craft, cargo icons and people are drawn in code. People are generated from a seed.

## Building

The game is built from the files in `src/` into `index.html`:

```
python3 build.py
```

It needs only Python 3. The three fonts in `fonts/` are inlined into the page.

| File | What is in it |
|---|---|
| `src/01_data.js` | Ports, craft, fish, flavor text, tuning numbers |
| `src/02_map.js` | The map: coastline, rasterizer, sea pathfinding |
| `src/03_sim.js` | The rules: jobs, routes, weather, fishing, yards, parts |
| `src/03x_more.js` | Everything that unlocks with levels, and events |
| `src/03y_vip.js` | VIPs and the holiday calendar |
| `src/04_art.js` | Sprites, icons, generated portraits, the pixel font |
| `src/05_render.js` | Drawing the map and the port scenes |
| `src/06_ui.js` | Screens, the tutorial, input |
| `src/07_main.js` | Saving, the frame loop, startup |

## Testing

The rules have no dependency on the page, so they are tested directly in Node:

```
node test/rules.js
```

The rest drive the built page in headless Chrome through Playwright (`pip install playwright`; set `CHROME` to the browser's path if it is not `/usr/bin/google-chrome`). Run them from the repository root:

```
python3 test/audit.py 386x630x3 1280x720x1     # nothing clipped, cropped or off screen, on every screen
python3 test/tutorial.py 386x630x3             # follows the tutorial by tapping only what it highlights
python3 test/levels.py 386x630x3 casco         # levels up and uses each unlock by taps
python3 test/playtest.py 386x630x3 casco       # a long tap-driven session, checking the wording per craft
python3 test/vip.py 386x630x3                  # VIPs, holidays and events by taps, through a save and reload
python3 test/away.py 386x630x3                 # closes the page mid-trip and reopens it: a real wait, two hours, twenty hours
python3 test/shot.py 1440 900 stress           # 3,000 random steps through every system
```

Sizes are `width x height x pixel ratio`. Widths under 800 are run as a touch phone.

## Credits and licenses

- Code and art: MIT, see [LICENSE](LICENSE).
- Fonts: [Silkscreen](https://github.com/googlefonts/silkscreen) and VT323, both under the SIL Open Font License 1.1. The license texts are in `fonts/`.
- Inspired by Pocket Planes and Pocket Trains by NimbleBit. This is an independent project and is not affiliated with them.
