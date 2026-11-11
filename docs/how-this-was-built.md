# How this was built

Plane Thing was built with an AI assistant. This page says what that means: who did what, how the work was checked, and
what has not been checked. It is meant to be read before you decide how far to trust the code.

**In short:** Thomas Marlowe set the goals, made the product decisions, approved the designs, and owns and tests the
project. Claude, Anthropic's AI assistant, wrote the code, the tests, the documentation and the icon, and did the research
behind the technical choices. Early commits carry a `Co-Authored-By: Claude` line. Later commits do not, because Claude is
credited as a tool in these docs and not as an author.

## Who did what

| Thomas Marlowe (owner and director)                                                              | Claude (AI assistant)                                                                |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Chose to build a second Car Thing app and the aircraft-only direction                             | Proposed app ideas and the five-screen plan                                          |
| Described the audience and the use: a second or third screen in a car, for geeks, "wardriving for planes" | Researched the free aircraft data services and read their terms                |
| Asked for a spotter log that saves tail numbers and exports to what spotters use                  | Researched spotting logbook formats and chose the CSV and KML layouts                |
| Asked for an Arrivals screen, because he drives for a ride-hailing service and spends time at airports | Found a free way to estimate arrivals and said plainly what it cannot do        |
| Asked for photos with a fallback to another tail number of the same type                          | Designed the photo fallback chain and its labels                                     |
| Asked for private airports, and for the airport list to be narrowed by country or location        | Built the airport data, the three modes and the nearest-airport logic                |
| Asked for the Radar to show the nearest airport, and for the emergency flash and jump             | Built both, and added the safeguards against false alarms                            |
| Looked into drone data, then decided to leave drones out of version 1                             | Researched drone data sources and explained the limits                               |
| Set the rule that nothing may cost money and that Claude should make the technical choices        | Wrote all the code, tests, documentation and the icon                                |
| Reviewed and approved mockups of the five screens before any code was written                     | Made the mockups                                                                     |
| Named the app (Plane Thing)                                                                       | Suggested the first name, which was replaced                                         |
| Installs and tests the app on his own Car Thing and phone                                         | Wrote the test checklist and the unit tests                                          |
| Asked for a look-here cue on Overhead, shown as an arrow and as clock-position words              | Worked out the clock and height arithmetic and built the card                        |
| Asked to open a plane from the Radar by touch or the dial                                         | Built it, and the Overhead screen that follows the chosen plane                      |
| Asked for a button press to mark a plane he saw with his own eyes, and chose the name Visually Verified | Built the marking, the export column and the Log & Photos screen with its four cards |
| Asked for every label in the app to be in Title Case                                              | Changed every label and wrote the rule as a tested function                          |
| Chose one release for these changes and left the Watchlist redesign out                           | Wrote the changelog and updated these docs                                           |
| Decides what gets published and when                                                              | Set up the build and release process                                                 |

[Design decisions](design-decisions.md) records, for each choice, who made it and why.

## How the work went

1. **Ideas and research.** Claude proposed ideas and checked what data was available for free. Thomas picked a direction.
2. **Decisions.** Thomas answered questions one at a time about scope: the screens, the log, arrivals, photos, airports,
   drones and the emergency alert.
3. **Mockups.** Claude made pictures of all five screens. Thomas reviewed them and asked for changes before approving.
4. **Build.** After the screens were approved, Thomas asked Claude to work on its own unless something needed him, within
   the rule that nothing may cost money. Claude wrote the app.
5. **Tests.** Claude wrote unit tests and ran the app in a simulator (see [testing](testing.md)).
6. **Documentation.** Claude wrote the documentation set, and re-checked the terms of every data service it uses.
7. **Real device.** Thomas installed version 0.1.0 on his own Car Thing and drove with it for about a day, which went well.
   On 2026-11-10 he installed the 0.2.0 build and checked the new features by hand (see the [test log](device-test-checklist.md)).
   Further testing is in progress.
8. **Publishing.** Thomas decides when the repository becomes public and whether the app is listed in the bridgething store.

## What this means for how far to trust it

What has been checked:

- The code compiles under strict TypeScript, the build produces a valid bridgething catalog, and 165 unit tests pass.
- Every screen was rendered in a simulator with made-up data, and Thomas reviewed mockups of the screens before the
  build. Six README and store pictures are real captures Thomas took from his Car Thing; the two simulator pictures left in the
  README are not photos of the real device, and the README says so.
- The data services' public terms were read, and the app changed to respect them (OpenSky was removed, request spacing
  was added, the position sent was made less precise).

What has not been checked, and the documentation says so wherever it matters:

- **No human programmer has reviewed the code line by line.** Thomas reviews behavior, screens and documentation, and
  tests on a device. If you read TypeScript, a review is welcome.
- **The live services have not been called by the tests.** Every service reply in the tests is a made-up fixture written
  from documentation and memory. The first real replies are now being seen on the device.
- **Most of the device behavior is unconfirmed.** One day of real driving with 0.1.0 and a short hands-on check of the 0.2.0
  features have been reported, but the [checklist](device-test-checklist.md) has not been worked through.
- **Pressing Back before the photo has loaded** is meant to save the photo when it arrives. That path has not been seen working
  on a real device, and how many saved photos the Car Thing can hold has not been measured.
- The photo services' terms are not fully satisfied. See [data sources](data-sources.md).

AI assistants make mistakes, including confident ones. A few found and fixed while building this:

- An airliner (the MD-90) had been put on the helicopter list.
- A country picker with about 250 buttons made the settings page roughly 2,000 pixels tall (an estimate), so it was
  replaced by a code box with a lookup list.
- An aircraft data service had been added whose terms do not allow this kind of app.
- Two countries in the picker had no airports at all.
- The position sent to the data services was precise to about 11 meters when about 1 kilometer was enough.

Found while building 0.2.0:

- The "Visually Verified" message first floated over the Overhead heading and the top of the cards. The owner pointed it out in
  the mockups, and it now takes the place of the heading.
- A details card on the photo screen ran about 20 pixels too tall in a simulated screenshot and hid the page dots.
- In the first real-device test of the photo view, a plane marked straight away showed "No Photo Saved". A retest on a plane
  whose photo had already loaded worked. Whether the first case was a bug or simply a plane without a photo has not been
  determined.

Those were caught by re-reading, by tests written to catch them, or by checking the output. Others will exist. Please
[open an issue](https://github.com/tomarlowe/plane-thing/issues) if you find one.

## Tools

- Claude (Anthropic), used through Claude Code. The trailers on the early commits name the model.
- The project is built on [bridgething](https://bridgething.com), React, Vite, TypeScript and Bun. See
  [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
- Aircraft positions, photos, airports and delays come from the services in [data sources](data-sources.md).

## Contributing

Human and AI-assisted contributions are both welcome. See [CONTRIBUTING.md](../CONTRIBUTING.md). Please say in the pull
request if an AI assistant wrote part of it, and say how you checked it.
