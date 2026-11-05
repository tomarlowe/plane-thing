# Testing

This page says what has been tested, how, and what has not. Plane Thing was written with an AI assistant (see
[how this was built](how-this-was-built.md)), so the honest answer to "does it work?" matters more than usual.

**The short version:** the logic is covered by 103 automated tests, and the whole app runs in a simulator. All of that uses
made-up data. Nothing in the automated testing has talked to a live flight service, run on a real Car Thing, or exported a
file from a real phone. That is what the [device test checklist](device-test-checklist.md) is for, and at the time of
writing none of its boxes are ticked.

## What runs automatically

Every push and pull request runs these in GitHub Actions (`.github/workflows/ci.yml`):

| Step                                      | What it checks                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile`           | The lockfile matches `package.json`                                                         |
| `bun run --cwd apps/plane-thing typecheck` | Strict TypeScript over the app, the settings page and the tests                            |
| `bun run --cwd apps/plane-thing test`      | The 103 unit tests below                                                                   |
| `bun run check`                           | Build, bundle, catalog generation and validation, and a version bump on any changed app    |

You can run the same things on your own computer. From the repository root:

```sh
bun install
bun run --cwd apps/plane-thing typecheck
bun run --cwd apps/plane-thing test
bun run check
```

## The unit tests

The tests live in `apps/plane-thing/src/tests/`. They cover the logic that has no screen code in it.

| File                    | Tests | What it covers                                                                                                  |
| ----------------------- | ----: | --------------------------------------------------------------------------------------------------------------- |
| `adsb.test.ts`          |    11 | Reading the flight services' replies, distance and bearing, ground vehicles, owner names, building request URLs |
| `airports.test.ts`      |    13 | Unpacking the real airport file, auto/country/world scoping, nearest airport, commercial-only for Arrivals       |
| `emergency-watch.test.ts` |  12 | The two-sightings rule, alert once, false-alarm cases, the watch list matching, the jump-to-Radar range         |
| `geo-units.test.ts`     |    13 | Distances, bearings, unit conversion, clock text in a time zone                                                  |
| `log-export.test.ts`    |    15 | One row per aircraft, saving in pieces, clearing, CSV columns and quoting, KML                                   |
| `manifest.test.ts`      |     6 | Every setting is declared, defaults are consistent, every choice has a label                                     |
| `parsers.test.ts`       |    17 | FAA status, routes, the three photo services, sister-aircraft selection, arrival estimates                       |
| `repo.test.ts`          |    16 | The whole data layer against a simulated platform: feeds, fallbacks, errors, saving and reloading the log        |

Some of the tests exist because of a specific mistake that was found while building:

- An airliner (the MD-90) was on the helicopter list. A test now checks it is not.
- The country list on the settings page once held countries with no airports. A test now compares it to the airport file.
- Spreadsheet programs run cells that start with `=`, `+`, `-` or `@` as formulas. A test checks that the exports defuse
  them, and that ordinary negative numbers are left alone.

## What "simulated" means here

Most tests answer the app's requests from a **simulated platform** (`src/sim/platform.ts`) using **fixtures**
(`src/sim/fixtures.ts`). A fixture is a reply written by hand in the format the real service is documented to use.

This proves the parsers handle those formats and that the app behaves correctly when a service is slow, fails, or returns
nothing. It does **not** prove that a live service still answers in that format today. If a service changes its replies, these
tests will keep passing while the app breaks. Only a real run can catch that.

Two groups of tests use real data and not fixtures: the airport tests read the shipped `airports.bin.gz` (so a bad rebuild of
the airport file is caught), and `geo-units.test.ts` checks distances against well-known city pairs.

## The simulator

`/sim.html` on the dev server runs the whole app at device size on made-up traffic. It can fake an emergency squawk, empty
skies, failing services and missing photos (options are in the [developer guide](developer-guide.md#get-started)). It is how
the screens, the flash, and the dial and button behavior were checked without a device.

Its pictures carry a "SIMULATED PICTURE" watermark. The five images in `apps/plane-thing/screenshots/` that appear in the
README were taken from the simulator with invented aircraft and are not photos of a real screen. The script that took them is
not part of the repository. They will be replaced with real captures from the device (`bun run shot plane-thing --replace`)
when testing is done.

The settings page was checked against a fake phone host that stands in for the companion app. That exercised the export
flow, but it is not the companion app.

## What has not been tested

- **Live services.** No automated test calls adsb.lol, airplanes.live, adsb.fi, Planespotters, airport-data.com, Wikimedia
  Commons or the FAA. Whether Planespotters accepts the app's requests at all is an [open question](data-sources.md).
- **The real device.** Rendering on the Car Thing's screen, the physical buttons and dial, the recessed button, touch,
  startup time, and how the app behaves when the device sleeps or another app is shown.
- **The phone.** Location sharing, the settings page inside the companion app, and the actual download or copy of an export.
- **Opening an export in other tools.** The CSV and KML have not been opened in a spotting logbook, a spreadsheet or a
  mapping program on a real computer.
- **Long runs.** Memory use and log growth over many hours of driving.
- **Accessibility and photosensitivity.** The emergency flash is slower than three flashes a second by design, but it has not
  been reviewed by anyone qualified.
- **Other devices and browsers.** The app targets the Car Thing's kiosk browser only.

## Reporting a result

If you try the app on a real Car Thing, please fill in the
[device test report](https://github.com/tomarlowe/plane-thing/issues/new?template=device_test_report.yml), even if
everything worked. A "worked for me on this setup" is useful.
