# Project: Globe Chase/Follow Camera

## Architecture
- **Globe Exploration Mode**:
  - The camera is a `THREE.PerspectiveCamera` configured in `src/App.tsx`.
  - The user control is an `OrbitControls` instance (`controls`).
  - During Globe exploration mode, `OrbitControls` mouse/keyboard/drag interactions must be disabled (`controls.enabled = false` and skip calling `controls.update()`) so the camera is fully automatic.
  - The camera should auto-rotate and swing behind the player's ship based on the yaw rotation (`heading`).
  - The camera should track the ship's altitude (`yPos` / `warpStar.position.y`) dynamically and smoothly.
  - All movements (camera position and look-at target vector) must exhibit smooth interpolation (cinematic lag) instead of rigid locking.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Architecture | Explore camera update loop in App.tsx, identify variables, design interpolation. | None | DONE |
| 2 | Disable OrbitControls | Bypass and disable OrbitControls during Globe mode, ensure it remains functional in other modes. | M1 | DONE |
| 3 | Auto-Chase & Altitude | Position camera behind ship, rotate smoothly with heading, track altitude dynamically. | M2 | DONE |
| 4 | Smooth Interpolation | Implement lerp/spring lag for camera position and look-at target. | M3 | DONE |
| 5 | Verification & Lint | Run build and lint checks, verify camera behavior, run auditor. | M4 | DONE |

## Interface Contracts
### Globe Mode Camera Update Loop
- **Inputs**:
  - `warpStar.position`: Current 3D position of player's ship.
  - `heading`: Player's current steer heading (yaw angle).
  - `yPos`: Player's vertical altitude above base planet surface height.
  - `dt`: Delta time for smooth frame rate-independent lerp/interpolation.
- **Controls State**:
  - `controls.enabled = !isPlannerMode && !isGlobeMode`: Set to `false` in Globe mode, `true` in normal track gameplay modes.

## Code Layout
- `src/App.tsx`: Main application file containing the rendering loop, update loop, camera tracking logic, and OrbitControls initialization/state update.
