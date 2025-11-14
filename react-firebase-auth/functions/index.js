// --- THIS IS THE FINAL AI BACKEND ---
const functions = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- FIX: This is the new, v5 way to get secrets ---
// We define the secret, but we don't access it here.
const { defineString } = require("firebase-functions/params");
const geminiKey = defineString("GEMINI_API_KEY");
// --------------------------------------------------

admin.initializeApp();
const db = admin.firestore();

// Set the region *one time*
setGlobalOptions({ region: "asia-south1" });

// --- 1. THE REAL VALIDATOR FUNCTION ---
exports.validateMedicalTerm = onCall(async (request) => {
  // --- FIX: Initialize genAI *inside* the function ---
  const genAI = new GoogleGenerativeAI(geminiKey.value());

  const { text, category } = request.data;

  if (!text || !category) {
    throw new HttpsError("invalid-argument", "Missing 'text' or 'category' argument.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

  const categoryMap = {
    allergies: "allergy",
    current_meds: "medication",
    conditions: "condition",
  };
  const singleCategory = categoryMap[category];

  const prompt = `You are a strict medical data validator. A user has provided a term and a category. Your task is to validate if the term is a real, correctly categorized medical term. Respond only with a JSON object.
1. If the term is valid AND correctly categorized: Return {"isValid": true, "correctedTerm": "Corrected Term"}. Correct any typos.
2. If the term is valid BUT incorrectly categorized: Return {"isValid": false, "reason": "Incorrect category. 'Term' is a [condition/medication/allergy], not a ${singleCategory}."}.
3. If the term is not a valid medical term at all: Return {"isValid": false, "reason": "'Term' is not a recognized medical term."}.
Example 1 (Correct):
Input: { "text": "Penicilin", "category": "allergies" }
Output: {"isValid": true, "correctedTerm": "Penicillin"}
Example 2 (Incorrect Category):
Input: { "text": "Arthritis", "category": "current_meds" }
Output: {"isValid": false, "reason": "Incorrect category. 'Arthritis' is a condition, not a medication."}
Example 3 (Invalid Term):
Input: { "text": "qwerty", "category": "conditions" }
Output: {"isValid": false, "reason": "'qwerty' is not a recognized medical term."}`;

  try {
    const result = await model.generateContent(
      `${prompt}\n\nInput: { "text": "${text}", "category": "${category}" }`
    );
    const response = await result.response;
    let jsonText = response.text();

    // Defensive parsing for markdown code blocks
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    }

    const jsonResponse = JSON.parse(jsonText);
    return { data: jsonResponse };
  } catch (error) {
    console.error("Error in validateMedicalTerm:", error);
    throw new HttpsError("internal", "Failed to validate medical term.");
  }
});

// --- 2. THE REAL SCANNER FUNCTION ---
exports.scanPrescription = onCall(async (request) => {
  // --- FIX: Initialize genAI *inside* the function ---
  const genAI = new GoogleGenerativeAI(geminiKey.value());

  const { imageData } = request.data;

  if (!imageData) {
    throw new HttpsError("invalid-argument", "Missing 'imageData' argument.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

  const prompt = `You are a 2-step medical parser. Step 1: Is this image a medical prescription or a list of medicines? Respond only with a JSON object. If 'no', respond with {"isPrescription": false, "medicines": []}. If 'yes', proceed to Step 2: Analyze the image, extract all medicines (name, dosage, duration, genericAlternative), and respond with {"isPrescription": true, "medicines": [...]}.`;

  const imageParts = [
    {
      inlineData: {
        mimeType: imageData.startsWith("data:image/png") ? "image/png" : "image/jpeg",
        data: imageData.split(",")[1] || imageData,
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
  // --- FIX: Initialize genAI *inside* the function ---
  const genAI = new GoogleGenerativeAI(geminiKey.value());

  const { newMedicines } = request.data;
  const uid = request.auth && request.auth.uid;

  if (!newMedicines || !uid) {
    throw new HttpsError("invalid-argument", "Missing arguments.");
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
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

exports.parseSchedule = onCall(async (request) => {
  // --- FIX: Initialize genAI *inside* the function ---
  const genAI = new GoogleGenerativeAI(geminiKey.value());

  const { dosage, duration } = request.data;

  if (!dosage || !duration) {
    throw new HttpsError("invalid-argument", "Missing 'dosage' or 'duration' argument.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

  const prompt = `You are an intelligent medical schedule parser. A user has provided a dosage and a duration string. Your task is to parse these into a structured JSON object. Respond only with a JSON object.
1.  **times_per_day**: Must be a number.
2.  **for_x_days**: Must be a number. If the duration is ongoing or not specified, this must be null.
Example 1:
Dosage: "1 pill, twice a day"
Duration: "14 days"
Output: {"times_per_day": 2, "for_x_days": 14}
Example 2:
Dosage: "2 tablets in the morning, 1 at night"
Duration: "1 month"
Output: {"times_per_day": 3, "for_x_days": 30}
Example 3 (Tricky):
Dosage: "Take one every 6 hours"
Duration: "for a week"
Output: {"times_per_day": 4, "for_x_days": 7}
Example 4 (Uncertain):
Dosage: "As needed for pain"
Duration: "3 days supply"
Output: {"times_per_day": 0, "for_x_days": 3, "is_prn": true }
Example 5 (Ongoing):
Dosage: "One tablet daily"
Duration: "Ongoing"
Output: {"times_per_day": 1, "for_x_days": null}`;

  try {
    const result = await model.generateContent(`${prompt}\n\nDosage: "${dosage}"\nDuration: "${duration}"`);
    const response = await result.response;
    let jsonText = response.text();

    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    }

    const jsonResponse = JSON.parse(jsonText);
    return { data: jsonResponse };
  } catch (error) {
    console.error("Error in parseSchedule:", error);
    throw new HttpsError("internal", "Failed to parse schedule.");
  }
});
