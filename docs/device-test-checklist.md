# Device test checklist

Everything before this point was tested in a simulator and in unit tests that answer with made-up data. These checks need a
real Car Thing with bridgething installed and a phone running the companion app. Tick each box only when you saw it on the
real device. An unticked box means not yet tested, not failed.

Record the date, the bridgething version, and the phone. Note anything that differs from what is written here.

## Test log

- 2026-11-05: first report from the owner after about a day of real driving, on the build made just before the rename (it
  differs from the current version only in the app's name). He reported that it worked well, that photos of the actual
  aircraft appeared a second or two after a silhouette, and that a photo credited to Planespotters.net appeared. He also
  reported trouble with the Bluetooth link between the Car Thing and the phone, which he believes is a bridgething matter.
  He did not go through this list item by item, so only items he specifically confirmed are ticked below.
- 2026-11-10: the owner installed version 0.2.0 on his own Car Thing from the project files and tried the new features by
  hand. He reported that the five-tab bar with the wider Log & Photos tab, pressing Back on Overhead to mark a plane
  Visually Verified (and again for Already Marked), opening a plane from the Radar, the Log & Photos screen and the look-here
  card all worked. A plane marked straight after it appeared showed "No Photo Saved" in the Visually Verified view. On a
  retest with another plane whose photo had already loaded, the plane and its photo were recorded correctly. Why the first
  plane had no photo was not determined. He did not record whether the look-here card used the car's heading while moving,
  and he did not go through the rest of this list, so only the items he confirmed are ticked below.
- Planned phone: Pixel 9 Pro (Android), bridgething companion app 0.16.0. The Car Thing runs Terbium firmware.
- Car Thing firmware and daemon version: not recorded.
- The code-level tests use simulated data and are not part of this list. The store
  screenshots were taken in the simulator with invented aircraft, not on the device. Replace them with
  `bun run shot plane-thing --replace` once the app runs on the device.

## Install and start

- [ ] The app installs and appears with the name "Plane Thing".
- [ ] It opens to the Overhead screen and finds your location within about 30 seconds.
- [ ] The first start loads the airport list (about 1.5 MB compressed) and "Loading airports" clears. Note how long it takes
      on the Car Thing's processor.
- [x] The top strip shows five pills, and the Log & Photos pill is wider with its name fitting (confirmed on 2026-11-10).
- [ ] Overhead is highlighted when the app opens.

## Controls

- [ ] Button 1 shows Overhead, 2 shows Radar, 3 shows Watchlist, 4 shows Log & Photos.
- [ ] The small recessed button shows Arrivals and does not drop to the bridgething dashboard on a quick tap.
- [ ] On Radar, turning the dial clockwise zooms in. If it zooms out, turn on "Reverse the dial" and note it.
- [ ] One notch of the dial moves exactly one range step (3, 6, 15, 50, 100).
- [ ] The dial click switches the Radar between the scope and the list.
- [ ] On Log & Photos the dial click steps through the four views, and in the photo view the dial moves to the next photo.
      On Arrivals the dial moves to the next airport.
- [x] The Back button on Overhead marks the plane as Visually Verified (see the 0.2.0 section below).
- [ ] The Back button does nothing on Radar, Watchlist, Log & Photos and Arrivals.
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
- [x] Planespotters answers the app's requests at all. Its terms say requests without an Origin or Referer header are
      rejected (403), and the phone's relay may send neither. The owner saw a photo credited to Planespotters.net on the
      device on 2026-11-05, so at least some requests are accepted. What the app shows when one fails is still unchecked.
- [ ] An aircraft with no photo shows "Photo shows ..." with another tail of the same airline and type.
- [ ] A rare aircraft shows a "Typical ..." photo from Wikimedia Commons with the artist and license.
- [ ] No photo at all shows the silhouette, and nothing hangs.
- [ ] Photos load in a reasonable time over the phone link. Note how long.
- [ ] The Planespotters, airport-data.com and Wikimedia Commons replies are understood (the shapes in the code were written
      from documentation and have not been checked against live replies).
- [ ] A custom User-Agent (naming Plane Thing and its GitHub page) reaches the photo and aircraft services unchanged
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

## Version 0.2.0 features

Only the ticked items were confirmed by the owner on 2026-11-10. The unticked ones have not been tried on a real device.

- [x] Overhead has a look-here card with a clock position and a height.
- [ ] While the car is moving, the card gives a clock position from the car's heading, and the position points the right way
      for a plane you can see. Standing still it says "North Is Up" and gives a compass direction.
- [x] A plane can be opened from the Radar and then shows on Overhead.
- [ ] Both ways of opening it work: touching a plane on the scope, and turning the dial to a row in the list and clicking.
      The heading reads "Picked From Radar", and button 1 returns to the closest plane.
- [x] Back on Overhead shows the Visually Verified bar, and the eye icon appears by the tail number afterwards.
- [x] Back again on the same plane shows the Already Marked bar.
- [ ] Back with nothing within 10 miles shows "Nothing Overhead to Mark".
- [x] Log & Photos shows its four cards, and the Visually Verified view shows the plane and its photo when the photo had loaded
      before Back was pressed.
- [ ] Back pressed before the photo has loaded: the app saves the photo when it arrives. The first attempt on 2026-11-10 showed
      "No Photo Saved", and the cause is not known.
- [ ] Reopening the app keeps the marks and the saved photos.
- [ ] The Car Thing can hold 60 saved photos. A 61st deletes the oldest, and its log row stays.
- [ ] "Clear the log" on the phone also removes the saved photos.
- [ ] A marked plane stays in the log when the log is full and trims old rows.
- [ ] The CSV has a "Visually Verified" column before "Source", and the KML has a "Visually Verified" line, with real times.

## Log

- [ ] After a drive past a few aircraft, Log & Photos shows them with counts, closest pass and NEW badges.
- [ ] Reopening the app keeps the log.
- [ ] Log writes complete without errors. Note how many aircraft the log can hold on the device (the code assumes about 30
      KiB per 100 rows against a 256 KiB document limit that has not been measured).
- [ ] Tapping Export CSV on the Car Thing shows the "export happens on your phone" note.

## Settings page and export

- [ ] The settings page opens from the companion app and shows every setting, the country code list, and the credits.
- [ ] The Spotter Log section reads the log from the Car Thing and shows the count.
- [ ] A changed setting takes effect on the device without restarting the app.
- [ ] The Done button closes the page.
- [ ] Download CSV saves a file on the phone. If it does not, Copy CSV and Show text work.
- [ ] The CSV opens in a spreadsheet with the columns in the right place and local times.
- [ ] Download map file (KML) opens in a map app, with the sightings where you stood.
- [ ] Copy CSV and Copy KML work from inside the companion app.
- [ ] "Clear the log" asks twice and empties the log, and the Car Thing's Log & Photos screen empties as well.
- [ ] The CSV imports into at least one real plane spotting tool or logbook. The column order was chosen from research and
      has not been tried in any such tool.

## Things to measure and record

- [ ] Memory and responsiveness stay fine after 30 minutes of use on Radar with many aircraft.
- [ ] The battery or heat of the Car Thing does not change noticeably.
- [ ] Documentation matches the real companion app screens and menu names. Fix [install.md](install.md) if it does not.
- [ ] Install through the companion app's "install from url or file" panel, with the zip address in
      [install.md](install.md).
