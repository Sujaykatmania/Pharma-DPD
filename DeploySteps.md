# Deployment Steps

This document outlines the necessary steps to deploy the application to Firebase.

## 1. Set the Gemini API Key (One-time only)

Before deploying for the first time, you need to set your Gemini API key in the Firebase environment configuration. Run the following command from your terminal in the `react-firebase-auth` directory:

```bash
firebase functions:config:set gemini.key="YOUR_AI_STUDIO_KEY_GOES_HERE"
```

Replace `"YOUR_AI_STUDIO_KEY_GOES_HERE"` with your actual Gemini API key.

## 2. Deploy the Application

Once the API key is set, you can deploy the application by running the following command from the `react-firebase-auth` directory:

```bash
npm run deploy
```

This command will build the React application and deploy both the hosting and the cloud functions to Firebase.
