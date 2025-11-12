import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const ScannerPage = () => {
  const [file, setFile] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState(null);
  const [crossCheckWarnings, setCrossCheckWarnings] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  // 1. When a user selects a file
  const handleFileChange = (e) => {
    setError(null);
    setScanResults(null);
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

    try {
      const scanPrescription = httpsCallable(functions, 'scanPrescription');
      const base64Data = base64Image.split(',')[1];
      const result = await scanPrescription({ imageData: base64Data });

      if (result.data.data.isPrescription === false) {
        setError("This does not appear to be a prescription.");
        setIsScanning(false);
        return;
      }

      const newMedicines = result.data.data.medicines;
      setScanResults(newMedicines);

      setIsChecking(true);
      const crossCheckMedication = httpsCallable(functions, 'crossCheckMedication');
      const crossCheckResult = await crossCheckMedication({ newMedicines });
      setCrossCheckWarnings(crossCheckResult.data.data.interactions);
    } catch (error) {
      console.error("Error during scan or cross-check:", error);
      setError("An error occurred. Please try again.");
    }
    setIsChecking(false);
    setIsScanning(false);
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
                <p className="text-xl font-bold text-slate-800">{med.name}</p>
                <p className="text-slate-700"><strong>Generic:</strong> {med.genericAlternative}</p>
                <p className="text-slate-700"><strong>Dosage:</strong> {med.dosage}</p>
                <p className="text-slate-700"><strong>Duration:</strong> {med.duration}</p>
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