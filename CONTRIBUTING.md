# Contributing to Plane Thing

Thank you for looking. Plane Thing is a small hobby project, and help of almost any size is welcome: a test report from a real
Car Thing, a typo fix, a bug report, or a code review from someone who reads TypeScript. By taking part you agree to the
[code of conduct](CODE_OF_CONDUCT.md).

## The most useful thing right now

**Try it on a real Car Thing and tell us what happened.** Version 0.2.0 has been tested in a simulator, in unit tests
with made-up data, and by its owner on one Car Thing (see [docs/testing.md](docs/testing.md)). Open a
[device test report](https://github.com/tomarlowe/plane-thing/issues/new?template=device_test_report.yml) even if
everything worked. The [checklist](docs/device-test-checklist.md) lists what to look at.

## Reporting a problem

- **Something is wrong or confusing:** open a [bug report](https://github.com/tomarlowe/plane-thing/issues/new?template=bug_report.yml).
  Read [troubleshooting](docs/troubleshooting.md) first; many messages are explained there.
- **A data service's terms:** if you believe the app uses a service in a way its terms do not allow, please say so using
  the [data source concern](https://github.com/tomarlowe/plane-thing/issues/new?template=data_source_concern.yml) form. We
  take those seriously and would rather fix them than defend them.
- **A security or privacy problem:** do not open a public issue. See [SECURITY.md](SECURITY.md).
- **An idea:** use the [feature request](https://github.com/tomarlowe/plane-thing/issues/new?template=feature_request.yml)
  form. Check the [roadmap](docs/roadmap.md) and the [design decisions](docs/design-decisions.md) first, because several
  things (no drones, no accounts, no paid services) were decided on purpose.

## Setting up

You need [Bun](https://bun.sh) (the version in `.bun-version`). Then:

```sh
git clone https://github.com/tomarlowe/plane-thing.git
cd plane-thing
bun install
bun run --cwd apps/plane-thing typecheck
bun run --cwd apps/plane-thing test
bun run check
```

`bun run --cwd apps/plane-thing dev` starts a dev server, and `/sim.html` on it is a simulator that needs no device and no
network. The [developer guide](docs/developer-guide.md) explains the layout and the simulator options, and the
[architecture](docs/architecture.md) page has diagrams.

You do not need a Car Thing to contribute, but anything that touches how the app behaves on the device cannot be confirmed
without one. Say so in your pull request.

## Making a change

1. Open an issue first for anything larger than a small fix, so we can agree on the idea.
2. Make your change on a branch of your own fork.
3. Add or update tests for logic changes. The data code in `apps/plane-thing/src/data` is plain TypeScript and easy to test.
4. Update the documentation if behavior changes. Docs are part of the product here.
5. Run `typecheck`, `test` and `bun run check` (above). `check` also fails a pull request that changes an app without a
   version bump; use `bun run bump plane-thing patch -m "what changed"` and fill in `apps/plane-thing/CHANGELOG.md`.
6. Open a pull request and fill in the template.

### Rules that are not negotiable

- **Never change the app `id`** in `apps/plane-thing/public/manifest.json`. Devices key upgrades and saved data on it.
- **A published version is immutable.** Fixes ship as new versions.
- **No accounts, no keys, no payments, no tracking.** The app must work for anyone with nothing set up.
- **Read the terms before adding a data source,** and add it to [docs/data-sources.md](docs/data-sources.md) with what it
  receives, the limits you read, and the date you read them. Do not use a service whose terms forbid this use.
- **Be honest in the documentation.** If something is untested, say so. Do not write "supports" for something that has only
  been run against made-up data.
- **Keep your position private.** Anything that sends a location out must round it, as the existing code does (two decimals).

### Style

- TypeScript in strict mode, formatted like the surrounding code.
- Comments are short, lowercase, explain the reason and not the mechanics, and stay under 120 columns.
- Prefer plain words in the docs. If a technical term is needed, explain it once.
- Diagrams in the docs should be real diagrams (Mermaid is fine), not text-character sketches.

## AI-assisted contributions

This project was itself written with an AI assistant (see [how this was built](docs/how-this-was-built.md)), so AI help is
fine. We only ask that you:

- **Say so** in the pull request if an AI assistant wrote or substantially shaped your change.
- **Understand and have checked what you submit.** Run it, read the diff and write down how you checked it. Do not submit
  generated code you could not explain.
- **Do not paste material you have no right to,** such as another project's code under an incompatible license.

## What happens next

Pull requests and issues are read by one person, so replies may be slow. A pull request may be declined
if it does not fit the project's direction, even if it is well made. That is not a judgment of you.

## License

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE), the same as the project.
