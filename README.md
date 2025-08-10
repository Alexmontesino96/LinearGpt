# LinearGpt

Demo frontend for a voice-first chat that morphs between a speaking circle and rendered class cards.

## Frontend

1. Navigate to `frontend` and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Provide your OpenAI key as `VITE_OAI_KEY` in an `.env.local` file.
3. Start the dev server:
   ```bash
   npm run dev
   ```

This project imports [`webrtc-adapter`](https://github.com/webrtchacks/adapter) for broader WebRTC browser compatibility. The adapter is loaded in `frontend/src/main.jsx`.

The interface starts as a black‑and‑white circle that animates with the model’s voice. When the model issues a `render` message with a `ClassCardGrid`, the circle transforms into the cards and retracts once the conversation moves on.

Connection status and activity logs are printed to the browser console, and a small status label shows the current WebRTC state (`connecting`, `connected`, `disconnected`, or `failed`).
