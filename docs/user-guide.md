# User guide

Plane Thing is not for navigation or safety. Positions can be late, wrong or missing, and arrival times are estimates.

## Controls

| Control               | What it does                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Buttons 1, 2, 3, 4    | Overhead, Radar, Watchlist, Spotter log                                                            |
| Small recessed button | Arrivals                                                                                           |
| Dial turn             | Radar: zoom (clockwise zooms in) or scroll the list. Spotter log: scroll. Arrivals: next airport   |
| Dial click            | Radar: switch between the scope and the list. Does nothing on the other screens                    |
| Back button           | Not used by this app                                                                               |
| Touch                 | Tap a pill along the top to switch screens. Tap the airport chip on Radar for the next airport, or the airport name on Arrivals. A touch during the emergency flash cuts it short |

The back button is left alone on purpose, so it stays free for actions that work across all your bridgething apps.

A quick tap of the recessed button opens Arrivals. Bridgething also uses that button to jump to its own dashboard. Which
gesture does it is a bridgething setting (a long press, five quick presses or a double press), not part of this app.

Plane Thing only runs while it is on the Car Thing's screen. It does not watch the sky or log aircraft in the background.

## Screens

### 1. Overhead (button 1)

The closest airborne aircraft within 10 miles of you, in large type.

- Airline, tail number (registration) and callsign. When the data does not know the tail number the chip shows the
  aircraft's six-character hex code instead, and an unknown airline reads "Operator unknown".
- The aircraft type, such as "Airbus A321".
- An estimated route chip, such as "ATL to LGA, est.". Airlines change flights, so this is always a guess from the
  callsign. When the lookup has no answer the chip is not shown.
- Altitude with a climb or descend arrow, ground speed, heading as an arrow and a compass point, and distance with the
  direction from you.
- A photo with the photographer and the photo site credited under it. If the exact aircraft has no photo it shows another
  aircraft of the same airline and type and says "Photo shows" with that tail number. If there is none it shows a photo of
  that type and says "Typical" (not this aircraft). If there is no photo at all it draws a silhouette.

When nothing is within 10 miles the screen says "No aircraft within 10 mi" (in your units), shows how far the nearest
aircraft is and a small scope. If the wider search finds nothing within 100 miles it says so and keeps checking.

### 2. Radar (button 2)

A scope with you in the middle. Aircraft are blue, helicopters peach, watched aircraft yellow and emergencies salmon. Each
aircraft is drawn as a small plane pointing the way it is flying. The footer reads "Not for navigation or safety" and the
name of the data service in use. There is a legend for the colors and a north-east-south-west compass ring.

- **Range:** turn the dial. The ranges are 3, 6, 15, 50 and 100 miles (or the same distances in your units). It starts
  at 15 miles. Clockwise zooms in.
- **List:** click the dial to switch to a list sorted by distance, and click again to go back. Turn the dial to scroll.
  On the touch screen, tap the "Click dial for list" button to open the list and the back button on the list to close it.
  The ranges shown are the same distances in your units (the 15 mile range reads 24 km in metric).
- **Airport:** the nearest airport of any kind is drawn as a white rounded square with its code on a chip. Tap the chip to
  look at the next nearest, through the five nearest. An airport farther than the range sits on the rim of the scope.
- **Emergency:** an emergency aircraft gets a salmon ring, a label with its squawk code and a salmon banner (see
  "Emergency alert" below).

At your home airport you may see a small private heliport or airstrip first, because the chip uses the nearest airport of
any kind. Tap the chip to move to the next.

### 3. Watchlist (button 3)

Three cards:

- **Emergency squawk:** any aircraft within 100 miles showing 7500 (hijack), 7600 (radio failure) or 7700 (general
  emergency). An emergency stays listed for about three minutes after it was last heard.
- **Helicopter:** the nearest helicopter.
- **On your list:** the nearest aircraft that matches something in the Watch list setting.

Below them are chips for the entries on your list. When a card has nothing to show it says so ("No emergency squawks",
"No helicopters", "Nothing on your list"). Drones are not shown in this version.

### 4. Spotter log (button 4)

The log is a running record of every airborne aircraft that came within your logging distance (10 miles unless you change
it). Each aircraft is logged once, by its unique hex code, and updated on later passes.

- Three counters: Aircraft logged, Different types, New today.
- Recent sightings, newest first, four at a time. Turn the dial to scroll. Each row shows the tail number, type and
  operator, the closest pass, when it was first seen, how many times it has been seen and a NEW badge for aircraft first
  logged today.
- An aircraft that leaves range for 15 minutes and comes back counts as another visit.
- The log keeps up to 12,000 aircraft. After that it drops the oldest.
- The Car Thing has no way to save a file. Tapping Export CSV on the screen only reminds you that export happens on the
  phone. See "Export the log" below.

### 5. Arrivals (recessed button)

An arrivals board for the nearest large or medium airport, such as "Arriving at TEB". It lists aircraft that are within about
45 miles and look like they are landing, soonest first, up to six at a time. Helicopters and aircraft that are just
passing over at cruising height are left out.

- ETA, flight (callsign), origin (an estimate, shown with "est."), distance and altitude, and a status chip that reads
  Inbound, Descending, Approach or Final approach.
- An FAA banner when the FAA reports a delay, ground stop or closure at that airport.
- Turn the dial or tap the airport name to move to the next of the five nearest large and medium airports.

Times and origins are estimates from position and speed. Plane Thing does not have airline schedules, so it cannot say
whether a flight is on time or late. For a flight you are meeting, use the airline or an airport flight board.

