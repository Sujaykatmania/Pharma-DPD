import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const ScannerPage = () => {
    const [imageFile, setImageFile] = useState(null);
    const [imageBase64, setImageBase64] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState([]);
    const [error, setError] = useState("");

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageBase64(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleScan = async () => {
        if (!imageBase64) return;
        setIsScanning(true);
        setError("");
        setScanResults([]);
        const scanPrescription = httpsCallable(functions, 'scanPrescription');
        try {
            const result = await scanPrescription({ imageData: imageBase64 });
            setScanResults(result.data.medicines);
        } catch (error) {
            console.error("Error scanning prescription: ", error);
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
                    className="w-full max-w-md px-4 py-2 text-slate-800 placeholder-gray-700 bg-white/30 border border-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                    onClick={handleScan}
                    disabled={!imageBase64 || isScanning}
                    className="px-6 py-3 bg-gradient-to-br from-blue-600/80 to-blue-900/80 hover:from-blue-600 hover:to-blue-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50"
                >
                    {isScanning ? "Scanning..." : "Scan Prescription"}
                </button>
            </div>
            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            {scanResults.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-2xl font-bold text-center text-white text-shadow-sm mb-4">Scan Results</h3>
                    <ul className="space-y-4">
                        {scanResults.map((med, index) => (
                            <li key={index} className="bg-white/20 p-4 rounded-lg shadow-md">
                                <p><strong>Name:</strong> {med.name}</p>
                                <p><strong>Dosage:</strong> {med.dosage}</p>
                                <p><strong>Duration:</strong> {med.duration}</p>
                                <p><strong>Generic Alternative:</strong> {med.genericAlternative}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export { ScannerPage };
