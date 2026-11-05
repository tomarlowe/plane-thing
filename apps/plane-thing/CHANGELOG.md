# plane-thing

## 0.1.0

First release.

- Five screens: Overhead (button 1), Radar (2), Watchlist (3), Spotter log (4) and Arrivals (the recessed button).
- Overhead shows the closest aircraft within 10 miles: airline, tail number, callsign, type, an estimated route, altitude, speed, heading, distance and a photo with credit. If that exact aircraft has no photo it shows another tail of the same airline and type, then a photo of the type.
- Radar is a self-drawn scope with five ranges (3, 6, 15, 50 and 100 miles). The dial changes range, and a dial click switches to a distance-sorted list. The nearest airport is plotted with its code, and touching the code looks at the next airport.
- Watchlist shows emergency squawks (7500, 7600, 7700), helicopters and the callsigns or tail numbers you list.
- Spotter log keeps every airborne aircraft you pass, once per aircraft, on the Car Thing itself. Export it as CSV (or a KML map file) from the settings page on your phone.
- Arrivals lists aircraft landing at the nearest airport with estimated times and origins, plus the FAA delay status.
- Emergency alert: an aircraft squawking 7500, 7600 or 7700 within 100 miles flashes EMERGENCY three times on any screen, then jumps to the Radar. A setting turns off the jump.
- Settings for units (imperial, aviation or metric), clock, location, airports (nearby, one country or the whole world), logging distance, watch list, the emergency jump and dial direction.
- Live positions come from adsb.lol, with airplanes.live and adsb.fi as fallbacks. Not for navigation or safety.
