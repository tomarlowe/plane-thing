# Troubleshooting

Plane Thing says plainly what is wrong on the screen. Find the message below. None of these have been seen on a real
device yet. The wording comes from the app's code.

## Messages while it starts

| Message                         | What it means and what to do                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Finding your location           | Waiting for the phone's location. Give it a few seconds.                                     |
| Cannot find your location       | The line underneath says why. See "Location" below.                                          |
| Loading airports                | The airport list that ships with the app is being unpacked. A few seconds on first start.    |
| Listening for aircraft          | Position found, waiting for the first answer from the flight data service.                   |
| Cannot reach the flight data    | The line underneath says why. See "Network" below. The app retries by itself.                |
| Offline. Showing 4:12 PM        | The phone could not be reached, so you are looking at the last data, fetched at that time. It recovers by itself. |

## Location

| Reason shown                                       | What to do                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Location is turned off for this app on the phone   | Allow location for the bridgething companion app in your phone's settings.              |
| Location is not enabled for this app               | Reinstall or update Plane Thing from the companion app, then allow location.           |
| Phone location is not available                    | The phone has no position fix yet. Try outdoors or wait a moment.                       |

If you do not want to share location, open settings, set Location to "Fixed place" and enter your latitude and longitude.

## Network

| Reason shown          | What to do                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Phone not connected   | The Car Thing cannot see the companion app. Open the app on the phone and check the connection. See "Phone link" below. |
| Network unavailable   | The phone has no internet. Check mobile data or Wi-Fi.                                       |
| Timed out             | The connection is very slow. The app retries by itself.                                      |
| Request failed        | The data service refused or failed the request. Usually temporary. Plane Thing then tries the next service (adsb.lol, then airplanes.live, then adsb.fi) and waits longer before it uses the failed one again. |
| Device link problem   | The Car Thing and the daemon on it lost contact. Leave the app and open it again.            |

## Aircraft and photos

| What you see                              | What it means and what to do                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| No aircraft within 10 mi                  | Nothing airborne is within the Overhead zone. The screen shows how far the nearest aircraft is. |
| Looking farther out                       | The 10 mile search found nothing, so a wider one is running. If it finds nothing within 100 miles it says so. |
| Few or no aircraft where there should be many | Coverage depends on volunteers' receivers. It is good in North America and Europe, patchy over oceans, mountains and some countries. Aircraft that do not broadcast ADS-B, some military flights and some blocked aircraft never appear. |
| An aircraft with no tail number or type   | The service did not have them. The screen shows the six-character hex code instead.         |
| Silhouette instead of a photo             | No photo was found for the aircraft, another of its airline and type, or its type. Or the photo services could not be reached. |
| "Photo shows N123AB"                      | No photo of this exact aircraft exists, so the photo is of another aircraft of the same airline and type. |
| "Typical A321, not this aircraft"         | A photo of the type, not of this airframe.                                                   |
| Route chip is missing                     | The route lookup had no answer. Routes are guesses from the callsign and are shown as "est.". |

## Radar

| What you see                   | What to do                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| The airport chip shows a small private heliport or strip | The chip shows the nearest airport of any kind. Tap it for the next nearest, through five. Arrivals uses large and medium airports only. |
| An airport chip with a name nobody knows | The airport list includes small private airfields on purpose. |
| Dial zooms the wrong way       | Turn on "Reverse the dial" in settings.                                                       |
| Dial click does nothing        | It only works on the Radar. It switches between the scope and the list.                       |
| Nothing on the scope           | Try a larger range. The footer shows which data service is in use, and the Overhead screen's top bar shows how old its data is.   |

## Airports

