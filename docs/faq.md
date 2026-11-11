# Frequently asked questions

## About the project

### Was this written by an AI?

An AI assistant (Claude, made by Anthropic) wrote the code, tests and documentation. Thomas Marlowe, who owns the project,
decided what to build, approved the designs, set the rules it follows, and is testing it on his own device. The page
[How this was built](how-this-was-built.md) says plainly who did what and what has not been reviewed by a human programmer.

### Does it work?

It has been built, type-checked and run in a simulator, and 165 unit tests pass. Its owner has also driven with version 0.1.0
on a real Car Thing for about a day and reports that it worked well, and he checked the main 0.2.0 features by hand on his
Car Thing on 2026-11-10. That is one person on one device: no automated test has talked to a live flight service, and most of
the [device test checklist](device-test-checklist.md) has not been worked through. See [testing](testing.md). Treat version
0.2.1 as an early release that may have rough edges. (It differs from 0.2.0 only in its store tagline.)

### Is it affiliated with Spotify, Anthropic, the FAA or any data service?

No. It is an independent hobby project. The Car Thing is a discontinued Spotify device, and Plane Thing runs on it through
the community [bridgething](https://bridgething.com) platform. Plane Thing does not read your Spotify account.

### What does it cost?

Nothing. It needs no account and no key, and the services it uses are free. Those services can change or limit access at any
time. See [data sources](data-sources.md).

## What it shows

### Where does the aircraft data come from?

From volunteer-run receivers that listen to the ADS-B signals aircraft broadcast, shared by adsb.lol, airplanes.live and
adsb.fi. The app asks them one at a time, in that order, and moves on if one fails.

### Why can't I see every aircraft?

Only aircraft that broadcast ADS-B, and that a volunteer receiver is in range of, can appear. Some aircraft are not
equipped, some switch the broadcast off, and some owners ask services to hide their aircraft. Coverage is thinner over oceans,
mountains and remote areas.

### What is the hex code?

Every aircraft transmitter has a fixed 24-bit address, written as six hex characters, such as `A1B2C3`. The log uses it as
the aircraft's identity, because tail numbers can be missing or change. The Overhead screen shows it when the aircraft's
registration is not known.

### The Arrivals screen says "est." Is that the real schedule?

No. Airline schedules are paid data and Plane Thing uses only free data. The board lists aircraft that look like they are
about to land, and estimates the time from their distance and speed. Origins come from a route lookup that can be wrong. It
cannot tell you whether a flight is on time. Use the airline's app for that. The FAA delay banner is real data but covers US
airports only.

### Why is the "nearest airport" a tiny heliport or private strip?

You asked for private airports to be included, so the Radar chip uses the nearest airport of any kind. Tap the chip to
step through the five nearest. Arrivals uses only large and medium airports, so the two screens can name different places.

### Why is the photo not of the plane overhead?

The Overhead screen tries the exact aircraft first. If no photo exists, it shows another aircraft of the same airline and
type and labels it with that aircraft's tail number, then a photo of the type, then a drawn silhouette. The label always says
which one you are seeing. Photos are credited to their photographers.

### What does the Back button do?

On the Overhead screen it marks the plane you are looking at as Visually Verified: you saw it with your own eyes. A bar
replaces the heading for about 3 seconds to say so. On the other screens it does nothing. See the
[user guide](user-guide.md#marking-a-plane-visually-verified).

### Where do the photos in Log & Photos come from, and are they stored?

When you mark a plane, the photo on screen at that moment is saved on your Car Thing, with the photographer and site credit, so
the Visually Verified view can show it later. It is one picture per plane, up to 60, and the oldest is deleted when a 61st is
saved. The photos never leave the Car Thing, are not in the CSV or KML, and clearing the log deletes them. See
[data sources](data-sources.md#photos) for the full picture.

### Why does the look-here card say "North Is Up"?

The clock position ("11 o'clock") needs to know which way the car is pointing. The phone reports that only while you are
moving at about walking pace or faster. When it has no usable heading the card gives the compass direction instead, with north
at the top, rather than guess.

### Why are there no drones?

Drones were considered. No free source was found that is confirmed to allow use in a free hobby app, so version 1 leaves them
out. See [roadmap](roadmap.md) and [design decisions](design-decisions.md).

### Does it work outside the United States?

Aircraft positions, the Radar, the Overhead screen and the log work worldwide, wherever the volunteer receivers reach.
Airports come from a worldwide list. The delay banner uses a US feed, so it only appears for US airports. Route estimates and
photos depend on each service's coverage.

## Using it

### Why do I need my phone?

The Car Thing has no internet connection or GPS of its own. The bridgething companion app on your phone gives it both over
Bluetooth, and shows the settings page where you export the log.

### Does it log while I am using another app?

No. Plane Thing only runs while it is the app on the Car Thing's screen. There is no background logging. Whether the app
keeps running while another one is shown has not been tested on a real device.

### How do I get my log out?

Open the Plane Thing settings in the companion app on your phone and scroll to "Spotter Log". Choose **Download CSV**,
**Copy CSV** or **Show text**, or the map file buttons for KML. The Car Thing itself cannot save a file. Whether the phone's
download and copy actions work inside the companion app has not been tested on a real device. See the
[user guide](user-guide.md#export-the-log).

### Will the CSV open in my logbook app?

Unknown. Plane spotting has no single standard file format. The CSV puts the tail number first, in an order common in
logbooks, and the KML opens in map programs. Neither has been tried in any specific spotting tool yet. If you try one, a
[report](https://github.com/tomarlowe/plane-thing/issues) would help.

### What happens when an aircraft squawks an emergency?

If it is within 100 miles and squawks 7500, 7600 or 7700 on two readings at least 4 seconds apart, the screen flashes
EMERGENCY three times and, unless you turn that off, jumps to the Radar. Any button press or touch stops the flash. It
alerts once per aircraft per emergency. There is no sound. Details are in the [user guide](user-guide.md#emergency-alert).

### Can I rely on the emergency alert?

No. The data can lag by seconds or minutes, can be missing, and sometimes contains wrong squawk codes. Plane Thing is a hobby
tool for curious people. Do not use it for aviation, navigation or safety decisions. A flashing screen can also distract a
driver, so do not look at it while driving, and turn the jump off in the settings if it bothers you.

## Development

### Can I fork it, or sell something built from it?

The code is MIT-licensed, so you can fork and change it. The data services have their own terms, and several say
personal or non-commercial use only. If you want to build something commercial, you need agreements with each provider. See
[data sources](data-sources.md#for-forks-and-commercial-use).

### Can I contribute?

Yes. See [CONTRIBUTING.md](../CONTRIBUTING.md). Bug reports, device test reports and documentation fixes are all welcome, as
are code reviews from people who read TypeScript.

### How do I report a security or privacy problem?

See [SECURITY.md](../SECURITY.md).

### Why was OpenSky removed?

An early draft used the OpenSky Network as a last resort. Its terms limit the free API to non-profit research and education
and require a license for operational use, which a driving app is. See [data sources](data-sources.md).
