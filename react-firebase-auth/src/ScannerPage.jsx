import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, auth, db } from './firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, arrayUnion, query, where, getDocs } from 'firebase/firestore';
import CameraComponent from './CameraComponent'; // --- NEW: Import the CameraComponent ---

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
  const [addedReminders, setAddedReminders] = useState([]);

  // --- NEW: State to control the camera modal ---
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // --- NEW: Function to reset states, used by both file/camera ---
  const resetScanState = () => {
    setError(null);
    setScanResults(null);
    setCrossCheckWarnings([]);
    setReminderConfirmForIndex(null);
    setParsedSchedules({});
    setAddedReminders([]);
  };

  // 1. When a user selects a file
  const handleFileChange = (e) => {
    resetScanState(); // --- MODIFIED: Use the reset function ---
    setBase64Image(null); // Clear previous preview
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
    } else {
      setFile(null); // User cancelled file picker
    }
  };

  // --- NEW: Function to handle photo taken from CameraComponent ---
  const handlePhotoCapture = (capturedImageSrc) => {
    resetScanState(); // Reset all results
    setFile(null); // We don't have a file object, just base64
    setBase64Image(capturedImageSrc); // Set the new image
    setIsCameraOpen(false); // Close the camera
  };

  // --- NEW: Function to cancel the camera ---
  const handleCancelCamera = () => {
    setIsCameraOpen(false);
  };

  // 2. When the "Scan" button is clicked
  const handleScan = async () => {
    if (!base64Image) { // --- MODIFIED: Check for base64Image, not file ---
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
      setIsScanning(false);

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
     setIsAppBusy(false);
    }
  };

  // --- (handleConfirmReminder function is unchanged) ---
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
    setError(null); // Clear previous errors

    try {
      // --- DEDUPLICATION LOGIC ---
      const remindersRef = collection(db, `users/${auth.currentUser.uid}/reminders`);
      const q = query(remindersRef, where("medName", "==", med.name));
      const existingDocs = await getDocs(q);

      if (!existingDocs.empty) {
        setError("A reminder for this medicine already exists.");
        setIsCreatingReminder(false);
        return; // Stop execution
      }
      // --- END DEDUPLICATION ---

      // Create a new document in the 'reminders' sub-collection
      const reminderDoc = {
        medName: med.name,
        dosage: med.dosage,
        durationInDays: schedule.for_x_days,
        isOngoing: schedule.for_x_days === null,
        timesPerDay: schedule.times_per_day,
        isPRN: schedule.is_prn || false, // 'as needed'
        createdAt: serverTimestamp(),
        isActive: true
      };

      await addDoc(remindersRef, reminderDoc);
      
      setAddedReminders(prev => [...prev, index]);
      // Close the confirmation box
      setReminderConfirmForIndex(null);

    } catch (e) {
      console.error("Failed to create reminder:", e);
      setError("Failed to create reminder.");
    }
    setIsCreatingReminder(false);
  };
  
// --- (handleSaveMeds function is unchanged) ---
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
      {/* --- NEW: Conditionally render the camera modal --- */}
      {isCameraOpen && (
        <CameraComponent 
          onPhotoTaken={handlePhotoCapture}
          onCancel={handleCancelCamera}
        />
      )}

      <h2 className="text-5xl font-bold text-center animated-gradient-header">
                Prescription Scanner
      </h2>
      
      {/* File Upload Input */}
      <div className="flex flex-col items-center gap-4">

        {/* --- NEW: Button to open the camera --- */}
        <button
          onClick={() => setIsCameraOpen(true)}
          className="w-full max-w-md py-3 px-4 bg-gradient-to-br from-blue-600/80 to-purple-900/80 hover:from-blue-600 hover:to-purple-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95"
        >
          Use Camera
        </button>

        <p className="text-slate-700 text-shadow-sm my-1">-- OR --</p>
        
        {/* --- MODIFIED: Added a label for clarity --- */}
        <label className="text-slate-800 text-shadow-sm">Choose a file from your device:</label>
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
          // --- MODIFIED: Disable based on base64Image, not file ---
          disabled={isScanning || !base64Image}
          className="w-full max-w-md py-3 px-4 bg-gradient-to-br from-blue-600/80 to-purple-900/80 hover:from-blue-600 hover:to-purple-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50"
        >
          {isScanning ? (
            <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
mit           </svg>
          ) : 'Scan Prescription'}
        </button>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {isScanning && <SkeletonLoader />}

      {/* --- (Results Display section is unchanged) --- */}
      {scanResults && (
        <div className="space-y-4">
          <h3 className="text-3xl font-bold text-center animated-gradient-header">
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
                    {addedReminders.includes(index) ? (
                        <button
                    t       disabled
                            className="px-3 py-1 bg-gray-500 text-white rounded shadow-md"
                        >
                            Reminder Added
                        </button>
                    ) : (
                        <button
                            onClick={() => setReminderConfirmForIndex(index)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded shadow-md"
                        >
                            Set Reminder
                        </button>
                    )}
                  </div>
                </div>

                {/* -- NEW: Smart Reminder Confirmation -- */}
                {reminderConfirmForIndex === index && parsedSchedules[index] && (
                  <div className="mt-3 p-3 border rounded bg-green-100/80 text-slate-800">
                    <p className="font-semibold">
                    {parsedSchedules[index].for_x_days !== null
                        ? `Detected a schedule of ${parsedSchedules[index].times_per_day} times per day for ${parsedSchedules[index].for_x_days} days.`
                        : `Detected a schedule of ${parsedSchedules[index].times_per_day} times per day for an ongoing duration. This reminder will be 'Active' until you pause it.`
                    }                    
                    </p>
                    <p>Would you like to schedule these reminders?</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleConfirmReminder(index)}
                        disabled={isCreatingReminder}
                        className="px-3 py-1 bg-indigo-600 text-white rounded shadow-md disabled:opacity-50"
                      >
                        {isCreatingReminder ? 'Saving...' : 'Confirm'}
mit                     </button>
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

      {/* --- (Cross-Check Results section is unchanged) --- */}
      {isChecking && (
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
t         </svg>
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
nbsp;             <p className="text-white">{warning.warning}</p>
              </div>
        ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { ScannerPage };