## Emergency alert

If an aircraft within 100 miles squawks 7500, 7600 or 7700, on any screen:

1. The screen flashes EMERGENCY three times, about one second each.
2. It then jumps to the Radar, zoomed to the smallest range that shows the aircraft, with a salmon banner.
3. On the other screens an emergency strip with "Tap for radar" stays on the screen after the flash.

Details:

- The radius is fixed at 100 miles. It is not a setting.
- A squawk must be seen on two updates at least 4 seconds apart, because pilots dial through codes on the way to the one
  they mean and bad data happens. You are alerted once per aircraft per emergency.
- Any button press or touch during the flash ends it early (and does nothing else).
- The "Jump to the radar on an emergency" setting turns off the automatic jump. The flash still happens.
- There is no sound. The alert only works while the app is on the screen.
- A flashing screen can distract a driver. Use your judgment and do not look at the screen while driving.

## Export the log

Export happens on the phone, in the app's settings page.

1. On the phone, open the bridgething companion app and open Plane Thing's settings.
2. Scroll to "Spotter log". It reads the log from the Car Thing and says how many aircraft it holds.
3. Choose **Download CSV** to save a file, **Copy CSV** to copy the text, or **Show text** to see it. If a download does
   not appear in your phone's downloads, use Copy or Show text.
4. For a map file (KML) use **Download map file** or **Copy KML**. A map file puts each sighting where you stood, so it
   always includes your position.

The CSV columns are Registration, Aircraft Type, Airline, Serial Number (left blank), Date and Time Seen, Place (the
nearest airport), Notes, then Callsign, ICAO Type Code, Closest Distance, Bearing at Closest, Highest Altitude, Times
Seen, ICAO Hex and Source. The tail number comes first because that is the order plane spotting tools and logbooks tend to
use. This order was chosen from research and has not been tried in any particular spotting tool. Distances in the file are
always in miles and altitudes in feet, whatever the Units setting. Your own latitude and longitude are left out unless you
tick "Add my position". Times use your phone's time zone.

The log stays on your Car Thing and nowhere else. The file is made on your phone and goes only where you send it. The log
and its export do not contain photo links or photographer names, because the photo sites do not allow re-use of their
data.

**Clear the log** deletes every sighting on the Car Thing. It asks you to tap twice and cannot be undone, so export first.

Whether the phone's download, copy and share actions work inside the companion app has not been tested on a real device.

## Settings

Open the app's settings from the bridgething companion app.

| Setting                          | Choices                                | Default               | What it does                                                                      |
| -------------------------------- | -------------------------------------- | --------------------- | --------------------------------------------------------------------------------- |
| Units                            | Imperial, Aviation, Metric             | Imperial              | Imperial is miles, feet and knots. Aviation is nautical miles, feet and knots. Metric is kilometers, meters and km/h |
| Clock                            | 12-hour, 24-hour                       | 12-hour               | How times are shown                                                               |
| Location                         | Follow my phone, Fixed place           | Follow my phone       | Follow uses the phone's GPS. Fixed always uses the coordinates below              |
| Fixed latitude / longitude       | numbers                                | 0                     | Used only with Fixed place. Example: 40.6413 and -73.7781                         |
| Airports                         | Auto, Pick a country, Whole world      | Auto                  | Auto uses only airports within 250 miles of you and reloads after you move 100 miles. A country uses that country's airports. Whole world uses them all |
| Country code                     | two letters, such as US, GB, DE, JP    | empty                 | Used only when Airports is Pick a country. The "Country codes" list on the settings page has them all |
| Log distance (miles)             | 1 to 50                                | 10                    | An aircraft is logged when it comes this close. Always in miles, whatever the Units setting |
| Watch list                       | text                                   | empty                 | See below                                                                         |
| Jump to the radar on an emergency | on, off                               | on                    | Whether the Radar takes over after the flash                                      |
| Reverse the dial                 | on, off                                | off                   | Flips the zoom and scroll direction                                               |

Changes take effect without restarting the app.

### The watch list

Separate entries with commas, spaces or semicolons. Up to 24 entries of two or more characters. An entry matches an
aircraft when it is:

- its tail number (with or without dashes, so G-ABCD and GABCD both work, as does N123AB)
- its hex code (six characters, such as AE01CE)
- its exact type code, such as A388 or B748
- the start of its callsign, at least three characters, such as DAL for every Delta flight or UAL22 for UAL2210
- the word MIL, which matches any aircraft the data marks as military

Example: `N123AB, DAL, A388, MIL`

### Which airports are loaded

The airport list comes from OurAirports. It includes large, medium and small airports, private airstrips and heliports,
and seaplane bases. Closed airports are dropped. Heliports and small private strips are kept on purpose, so at some
places the nearest "airport" on the Radar is a rooftop helipad. Arrivals uses only large and medium airports.

## How fresh the data is

| Data                      | Refreshed about every                                    |
| ------------------------- | -------------------------------------------------------- |
| Aircraft near you         | 6 seconds                                                |
| Your position             | 8 seconds                                                |
| Emergency squawk search   | 25 seconds, within 100 miles                             |
| Arrivals                  | 10 seconds                                               |
| FAA delay status          | 5 minutes                                                |
| Photo lookups             | each photo is kept for 30 minutes while the app is open  |

The top bar of the Overhead screen reads "Data: adsb.lol · 4 s ago", with the name of the service that answered. If the
phone cannot be reached the screens keep the last data and say "Offline. Showing 4:12 PM". The app keeps trying and
recovers by itself. Aircraft that have not been
heard for 60 seconds are dropped from the screens.
