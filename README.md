# Dash Spotter

An aircraft spotter for the discontinued Spotify Car Thing, running on [bridgething](https://bridgething.com). Think of
wardriving for Wi-Fi, but for planes: drive around, and the Car Thing shows what is flying near you and keeps a log of
every aircraft you pass. Five screens, one for each button, in bright Material 3 Expressive colors on a black background.
It is free, has no accounts or API keys, and is open source.

Dash Spotter is for fun and curiosity. Positions can be late, wrong or missing. **It is not for navigation or safety.**

## The five screens

| Button          | Screen      | What it shows                                                                                       |
| --------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| 1               | Overhead    | The closest aircraft within 10 miles: airline, tail number, callsign, type, estimated route, altitude, speed, heading, distance, and a photo with credit |
| 2               | Radar       | A scope of everything near you with five ranges, the nearest airport plotted with its code, and a list view |
| 3               | Watchlist   | Emergency squawks, helicopters, and the callsigns, tail numbers or types you list                   |
| 4               | Spotter log | Counts, recent sightings and what is new today. Export the whole log from your phone                |
| Recessed button | Arrivals    | Aircraft landing at the nearest airport with estimated times and origins, plus FAA delay status     |

An aircraft squawking 7500, 7600 or 7700 within 100 miles flashes EMERGENCY on whatever screen you are on and then jumps to
the Radar. A setting turns the jump off.

## What you need

- A Car Thing running bridgething 0.16.0 or newer.
- The bridgething companion app on your phone, signed in to the internet, with location allowed. The phone does all the
  networking for the Car Thing.
- Aircraft that are in range of a volunteer's ADS-B receiver. Coverage is very good in North America and Europe and
  patchy elsewhere.

## Install

See [docs/install.md](docs/install.md). Short version: install it from the bridgething store once it is listed, or paste the
address of the version zip into the companion app's "install from url or file" panel (not yet tested on a real device).

- Catalog address, which the store reads: `https://tomarlowe.github.io/dash-spotter/catalog.v1.json`
- Zip for version 0.1.0: `https://tomarlowe.github.io/dash-spotter/r/01a1a8ce-5e3a-71a1-8619-b65be4e9d5d1/0.1.0.zip`

## Documentation

- [Install guide](docs/install.md)
- [User guide](docs/user-guide.md): every screen, every setting, how to export the log
- [Troubleshooting](docs/troubleshooting.md)
- [Data sources, credits and terms](docs/data-sources.md)
- [Developer guide](docs/developer-guide.md): build it, change it, test it, ship it
- [Device test checklist](docs/device-test-checklist.md): what has and has not been tried on a real device
- [Changelog](apps/dash-spotter/CHANGELOG.md)

## Status

Version 0.1.0 was built and tested against a simulator that answers with made-up data. It has not yet been run on a real
Car Thing, and the live data services have not been called by its tests. The
[device test checklist](docs/device-test-checklist.md) lists every thing still to be confirmed on the real device. The
screenshots in the store listing are simulator pictures with sample data, not photos of the real screen.

## Privacy

There is no account, no tracking and no analytics, and nothing is sent to the author. Your position goes to the flight
data service only as coordinates rounded to about 1 kilometer. Photo services see the aircraft's identifying numbers, not
you. The spotter log stays on your Car Thing. Details in [docs/data-sources.md](docs/data-sources.md).

## Credits

- Live aircraft positions: volunteer ADS-B receivers, shared by [adsb.lol](https://adsb.lol/) (Open Database License),
  [airplanes.live](https://airplanes.live/) and [adsb.fi](https://adsb.fi/)
- Photos: [Planespotters.net](https://www.planespotters.net/), [airport-data.com](https://www.airport-data.com/) and
  [Wikimedia Commons](https://commons.wikimedia.org/), credited beside each photo
- Airports: [OurAirports](https://ourairports.com/), public domain
- Delays: FAA National Airspace System status
- Fonts: [Roboto Flex](https://github.com/googlefonts/roboto-flex), SIL Open Font License
- Platform: [bridgething](https://bridgething.com)

## License

[MIT](LICENSE). The data services above have their own terms, summarized in
[docs/data-sources.md](docs/data-sources.md). The free access they offer is for personal, non-commercial use.
