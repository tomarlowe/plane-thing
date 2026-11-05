# Device test checklist

Everything before this point was tested in a simulator and in unit tests that answer with made-up data. These checks need a
real Car Thing with bridgething installed and a phone running the companion app. Tick each box only when you saw it on the
real device. An unticked box means not yet tested, not failed.

Record the date, the bridgething version, and the phone. Note anything that differs from what is written here.

## Test log

- Date: not yet tested on a real device (as of 2026-11-04).
- Planned phone: Pixel 9 Pro (Android), bridgething companion app 0.16.0. The Car Thing runs Terbium firmware.
- Car Thing firmware and daemon version: not recorded.
- Nothing below has been ticked. The code-level tests use simulated data and are not part of this list. The store
  screenshots were taken in the simulator with invented aircraft, not on the device. Replace them with
  `bun run shot dash-spotter --replace` once the app runs on the device.

## Install and start

- [ ] The app installs and appears with the name "Dash Spotter".
- [ ] It opens to the Overhead screen and finds your location within about 30 seconds.
- [ ] The first start loads the airport list (about 1.5 MB compressed) and "Loading airports" clears. Note how long it takes
      on the Car Thing's processor.
- [ ] The top strip shows five pills and Overhead is highlighted.

## Controls

- [ ] Button 1 shows Overhead, 2 shows Radar, 3 shows Watchlist, 4 shows Spotter log.
- [ ] The small recessed button shows Arrivals and does not drop to the bridgething dashboard on a quick tap.
- [ ] On Radar, turning the dial clockwise zooms in. If it zooms out, turn on "Reverse the dial" and note it.
- [ ] One notch of the dial moves exactly one range step (3, 6, 15, 50, 100).
- [ ] The dial click switches the Radar between the scope and the list.
- [ ] On Spotter log the dial scrolls the recent sightings. On Arrivals it moves to the next airport.
- [ ] The back button does nothing in this app.
- [ ] Tapping a pill on the touch screen switches screens. Tapping the airport chip on Radar moves to the next airport.

## Live data

- [ ] Aircraft near you appear on Radar. Compare with another tracker (for example the adsb.lol map) for the same place.
- [ ] The Overhead screen shows the closest aircraft within 10 miles, with operator, tail number, type and numbers that
      match another tracker.
- [ ] The "Data: ... · N s ago" note names a service and updates about every 6 seconds.
- [ ] Turn off the phone's internet and reopen the app: the last data stays and the Offline note appears. Turn it back on:
      the note clears by itself.
- [ ] With adsb.lol blocked or failing, the app falls back to airplanes.live or adsb.fi. (Hard to test. A VPN or a captive
      network can help.)
- [ ] Each service's real reply is understood: note which of adsb.lol, airplanes.live and adsb.fi answered, and that
      aircraft, altitude, speed and heading are right.
- [ ] How often the phone reports a new position while driving.

## Photos

- [ ] A photo of the exact aircraft appears, with the photographer and "Planespotters.net" under it.
- [ ] An aircraft with no photo shows "Photo shows ..." with another tail of the same airline and type.
- [ ] A rare aircraft shows a "Typical ..." photo from Wikimedia Commons with the artist and license.
- [ ] No photo at all shows the silhouette, and nothing hangs.
- [ ] Photos load in a reasonable time over the phone link. Note how long.
- [ ] The Planespotters, airport-data.com and Wikimedia Commons replies are understood (the shapes in the code were written
      from documentation and have not been checked against live replies).
- [ ] A custom User-Agent (naming Dash Spotter and its GitHub page) reaches the photo and aircraft services unchanged
      through the phone's connection.

## Routes and Arrivals

- [ ] The route chip on Overhead shows a plausible "ATL to LGA, est." for an airline flight. Compare with another tracker.
      The adsb.lol route lookup reply shape has not been checked live.
- [ ] Arrivals shows aircraft that are landing at the nearest large or medium airport, with sensible estimated times.
- [ ] The FAA banner appears when the FAA reports a delay at that airport (hard to arrange; check the FAA site first).
- [ ] The time zone handling is right: ETAs and the log times show the local time of the airport and of your phone.

## Airports

- [ ] Radar shows the nearest airport as a white rounded square with its code, and the line toward it.
- [ ] Tapping the chip steps through the five nearest, and an airport outside the range sits on the rim.
- [ ] Arrivals defaults to the nearest large or medium airport.
- [ ] Changing Airports to a country, and to the whole world, still works and stays fast. Note the speed on the device.
- [ ] Entering a two-letter country code on the settings page changes the airports.

## Watchlist and emergency alert

- [ ] Helicopters show on the Watchlist card when one is near (try near a hospital or news helicopter area).
- [ ] An entry in the watch list (a callsign start, a tail number, a type code, MIL) shows as "On your list" when one is
      near.
- [ ] A real 7700, 7600 or 7500 squawk within 100 miles flashes EMERGENCY three times and jumps to Radar. (Real events are
      rare. Check the code with a simulator run on the device: `sim.html?scenario=emergency` shows the behavior with
      invented data.)
- [ ] The flash is readable, and does not flash more than three times a second.
- [ ] Pressing a button during the flash ends it.
- [ ] With "Jump to the radar on an emergency" off, the flash happens and the screen stays.
- [ ] How the app behaves while another bridgething app is on screen. It is expected not to run in the background.
- [ ] The question of sound is left open. The bridgething SDK has an audio surface that could play an alert tone.

## Spotter log

- [ ] After a drive past a few aircraft, Spotter log shows them with counts, closest pass and NEW badges.
- [ ] Reopening the app keeps the log.
- [ ] Log writes complete without errors. Note how many aircraft the log can hold on the device (the code assumes about 30
      KiB per 100 rows against a 256 KiB document limit that has not been measured).
- [ ] Tapping Export CSV on the Car Thing shows the "export happens on your phone" note.

## Settings page and export

- [ ] The settings page opens from the companion app and shows every setting, the country code list, and the credits.
- [ ] The Spotter log section reads the log from the Car Thing and shows the count.
- [ ] A changed setting takes effect on the device without restarting the app.
- [ ] The Done button closes the page.
- [ ] Download CSV saves a file on the phone. If it does not, Copy CSV and Show text work.
- [ ] The CSV opens in a spreadsheet with the columns in the right place and local times.
- [ ] Download map file (KML) opens in a map app, with the sightings where you stood.
- [ ] Copy CSV and Copy KML work from inside the companion app.
- [ ] "Clear the log" asks twice and empties the log, and the Car Thing's Spotter log screen empties as well.
- [ ] The CSV imports into at least one real plane spotting tool or logbook. The column order was chosen from research and
      has not been tried in any such tool.

## Things to measure and record

- [ ] Memory and responsiveness stay fine after 30 minutes of use on Radar with many aircraft.
- [ ] The battery or heat of the Car Thing does not change noticeably.
- [ ] Documentation matches the real companion app screens and menu names. Fix [install.md](install.md) if it does not.
- [ ] Install through the companion app's "install from url or file" panel, with the zip address in
      [install.md](install.md).
