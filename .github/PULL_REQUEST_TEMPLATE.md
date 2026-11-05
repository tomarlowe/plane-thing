## What this changes

<!-- A sentence or two. Link the issue if there is one. -->

## Why

## How it was checked

<!-- Tick what you actually ran. Say what you could NOT check, such as behavior on a real device. -->

- [ ] `bun run --cwd apps/plane-thing typecheck`
- [ ] `bun run --cwd apps/plane-thing test`
- [ ] `bun run check`
- [ ] Tried it in the simulator (`/sim.html`)
- [ ] Tried it on a real Car Thing and phone
- [ ] Not tested on a device, and I say so below

## Checklist

- [ ] Tests added or updated for logic changes
- [ ] Docs updated if behavior changed
- [ ] Version bumped with `bun run bump` and `CHANGELOG.md` filled in (only for changes to the app)
- [ ] I did not change the app `id` in `manifest.json`
- [ ] Anything that sends a location out still rounds it
- [ ] If I added or changed a data source, I read its terms and updated `docs/data-sources.md`

## AI assistance

<!-- If an AI assistant wrote or shaped this change, say so and say how you checked it. Not required to be negative, just honest. -->

- [ ] No AI assistance
- [ ] AI assisted, and I have read and run what I am submitting
