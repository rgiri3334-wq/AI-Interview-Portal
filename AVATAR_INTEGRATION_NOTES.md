# Avatar Integration Notes (model.glb)

Your Avaturn male model is now wired into the live interview.

## What changed
- `frontend/public/model.glb` — your model, copied here so Vite can serve it.
- `frontend/src/components/AvatarRig.jsx` — loads `/model.glb`, robust bone
  resolution, and a **hand-wave on the greeting**.
- `frontend/src/hooks/useAvatarState.js` — new `GREETING` state (first spoken
  turn) that triggers the wave.
- `services/tts_service.py` — voice switched to the formal male
  `en-US-AndrewMultilingualNeural` (override with the `TTS_VOICE` env var).

## What works now
- Head turns, nods, breathing, body lean, and idle/speaking/listening motion
  (the model's bone names match what the rig drives).
- A friendly **right-hand wave** during the opening greeting (~4.5s, eases in/out).
- Formal male voice with a slightly measured pace (`TTS_RATE`, default `-3%`).

## Known limitation: no lip-sync (mouth won't move)
The model has **no facial blendshapes and no jaw bone**, so there is physically
nothing to animate the mouth with. The lip-sync code is still in place and will
light up automatically if you re-export the avatar **with visemes / ARKit
blendshapes** (Avaturn has this option) — specifically any of: `jawOpen`,
`mouthOpen`, `viseme_aa`, `viseme_O`. Even a single `jawOpen` blendshape is
enough for believable talking.

## You should preview once with `npm run dev`
I can't render 3D here, so two things may need a small visual tweak:
1. **Framing/scale** — if the model sits too high/low or too big, adjust the
   `<group position={[0, -1.5, 0]} scale={1}>` in `AvatarRig.jsx` (bottom of file)
   and/or the camera in `Avatar3D.jsx` (`camera={{ position: [0,0,3], fov: 30 }}`).
2. **Wave angles** — if the wave raises the wrong way, tweak the `WAVE_*`
   constants in the wave block of `AvatarRig.jsx` (clearly commented).

## Revert
The previous avatar is untouched at `frontend/public/avatar.glb`. To roll back,
set `AVATAR_MODEL_PATH` back to `/avatar.glb` in `AvatarRig.jsx`.
