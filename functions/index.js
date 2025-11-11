const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { GoogleGenerativeAI } = require("@google/generative-ai");

initializeApp();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.validateMedicalTerm = onCall(async (request) => {
    const { text } = request.data;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-preview-0514" });

    const prompt = "You are a medical data validator. A user has provided a term. Check if it is a real, valid medical allergy, medication, or pre-existing condition. Respond only with a JSON object. If it is valid, correct any spelling mistakes and return the proper term. If it is not a valid medical term, return isValid: false. Example 1 Input: 'Penicilin'. Example 1 Output: {\"isValid\": true, \"correctedTerm\": \"Penicillin\"}. Example 2 Input: 'hbp'. Example 2 Output: {\"isValid\": true, \"correctedTerm\": \"High Blood Pressure\"}. Example 3 Input: 'dad'. Example 3 Output: {\"isValid\": false, \"correctedTerm\": null}.";

    try {
        const result = await model.generateContent(prompt + ` Input: '${text}'`);
        const response = await result.response;
        const responseText = await response.text();
        const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Error validating medical term:", error);
        return { isValid: false, correctedTerm: null, error: "An error occurred during validation." };
    }
});

exports.scanPrescription = onCall(async (request) => {
    const { imageData } = request.data;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-preview-0514" });

    const prompt = "You are a medical prescription parser. Analyze this image of a prescription. Extract all medicines, including their name, dosage (e.g., '1 pill, 3 times per day'), and duration (e.g., '10 days'). Also find a common generic alternative for each. Respond only with a JSON object. The root object should be a 'medicines' array. Each object in the array should have keys: name, dosage, duration, and genericAlternative. If a value is not found, return an empty string.";

    try {
        const imagePart = {
            inlineData: {
                data: imageData,
                mimeType: "image/jpeg"
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const responseText = await response.text();
        const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Error scanning prescription:", error);
        return { medicines: [], error: "An error occurred during scanning." };
    }
});
