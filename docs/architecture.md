# Architecture

Plane Thing is a single web page that runs in the Car Thing's kiosk browser and gets everything from the outside world
through the phone. This page shows where each part lives and how data moves. For file-by-file notes see the
[developer guide](developer-guide.md), and for the reasons behind the choices see
[design decisions](design-decisions.md).

## The system

```mermaid
flowchart LR
  subgraph CT["Car Thing (800x480 screen, buttons, dial)"]
    APP["Plane Thing page"]
    DAEMON["bridgething daemon"]
    APP <--> DAEMON
  end
  subgraph PH["Phone"]
    COMP["bridgething companion app"]
    SET["Plane Thing settings page<br/>(log export, country list, credits)"]
    COMP --- SET
  end
  subgraph NET["Internet"]
    ADSB["adsb.lol, airplanes.live, adsb.fi<br/>aircraft positions"]
    PHOTO["Planespotters, airport-data.com,<br/>Wikimedia Commons<br/>photos"]
    FAA["FAA NAS status<br/>airport delays"]
  end
  DAEMON <-->|"Bluetooth"| COMP
  COMP -->|"HTTPS requests"| ADSB
  COMP -->|"HTTPS requests"| PHOTO
  COMP -->|"HTTPS requests"| FAA
  SET <-->|"reads and clears the log"| DAEMON
```

- The Car Thing has no internet connection of its own. Every request goes through the phone's companion app.
- The settings page is a second page, built separately, that the companion app shows on the phone. It reads and clears the
  spotter log that the Car Thing keeps, and it is the only place a file or a clipboard copy can be made.
- The airport list ships inside the app. Nothing about airports is fetched at run time.

## Inside the app

```mermaid
flowchart TB
  subgraph PLAT["Platform interface (src/platform)"]
    DEV["device<br/>@bridgething/client"]
    WEB["web<br/>plain fetch"]
    SIM["sim<br/>made-up data for tests and screenshots"]
  end
  subgraph DATA["Logic with no screen code (src/data)"]
    REPO["Repo<br/>timers, feeds, retries, state"]
    ADSBP["adsb<br/>provider URLs and parsers"]
    EM["emergency<br/>squawk tracker"]
    WATCH["watch<br/>watch list matching"]
    APT["airports<br/>nearest, working set"]
    LOG["log + export<br/>one row per aircraft, CSV, KML"]
    PHOTOS["photoservice<br/>photo fallback chain"]
    ARR["arrivals + faa + route"]
  end
  subgraph UI["Screens (src/ui)"]
    SCR["Overhead, Radar, Watchlist,<br/>Spotter log, Arrivals"]
    FLASH["Emergency flash"]
  end
  PLAT --> REPO
  REPO --> ADSBP & EM & WATCH & APT & LOG & PHOTOS & ARR
  REPO -->|"useSyncExternalStore"| SCR
  REPO --> FLASH
  INPUT["input.ts<br/>buttons and dial"] --> SCR
```

- **One interface for the outside world.** Everything the app needs from outside (fetching a web address, saving a
  value, reading settings, finding the position) goes through the `Platform` interface in `src/platform/types.ts`. There
  are three implementations: the real device, a plain browser, and a simulator that answers from made-up fixtures. That is
  why the whole app runs on a desktop and why the tests need no device or network.
- **One owner for state.** The `Repo` class owns every timer and every feed. Screens only read its state, so a screen
  never talks to the network.
- **Data logic is separate from drawing.** Everything in `src/data` is plain TypeScript with no screen code, which is what
  the unit tests cover.

## A data cycle

```mermaid
sequenceDiagram
  participant T as Timer (every 6 s)
  participant R as Repo
  participant G as Per-host gate (1.1 s apart)
  participant P as Provider (adsb.lol first)
  participant S as Screens
  T->>R: nearby tick
  R->>R: position, rounded to 2 decimals
  R->>G: ask for aircraft near that point
  G->>P: HTTPS request through the phone
  alt answered
    P-->>R: readsb-format JSON
    R->>R: parse, drop ground vehicles, sort by distance
    R->>R: update emergency tracker, watch list, spotter log
    R-->>S: new state
  else failed
    R->>R: mark provider down, back off, try the next one
  end
```

Other feeds run on their own timers: the emergency squawk search (25 s), arrivals (10 s), the FAA status (5 min) and
your position (8 s). Photos and routes are fetched one at a time when an aircraft needs them.

## The spotter log and the phone

```mermaid
flowchart LR
  REPO["Repo (on the Car Thing)"] -->|"writes rows in 100-row pieces<br/>log.0, log.1, ... and log.meta"| DOCS[("Car Thing doc storage")]
  DOCS -->|"settings page reads"| SET["Settings page (on the phone)"]
  SET --> CSV["CSV or KML text, built on the phone"]
  CSV --> OUT["download, copy or show text"]
  SET -->|"Clear the log"| DOCS
  DOCS -->|"log.meta removed"| REPO
```

The log is split into pieces of about 100 rows because the device stores each piece as one document with a size limit.
The phone builds the export itself, so the log never leaves the Car Thing except as a file you choose to save or copy.
Clearing the log from the phone removes the pieces and then the index, and the app notices the index is gone and empties
its own copy.

## Build and release

```mermaid
flowchart LR
  SRC["source on main"] --> CI["CI: build, bundle,<br/>validate catalog, run tests"]
  SRC --> PUB["publish workflow"]
  PUB --> ZIP["versioned zip + settings page<br/>with sha256"]
  ZIP --> PAGES["GitHub Pages catalog (catalog.v1.json)"]
  PAGES -.->|"only after the owner submits it"| STORE["bridgething store"]
  PAGES --> COMP2["companion app: install from URL"]
```

Bundles are reproducible: the same source gives the same file digest. A published version is immutable, so every change
needs a new version number. See the [developer guide](developer-guide.md#releasing).

## Technology

- TypeScript, React 19 (the settings page uses Preact to stay small), Vite 8, Bun for scripts and tests.
- The radar scope is drawn as SVG by the app. There is no map library and no map tiles.
- Roboto Flex is bundled with the app, so no font is downloaded at run time.
- Runtime packages are listed in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
