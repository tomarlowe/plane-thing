# Data sources, credits and terms

Dash Spotter uses free online services. None needs an account or an API key. The phone's internet connection makes every
request. Terms below were last checked on 2026-11-04 by reading each service's public pages. Services change their terms,
and some pages could not be read (noted below), so read the linked pages yourself if you plan to do anything beyond
personal or community use. Nothing here is legal advice.

| What                      | Service                  | Host                          | Refreshed                                   |
| ------------------------- | ------------------------ | ----------------------------- | ------------------------------------------- |
| Aircraft near you         | adsb.lol (first choice)  | api.adsb.lol                  | about every 6 seconds                       |
| Aircraft near you, backup | airplanes.live           | api.airplanes.live            | only if adsb.lol fails                      |
| Aircraft near you, backup | adsb.fi                  | opendata.adsb.fi              | only if both others fail                    |
| Emergency squawk search   | the same three services  | same hosts                    | about every 25 seconds                      |
| Estimated route           | adsb.lol route service   | api.adsb.lol                  | once per airline callsign seen              |
| Photo of the aircraft     | Planespotters.net        | api.planespotters.net         | when an aircraft is on the Overhead screen  |
| Photo, second try         | airport-data.com         | airport-data.com              | when Planespotters has none                 |
| Photo of the type         | Wikimedia Commons        | commons.wikimedia.org         | when no aircraft photo exists               |
| Airport delays            | FAA NAS status           | nasstatus.faa.gov             | every 5 minutes, on the Arrivals screen     |
| Airports                  | OurAirports              | none (ships inside the app)   | updated when the app is rebuilt             |

Everything else (distances, bearings, the log, arrival estimates) is calculated on the device.

## Important limits of the data

- ADS-B positions are broadcast by the aircraft and collected by volunteers' receivers. They can be late, wrong, missing,
  or withheld. Some aircraft (including some military and government flights) are not shown, and some owners can ask for
  their aircraft to be hidden.
- Routes are guesses from the callsign, and arrival times are worked out from position and speed. Neither comes from an
  airline schedule.
- **Dash Spotter is not for navigation or safety.** It says so on the Radar screen and on the settings page.

## Live aircraft data

All three services share the same data format (the one used by the readsb software), so the app reads them the same way.
It asks adsb.lol first and moves on to the next service when one fails, then waits longer before using the failed one
again. The app spaces its requests to any one of these hosts at least 1.1 seconds apart.

### adsb.lol

