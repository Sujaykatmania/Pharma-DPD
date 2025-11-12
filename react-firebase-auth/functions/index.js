const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.validateMedicalTerm = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    const { term } = request.body.data;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });
    const prompt = `You are a medical data validator. A user has provided a term. Check if it is a real, valid medical allergy, medication, or pre-existing condition. Respond only with a JSON object. If it is valid, correct any spelling mistakes and return the proper term. If it is not a valid medical term, return isValid: false. Example 1 Input: 'Penicilin'. Example 1 Output: {\"isValid\": true, \"correctedTerm\": \"Penicillin\"}. Example 2 Input: 'hbp'. Example 2 Output: {\"isValid\": true, \"correctedTerm\": \"High Blood Pressure\"}. Example 3 Input: 'dad'. Example 3 Output: {\"isValid\": false, \"correctedTerm\": null}.`;

    try {
      const result = await model.generateContent([prompt, `Input: '${term}'`]);
      const jsonResponse = JSON.parse(result.response.text());
      response.status(200).send({ data: jsonResponse });
    } catch (error) {
      console.error("Error validating medical term:", error);
      response.status(500).send({ error: "Internal Server Error" });
    }
  });
});

exports.scanPrescription = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    const { imageData } = request.body.data;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });
    const prompt = "You are a medical prescription parser. Analyze this image of a prescription. Extract all medicines, including their name, dosage (e.g., '1 pill, 3 times per day'), and duration (e.g., '10 days'). Also find a common generic alternative for each. Respond only with a JSON object. The root object should be a 'medicines' array. Each object in the array should have keys: name, dosage, duration, and genericAlternative. If a value is not found, return an empty string.";
    const image = {
      inlineData: {
        data: imageData.split(',')[1] || imageData,
        mimeType: 'image/png',
      },
    };

    try {
      const result = await model.generateContent([prompt, image]);
      const jsonResponse = JSON.parse(result.response.text());
      response.status(200).send({ data: jsonResponse });
    } catch (error) {
      console.error("Error scanning prescription:", error);
      response.status(500).send({ error: "Internal Server Error" });
    }
  });
});
