# Security policy

## Reporting a vulnerability

Please report security and privacy problems **privately**, not in a public issue.

1. Go to the **Security** tab of this repository on GitHub.
2. Choose **Report a vulnerability**.
3. Describe what you found, how to reproduce it, and what it could let someone do.

This uses GitHub's private vulnerability reporting, which only the maintainer can read. If the button is missing, private
reporting has not been switched on yet; open a public issue that says only "I need a private way to report a security problem"
and does not include the details, and the maintainer will arrange something.

This is a hobby project run by one person, so there is no guaranteed response time. Please allow reasonable time before
sharing details publicly.

## What is in scope

Plane Thing has no server, no accounts and no stored credentials, so the interesting problems are few. Examples that count:

- Your location, or the contents of your spotter log, reaching somewhere they should not. See [privacy](docs/privacy.md)
  for what is meant to leave the device.
- A way for data from a flight, photo or airport service to run code in the app or the settings page (for example through an
  aircraft name, an owner name or a photo credit).
- A log export that can run code or leak data when opened in a spreadsheet or map program. Cells that could run as formulas
  are meant to be defused.
- Something in the build or release workflow that could publish a tampered app.
- A dependency with a known serious vulnerability that affects the shipped app.

## What is out of scope

- The Car Thing hardware or the bridgething platform itself. Report those to [bridgething](https://github.com/JoeyEamigh/bridgething).
- Problems in the flight, photo or FAA services. Report those to their operators.
- Data being wrong or missing. That is a normal bug; open a regular issue.
- Anything that needs physical access to your unlocked phone or Car Thing.

## Supported versions

Only the latest published version is supported. Published versions are never changed, so a fix means a new version.

## What the app does and does not protect

The app sends your position, rounded to about 1 kilometer, to public flight data services over HTTPS through your phone's
connection. It cannot hide your phone's internet address from them. The app adds no encryption of its own to the spotter
log, and anyone with access to your phone's settings page can read and export it. Treat exported files as a record of where
you have been.

