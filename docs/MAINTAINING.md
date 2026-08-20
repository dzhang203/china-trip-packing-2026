# Maintaining “Zuzu Goes East”

This page is intentionally a dependency-free static site. GitHub Pages can serve the contents of `docs/` directly, and future edits do not require Node packages, a framework, or a build step.

## File map

- `index.html` — page structure and relatively stable trip guidance.
- `data.js` — frequently changing structured research, currently the car-seat comparison.
- `app.js` — tab behavior, checklist persistence, printing, and data rendering.
- `styles.css` — design tokens, components, responsive rules, and print rules.
- `.nojekyll` — tells GitHub Pages to publish the files exactly as written.

Keep those responsibilities separate. Facts and products belong in `data.js`; structure belongs in `index.html`; behavior belongs in `app.js`; appearance belongs in `styles.css`.

## Design principles

1. **Useful before decorative.** The page should answer “what do we do?” before it explains every edge case.
2. **Warm field guide, not baby-product catalog.** Use the paper, jade, persimmon, gold, and deep-green palette already defined in `:root`. Avoid adding unrelated colors.
3. **One strong idea per block.** Prefer short cards, comparison tables, and explicit verdicts over long undifferentiated prose.
4. **Mobile first in practice.** Any new section must work at 680 px without horizontal scrolling. The comparison table is the deliberate exception and lives inside `.table-scroll`.
5. **Accessible by default.** Preserve semantic headings, ARIA tab relationships, keyboard navigation, visible focus states, sufficient contrast, and the reduced-motion rule.
6. **Honest uncertainty.** Separate manufacturer claims, independent testing, personal priorities, and inference. Never turn a feature list into a safety claim.
7. **Dates beside unstable facts.** Weather, prices, stock, laws, airline rules, holidays, and product availability must carry a “checked” or “updated” date.

## Common updates

### Update car-seat research

Edit `window.TRIP_GUIDE.carSeats` in `data.js`. Each item uses these fields:

- `name` and optional `url`
- `comfort`, `carry`, `install`, and `limits`
- `verdict` and optional `badgeClass` (`best` or `avoid`)
- optional `rowClass` (`winner` or `muted`)

Use plain text only; `app.js` creates the HTML safely. Update the recommendation card in `index.html` only when the actual front-runner changes. Recheck every manufacturer link and manual link when doing so.

### Add a checklist item

Copy an existing checkbox label in `index.html` and give `data-pack` a new, unique, stable key such as `health-thermometer`. Never reuse or rename an old key casually: the browser stores checked state against that key in `localStorage`.

If the checklist meaning changes incompatibly, bump `storageKey` in `app.js` from `zuzu-packing-checklist-v1` to `v2`. That intentionally starts everyone with a clean checklist.

### Add a tab

1. Add a tab button with matching `aria-controls`, `data-tab`, and panel `id`.
2. Add a `section.tab-panel` with `role="tabpanel"` and the corresponding `aria-labelledby`.
3. Keep the tab order logical. `app.js` discovers tabs and panels automatically.
4. Add responsive styles only if existing components cannot express the layout.

### Change trip dates or destinations

Search `index.html` for the old year, destination, and date strings. Update the document description, brand subtitle, hero, country guide, holiday warning, research dates, and footer together. Then recheck weather normals, holiday schedules, airline policies, health guidance, and local transport rules.

## Content conventions

- Use curly punctuation in prose and an en dash for ranges: `5–40 lb`.
- Temperature guidance should include both Celsius and Fahrenheit when space allows.
- Write for David and Luna directly; use Zuzu’s name instead of “the child” except in formal safety wording.
- Keep external-link labels descriptive and end them with `↗`.
- Prefer manufacturer pages, government guidance, and manuals. Use reputable independent testing for comparative claims and identify it as such.
- Do not recommend aftermarket padding, harness covers, or other accessories unless the car-seat manufacturer explicitly permits them.
- Do not claim a seat “fits an airplane,” “fits a suitcase,” or is legal in another country based only on U.S. certification. Verify the exact operating carrier, vehicle, seat label, and current rule.

## Adding styles

Reuse the custom properties at the top of `styles.css`. Prefer an existing card, grid, pill, table, or callout pattern before adding a new component. New component selectors should be specific, readable class names such as `.packing-reality`; avoid styling by element position when a class communicates intent better.

Add the desktop rule near related components, then update both responsive breakpoints if needed. Do not introduce remote fonts, images, trackers, or framework CDNs without a clear benefit and a documented reason.

## Pre-publish QA

Run from the repository root:

```sh
node --check docs/data.js
node --check docs/app.js
python3 -m http.server 8000 --directory docs
```

Then open `http://localhost:8000` and check:

- all five tabs by mouse and keyboard;
- direct hashes such as `#packing`, `#flight`, and `#car-seat`;
- checklist persistence after refresh, Reset, and Print;
- mobile width around 375 px;
- the car-seat table’s horizontal scroll;
- every external product/manual/source link;
- browser console errors.

Finally, run `git diff --check`. GitHub Pages should remain configured for the `main` branch and `/docs` directory.

## When to introduce a build system

Do not add one just to split a few files. Consider a small static-site generator only if the guide grows beyond roughly eight substantial tabs, repeats the same content in multiple pages, or needs many dated research entries. If that happens, preserve the current URLs, accessibility behavior, visual tokens, and zero-tracker stance.
