# Developer guide

Dash Spotter is a bridgething webapp: one page, 800 by 480 pixels, running full screen in the Car Thing's kiosk browser
and talking to the on-device daemon through `@bridgething/client`. It is built with React, TypeScript and Vite inside a
Bun workspace; the settings page uses Preact to stay small. The workspace comes from the bridgething scaffold, so [CLAUDE.md](../CLAUDE.md)
at the repo root also applies. The settings page on the phone is a second, separate page built from `settings/`.

## Get started

```sh
bun install
bun run check                                      # typecheck, build, bundle, validate the catalog
bun run --cwd apps/dash-spotter dev                # dev server
```

Open `/sim.html` on the dev server for the desktop simulator: the app at device size with buttons for the four presses, the
recessed button and the dial. It runs on made-up data, with no network and no device. Everything it shows, including every
aircraft, photo, airline, delay and emergency, is invented. Pictures from it carry a "SIMULATED PICTURE" watermark.

The simulator reads options from the address, for example `sim.html?scenario=emergency&units=metric`:

| Option                | Values                                  | Effect                                                         |
| --------------------- | --------------------------------------- | -------------------------------------------------------------- |
| `scenario`            | normal, empty, emergency, fleet         | What is in the sky. `emergency` adds a 7700 squawk later       |
| `emergency_after`     | seconds                                 | Delay before the emergency begins                              |
| `photo`               | all, sister, type, none                 | Which pictures exist                                           |
| `fail`                | flights, squawk, photos, faa, routes, position, airports, all | Makes those feeds fail            |
| `frozen`, `speed`, `slow` | 1, a number, milliseconds           | Stop the clock, run it faster, delay every reply               |
| `lat`, `lon`          | numbers                                 | Where the simulated user is                                    |
| any app setting       | for example `units=metric`, `watch_list=UAL2210` | Read as a setting                                     |

Other useful commands, all from the repo root:

```sh
bun run push                              # build and install onto a Car Thing connected over USB
bun run share                             # zip dist/ for someone to install from the companion app
bun run shot dash-spotter [--replace]     # screenshot the real device for the store listing
bun run bump dash-spotter patch -m "note"
bun run --cwd apps/dash-spotter typecheck # checks src, settings and the tests
cd apps/dash-spotter && bun test          # unit tests
```

Bun lives at `~/.bun/bin`. Add it to your PATH if `bun` is not found.

## Controls and events

The device sends ordinary browser events. `src/input.ts` is the only place that reads them.

| Control         | Event                                | Used here                                       |
| --------------- | ------------------------------------ | ----------------------------------------------- |
| Buttons 1 to 4  | `keydown` "1" to "4"                 | Overhead, Radar, Watchlist, Spotter log         |
| Mode (recessed) | `keydown` "m"                        | Arrivals                                        |
| Back            | `keydown` "Escape"                   | never touched, left free                        |
| Dial turn       | `wheel` with horizontal `deltaX`     | radar range, list scroll, next airport          |
| Dial click      | `keydown` "Enter"                    | Radar list toggle                               |

One dial detent can arrive as a burst of wheel events, so only one step is taken per 120 ms.

## Layout

```
apps/dash-spotter/
  public/manifest.json    identity, settings fields, the geo permission. Never change "id".
  catalog.json            store listing
  CHANGELOG.md            a section per version
  sim.html                desktop simulator (development only, not in the build)
  settings/               the phone settings page: log export, country lookup, credits
  scripts/                build-airports.ts, plus push and share
  src/
    main.tsx, App.tsx     picks the platform, creates the repo, screen state, emergency flash handling
    input.ts              key and dial handling
    data/                 pure logic: parsing, units, airports, the log, export, the Repo class
    platform/             the Platform interface and its device, web and shared code
    sim/                  fixtures and a simulated platform
    tests/                unit tests
    ui/                   theme, icons, shared pieces, the emergency flash and the five screens
```

## How it fits together

- **Platform interface** (`src/platform/types.ts`): everything the app needs from outside (fetch, saved values, docs,
  settings, position). There are three implementations. The device one calls `@bridgething/client`. The web one uses
  `fetch` in a normal browser. The sim one answers from fixtures.
- **Repo** (`src/data/repo.ts`): owns every feed and timer: your position (every 8 s), the nearby aircraft (every 6 s), the
  emergency squawk search (25 s), arrivals (10 s) and the FAA status (5 min). Failed runs are retried after 30 s when the
  phone could not be reached at all, and after 15, 30, 60, 120, 240 and then 300 s when a service answered with an error. A
  failed provider is skipped for a while and the next one is tried. Requests to one host are spaced at least 1.1 s apart.
  The UI reads the state with `useSyncExternalStore`.
