# Steal-a-BFDI-character

A **3D multiplayer starter prototype** inspired by Steal a Brainrot, but where **BFDI characters** spawn from a tunnel and walk down a runway.

## What's implemented
- Three.js 3D arena with tunnel, runway, and two bases.
- BFDI characters ("those") continuously spawn from the tunnel and walk the runway.
- Character stat labels float above each character (`SPD` and `VAL`).
- Local 2-player multiplayer controls (blue vs orange) on one screen.
- Grab/carry/drop gameplay plus stealing banked characters from the enemy base.

## Controls
- **Blue player:** `WASD` to move, `E` to grab/drop/steal
- **Orange player:** Arrow keys to move, `M` to grab/drop/steal

## Run locally
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Next ideas
- Upgrade local multiplayer to online netcode with server authority.
- Replace primitives with real BFDI character models + animations.
- Add timer, match win conditions, and lobby selection.
