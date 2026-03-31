# Tuning Checklist

## First Pass

- Set the camera angle.
- Set the observer latitude.
- Confirm the trail direction feels like a sky rotation rather than a generic particle drift.

## Second Pass

- Adjust motion scale and timelapse intensity.
- Set trail exposure and trail warp.
- Tune the density limits for common viewport sizes.

## Third Pass

- Balance glow, twinkle, and star size range.
- Add atmosphere only if it does not fight the text.
- Keep the background dark enough for the foreground content to remain readable.

## Final Check

- Run `npm test`.
- Run `npm run build`.
- Inspect at a narrow mobile width and a wide desktop width.
