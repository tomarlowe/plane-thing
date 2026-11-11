# Install Plane Thing

Plane Thing is a bridgething webapp. You need a Car Thing that already runs bridgething 0.16.0 or newer and the
bridgething companion app on your phone. If you do not have bridgething yet, start at [bridgething.com](https://bridgething.com).

There are three ways to install. Pick one.

## Option 1: from the bridgething store

Once Plane Thing is listed in the store, find it at [bridgething.com/apps](https://bridgething.com/apps) and install it
through the companion app. Updates arrive on their own.

## Option 2: install the zip by its web address

The companion app has an "install from url or file" panel on its Apps screen. It asks for the address of an app zip.

1. Open the bridgething companion app on your phone and go to the Apps screen.
2. Open the "install from url or file" panel.
3. Paste this address, then tap install:

   `https://tomarlowe.github.io/plane-thing/r/01a1a8ce-5e3a-71a1-8619-b65be4e9d5d1/0.2.1.zip`

This is the zip for version 0.2.1. The [catalog](https://tomarlowe.github.io/plane-thing/catalog.v1.json) lists the
address of every version.

## Option 3: install a downloaded zip file

1. Download the zip from the address in Option 2 to your phone. Do not unzip it.
2. In the same "install from url or file" panel, tap "choose a zip" and pick the file.

Plane Thing has not yet been installed through Option 2 or Option 3 on a real device. The panel and its buttons are real
(Dash Weather, the author's other app, was set up the same way), but if the install fails, please
[open an issue](https://github.com/tomarlowe/plane-thing/issues) and say what the app showed.

## First start

- Plane Thing uses your phone's location, through the companion app. Allow location for the companion app when your
  phone asks. If you would rather not, open the app's settings and set Location to "Fixed place", then enter coordinates.
- The first start also loads the airport list that ships inside the app (about 1.5 MB compressed). Give it a few seconds.
- Press button 1 to 4 or the recessed button to switch screens. The [user guide](user-guide.md) lists every control.
- Open the app's settings from the companion app to change units, clock, airports, the watch list and the rest. That page
  is also where you export the spotter log. The app keeps the same id in every version, so bridgething should upgrade it in place and keep its saved data. Whether your log and saved photos survive an upgrade has not been tested.
- Plane Thing only works while it is on the Car Thing's screen. It does not log aircraft in the background.

If something does not work, see [troubleshooting](troubleshooting.md).

## For developers

With the Car Thing connected over USB to a computer that has this repo and [Bun](https://bun.sh) installed:

```sh
bun install
bun run push
```

The [developer guide](developer-guide.md) has the rest.
