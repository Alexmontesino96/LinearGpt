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

The interface starts as a black‑and‑white circle that animates with the model’s voice. When the model issues a `render` message with a `ClassCardGrid`, the circle transforms into the cards and retracts once the conversation moves on.
