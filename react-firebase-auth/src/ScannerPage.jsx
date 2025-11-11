import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const scanPrescription = httpsCallable(functions, 'scanPrescription');

const ScannerPage = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    const [error, setError] = useState(null);
    const [imageData, setImageData] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageData(reader.result.split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleScan = async () => {
        if (!imageData) {
            setError("Please select an image first.");
            return;
        }
        setIsScanning(true);
        setError(null);
        setScanResults(null);
        try {
            const result = await scanPrescription({ imageData });
            setScanResults(result.data.medicines);
        } catch (error) {
            console.error("Error scanning prescription:", error);
            setError("An error occurred during scanning.");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50">Scan Prescription</h2>
            <div className="flex flex-col items-center gap-4">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full max-w-xs px-4 py-2 text-slate-800 placeholder-gray-700 bg-white/30 border border-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                    onClick={handleScan}
                    className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50"
                    disabled={isScanning}
                >
                    {isScanning ? 'Scanning...' : 'Scan Prescription'}
                </button>
            </div>
            {error && <p className="text-red-500 bg-white/80 rounded-md p-2 text-sm text-center mt-2">{error}</p>}
            {scanResults && (
                <div className="mt-6 space-y-4">
                    <h3 className="text-slate-800 font-semibold text-lg text-shadow-sm">Scan Results:</h3>
                    <ul className="space-y-2">
                        {scanResults.map((med, index) => (
                            <li key={index} className="bg-purple-600/80 text-white font-bold rounded-lg p-4 shadow-md">
                                <p>Name: {med.name}</p>
                                <p>Dosage: {med.dosage}</p>
                                <p>Duration: {med.duration}</p>
                                <p>Generic Alternative: {med.genericAlternative}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export { ScannerPage };
