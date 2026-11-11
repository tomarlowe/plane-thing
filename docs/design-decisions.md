# Design decisions

Each entry says what was decided, why, what it costs, and who decided. "Thomas" is Thomas Marlowe, who owns and directs
the project. "Claude" is the AI assistant that wrote the code (see [how this was built](how-this-was-built.md)). Where
Claude proposed something and Thomas approved it, both are named. Decisions that are still open say so.

## Product

### 1. Aircraft only

- **Decision:** Plane Thing shows aircraft and nothing else. An earlier idea was a broader "sky and space" app.
- **Why:** a narrower app can be done well, and aircraft spotting has an established community, file habits and free live
  data. The goal Thomas described was "wardriving for Wi-Fi, but for planes".
- **Decided by:** Thomas.

### 2. Five screens, one per button

- **Decision:** Overhead (1), Radar (2), Watchlist (3), Spotter log (4, renamed Log & Photos in version 0.2.0) and Arrivals (the recessed button). The screen is
  a second or third display in a car, so each screen answers one question at a glance.
- **Why:** the Car Thing has four preset buttons and a mode button, and a kiosk shows one page at a time. Mapping one
  screen to each button keeps navigation to a single press.
- **Decided by:** Claude proposed the list of ideas and the layouts. Thomas picked the aircraft direction, asked for the
  spotter log and the arrivals screen, and approved mockups of all five screens before any code was written.

### 3. Spotter log with tail numbers and export

- **Decision:** the app keeps a log of every airborne aircraft that comes near, by tail number, and the log can be exported.
- **Why:** this is the "wardriving" part. Thomas asked that it save tail numbers and that the export work with what
  plane spotters already use.
- **How the export was chosen:** Claude researched spotting logbook and tool formats, found no single standard, and chose
  CSV with columns in the order common logbooks use, plus an optional KML file for maps. That order has not been tried in
  any particular spotting tool (see [the checklist](device-test-checklist.md)).
- **Decided by:** Thomas (the log, tail numbers, export); Claude (the formats).

### 4. Arrivals board for the nearest airport

- **Decision:** a last screen listing aircraft that look like they are about to land, with estimated times and origins.
- **Why:** Thomas drives for a ride-hailing service and spends time at airports, and wanted something like the arrivals
  screens of flight tracking apps.
- **Limit:** airline schedules are paid data, so this board cannot say whether a flight is on time. It estimates from
  position and speed and says "est." wherever it guesses. An optional schedule provider key was considered and not built.
- **Decided by:** Thomas (the screen); Claude (using only free data and being open about the estimates).

### 5. Photos, with fallbacks

- **Decision:** the Overhead screen shows a photo of the exact aircraft, and if none exists, a photo of another aircraft of
  the same airline and type, labelled with its tail number, then a photo of the type, then a drawn silhouette. Credit is
  always shown next to the photo.
- **Why:** Thomas asked for a photo with a fallback to a different tail number. Labelling each fallback keeps the screen
  from claiming a photo is of an aircraft it is not.
- **Cost:** photo terms are an open problem. See [data sources](data-sources.md) (Planespotters in particular).
- **Decided by:** Thomas (the idea); Claude (the order and labels).

### 6. Private airports included

- **Decision:** the airport list includes private strips, heliports and seaplane bases, and drops only closed airports.
- **Why:** Thomas asked for private airports. The side effect is that at some places the nearest "airport" on the Radar
  is a small heliport. The Radar chip can be tapped to step through the five nearest, and Arrivals uses only large and
  medium airports.
- **Decided by:** Thomas.

### 7. Airports are scoped, never the whole list at once

- **Decision:** the Airports setting is Auto (airports within 250 miles, rebuilt after moving 100 miles), one country, or
  the whole world. Nearest-airport lookups only touch the working set.
- **Why:** Thomas asked that the app should not need to look at the entire database at once. Auto is the default.
- **Decided by:** Thomas (the requirement); Claude (the modes and distances).

### 8. Emergency alert

- **Decision:** on any screen, an aircraft within 100 miles squawking 7500, 7600 or 7700 makes the screen flash
  "EMERGENCY" three times (about one second each, under three flashes a second), then jump to the Radar at the smallest
  range that shows it. A setting turns the jump off. There is no sound.
- **Safeguards:** a code must be seen on two updates at least 4 seconds apart; one alert per aircraft per emergency;
  any button press or touch ends the flash early.
- **Why:** pilots dial through codes on the way to the one they mean, and data can glitch, so one reading is not enough.
  The flash rate stays under the limit that is commonly used to avoid triggering photosensitive reactions.