- Terms: the data is shared under the Open Database License 1.0 (ODbL). Keep the credit, and if you build a database from
  it, the share-alike rules apply. See [adsb.lol](https://adsb.lol/).
- A numeric request limit was not recorded in this review. Dash Spotter asks about every 6 seconds.
- Credit shown: the settings page, this page and the README. The service name that answered is shown on the Overhead
  and Radar screens.

### airplanes.live

- Terms: free for non-commercial use, at no more than about one request per second. See
  [airplanes.live](https://airplanes.live/).
- Credit shown: the settings page, this page and the README, and the service name on the screens when it answers.

### adsb.fi

- Terms: the open data API is for personal, non-commercial use, with a limit of about one request per second, and it asks
  users to credit and link [adsb.fi](https://adsb.fi/). Repeated failed requests can count as abuse, so Dash Spotter backs
  off after a failure instead of retrying quickly.
- Credit shown: a link to adsb.fi on the settings page, in this page and in the README, and the name on the screens when it
  answers.

### What they receive

The services receive your latitude and longitude rounded to two decimals, about 1 kilometer, and a search radius. They
also see the phone's IP address like any website would, and the app's User-Agent, which names Dash Spotter and its GitHub
page. The emergency search asks for squawk codes only and sends no position.

### Not used: OpenSky Network

An earlier draft of Dash Spotter listed the OpenSky Network as a last resort. It was removed. The OpenSky Network's terms
limit its REST API to non-profit research and education and require a written license for operational use, which a
driving app is. The three services above are used instead.

## Estimated routes

- Used for: the route chip on Overhead ("ATL to LGA, est.") and the origin on Arrivals.
- Source: adsb.lol's route lookup. The app sends callsigns and each aircraft's position, not yours. Only airline-style
  callsigns are sent.
- The shape of this service's reply was written from documentation and memory and has not been checked against a live
  reply. When the reply is not understood the app shows no route ("Origin unknown" on Arrivals).

## Photos

Photos are fetched one at a time over the phone, kept in memory only (at most eight pictures), and thrown away when the
app closes. Dash Spotter never saves, uploads or re-publishes a photo, and the spotter log and the CSV carry no photo
link or photographer name. The photographer and the site are credited under every photo.

The app tries, in order: this aircraft (Planespotters by hex code, then by tail number, then airport-data.com), another
aircraft of the same airline and type from the aircraft in the current list (labelled "Photo shows N123AB"), a photo of
the type from Wikimedia Commons (labelled "Typical ..., not this aircraft"), and finally a drawn silhouette.

### Planespotters.net

- Used for: photos of the exact aircraft, looked up by hex code and then tail number.
- Terms (from its public API page, read 2026-11-04): each photo must credit the photographer in text visible next to the
  image. The thumbnail must link to the photo's page with a plain anchor. API replies may be cached for up to 24 hours,
  but image files may not be cached or re-hosted, and images must load in the end user's browser from the addresses the
  API returns, unchanged. Server-side programs must send a unique, descriptive User-Agent with a contact URL. Browser
  requests must come from a web page that sends a valid Origin or Referer header, and requests without one are rejected.
  Use must stay within reasonable limits, and the page asks projects with advanced use to contact Planespotters first.
- What Dash Spotter does: it shows the photographer and "Planespotters.net" next to each photo, puts the photo-page link
  in the credit, sends a User-Agent that names Dash Spotter and its GitHub page, keeps API replies in memory for one hour,
  asks for one photo at a time, and never saves or republishes a photo or puts it in the log.
- **Open issues, not resolved.** The Car Thing has no direct internet access, so Dash Spotter asks the phone's bridgething
  connection to fetch each image and turns it into a picture held in memory (at most eight). That is not the same as the
  picture loading in the user's own browser from Planespotters' address, so it may not meet the terms. The kiosk cannot
  open the credit link, so nobody can follow it. The phone's relay probably sends no Origin or Referer header, so
  Planespotters may refuse the requests, and in that case the app silently moves on to the other photo sources. Dash
  Spotter has not been given written permission for any of this and has not been tested against the live service.
- What to do: ask Planespotters for permission, describing the project and this limit. If they decline, or before listing
  the app publicly without an answer, a new version should drop Planespotters and use only the other photo sources.

### airport-data.com

- Used for: a second try at a photo of the exact aircraft.
- Terms: the site's terms for its aircraft picture lookup were not clear in this review. Forum posts mention a limit
  around 120 requests an hour for the whole service. Dash Spotter asks only after Planespotters has no picture, one at a
  time. The photographer and "airport-data.com" are credited under the photo. Treat it as unconfirmed.

### Wikimedia Commons

- Used for: a typical photo of the aircraft type when no photo of a real aircraft is found.
- Terms: each file has its own license. Dash Spotter shows the artist and the license text with the photo. The Wikimedia
  reuse guidelines page could not be read during this review, so the way credit is shown here has not been checked against
  them.

## Airports

- Source: [OurAirports](https://ourairports.com/data/), which releases its data into the public domain. A processed copy
  (type, code, name, position, country) ships inside the app, about 1.5 MB compressed. Closed airports are dropped.
  Private airstrips, heliports and seaplane bases are kept.
- Your Airports setting controls how much of it the app uses: Auto (within 250 miles of you), one country, or the whole
  world.
- No data about airports is fetched at run time and no position is sent anywhere for it.

## FAA delay status

- Used for: the delay banner on the Arrivals screen.
- Source: the FAA's National Airspace System status feed at nasstatus.faa.gov (XML). No usage terms were found for this
  feed in this review. The request carries no position.
- The feed covers US airports, so airports elsewhere do not get a banner.

## Privacy summary

- No account, no analytics, no tracking, no messages to the author.
- Your phone's location leaves the device only as coordinates rounded to about 1 kilometer, sent to the aircraft data
  services above.
- Photo services see an aircraft's hex code or tail number, never your position.
- A little data is saved on the Car Thing: the spotter log, your last position, and the airport list in use. The log
  never leaves the Car Thing except when you export it from the settings page on your phone, and then it goes only where
  you send it. Observer coordinates are in the exported CSV only if you turn that on, and always in the KML map file.
- Each log row records where you were, rounded to about 1 kilometer (two decimals), and the name of the nearest airport.
  That is what the KML map file draws, and the CSV includes it only if you tick "Add my position". If that matters to you,
  clear the log from the settings page, and be careful who you share an export with.

## For forks and commercial use

The MIT license covers the code. The data services above give no blanket license for commercial use, and several say
personal or non-commercial use only. If you build a commercial product from this code, you need a written agreement or a
paid plan from each provider.
