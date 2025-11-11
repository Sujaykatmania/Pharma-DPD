import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const ScannerPage = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    const [error, setError] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
                setImageBase64(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleScan = async () => {
        if (!imageBase64) {
            setError("Please select an image first.");
            return;
        }
        setIsScanning(true);
        setError(null);
        setScanResults(null);
        const scanPrescription = httpsCallable(functions, 'scanPrescription');
        try {
            const result = await scanPrescription({ imageData: imageBase64 });
            setScanResults(result.data.medicines);
        } catch (error) {
            console.error("Error scanning prescription:", error);
            setError("An error occurred while scanning the prescription.");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50">Prescription Scanner</h2>
            <div className="flex flex-col items-center gap-4">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
                <button
                    onClick={handleScan}
                    disabled={isScanning || !imageBase64}
                    className="px-4 py-2 bg-gradient-to-br from-blue-600/80 to-blue-900/80 hover:from-blue-600 hover:to-blue-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isScanning ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        'Scan Prescription'
                    )}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-1 text-center">{error}</p>}
            {scanResults && (
                <div className="mt-6">
                    <h3 className="text-slate-800 font-semibold text-lg text-shadow-sm">Scan Results</h3>
                    <ul className="space-y-4 mt-2">
                        {scanResults.map((medicine, index) => (
                            <li key={index} className="bg-white/30 p-4 rounded-lg shadow-md">
                                <p><span className="font-bold">Name:</span> {medicine.name}</p>
                                <p><span className="font-bold">Dosage:</span> {medicine.dosage}</p>
                                <p><span className="font-bold">Duration:</span> {medicine.duration}</p>
                                <p><span className="font-bold">Generic Alternative:</span> {medicine.genericAlternative}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export { ScannerPage };
