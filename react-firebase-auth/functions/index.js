const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

const genAI = new GoogleGenerativeAI(functions.config().gemini.key);

exports.validateMedicalTerm = functions.https.onCall(async (data, context) => {
  const { text } = data;

  if (!text) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with one argument 'text' containing the term to validate."
    );
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `You are a medical data validator. A user has provided a term. Check if it is a real, valid medical allergy, medication, or pre-existing condition. Respond only with a JSON object. If it is valid, correct any spelling mistakes and return the proper term. If it is not a valid medical term, return isValid: false. Example 1 Input: 'Penicilin'. Example 1 Output: {"isValid": true, "correctedTerm": "Penicillin"}. Example 2 Input: 'hbp'. Example 2 Output: {"isValid": true, "correctedTerm": "High Blood Pressure"}. Example 3 Input: 'dad'. Example 3 Output: {"isValid": false, "correctedTerm": null}.`;

  try {
    const result = await model.generateContent(prompt + " Input: '" + text + "'");
    const response = await result.response;
    const jsonResponse = JSON.parse(response.text());
    return jsonResponse;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to validate medical term."
    );
  }
});

exports.scanPrescription = functions.https.onCall(async (data, context) => {
  const { imageData } = data;

  if (!imageData) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with one argument 'imageData' containing the base64 encoded image."
    );
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  const prompt = `You are a medical prescription parser. Analyze this image of a prescription. Extract all medicines, including their name, dosage (e.g., '1 pill, 3 times per day'), and duration (e.g., '10 days'). Also find a common generic alternative for each. Respond only with a JSON object. The root object should be a 'medicines' array. Each object in the array should have keys: name, dosage, duration, and genericAlternative. If a value is not found, return an empty string.`;

  const imageParts = [
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData,
      },
    },
  ];

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const jsonResponse = JSON.parse(response.text());
    return jsonResponse;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to scan prescription."
    );
  }
});
