# LinearGpt

Demo frontend for a voice-first chat that morphs between a speaking circle and rendered class cards.

## Frontend

1. Navigate to `frontend` and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set:
   ```bash
   VITE_OAI_KEY=<your-openai-key>
   VITE_OAI_ENDPOINT=https://api.openai.com/v1/realtime
   VITE_OAI_MODEL=gpt-4o-realtime-preview
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

The interface starts as a black‑and‑white circle that animates with the model’s voice. When the model issues a `render` message with a `ClassCardGrid`, the circle transforms into the cards and retracts once the conversation moves on.

Connection status and activity logs are printed to the browser console, and a small status label shows the current WebRTC state (`connecting`, `connected`, `disconnected`, or `failed`).
