# Pharma-DPD (Doctors Prescription Decipher)

![Firebase](https://img.shields.io/badge/Firebase-Full%20Stack-orange)
![React](https://img.shields.io/badge/React-UI-blue)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Agentic%20Backend-purple)
![FCM](https://img.shields.io/badge/FCM-Push%20Notifications-green)

A full-stack, AI-powered medical assistant built on Firebase and React. Pharma-DPD allows users to scan handwritten prescriptions, deciphers them with AI, cross-checks for safety, and automates medication reminders via Push Notifications.

## Core Features

The "magic" of Pharma-DPD comes from its **"Agentic" Backend** (Cloud Functions + Gemini 1.5 Flash) and its **"Safety Net" Frontend**.

### 🧠 AI Agents

- **Multi-Page Scanner:** Accepts multiple images (e.g., front and back of a prescription) to capture long lists of medications.
- **Visual Verification:** Before processing, the AI acts as a "Gatekeeper," strictly verifying visual markers (Clinic Letterhead, Doctor's Signature) to reject non-prescription images.
- **Decipher & Validate:** Extracts medicine names, dosages, and durations. It flags low-confidence results or unknown drug names for manual user review ("Human-in-the-Loop").
- **The "AI Pharmacist":** Cross-references new medicines against the user's existing health profile (allergies, current meds) to warn of dangerous interactions.

### 🔔 Automated Reminders

- **Smart Scheduling:** Intelligently parses schedules (e.g., "3 times a day") into specific actionable times (09:00, 14:00, 21:00).
- **SOS Support:** Handles "As Needed" (PRN) medications separately from scheduled ones.
- **Push Notifications:** Uses **Firebase Cloud Messaging (FCM)** and a backend Cron Job (running every 15 minutes) to send reliable alerts even when the app is closed.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, GSAP (Animations).
- **Backend:** Firebase Cloud Functions (v2), Node.js 20.
- **AI:** Google Gemini 1.5 Flash (via Vertex AI / Generative AI SDK).
- **Database:** Cloud Firestore (Native Mode, Asia-South1).
- **Auth:** Firebase Authentication.
- **Notifications:** Firebase Cloud Messaging (FCM) + Service Workers.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Sujaykatmania/pharma-dpd.git
cd pharma-dpd
```

### 2. Install Dependencies

This project uses a monorepo-style structure with separate dependencies for frontend and backend.

```bash
# 1. Install Frontend Dependencies
npm install

# 2. Install Backend Dependencies
cd functions
npm install
cd ..
```

### 3. Environment Setup (Critical)

You must create a `.env` file in the root directory to store your Firebase configuration and VAPID key. Use the `env.example` format:

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_VAPID_KEY="your-web-push-certificate-key"
```

### 4. Firebase Setup

Enable Services: Ensure Authentication, Firestore, and Cloud Functions are enabled in your Firebase Console.

Set AI Key: Set your Gemini API key as a secret for Cloud Functions:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

### 5. Run Locally

You can run the full suite (Frontend + Backend Emulators) locally.

```bash
npm run dev:emulators
```

- App: http://localhost:5173
- Emulator UI: http://localhost:4000

## Deployment

This project is configured for Atomic Deployment. A single command builds the frontend, updates the backend functions, and syncs the security rules.

```bash
npm run deploy
```

What happens during deploy:

1. `vite build`: Compiles React code to the `dist` folder.
2. `firebase deploy`:
   - Uploads `dist` to Firebase Hosting.
   - Deploys functions to Cloud Functions (Asia-South1).
   - Updates Firestore Rules from `firestore.rules`.
   - Updates Firestore Indexes from `firestore.indexes.json`.