- **Risk acknowledged:** a flashing screen can distract a driver. Claude raised this once and Thomas chose to proceed.
- **Decided by:** Thomas (the feature); Claude (the safeguards and flash timing).

### 9. Drones left out of version 1

- **Decision:** the Watchlist shows emergencies, helicopters and your own list. It does not show drones.
- **Why:** Thomas wanted drones included if possible. Claude researched the options, and no free source was confirmed to
  allow use in a free hobby app. Thomas sent an access inquiry to one provider, and no reply was on record in this project
  when version 1 was built. Thomas agreed to leave drones out of version 1.
- **Decided by:** Thomas.

## Data and privacy

### 10. Free data only, no accounts, no keys

- **Decision:** every service used is free and needs no account or key.
- **Why:** it was a rule of the project that nothing may cost money, and a key in a public app would be shared by every
  user.
- **Decided by:** Thomas (the rule).

### 11. Three aircraft data services, in order

- **Decision:** adsb.lol first, then airplanes.live, then adsb.fi. All three use the same data format, so one parser reads
  all of them. A failed service is skipped for a while, with a longer wait after each repeat. Requests to one host are at
  least 1.1 seconds apart.
- **Why:** each one offers free access and asks for modest use. Falling back keeps the app working when one is down, and
  the spacing keeps it inside their stated limits.
- **Decided by:** Claude.

### 12. OpenSky was removed

- **Decision:** an earlier draft used the OpenSky Network as a last resort. It was taken out.
- **Why:** its terms limit the REST API to non-profit research and education and require a written license for operational
  use. A driving app is operational use.
- **Decided by:** Claude, after re-reading the terms. Thomas was told.

### 13. The position is rounded before it leaves the device

- **Decision:** the position sent to flight services is rounded to two decimals, about 1 kilometer.
- **Why:** the service needs a search area, not an address. Distances on screen still use the exact position.
- **Decided by:** Claude, who first used four decimals (about 11 meters) and tightened it. Thomas was told.

### 14. The log leaves the device only as a file you save

- **Decision:** the log lives on the Car Thing. Export is built on the phone, in the settings page. Your own latitude and
  longitude are left out of the CSV unless you tick a box. The map file always includes them, because it draws where you
  stood.
- **Why:** the Car Thing cannot save a file, and a log of where someone drove is private.
- **Decided by:** Claude.

### 15. No photo links or photographer names in the log or export

- **Decision:** the log and the files made from it carry no photo data.
- **Why:** Planespotters' terms do not allow its data to be re-exported.
- **Decided by:** Claude. Thomas was told.

## Design and behavior

### 16. A self-drawn radar scope, not a map

- **Decision:** the Radar is drawn by the app as SVG, with five ranges (3, 6, 15, 50 and 100 miles). The dial changes
  range and a dial click switches to a distance-sorted list.
- **Why:** no map tiles means no extra data, no map service terms and a fast screen on small hardware.
- **Decided by:** Claude proposed; Thomas approved the mockup.

### 17. Visual style

- **Decision:** a black background with pastel containers and dark ink, in the style of Google's Material 3 Expressive,
  using the Roboto Flex font.
