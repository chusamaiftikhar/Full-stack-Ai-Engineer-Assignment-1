# Frontend Seating Map Task Kit

This package contains a revised frontend take-home assignment for an interactive event seating map.

## Contents

```txt
candidate-assignment.md          Candidate-facing assignment
public/venues/small.json         Small fixture for debugging
public/venues/medium.json        Medium fixture for development
public/venues/large.json         Large fixture with 15,000 seats
schema/venue.schema.json         JSON schema for the fixture shape
scripts/generate-venues.mjs      Deterministic fixture generator
scripts/validate-venues.mjs      Fixture validation script
package.json                     Helper scripts
```

## Suggested usage

Send candidates:

- `candidate-assignment.md`
- `public/venues/small.json`
- `public/venues/medium.json`
- `public/venues/large.json`
- optionally `schema/venue.schema.json`

The fixtures are committed so candidates can start immediately. The generator is included so you can regenerate deterministic fixtures or change the seed for future hiring rounds.

## Regenerating fixtures

```bash
npm run generate:venues
```

Use the equivalent command for your package manager if you prefer `pnpm` or `yarn`.

The current generator creates:

- `small.json` with 144 seats,
- `medium.json` with 2,500 seats,
- `large.json` with 15,000 seats.

## Validating fixtures

```bash
npm run validate:venues
```

## Notes

The assignment is intentionally less focused on feature volume and more focused on rendering decisions, accessibility trade-offs, and performance reasoning. The large fixture is not a perfect grid; it contains uneven rows, multiple sections, mixed statuses, and absolute coordinates.
