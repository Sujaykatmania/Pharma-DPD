# Pharma-DPD (Doctors Prescription Decipher)

A full-stack, AI-powered medical assistant built on Firebase and React. Pharma-DPD allows users to scan handwritten prescriptions, deciphers them with AI, and acts as an "AI Pharmacist" to cross-check for potential drug interactions against their health profile.

## Core Features

The "magic" of Pharma-DPD comes from its "agentic" backend, which uses a series of specialized AI agents built on Firebase Cloud Functions and the Gemini API.

* **Read & Decipher:** Scans prescription images (via upload or camera) to read and extract medicine names, dosages, durations, and find generic alternatives.

* **Validate:** Intelligently checks all user-provided profile data (like "allergies" or "conditions") to ensure it's a real medical term and not "junk data" (e.g., it will flag "dad" as an invalid allergy).

* **Cross-Check (The "AI Pharmacist"):** When a new prescription is scanned, this agent cross-references the new medicines against the user's existing health profile (allergies, current medications) to provide immediate warnings for allergic reactions or drug-on-drug interactions.

* **Schedule:** Intelligently parses natural language dosage text (e.g., "3 times a day for 7 days") to automatically schedule medication reminders.

## Tech Stack

This project uses a modern, full-stack, serverless architecture.

### Front-End (`react-firebase-auth/src`)

* **UI:** [React](https://reactjs.org/) (with Hooks)

* **Styling:** [Tailwind CSS](https://tailwindcss.com/)

* **Animations:** [GSAP](https://gsap.com/) (for the "PillNav" and other UI elements)

* **Backgrounds:** [OGL](https://github.com/oframe/ogl) (for "Iridescence" WebGL background)

### Back-End (`react-firebase-auth/functions`)

* **Serverless:** [Firebase Cloud Functions](https://firebase.google.com/docs/functions) (v5, Node.js 20)

* **AI Models:** [Google Gemini 2.5 Flash](https://ai.google.dev/)

* **Database:** [Cloud Firestore](https://firebase.google.com/docs/firestore) (for user profiles, reminders, etc.)

* **Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth) (Email/Password & Google)

* **Hosting:** [Firebase Hosting](https://firebase.google.com/docs/hosting)

## Getting Started

### 1. Clone the Repository

git clone https://github.com/YOUR_USERNAME/pharma-dpd.git cd pharma-dpd


### 2. Install Dependencies

This project uses two separate `package.json` files.

Install root (front-end) dependencies
npm install

Install Cloud Functions (back-end) dependencies
cd functions npm install cd ..


### 3. Set Up Firebase

This project relies on the Firebase Emulator Suite for local development. Make sure you have the Firebase CLI installed (`npm install -g firebase-tools`).

You will also need to set up your Gemini API key as a Firebase secret:

firebase functions:secrets:set GEMINI_API_KEY

(You will be prompted to paste your key)

### 4. Run Locally

This command will start the Vite dev server and all the Firebase emulators (Auth, Firestore, Functions) at the same time.

npm run dev:emulators


* Front-End App: `http://localhost:5173` (or as specified by Vite)

* Emulator UI: `http://localhost:4000`

## Deployment

To Run Locally you have to create a firebase project and configure it.
Then run:

Terminal 1:

`npm run dev:emulator `

Terminal 2:

`npm run dev`


This project is also configured for continuous deployment with a single command.

`npm run deploy`

This script will automatically:

1. Build the React application (`vite build`).

2. Deploy the `dist` folder to **Firebase Hosting**.

3. Deploy the backend agents to **Cloud Functions**.

4. Deploy the database rules from `firestore.rules` to **Cloud Firestore**.

For more detailed information on the deployment configuration, see the **DEPLOYMENT.md** file.
