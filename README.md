# PigeonSub Mobile

Standalone Expo (React Native) app for PigeonSub.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment example and set your backend URL:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `EXPO_PUBLIC_API_BASE_URL` to your PigeonSub backend URL
   (e.g. your Replit dev domain, `https://your-repl.replit.dev`).
3. Start the Expo dev server:
   ```bash
   npx expo start
   ```

Then scan the QR code with Expo Go (iOS/Android) or run on a simulator.