| What you see                        | What to do                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| No airport on Radar or Arrivals     | With Airports set to Pick a country, check that the country code is two letters and appears in the "Country codes" list on the settings page. An empty or unknown code finds nothing. |
| The wrong airports after a long trip | Auto reloads the airport list after you move about 100 miles. Reopen the app if you drove farther without it on the screen. |
| Arrivals says nothing is arriving   | No aircraft within about 45 miles looks like it is landing. Normal at quiet airports or at night. |
| Arrivals shows "Origin unknown"     | The route lookup had no guess for that callsign.                                         |

## Spotter log and export

| What you see                                             | What to do                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Nothing logged yet                                       | An aircraft is logged when it comes within the logging distance (10 miles unless changed) while the app is on the screen. The app does not log in the background. |
| Export CSV on the Car Thing shows a message              | Export happens on the phone. Open the app's settings in the companion app and use Download CSV there. |
| Could not read the log from your Car Thing               | The settings page could not reach the Car Thing. Check the phone link, then reopen the page. |
| Download CSV does nothing or no file appears             | Use Copy CSV or Show text on the same page, then paste into a note or a spreadsheet. Whether downloads work inside the companion app has not been tested. |
| Clear the log says it was not fully cleared              | Try again. Export first if you want a copy.                                         |
| Opening the CSV in a spreadsheet shows odd times         | Times are written in your phone's time zone as `YYYY-MM-DD HH:MM`.                  |

## Emergency alert

| What happened                                  | What it means                                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| The screen flashed EMERGENCY but I stayed on the same screen | "Jump to the radar on an emergency" is off in settings, or you touched or pressed a button during the flash. |
| I saw a squawk 7700 on a flight tracker and nothing happened | The aircraft was more than 100 miles away, on the ground, or its code was only seen once. A code must be seen on two updates at least 4 seconds apart. |
| It flashed only once for an aircraft         | Alerts happen once per aircraft per emergency. A new alert needs the code to be gone for 10 minutes. |
| The app was not on the screen                | The app only runs while it is on the Car Thing's screen. There is no alert in the background and no sound. |

## Buttons

- A quick tap of the recessed button opens Arrivals. Bridgething also uses that button to jump to its dashboard, with a
  gesture you can choose in bridgething: a long press, five quick presses or a double press. If a tap sends you to the
  dashboard, your bridgething gesture setting is probably catching it.
- The back button does nothing in this app, by design.

## Phone link (Bluetooth)

The link between the Car Thing and your phone belongs to bridgething, not to Plane Thing. Plane Thing needs it because
the Car Thing gets its internet and location through the phone. When the two lose each other you see "Phone not
connected", or the "Offline" note with the last data still showing. Plane Thing recovers by itself after the link is
back, but it cannot bring the link back.

The link can be fussy. On a Pixel 9 Pro, turning the phone's Bluetooth off and on again did not bring a Car Thing back
(seen with the author's other app, Dash Weather), and the bridgething app showed it as "not connected". Avoid switching
Bluetooth off while you use the Car Thing.

On the first long real drive the owner also saw the link drop at times. He believes that is down to bridgething and not to
Plane Thing. It has not been investigated, so treat that as his observation and not as a finding.

If the link does not come back:

1. Open the bridgething app on the phone. If the Car Thing's row says "not connected", carry on.
2. Forget the Car Thing in all three places: the phone's Bluetooth settings, the Car Thing itself (settings, then
   Bluetooth, remove the phone), and the bridgething app.
3. On the Car Thing, open settings, then Bluetooth, then make it discoverable. Leave that screen open.
4. In the bridgething app, tap "pair another car thing" and pick the Car Thing.
5. Accept any pairing request on the phone and on the Car Thing.
6. If it does not take, repeat from step 3. It can take several tries.

These steps follow [bridgething's own troubleshooting page](https://bridgething.com/docs/troubleshooting): "on the device,
open settings, then bluetooth, then make discoverable" and "for a device that pairs but does not connect, forget it there
and pair again."

## Still stuck

Open an issue on the project's GitHub page. Say which message you see, what your phone is, and what you tried. Do not
include your exact location.
