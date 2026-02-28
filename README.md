# Steal-a-BFDI-character

Fresh rebuild of a **local 2-player BFDI runway prototype**.

## Current gameplay
- Characters spawn from a tunnel and walk down a runway.
- Each character shows stats above them (`SPD` and `VAL`).
- Blue and Orange players can move, grab, carry, bank at their own base, and steal from the enemy base.

## Controls
- **Blue:** `WASD` move, `E` act (grab/drop/steal/bank)
- **Orange:** Arrow keys move, `M` act (grab/drop/steal/bank)

## Run locally
```bash
python3 -m http.server 8000 --bind 0.0.0.0
# open http://localhost:8000
```

## Quick checks
```bash
node --check script.js
curl -I http://127.0.0.1:8000
```
