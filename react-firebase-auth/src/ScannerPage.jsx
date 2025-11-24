import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from './firebase';
import { doc, collection, addDoc, serverTimestamp, updateDoc, arrayUnion, query, where, getDocs } from 'firebase/firestore';
import CameraComponent from './CameraComponent';

const SkeletonLoader = () => (
    <div className="space-y-4">
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

const ScannerPage = ({ user, setIsAppBusy }) => {
    // Changed: Store array of base64 strings
    const [base64Images, setBase64Images] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    const [error, setError] = useState(null);
    const [crossCheckWarnings, setCrossCheckWarnings] = useState([]);
    const [isChecking, setIsChecking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [medsHaveBeenSaved, setMedsHaveBeenSaved] = useState(false);

    const [isCreatingReminder, setIsCreatingReminder] = useState(false);
    const [parsedSchedules, setParsedSchedules] = useState({});
    const [reminderConfirmForIndex, setReminderConfirmForIndex] = useState(null);
    const [addedReminders, setAddedReminders] = useState([]);

    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const MAX_IMAGES = 3;

    const resetScanState = () => {
        setError(null);
        setScanResults(null);
        setCrossCheckWarnings([]);
        setReminderConfirmForIndex(null);
        setParsedSchedules({});
        setAddedReminders([]);
        setMedsHaveBeenSaved(false);
    };

    // Helper: Compress image
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileChange = async (e) => {
        resetScanState();
        const files = Array.from(e.target.files);

        if (files.length + base64Images.length > MAX_IMAGES) {
            setError(`You can only select a maximum of ${MAX_IMAGES} images.`);
            return;
        }

        try {
            const compressedImages = await Promise.all(files.map(file => compressImage(file)));
            setBase64Images(prev => [...prev, ...compressedImages]);
        } catch (err) {
            console.error("Error compressing images:", err);
            setError("Failed to process images.");
        }
    };

    const handlePhotoCapture = async (capturedImageSrc) => {
        resetScanState();
        if (base64Images.length >= MAX_IMAGES) {
            setError(`You can only select a maximum of ${MAX_IMAGES} images.`);
            setIsCameraOpen(false);
            return;
        }

        // Even though capturedImageSrc is already base64, we might want to ensure it's compressed/resized if the camera component returns full res.
        // For now, assuming CameraComponent returns a reasonable size or we can pass it through compressImage logic if we convert it to a Blob/File first.
        // But to keep it simple and consistent, let's just add it. If needed, we can add compression here too.
        // Actually, let's be safe and compress it too by creating a temporary Image object.
        
        try {
             // Create a blob from base64 to reuse compressImage or just duplicate logic?
             // Let's duplicate the canvas logic for base64 string input
             const img = new Image();
             img.src = capturedImageSrc;
             img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                
                setBase64Images(prev => [...prev, compressedDataUrl]);
                setIsCameraOpen(false);
             };
        } catch (err) {
             console.error("Error processing captured photo:", err);
             setError("Failed to process captured photo.");
             setIsCameraOpen(false);
        }
    };

    const handleRemoveImage = (indexToRemove) => {
        setBase64Images(prev => prev.filter((_, index) => index !== indexToRemove));
        resetScanState();
    };

    const handleCancelCamera = () => {
        setIsCameraOpen(false);
    };

    const handleScan = async () => {
        if (base64Images.length === 0) {
            setError("Please select at least one image.");
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
            // Send array of base64 strings (stripping the prefix)
            const imagesData = base64Images.map(img => img.split(',')[1]);
            
            const result = await scanPrescription({ images: imagesData });

            if (result?.data?.data?.isPrescription === false) {
                setError("This does not appear to be a valid prescription. Please ensure the image is clear and contains a doctor's signature or clinic letterhead.");
                setIsScanning(false);
                setIsAppBusy(false);
                return;
            }

            const newMedicines = result?.data?.data?.medicines || [];
            setScanResults(newMedicines);
            setIsScanning(false);

            setIsChecking(true);
            const crossCheckMedication = httpsCallable(functions, 'crossCheckMedication');
            const crossCheckResult = await crossCheckMedication({ newMedicines: newMedicines });
            const interactions = crossCheckResult?.data?.data?.interactions || [];
            setCrossCheckWarnings(interactions);
            setIsChecking(false);

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

    const handleConfirmReminder = async (index) => {
        if (!user) {
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
        setError(null);

        try {
            const remindersRef = collection(db, `users/${user.uid}/reminders`);
            const q = query(remindersRef, where("medName", "==", med.name));
            const existingDocs = await getDocs(q);

            if (!existingDocs.empty) {
                setError("A reminder for this medicine already exists.");
                setIsCreatingReminder(false);
                return;
            }

            const reminderDoc = {
                medName: med.name,
                dosage: med.dosage,
                durationInDays: schedule.for_x_days,
                isOngoing: schedule.for_x_days === null,
                timesPerDay: schedule.times_per_day,
                isPRN: schedule.is_prn || false,
                createdAt: serverTimestamp(),
                isActive: true
            };

            await addDoc(remindersRef, reminderDoc);

            setAddedReminders(prev => [...prev, index]);
            setReminderConfirmForIndex(null);

        } catch (e) {
            console.error("Failed to create reminder:", e);
            setError("Failed to create reminder.");
        }
        setIsCreatingReminder(false);
    };

    const handleSaveMeds = async () => {
        if (!scanResults || !user) return;

        setIsSaving(true);
        const userDocRef = doc(db, "users", user.uid);
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
        setMedsHaveBeenSaved(true);
    };

    return (
        <div className="space-y-6">
            {isCameraOpen && (
                <CameraComponent
                    onPhotoTaken={handlePhotoCapture}
                    onCancel={handleCancelCamera}
                />
            )}

            <h2 className="text-5xl font-bold text-center animated-gradient-header">
                Prescription Scanner
            </h2>

            <div className="flex flex-col items-center gap-4">

                <div className="flex gap-4 w-full max-w-md">
                    <button
                        onClick={() => {
                            if (base64Images.length >= MAX_IMAGES) {
                                setError(`You can only select a maximum of ${MAX_IMAGES} images.`);
                            } else {
                                setIsCameraOpen(true);
                            }
                        }}
                        disabled={base64Images.length >= MAX_IMAGES}
                        className="flex-1 py-3 px-4 bg-gradient-to-br from-blue-600/80 to-purple-900/80 hover:from-blue-600 hover:to-purple-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Use Camera
                    </button>
                    
                    <label className={`flex-1 flex items-center justify-center py-3 px-4 bg-white/20 hover:bg-white/30 text-slate-800 font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 cursor-pointer ${base64Images.length >= MAX_IMAGES ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        Upload File
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                            disabled={base64Images.length >= MAX_IMAGES}
                            className="hidden"
                        />
                    </label>
                </div>

                <p className="text-slate-600 text-sm">
                    {base64Images.length} / {MAX_IMAGES} images selected
                </p>

                {/* Thumbnails Grid */}
                {base64Images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 w-full max-w-md">
                        {base64Images.map((img, index) => (
                            <div key={index} className="relative group">
                                <img
                                    src={img}
                                    alt={`Prescription page ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg shadow border border-white/30"
                                />
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                    aria-label="Remove image"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={handleScan}
                    disabled={isScanning || base64Images.length === 0}
                    className="w-full max-w-md py-3 px-4 bg-gradient-to-br from-blue-600/80 to-purple-900/80 hover:from-blue-600 hover:to-purple-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50"
                >
                    {isScanning ? (
                        <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : 'Scan Prescription'}
                </button>

                {error && <p className="text-red-500 text-sm mt-2 text-center px-4">{error}</p>}
            </div>

            {isScanning && <SkeletonLoader />}

            {scanResults && (
                <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-center animated-gradient-header">
                        Scan Results
                    </h3>
                    <button
                        onClick={handleSaveMeds}
                        disabled={isSaving || medsHaveBeenSaved}
                        className="w-full max-w-md py-3 px-4 bg-gradient-to-br from-green-600/80 to-green-900/80 hover:from-green-600 hover:to-green-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:from-gray-500 disabled:to-gray-600 disabled:shadow-none disabled:hover:from-gray-600"
                    >
                        {isSaving
                            ? 'Saving...'
                            : medsHaveBeenSaved
                                ? 'Medicines Saved'
                                : 'Save Scanned Medicines to Profile'}
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
                                                disabled
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
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-slate-700">No medicines found in the image.</p>
                    )}
                </div>
            )}

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