- **Providers** (`src/data/adsb.ts`): adsb.lol, airplanes.live and adsb.fi share the readsb JSON shape, so one parser
  reads all three. Aircraft whose category is a ground vehicle are dropped.
- **Search size**: the nearby search radius follows the radar range (range times 1.1, between 20 and 100 nautical miles),
  and the position sent is rounded to two decimals. A separate squawk search finds emergencies within 100 miles.
- **Emergency tracking** (`src/data/emergency.ts`): a squawk must be heard on two updates at least 4 s apart, within
  100 miles and airborne. One alert per aircraft per episode. An episode ends after 10 minutes without the code.
- **Airports** (`src/data/airports.ts`): decodes `airports.bin.gz` and builds a working set (Auto: within 250 miles,
  rebuilt after moving 100 miles; a country; or the world). Nearest-airport lookups only touch the working set.
- **Log** (`src/data/log.ts`): one row per ICAO hex, up to 12,000 rows, written to device docs in shards of 100 rows
  (`log.0`, `log.1`, ..., plus a small `log.meta`). The settings page on the phone reads those docs to export. Deleting
  `log.meta` from the phone empties the app's log too.
- **Photos** (`src/data/photoservice.ts`): one lookup at a time. Exact aircraft, then another tail of the same airline and
  type from the live list, then Commons, then a silhouette. Pictures are kept as blob addresses in memory only.
- **Units**: data is held in miles, feet and knots and converted when drawn.

## Airport data

`src/data/airports.bin.gz` is built from [OurAirports](https://github.com/davidmegginson/ourairports-data):

```sh
git clone --depth 1 https://github.com/davidmegginson/ourairports-data <folder>
bun run --cwd apps/dash-spotter airports <folder>
```

The script writes the packed airport file and `settings/countries.ts` (the countries that have at least one airport). A
test checks that the two agree. Running it on 2026-11-04 data produced a byte-identical file.

## Tests

There are two kinds, and neither runs on a real device.

- `bun test` in `apps/dash-spotter`: 103 unit tests of the data layer. Every service reply in them is a **simulated
  fixture written from the published formats and memory**. They prove the parsers handle what they were written for. They
  do not prove that any live service answers that way. The airport tests use the real airport file.
- A fake phone page host used while building the settings page, which checked the export flow against a simulated bridge.

The real device is tested by hand with [device-test-checklist.md](device-test-checklist.md). Until that has been done, every
live service shape and every phone interaction counts as unconfirmed.

The unit tests need `tsconfig.test.json` (TypeScript 6 loads no global types by default), which `bun run typecheck` uses.

## Changing the app

- Settings: add the field in `public/manifest.json` (values arrive as strings), read it in `parseSettings` in
  `src/data/repo.ts`, and mention it in the [user guide](user-guide.md). A test (`manifest.test.ts`) checks that each
  field's default parses the same as no value.
- A new data source: add a parser in `src/data`, a feed in the Repo, a fixture in `src/sim/fixtures.ts` and a case in
  `src/sim/platform.ts`, then document it in [data-sources.md](data-sources.md) with its terms. Read the terms first.
  Several services in the aircraft world forbid operational or commercial use.
- Colors live in `src/ui/theme.ts`. The look is Material 3 Expressive: black background, pastel containers with dark ink.
- Comment style: terse, lowercase, why-only, 120 columns, no emdashes.

## Releasing

1. `bun run bump dash-spotter <patch|minor|major> -m "what changed"` moves the version and opens a changelog section.
2. Fill in `apps/dash-spotter/CHANGELOG.md` for that version.
3. `bun run check`.
4. Push to `main`. The publish workflow builds the app into `catalog.v1.json` on the `gh-pages` branch, served by GitHub
   Pages. A published version is immutable, so changes always mean a new version.
5. To list the app in the public bridgething store, `bun run submit`. A listing is public, so only do it deliberately.

The manifest `id` must never change: devices key upgrades and saved data on it.

## Known limits

- Everything on the real device is unconfirmed until the checklist is done.
- The app runs only while it is on the Car Thing's screen. There is no background logging.
- The settings page is limited to 1 MiB and is currently about 55 KB.
- The log is limited by the device's doc storage. The 100-row shards are about 30 KiB each against a 256 KiB document
  limit that was read from documentation, not measured.
- Route estimates depend on an adsb.lol endpoint whose reply shape was written from memory.
- Planespotters, airport-data.com and Wikimedia Commons use is not confirmed against their terms. See
  [data-sources.md](data-sources.md).
