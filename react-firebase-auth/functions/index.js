// --- THIS IS THE FINAL AI BACKEND ---
const functions = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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

  const { images } = request.data;

  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new HttpsError("invalid-argument", "Missing 'images' argument or it is empty.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

  const prompt = `You are a strict medical document analyst.

  Step 1: The Gatekeeper (Strict Visual Verification).
  Scan the TOP 25% of the provided image(s). You must identify at least TWO of the following "Official Markers" to validate this as a legitimate prescription:
  1. A Hospital/Clinic Name (e.g., "City General", "Dr. Smith's Clinic", printed letterhead).
  2. Contact Details (Phone number, Address, Email in a header format).
  3. A Doctor's Name or Registration Number (e.g., "Dr. John Doe", "Reg No: 12345").

  Decision Logic:
  - If these markers are MISSING or insufficient: STOP immediately. REJECT the image.
    Return: {"isPrescription": false, "reason": "Missing official clinic header or doctor details."}
  - If these markers are PRESENT: PROCEED to Step 2.

  Step 2: Data Extraction & Safety Check.
  - Extract the "clinicDetails" (the detected name, address, or doctor's details that passed Step 1).
  - Extract all medicine details from ALL pages combined.
  - Merge the list into a single array of medicines.
  - For each medicine, extract:
    - name: The corrected, likely intended medicine name (Prioritize clear, printed text).
    - dosage: e.g., "500mg".
    - duration: e.g., "5 days".
    - genericAlternative: The generic name.
    - confidence: A number (0-100) representing how clear the text is.
    - isKnownDrug: Boolean. true if 'name' matches a known real-world brand or generic. false if it looks like a typo or gibberish.
    - originalText: The exact text found in the image, if different from 'name'.

  Logic:
  - If the extracted text is "Glimmerday" but you believe it is "Glimser" based on context/similarity, set name="Glimser" and originalText="Glimmerday".
  - Prioritize clear, printed text on packaging over ambiguous handwritten notes.

  Response Format (JSON ONLY):
  If Rejected: {"isPrescription": false, "reason": "..."}
  If Accepted: 
  {
    "isPrescription": true,
    "clinicDetails": "Extracted Header Info",
    "medicines": [
      { 
        "name": "...", 
        "dosage": "...", 
        "duration": "...", 
        "genericAlternative": "...",
        "confidence": 95,
        "isKnownDrug": true,
        "originalText": "..."
      },
      ...
    ]
  }
  `;

  const imageParts = images.map((base64Data) => ({
    inlineData: {
      mimeType: base64Data.startsWith("data:image/png") ? "image/png" : "image/jpeg",
      data: base64Data,
    },
  }));

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

// --- 3. NOTIFICATION SCHEDULERS ---

// Cron Job 1: Send Reminders (Every 15 minutes)
exports.sendReminders = onSchedule("every 15 minutes", async (event) => {
  const now = new Date();
  
  try {
    // Query active, non-SOS reminders that are due
    const remindersSnapshot = await db.collectionGroup("reminders")
      .where("isActive", "==", true)
      .where("isSOS", "==", false)
      .where("nextScheduledRun", "<=", now)
      .get();

    if (remindersSnapshot.empty) {
      console.log("No reminders due.");
      return;
    }

    const batch = db.batch();
    const notifications = [];

    for (const doc of remindersSnapshot.docs) {
      const reminder = doc.data();
      const parentUserRef = doc.ref.parent.parent; // users/{uid}
      
      if (!parentUserRef) continue;

      // Prepare notification
      notifications.push((async () => {
        const userDoc = await parentUserRef.get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        const tokens = userData.fcmTokens || [];

        if (tokens.length > 0) {
          const message = {
            notification: {
              title: "Medication Reminder",
              body: `Time to take your ${reminder.medName}!`,
            },
            tokens: tokens,
          };

          try {
            await admin.messaging().sendEachForMulticast(message);
            console.log(`Notification sent for ${reminder.medName}`);
          } catch (err) {
            console.error("Error sending notification:", err);
          }
        }

        // Calculate next run (add 24 hours for simplicity as per instructions)
        // "CRITICAL: Calculate the next run (add 24 hours) and update the nextScheduledRun"
        const nextRun = new Date(reminder.nextScheduledRun.toDate());
        nextRun.setHours(nextRun.getHours() + 24);
        
        batch.update(doc.ref, { nextScheduledRun: nextRun });
      })());
    }

    await Promise.all(notifications);
    await batch.commit();
    console.log(`Processed ${remindersSnapshot.size} reminders.`);

  } catch (error) {
    console.error("Error in sendReminders:", error);
  }
});

// Cron Job 2: Daily SOS Check-in (Every day at 20:00)
exports.sendSOSCheckin = onSchedule("every day 20:00", async (event) => {
  try {
    // Query users who have at least one active SOS reminder
    // Note: Collection Group Query for 'reminders' where isSOS == true
    const sosRemindersSnapshot = await db.collectionGroup("reminders")
      .where("isActive", "==", true)
      .where("isSOS", "==", true)
      .get();

    if (sosRemindersSnapshot.empty) {
      console.log("No SOS reminders found.");
      return;
    }

    // Get unique user IDs
    const userIds = new Set();
    sosRemindersSnapshot.forEach(doc => {
      const parentUserRef = doc.ref.parent.parent;
      if (parentUserRef) userIds.add(parentUserRef.id);
    });

    for (const uid of userIds) {
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      const tokens = userData.fcmTokens || [];

      if (tokens.length > 0) {
        const message = {
          notification: {
            title: "Daily Check-in",
            body: "Did you need any of your SOS medications today? Tap to log.",
          },
          tokens: tokens,
        };

        try {
          await admin.messaging().sendEachForMulticast(message);
          console.log(`SOS Check-in sent to user ${uid}`);
        } catch (err) {
          console.error(`Error sending SOS check-in to ${uid}:`, err);
        }
      }
    }

  } catch (error) {
    console.error("Error in sendSOSCheckin:", error);
  }
});
