// --- THIS IS THE FINAL AI BACKEND ---
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

// Set the region *one time*
setGlobalOptions({ region: "asia-south1" });

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. THE REAL VALIDATOR FUNCTION ---
exports.validateMedicalTerm = onCall(async (request) => {
  const { text } = request.data;

  if (!text) {
    throw new HttpsError("invalid-argument", "Missing 'text' argument.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

  const prompt = `You are a medical data validator. A user has provided a term. Check if it is a real, valid medical allergy, medication, or pre-existing condition. Respond only with a JSON object. If it is valid, correct any spelling mistakes and return the proper term. If it is not a valid medical term, return isValid: false. Example 1 Input: 'Penicilin'. Example 1 Output: {"isValid": true, "correctedTerm": "Penicillin"}. Example 2 Input: 'hbp'. Example 2 Output: {"isValid": true, "correctedTerm": "High Blood Pressure"}. Example 3 Input: 'dad'. Example 3 Output: {"isValid": false, "correctedTerm": null}.`;

  try {
    const result = await model.generateContent(prompt + " Input: '" + text + "'");
    const response = await result.response;
    let jsonText = response.text();
    if (jsonText.startsWith("```json")) {
        jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    }
    const jsonResponse = JSON.parse(jsonText);
    return { data: jsonResponse }; // Send success response
  } catch (error) {
    console.error("Error in validateMedicalTerm:", error);
    throw new HttpsError("internal", "Failed to validate medical term.");
  }
});

// --- 2. THE REAL SCANNER FUNCTION ---
exports.scanPrescription = onCall(async (request) => {
  const { imageData } = request.data;

  if (!imageData) {
    throw new HttpsError("invalid-argument", "Missing 'imageData' argument.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

  const prompt = `You are a 2-step medical parser. Step 1: Is this image a medical prescription or a list of medicines? Respond only with a JSON object. If 'no', respond with {"isPrescription": false, "medicines": []}. If 'yes', proceed to Step 2: Analyze the image, extract all medicines (name, dosage, duration, genericAlternative), and respond with {"isPrescription": true, "medicines": [...]}.`;

  const imageParts = [
    {
      inlineData: {
        mimeType: imageData.startsWith('data:image/png') ? "image/png" : "image/jpeg",
        data: imageData.split(',')[1] || imageData,
      },
    },
  ];

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let jsonText = response.text();
    if (jsonText.startsWith("```json")) {
        jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    }
    const jsonResponse = JSON.parse(jsonText);
    return { data: jsonResponse }; // Send success response
  } catch (error) {
    console.error("Error in scanPrescription:", error);
    throw new HttpsError("internal", "Failed to scan prescription.");
  }
});

exports.crossCheckMedication = onCall(async (request) => {
    const { newMedicines } = request.data;
    const uid = request.auth.uid;

    if (!newMedicines || !uid) {
        throw new HttpsError("invalid-argument", "Missing arguments.");
    }

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new HttpsError("not-found", "User profile not found.");
        }
        const userData = userDoc.data();
        const { allergies, current_meds, conditions } = userData;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

        const prompt = `You are an AI Pharmacist. A user has a health profile and is about to take new medicines. Cross-reference the New Medicines with their Health Profile. List only the serious potential interactions or allergic reactions. Respond only with a JSON object containing an interactions array. Each object in the array should have type ('Allergy' or 'Interaction') and warning (the specific warning). If there are no interactions, return an empty array.
User's Health Profile:
Allergies: ${JSON.stringify(allergies)}
Current Medications: ${JSON.stringify(current_meds)}
Conditions: ${JSON.stringify(conditions)}
New Medicines: ${JSON.stringify(newMedicines)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonText = response.text();
        if (jsonText.startsWith("```json")) {
            jsonText = jsonText.substring(7, jsonText.length - 3).trim();
        }
        const jsonResponse = JSON.parse(jsonText);
        return { data: jsonResponse };
    } catch (error) {
        console.error("Error in crossCheckMedication:", error);
        throw new HttpsError("internal", "Failed to cross-check medications.");
    }
});