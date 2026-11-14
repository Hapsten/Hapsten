# Hapsten

Expo/React Native mobile app — SDK 58. Built for discovering people and events near you.

## 👥 Team Setup

This repo is shared between 3 developers. Follow the steps below to get running locally on your phone.

---

## 📱 Prerequisites

Install these once on your machine:

| Tool | Install from |
|------|-------------|
| **Node.js** (v18 or newer) | https://nodejs.org |
| **npm** | Comes with Node |
| **Expo Go** (on your phone) | App Store (iOS) / Google Play (Android) |

> **Important:** Your phone and computer must be on the same Wi-Fi network for Expo Go to connect.

---

## 🚀 Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/Hapsten/Hapsten.git
cd Hapsten
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase (required)

Firebase config contains API keys and is **not committed** to git.

1. Copy the example file:
   ```bash
   cp src/firebase/config.example.ts src/firebase/config.ts
   ```
2. Open `src/firebase/config.ts` and replace the placeholder values with your Firebase project settings:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select project **hapsten-bck**
   - Project settings → General → Your apps → **Add app** → Web (`</>`)
   - Copy the `firebaseConfig` object into `src/firebase/config.ts`
3. In Firebase Console → **Build → Authentication → Sign-in method**, enable **Email/Password**

> ⚠️ Never commit `src/firebase/config.ts`. It is in `.gitignore` and contains your API keys.

### 4. Start the dev server

```bash
npm start
```

### 5. Open on your phone

- **Android:** Scan the QR code in the terminal with your camera, or press `a` in the terminal
- **iOS:** Scan the QR code with the Camera app, or press `i` in the terminal

Expo Go will open the app on your device.

---

## 🛠 Available Scripts

| Script | What it does |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Start and open on Android emulator/device |
| `npm run ios` | Start and open on iOS simulator/device |
| `npm run web` | Start on web browser |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check TypeScript (`tsc --noEmit`) |
| `npx tsc --noEmit` | Type-check TypeScript |

---

## 🏸 Matchmaking build

The squad-matching flow (intents → matchmaker → event chat → venue suggestion) is documented in
[`docs/ROADMAP.md`](docs/ROADMAP.md), including Firestore rules, indexes, and Cloud Functions
deployment. Payment is intentionally not part of this phase.

---

## 📂 Project Structure

```
Hapsten/
├── app.json              # Expo config
├── package.json          # Dependencies & scripts
├── tsconfig.json         # TypeScript config
├── .gitignore            # Git ignore rules
├── README.md             # This file
├── src/
│   ├── app/              # Expo Router screens (file-based routing)
│   │   ├── _layout.tsx   # Root navigator + auth gating
│   │   ├── index.tsx     # Home screen
│   │   ├── auth.tsx      # Sign in / Sign up (Firebase)
│   │   ├── discover.tsx
│   │   ├── plans.tsx
│   │   ├── profile.tsx
│   │   ├── create.tsx
│   │   └── map.tsx
│   ├── components/       # Reusable UI components
│   │   ├── themed-text.tsx
│   │   ├── themed-view.tsx
│   │   ├── bottom-tab-bar.tsx
│   │   └── splash-screen.tsx
│   ├── contexts/         # React context providers
│   │   └── AuthContext.tsx   # Firebase auth state
│   ├── firebase/         # Firebase configuration
│   │   ├── config.example.ts   # Copy to config.ts and add keys
│   │   └── config.ts           # (gitignored - your real keys)
│   ├── constants/        # Theme colors, fonts, spacing
│   │   └── theme.ts
│   └── hooks/            # Custom hooks
│       ├── use-theme.ts
│       └── use-color-scheme.web.ts
└── assets/               # Images, icons, fonts
```

---

## 🔐 Firebase Auth Setup

The app uses Firebase Authentication (Email/Password) via the web JS SDK.

**One-time setup per developer:**

1. Create a web app in your Firebase project (or use the shared `hapsten-bck` project)
2. Copy `src/firebase/config.example.ts` → `src/firebase/config.ts`
3. Paste your web app config values
4. Enable **Email/Password** sign-in in Firebase Console → Authentication → Sign-in method

**No Android-specific setup needed** — `google-services.json` is not required for email/password auth with the web SDK.

---

## 🔄 Working as a Team

1. Always `git pull` before starting work
2. Create a branch for your feature: `git checkout -b feature/your-name`
3. Commit and push regularly
4. Run `npm run lint` and `npx tsc --noEmit` before pushing
5. Never commit `src/firebase/config.ts` — each developer has their own copy

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Expo Go says "SDK 57 vs 58 mismatch" | Update Expo Go app on your phone to the latest version |
| Can't connect to phone | Make sure phone and computer are on the same Wi-Fi |
| Firebase auth errors | Check that `src/firebase/config.ts` exists and has correct values; enable Email/Password in Firebase Console |
| Metro bundler stuck | Press `r` in the terminal to reset cache, or `npm start -- --clear` |
| TypeScript errors | Run `npx tsc --noEmit` to see them |

---

## 📦 Tech Stack

- **Expo SDK 58** + **React Native 0.88**
- **Expo Router** (file-based navigation)
- **Firebase Auth** (Email/Password)
- **TypeScript** (strict)
- **AsyncStorage** (auth persistence)

---

Need help? Ask in the team chat or open an issue on GitHub.