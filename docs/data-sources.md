# Data sources, credits and terms

Plane Thing uses free online services. None needs an account or an API key. The phone's internet connection makes every
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
- **Plane Thing is not for navigation or safety.** It says so on the Radar screen and on the settings page.

## Live aircraft data

All three services share the same data format (the one used by the readsb software), so the app reads them the same way.
It asks adsb.lol first and moves on to the next service when one fails, then waits longer before using the failed one
again. The app spaces its requests to any one of these hosts at least 1.1 seconds apart.

### adsb.lol

- Terms: the data is shared under the Open Database License 1.0 (ODbL). Keep the credit, and if you build a database from
  it, the share-alike rules apply. See [adsb.lol](https://adsb.lol/).
- A numeric request limit was not recorded in this review. Plane Thing asks about every 6 seconds.
- Credit shown: the settings page, this page and the README. The service name that answered is shown on the Overhead
  and Radar screens.

### airplanes.live

- Terms: free for non-commercial use, at no more than about one request per second. See
  [airplanes.live](https://airplanes.live/).
- Credit shown: the settings page, this page and the README, and the service name on the screens when it answers.

### adsb.fi

- Terms: the open data API is for personal, non-commercial use, with a limit of about one request per second, and it asks
  users to credit and link [adsb.fi](https://adsb.fi/). Repeated failed requests can count as abuse, so Plane Thing backs
  off after a failure instead of retrying quickly.
- Credit shown: a link to adsb.fi on the settings page, in this page and in the README, and the name on the screens when it
  answers.

### What they receive

The services receive your latitude and longitude rounded to two decimals, about 1 kilometer, and a search radius. They
also see the phone's IP address like any website would, and the app's User-Agent, which names Plane Thing and its GitHub
page. The emergency search asks for squawk codes only and sends no position.

### Not used: OpenSky Network

An earlier draft of Plane Thing listed the OpenSky Network as a last resort. It was removed. The OpenSky Network's terms
limit its REST API to non-profit research and education and require a written license for operational use, which a
driving app is. The three services above are used instead.

## Estimated routes

- Used for: the route chip on Overhead ("ATL to LGA, est.") and the origin on Arrivals.
- Source: adsb.lol's route lookup. The app sends callsigns and each aircraft's position, not yours. Only airline-style
  callsigns are sent.
- The shape of this service's reply was written from documentation and memory and has not been checked against a live
  reply. When the reply is not understood the app shows no route ("Origin unknown" on Arrivals).

## Photos

Photos are fetched one at a time over the phone and kept in memory (at most eight pictures), and thrown away when the
app closes. There is one exception, added in version 0.2.0: when you mark a plane as Visually Verified, the picture on the
screen at that moment is saved on the Car Thing, together with the photographer and site credit, so the Log & Photos screen
can show it later. One picture is kept per plane, up to 60, and the oldest is deleted when a 61st is saved. Clearing the log
deletes them. This applies to any of the sources below. Plane Thing never uploads or re-publishes a photo, and the spotter
log and the CSV carry no photo link or photographer name. The photographer and the site are credited under every photo.

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
- What Plane Thing does: it shows the photographer and "Planespotters.net" next to each photo, puts the photo-page link
  in the credit, sends a User-Agent that names Plane Thing and its GitHub page, keeps API replies in memory for one hour,
  asks for one photo at a time, and never republishes a photo or puts it in the log. Pictures stay in memory, except the
  ones saved on the Car Thing for planes marked Visually Verified (see above).
- **Open issues, not resolved.** The Car Thing has no direct internet access, so Plane Thing asks the phone's bridgething
  connection to fetch each image and turns it into a picture held in memory (at most eight). That is not the same as the
  picture loading in the user's own browser from Planespotters' address, so it may not meet the terms. The kiosk cannot
  open the credit link, so nobody can follow it. The phone's relay might send no Origin or Referer header, in which case Planespotters would
  refuse the requests and the app would silently move on to the other photo sources. On 2026-11-05 the owner saw a photo
  credited to Planespotters.net on a real Car Thing, so at least some requests are accepted through the relay. Whether that
  holds for every request, and which headers the relay sends, has not been checked. Plane Thing has not been given written
  permission for any of this.
- **Saved pictures, not resolved.** The terms above say image files may not be cached. Saving the picture of a plane you
  marked as Visually Verified on the Car Thing is caching. Plane Thing has not asked Planespotters about this and has no
  permission for it. A saved picture is shown only on the owner's own Car Thing and is never uploaded or shared.
- What to do: ask Planespotters for permission, describing the project and this limit. If they decline, or before listing
  the app publicly without an answer, a new version should drop Planespotters and use only the other photo sources.

### airport-data.com

- Used for: a second try at a photo of the exact aircraft.
- Terms: the site's terms for its aircraft picture lookup were not clear in this review. Forum posts mention a limit
  around 120 requests an hour for the whole service. Plane Thing asks only after Planespotters has no picture, one at a
  time. The photographer and "airport-data.com" are credited under the photo. Treat it as unconfirmed.

### Wikimedia Commons

- Used for: a typical photo of the aircraft type when no photo of a real aircraft is found.
- Terms: each file has its own license. Plane Thing shows the artist and the license text with the photo. The Wikimedia
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
- A little data is saved on the Car Thing: the spotter log, your last position, the airport list in use, and the pictures
  of planes you marked as Visually Verified. The log never leaves the Car Thing except when you export it from the settings
  page on your phone, and then it goes only where you send it. The saved pictures never leave the Car Thing. Observer coordinates are in the exported CSV only if you turn that on, and always in the KML map file.
- Each log row records where you were, rounded to about 1 kilometer (two decimals), and the name of the nearest airport.
  That is what the KML map file draws, and the CSV includes it only if you tick "Add my position". If that matters to you,
  clear the log from the settings page, and be careful who you share an export with.

## For forks and commercial use

The MIT license covers the code. The data services above give no blanket license for commercial use, and several say
personal or non-commercial use only. If you build a commercial product from this code, you need a written agreement or a
paid plan from each provider.
