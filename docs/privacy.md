# Privacy

Plane Thing needs to know roughly where you are, because "overhead" means nothing without it. This page lists exactly what
leaves your devices, what is saved, and what is never collected.

**In short:** there is no account, no analytics, no tracking, and nothing is sent to the author. Your location goes to flight
data services as coordinates rounded to about 1 kilometer. The spotter log stays on your Car Thing until you choose to export
it.

## What leaves your devices

Everything below goes out through your phone's internet connection, using the bridgething companion app.

| To whom                                                    | What they get                                                                                          | Why                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| adsb.lol, airplanes.live or adsb.fi (whichever answers)    | Your latitude and longitude rounded to two decimals (about 1 km) and a search radius                    | To find aircraft near you            |
| The same services, for emergencies                         | A request for aircraft squawking 7500, 7600 or 7700. No position is sent                                | To find emergencies within 100 miles |
| adsb.lol (route lookup)                                    | The callsigns and positions of nearby **aircraft** (not you)                                            | To estimate routes                   |
| Planespotters.net, airport-data.com, Wikimedia Commons     | An aircraft's hex code, tail number or type. Never your position                                        | To show photos                       |
| FAA (nasstatus.faa.gov)                                    | A request for the national airport status list. No position is sent                                     | To show delay banners                |

Two caveats:

- **Every web request exposes your phone's internet address (IP address)** to the service it goes to, as it would for any
  website. That address usually points to your mobile carrier or home provider and can indicate a city. Plane Thing cannot
  prevent that.
- **The route lookup sends aircraft positions.** Those are public aircraft, not you, but a list of aircraft within the search
  radius (20 to 100 nautical miles, depending on the radar range) does say roughly where you are. The route chip cannot
  currently be turned off separately.

The app identifies itself to these services as `PlaneThing/0.1` with a link to this repository. It does not send your name,
email address, device name or any identifier of its own.

## What is saved, and where

On the Car Thing:

- **The spotter log.** One row per aircraft: tail number, hex code, type, airline, the closest pass, the highest altitude,
  times, and where you were when it passed, rounded to about 1 kilometer, with the nearest airport's name. Up to 12,000 rows.
- **Photos of planes you marked as Visually Verified.** When you press Back on the Overhead screen, the photo on screen is
  saved with its photographer and site credit, one per plane, up to 60. They are shown only on the Log & Photos screen, never
  leave the Car Thing and are not in an export. This was added in version 0.2.0.
- **Your last known position,** at full precision, so the app can start with a position before the phone answers.
- **Your settings,** which the companion app also holds.

Nothing is saved on any server run by the author, because there is none.

If you would rather not share your phone's location at all, set **Location** to **Fixed place** in the settings and enter
coordinates. The app then uses those, and the phone's location is not read for the search.

On your phone, the companion app keeps the settings and the settings page. The export file exists only if you download or copy
it.

## What an export contains

- The **CSV** has the aircraft columns and, if you tick "Add my position", your rounded position. By default it does not.
- The **KML** map file always includes your rounded position, because it draws where you stood when you saw each aircraft.
- Neither file carries photo links or photographer names.

An export is a record of where you drove and when. Think before you post or send one. A single sighting reveals little, but
a month of them reveals a routine, and a position at 1 km can still be a street or a home.

## Clearing it

On the phone, open the Plane Thing settings and choose **Clear the log**. The Car Thing's copy empties, too, including the
saved photos. Whether
uninstalling the app also removes its saved data has not been tested.

## What is never collected

Plane Thing has no analytics, advertising, crash reporting, account system or telemetry. It does not read your Spotify
account, contacts, messages or anything else on your phone. It asks the companion app for your location, and the only permission
it declares in `manifest.json` is location (`geo`).

## The services have their own policies

Once a request reaches adsb.lol, airplanes.live, adsb.fi, Planespotters, airport-data.com, Wikimedia or the FAA, what
they do with it is up to them. Their terms, as read on 4 November 2026, are summarized in [data sources](data-sources.md).
This page describes what Plane Thing sends, not what they keep.

## Questions and concerns

Open an issue, or for something sensitive follow [SECURITY.md](../SECURITY.md).
