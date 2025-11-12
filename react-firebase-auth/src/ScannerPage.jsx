import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, auth, db } from './firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ScannerPage = () => {
  const [file, setFile] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState(null);
  const [crossCheckWarnings, setCrossCheckWarnings] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  // Save / reminder state
  const [isSaving, setIsSaving] = useState(false);
  const [scanSavedId, setScanSavedId] = useState(null);
  const [reminderFormForIndex, setReminderFormForIndex] = useState(null);
  const [reminderSchedule, setReminderSchedule] = useState('');
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);

  // 1. When a user selects a file
  const handleFileChange = (e) => {
    setError(null);
    setScanResults(null);
    setCrossCheckWarnings([]);
    setScanSavedId(null);
    setReminderFormForIndex(null);
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Convert the file to Base64
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
    setScanResults(null);
    setCrossCheckWarnings([]);
    setScanSavedId(null);
    setReminderFormForIndex(null);

    try {
      const scanPrescription = httpsCallable(functions, 'scanPrescription');
      const base64Data = base64Image.split(',')[1];
      const result = await scanPrescription({ imageData: base64Data });

      // Backend may add isPrescription flag
      if (result?.data?.data?.isPrescription === false) {
        setError("This does not appear to be a prescription.");
        setIsScanning(false);
        return;
      }

      const newMedicines = result?.data?.data?.medicines || [];
      setScanResults(newMedicines);

      // Kick off cross-check
      setIsChecking(true);
      const crossCheckMedication = httpsCallable(functions, 'crossCheckMedication');
      // backend expects { scannedMeds: [...] }
      const crossCheckResult = await crossCheckMedication({ scannedMeds: newMedicines });
      const interactions = crossCheckResult?.data?.data?.interactions || [];
      setCrossCheckWarnings(interactions);
    } catch (err) {
      console.error("Error during scan or cross-check:", err);
      // Prefer user-friendly message but include details in console
      setError(err?.message || "An error occurred. Please try again.");
    } finally {
      setIsChecking(false);
      setIsScanning(false);
    }
  };

  // Save scanned data to users/{uid}/scan_history and set scanSavedId
  const handleSave = async (userOverride = false) => {
    if (!auth?.currentUser) {
      setError("You must be signed in to save scans.");
      return null;
    }
    if (!scanResults) {
      setError("No scan results to save.");
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        scannedAt: serverTimestamp(),
        medicines: scanResults,
        warningsReceived: Array.isArray(crossCheckWarnings) && crossCheckWarnings.length > 0,
        userOverride: !!userOverride
      };
      const ref = await addDoc(collection(db, `users/${auth.currentUser.uid}/scan_history`), payload);
      setScanSavedId(ref.id);
      return ref.id;
    } catch (e) {
      console.error("Failed to save scan history:", e);
      setError("Failed to save scan.");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Create a reminder doc for a specific med (by index)
  // If the scan isn't saved yet, auto-save it first and then create the reminder linking to scanSavedId
  const handleCreateReminderForMed = async (index) => {
    if (!auth?.currentUser) {
      setError("You must be signed in to set reminders.");
      return;
    }
    if (!scanResults || !scanResults[index]) {
      setError("Selected medicine not found.");
      return;
    }

    setError(null);
    setIsCreatingReminder(true);

    try {
      // ensure scan saved
      let localScanId = scanSavedId;
      if (!localScanId) {
        const createdId = await handleSave(false);
        if (!createdId) {
          setError("Failed to save scan — cannot create reminder.");
          setIsCreatingReminder(false);
          return;
        }
        localScanId = createdId;
      }

      // Build reminder doc (MVP: free-text schedule)
      const med = scanResults[index];
      const reminderDoc = {
        medName: med.name || '',
        dosage: med.dosage || '',
        duration: med.duration || '',
        createdAt: serverTimestamp(),
        sourceScanId: localScanId,
        schedule: reminderSchedule || '',
        enabled: true
      };

      await addDoc(collection(db, `users/${auth.currentUser.uid}/reminders`), reminderDoc);

      // UI feedback
      setReminderFormForIndex(null);
      setReminderSchedule('');
    } catch (e) {
      console.error("Failed to create reminder:", e);
      setError("Failed to create reminder.");
    } finally {
      setIsCreatingReminder(false);
    }
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
        
        {/* Image Preview */}
        {base64Image && (
          <img 
            src={base64Image} 
            alt="Prescription preview" 
            className="mt-4 w-full max-w-md rounded-lg shadow-lg border border-white/30"
          />
        )}

        {/* Scan Button */}
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
          ) : (
            'Scan Prescription'
          )}
        </button>

        {/* Error Message */}
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Results Display */}
      {scanResults && (
        <div className="space-y-4">
          <h3 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50">
            Scan Results
          </h3>
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
                    {/* Save scan quick action */}
                    <button
                      onClick={() => handleSave(false)}
                      disabled={isSaving}
                      className="px-3 py-1 bg-blue-600 text-white rounded"
                    >
                      {isSaving ? 'Saving...' : (scanSavedId ? 'Saved' : 'Save Scan')}
                    </button>

                    {/* Set Reminder button */}
                    <button
                      onClick={() => setReminderFormForIndex(index)}
                      className="px-3 py-1 bg-green-600 text-white rounded"
                    >
                      Set Reminder
                    </button>
                  </div>
                </div>

                {/* Inline reminder form (MVP) */}
                {reminderFormForIndex === index && (
                  <div className="mt-3 p-3 border rounded bg-gray-50">
                    <label className="block text-sm font-medium mb-1">Schedule (free-text)</label>
                    <input
                      type="text"
                      placeholder="e.g., Every day 9:00 AM"
                      value={reminderSchedule}
                      onChange={(e) => setReminderSchedule(e.target.value)}
                      className="w-full px-3 py-2 rounded border"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleCreateReminderForMed(index)}
                        disabled={isCreatingReminder}
                        className="px-3 py-1 bg-indigo-600 text-white rounded"
                      >
                        {isCreatingReminder ? 'Creating...' : 'Create Reminder'}
                      </button>
                      <button
                        onClick={() => { setReminderFormForIndex(null); setReminderSchedule(''); }}
                        className="px-3 py-1 bg-gray-300 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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
