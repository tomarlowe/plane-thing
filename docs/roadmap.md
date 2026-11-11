# Roadmap

This is a list of things the project might do, not promises. Plane Thing is a hobby project run by one person with an AI
assistant, and the order, or whether anything happens, depends on what real-device testing turns up and on what the data
services allow. Things marked **blocked** need something outside the project first.

## Before anything else: prove version 0.2.0

Version 0.1.0 was driven with for about a day, which went well, and the 0.2.0 features were checked by hand on a real Car Thing
on 2026-11-10 (see the test log in the [checklist](device-test-checklist.md)). Most of the rest is still untested. The first job
is to work through the checklist on a real Car Thing and a real phone, over several days of real driving.

- [ ] Run the checklist and record the results in it.
- [ ] Fix whatever the real services and the real device show up. Expect surprises: the service replies in the tests were
      written from documentation.
- [ ] Replace the simulator pictures in the README and store listing with real captures (`bun run shot plane-thing --replace`).
- [ ] Open a real CSV in a spreadsheet and a real KML in a map program, and in at least one plane spotter's logbook if one
      accepts imports. Adjust the columns if needed.

## Open problems

- **Photo terms.** Planespotters.net restricts how its photos may be used and requires requests from a browser to carry the
  site's origin. Plane Thing's use may not meet that. Options: get written permission (blocked on a reply), turn Planespotters
  off by default, or replace it. See [data sources](data-sources.md#planespottersnet).
- **Saved pictures.** Since 0.2.0 the picture of a plane marked Visually Verified is saved on the Car Thing.
- **airport-data.com and Wikimedia Commons** terms are unclear or unread. Needs reading and a decision.
- **FAA status feed** terms were not found. The banner is a small feature and could be removed if that stays unclear.
- **The route lookup** sends nearby aircraft positions to adsb.lol and has no off switch. A setting to disable it would be
  easy to add.

## Ideas

Roughly in order of how likely they seem, not a schedule.

- **Tap to open from the Watchlist.** Touching any of the three Watchlist cards (Emergency, Helicopter, On Your List) would open
  that aircraft on the Overhead screen with its photo, the way a plane touched on the Radar does now. Asked for by the owner.
- **Tap any tail number to open a screen about that aircraft.** For an aircraft that is not nearby, the screen would be built
  from what the log remembers plus a fetched photo, and labelled "Not Overhead Now". Asked for by the owner.
- **A redesigned Watchlist** as a dial-scrollable list of callsigns with last-seen times. The owner set this aside to think
  about it, so it is undecided.
- **A setting to turn photos or routes off,** for people who want fewer outside requests. (A suggestion from the assistant,
  not yet discussed with the owner.)
- **Optional airline schedule data.** Arrivals could show real scheduled times and delays if a person supplies their own
  key for a provider that allows it. Not built, because the project must work with no account. **Blocked** on choosing a
  provider whose free terms allow it.
- **Drones.** Larger drones in some regions broadcast their position. A Watchlist card for them was wanted for version 1 but
  no free source confirmed to allow this use was found. An access inquiry was sent, and no reply was on record when version 1 was built. **Blocked.**
- **A sound for emergencies.** The bridgething SDK can play audio. Nothing is built, and a sound in a car raises its own
  questions. Would be off by default.
- **More export formats,** if a spotting community tool is found that accepts imports.

## Not planned

- Anything that needs an account, a paid plan or a key stored in the app.
- Tracking, analytics or any server run by the project.
- Using a service whose terms prohibit what the app does (OpenSky was removed for this reason).
- Use for aviation, navigation or safety purposes. This is a hobby display.

## How to influence this

Open an [issue](https://github.com/tomarlowe/plane-thing/issues) with what you would use. Test reports from real devices
are the most useful thing right now.
