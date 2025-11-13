import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, auth, db } from './firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';

const SkeletonLoader = () => (
    <div className="space-y-4">
        {/* ... (skeleton loader code is unchanged) ... */}
        <div className="bg-white/20 p-4 rounded-lg shadow-md border border-white/40 animate-pulse">
            <div className="h-4 bg-white/30 rounded w-3/4"></div>
            <div className="h-4 bg-white/30 rounded w-1/2 mt-2"></div>
        </div>
        <div className="bg-white/20 p-4 rounded-lg shadow-md border border-white/40 animate-pulse">
            <div className="h-4 bg-white/30 rounded w-3/4"></div>
            <div className="h-4 bg-white/30 rounded w-1/2 mt-2"></div>
        </div>
        <div className="bg-white/20 p-4 rounded-lg shadow-md border border-white/40 animate-pulse">
            <div className="h-4 bg-white/30 rounded w-3/4"></div>
            <div className="h-4 bg-white/30 rounded w-1/2 mt-2"></div>
        </div>
    </div>
);

const ScannerPage = ({ setIsAppBusy }) => {
  const [file, setFile] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState(null);
  const [crossCheckWarnings, setCrossCheckWarnings] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- REMINDER STATE ---
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);
  const [parsedSchedules, setParsedSchedules] = useState({});
  const [reminderConfirmForIndex, setReminderConfirmForIndex] = useState(null);

  // 1. When a user selects a file
  const handleFileChange = (e) => {
    setError(null);
    setScanResults(null);
    setCrossCheckWarnings([]);
    setReminderConfirmForIndex(null);
    setParsedSchedules({});
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = () => {
        setBase64Image(reader.result);
      };
      reader.onerror = (error) => {
        console.error("Error converting file to Base64:", error);
        setError("Failed to read the image file.");
      };
    }
  };

  // 2. When the "Scan" button is clicked
  const handleScan = async () => {
    if (!base64Image) {
      setError("Please select an image first.");
      return;
    }

    setError(null);
    setIsScanning(true);
    setIsAppBusy(true);
    setScanResults(null);
    setCrossCheckWarnings([]);
    setParsedSchedules({});
    setReminderConfirmForIndex(null);

    try {
      const scanPrescription = httpsCallable(functions, 'scanPrescription');
      const base64Data = base64Image.split(',')[1];
      const result = await scanPrescription({ imageData: base64Data });

      if (result?.data?.data?.isPrescription === false) {
        setError("This does not appear to be a prescription.");
        setIsScanning(false);
        setIsAppBusy(false);
        return;
      }

      const newMedicines = result?.data?.data?.medicines || [];
      setScanResults(newMedicines);

      // Kick off cross-check
      setIsChecking(true);
      const crossCheckMedication = httpsCallable(functions, 'crossCheckMedication');
      const crossCheckResult = await crossCheckMedication({ newMedicines: newMedicines });
      const interactions = crossCheckResult?.data?.data?.interactions || [];
      setCrossCheckWarnings(interactions);
      setIsChecking(false);

      // Parse schedules for all new meds
      if (newMedicines.length > 0) {
        const schedulePromises = newMedicines.map((med) => {
          if (med.dosage && med.duration) {
            const parseSchedule = httpsCallable(functions, 'parseSchedule');
            return parseSchedule({ dosage: med.dosage, duration: med.duration });
          }
          return Promise.resolve(null);
        });
        const scheduleResults = await Promise.all(schedulePromises);
        const newParsedSchedules = {};
        scheduleResults.forEach((result, index) => {
          if (result) {
            newParsedSchedules[index] = result.data.data;
          }
        });
        setParsedSchedules(newParsedSchedules);
      }
    } catch (err) {
      console.error("Error during scan or cross-check:", err);
      setError(err?.message || "An error occurred. Please try again.");
    } finally {
      setIsScanning(false);
      setIsAppBusy(false);
    }
  };

  // --- THIS IS THE FIX ---
  // This function now *actually* saves the reminder to Firestore
  const handleConfirmReminder = async (index) => {
    if (!auth?.currentUser) {
      setError("You must be signed in to set reminders.");
      return;
    }
    const med = scanResults[index];
    const schedule = parsedSchedules[index];

    if (!med || !schedule) {
      setError("Could not find medicine or schedule data.");
      return;
    }

    setIsCreatingReminder(true);
    try {
      // Create a new document in the 'reminders' sub-collection
      const reminderDoc = {
        medName: med.name,
        dosage: med.dosage,
        durationInDays: schedule.for_x_days,
        timesPerDay: schedule.times_per_day,
        isPRN: schedule.is_prn || false, // 'as needed'
        createdAt: serverTimestamp(),
        isActive: true
      };

      await addDoc(collection(db, `users/${auth.currentUser.uid}/reminders`), reminderDoc);
      
      // Close the confirmation box
      setReminderConfirmForIndex(null);

    } catch (e) {
      console.error("Failed to create reminder:", e);
      setError("Failed to create reminder.");
    }
    setIsCreatingReminder(false);
  };
  
  // --- THIS IS THE OTHER FIX ---
  // This logic was missing from the last file.
  const handleSaveMeds = async () => {
    if (!scanResults || !auth.currentUser) return;

    setIsSaving(true);
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const validateMedicalTerm = httpsCallable(functions, 'validateMedicalTerm');

    let savedCount = 0;
    for (const med of scanResults) {
      try {
        const result = await validateMedicalTerm({ text: med.name, category: 'current_meds' });
        const { isValid, correctedTerm } = result.data.data;
        if (isValid) {
          await updateDoc(userDocRef, { current_meds: arrayUnion(correctedTerm) });
          savedCount++;
        }
      } catch (error) {
        console.error("Error validating/saving med:", error);
      }
    }
    console.log(`Successfully saved ${savedCount} medicines to profile.`);
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50">
        Prescription Scanner
      </h2>
      
      {/* File Upload Input */}
      <div className="flex flex-col items-center gap-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                     file:text-sm file:font-semibold file:bg-white/30 file:text-slate-800
                     hover:file:bg-white/50 text-slate-800 text-shadow-sm"
        />
        
        {base64Image && (
          <img 
            src={base64Image} 
            alt="Prescription preview" 
            className="mt-4 w-full max-w-md rounded-lg shadow-lg border border-white/30"
          />
        )}

        <button
          onClick={handleScan}
          disabled={isScanning || !file}
          className="w-full max-w-md py-3 px-4 bg-gradient-to-br from-blue-600/80 to-blue-900/80 hover:from-blue-600 hover:to-blue-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50"
        >
          {isScanning ? (
            <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Scan Prescription'}
        </button>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {isScanning && <SkeletonLoader />}

      {/* Results Display */}
      {scanResults && (
        <div className="space-y-4">
          <h3 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50">
            Scan Results
          </h3>
          <button 
            onClick={handleSaveMeds} 
            disabled={isSaving}
            className="w-full max-w-md py-3 px-4 bg-gradient-to-br from-green-600/80 to-green-900/80 hover:from-green-600 hover:to-green-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Scanned Medicines to Profile'}
          </button>
          
          {scanResults.length > 0 ? (
            scanResults.map((med, index) => (
              <div key={index} className="bg-white/30 p-4 rounded-lg shadow-md border border-white/40">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-xl font-bold text-slate-800">{med.name}</p>
                    <p className="text-slate-700"><strong>Generic:</strong> {med.genericAlternative}</p>
                    <p className="text-slate-700"><strong>Dosage:</strong> {med.dosage}</p>
                    <p className="text-slate-700"><strong>Duration:</strong> {med.duration}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* "Set Reminder" button */}
                    <button
                      onClick={() => setReminderConfirmForIndex(index)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded shadow-md"
                    >
                      Set Reminder
                    </button>
                  </div>
                </div>

                {/* -- NEW: Smart Reminder Confirmation -- */}
                {reminderConfirmForIndex === index && parsedSchedules[index] && (
                  <div className="mt-3 p-3 border rounded bg-green-100/80 text-slate-800">
                    <p className="font-semibold">
                      Detected a schedule of {parsedSchedules[index].times_per_day} times per day for {parsedSchedules[index].for_x_days} days.
                    </p>
                    <p>Would you like to schedule these reminders?</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleConfirmReminder(index)}
                        disabled={isCreatingReminder}
                        className="px-3 py-1 bg-indigo-600 text-white rounded shadow-md disabled:opacity-50"
                      >
                        {isCreatingReminder ? 'Saving...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setReminderConfirmForIndex(null)}
                        className="px-3 py-1 bg-gray-400 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {/* --- This was the part that was broken --- */}
              </div>
            ))
          ) : (
            <p className="text-center text-slate-700">No medicines found in the image.</p>
          )}
        </div>
      )}

      {/* Cross-Check Results */}
      {isChecking && (
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-white/80 mt-2">Cross-checking with your profile...</p>
        </div>
      )}

      {crossCheckWarnings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-3xl font-bold text-center text-red-500">
            Cross-Check Warnings
          </h3>
          <div className="bg-red-500/80 p-4 rounded-lg shadow-md border border-white/40">
            {crossCheckWarnings.map((warning, index) => (
              <div key={index} className="mb-2">
                <p className="text-xl font-bold text-white">{warning.type}</p>
                <p className="text-white">{warning.warning}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { ScannerPage };