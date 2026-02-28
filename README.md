# Steal-a-BFDI-character

A **3D-style local multiplayer starter prototype** inspired by Steal a Brainrot, where **those BFDI characters** spawn from a tunnel and walk a runway.

## What's implemented
- Canvas-rendered pseudo-3D arena with tunnel, runway, and two bases (no external JS dependencies).
- BFDI characters continuously spawn from the tunnel and walk the runway.
- Floating stat labels above each character (`SPD` and `VAL`).
- Local 2-player controls on one screen (blue vs orange).
- Grab/carry/drop gameplay plus stealing already-stored characters from the enemy base.

## Controls
- **Blue player:** `WASD` to move, `E` to grab/drop/steal.
- **Orange player:** Arrow keys to move, `M` to grab/drop/steal.

## Run locally
```bash
python3 -m http.server 8000 --bind 0.0.0.0
# open http://localhost:8000
```

## Validation checks
```bash
node --check script.js
curl -I http://127.0.0.1:8000
```

## Next ideas
- Upgrade local multiplayer to online netcode with server authority.
- Replace primitives with unique BFDI character models + animations.
- Add a timer, match win conditions, and lobby flow.


## Merge notes
- Current HUD exposes a build tag (`conflict-safe-v2`) so you can quickly verify this branch's conflict-resolved payload is what got merged.

## Conflict mitigation
- Added `.gitattributes` merge rules for `index.html`, `styles.css`, `script.js`, and `README.md` using `merge=ours` so future merges prefer the current branch's resolved versions for these frequently-conflicting prototype files.