- **Why:** high contrast for a screen in a car, and the same look as Thomas's other Car Thing app.
- **Decided by:** Thomas asked for this look (colorful, friendly, modern, based on Google's recent design language) when
  building Dash Weather, and asked for this app to be built the same way. Claude applied it to the new screens and Thomas
  approved the mockups.

### 18. Only runs while it is on the screen

- **Decision:** the app logs and alerts only while it is the app on the Car Thing's screen.
- **Why:** that is how the bridgething platform runs webapps. It is a limit, not a choice, and the documentation says so.
- **Open question:** what happens to a running app when another one is shown has not been tested on a real device.

### 19. Units

- **Decision:** a Units setting with Imperial (miles, feet, knots), Aviation (nautical miles, feet, knots) and Metric
  (kilometers, meters, km/h). Speeds are knots except in Metric.
- **Why:** aircraft speeds are quoted in knots everywhere, so "mph" is not offered.
- **Decided by:** Claude.

### 20. Settings use a country code box

- **Decision:** the country setting is a two-letter code box with a lookup list on the phone page.
- **Why:** a picker with 247 countries made the settings page enormous.
- **Decided by:** Claude.

### 21. Back button left alone, dial click used only on Radar

- **Decision:** the app never reacts to the back button, and the dial click only matters on the Radar.
- **Why:** the back button is left free for actions that work across all bridgething apps.
- **Decided by:** Claude.
- **Superseded in version 0.2.0** by decision 26: the Back button now marks a plane on the Overhead screen. The dial click now
  also steps through the four views on Log & Photos and opens the highlighted plane in the Radar list.

## Project

### 22. Open source under the MIT license, documented in depth

- **Decision:** the code is MIT-licensed, hosted on GitHub, and documented with a user guide, troubleshooting, data source
  terms, a developer guide, architecture, a test checklist and this page.
- **Why:** Thomas wanted a thoroughly documented public repository. The data services have their own terms, and the
  documentation says where those limit what others can do.
- **Decided by:** Thomas.

### 23. The name

- **Decision:** the app is called Plane Thing. It started as "Dash Spotter" (chosen by Claude because two other names were
  taken), and Thomas renamed it before anything was published. The app's internal id did not change.
- **Decided by:** Thomas.

## Added in version 0.2.0

### 24. A look-here cue on Overhead

- **Decision:** a white card at the bottom of the right column says where to look from the car: an arrow on a small dial and
  the clock position in words ("11 o'clock", 12 being straight ahead), plus how high ("Low", "Mid" or "High" with an angle
  rounded to 5 degrees).
- **Why:** the Overhead screen said how far away a plane was, but not which way to turn your head.
- **How it works:** the clock position needs the phone's heading, and the app trusts that only while the car moves at about
  walking pace or faster, because a standing phone gives a meaningless heading. Otherwise the card says "North Is Up" and gives
  the compass direction. The height is the angle above the horizon from altitude and distance, and the split points are 30 and
  60 degrees.
- **Decided by:** Thomas asked for the cue, wanted both the arrow and the clock words, and chose the layout from mockups. Claude
  chose the arithmetic, the walking-pace rule and the fallback.

### 25. Open a plane from the Radar

- **Decision:** touching a plane on the Radar scope, or clicking the highlighted row in the list view, shows that plane on the
  Overhead screen, which follows it live. Button 1 returns to the closest plane.
- **Why:** the Radar shows everything nearby, and the Overhead screen has the photo and the detail, so the two should connect.
- **Decided by:** Thomas asked for it and approved the mockups. Claude chose the touch and dial behavior and the "Picked From
  Radar" heading.

### 26. Back marks a plane as Visually Verified

- **Decision:** on the Overhead screen the Back button marks the plane being shown as Visually Verified, meaning the owner
  saw it with his own eyes. A bar takes the place of the heading for about 3 seconds ("Visually Verified", "Already
  Marked" or "Nothing Overhead to Mark"), a small eye icon marks the plane afterwards, and the first time is kept. There is no
  undo on the device. The mark works on the Overhead screen only, including for a plane opened from the Radar. Marked planes
  are never dropped when the log trims old rows, and the CSV and KML carry the time. The photo on screen when the plane is
  marked is saved on the Car Thing with the mark; see [data sources](data-sources.md#photos) for what is saved and what the
  photo services' terms say.
- **Why:** the log recorded what the radio heard, not what a person saw. A button press is the quickest way to say "I saw
  that one" while driving.
- **Decided by:** Thomas asked for it, chose the Back button, chose the name Visually Verified (replacing "seen by eye"), and
  chose that it works on Overhead only. The first mockup had the bar floating over the heading and the cards, Thomas pointed that
  out, and Claude moved it into the heading's place.

### 27. Log & Photos with four selectable cards

- **Decision:** the Spotter log screen became Log & Photos. Its counters became four cards you can touch, or step through with
  the dial click: Aircraft Logged, Different Types, New Today and Visually Verified. The fourth shows the marked planes, one
  photo at a time. The tab is drawn wider than the others so the name fits.
- **Why:** the new photos needed a home, and the counters were already the natural way into the lists behind them.
- **Decided by:** Thomas chose the structure and the names. Claude drew the layouts and made the fit changes, such as the wider tab.

### 28. Title Case for every label

- **Decision:** every label and heading on the screens starts each word with a capital, except small words in the middle
  ("by", "to", "of"). Units and codes keep their own case ("mi", "ft", "N372DN").
- **Decided by:** Thomas asked for it across the whole app. Claude wrote the rule as a tested function so new labels follow it.

### 29. One release, without the Watchlist redesign

- **Decision:** version 0.2.0 contains the four changes above. A redesigned Watchlist that Thomas had been considering is not in
  it, and is undecided (see the [roadmap](roadmap.md)).
- **Decided by:** Thomas.
