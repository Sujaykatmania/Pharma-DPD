import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { auth, db, functions } from './firebase'; 
import { httpsCallable } from 'firebase/functions';

const Profile = () => {
    const [userData, setUserData] = useState({
        gender: "",
        allergies: [],
        current_meds: [],
        conditions: []
    });
    const [newAllergy, setNewAllergy] = useState("");
    const [newMed, setNewMed] = useState("");
    const [newCondition, setNewCondition] = useState("");
    const [isEditingGender, setIsEditingGender] = useState(false);
    
    // We can have a separate error for each form
    const [allergyError, setAllergyError] = useState(null);
    const [medError, setMedError] = useState(null);
    const [conditionError, setConditionError] = useState(null);
    
    const [loading, setLoading] = useState(null); // Tracks 'allergies', 'meds', 'conditions'

    useEffect(() => {
        if (auth.currentUser) {
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            const unsubscribe = onSnapshot(userDocRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
            });
            return () => unsubscribe();
        }
    }, []);

    const handleGenderChange = async (e) => {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userDocRef, { gender: e.target.value });
        setIsEditingGender(false);
    };

    const handleDeleteItem = async (field, itemToRemove) => {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userDocRef, { [field]: arrayRemove(itemToRemove) });
    };

    // --- THIS IS THE REAL 'handleAddItem' ---
    const handleAddItem = async (field, value, setValue, setError) => {
      setError(null);
      if (value.trim() === "") return; // Don't run on empty string

      setLoading(field); // Set loading for this specific field
      
      try {
        // 1. Call the REAL validator function
        const validateMedicalTerm = httpsCallable(functions, 'validateMedicalTerm');
        const result = await validateMedicalTerm({ text: value, category: field });

        const { isValid, correctedTerm, reason } = result.data.data; // Access the nested 'data' object

        if (isValid) {
          // 2. Add the *corrected* term to Firestore
          const userDocRef = doc(db, "users", auth.currentUser.uid);
          await updateDoc(userDocRef, { [field]: arrayUnion(correctedTerm) });
          setValue(""); // Clear the input field
        } else {
          // 3. Show a user-friendly error
          setError(reason || `'${value}' is not a recognized medical term.`);
        }   

      } catch (error) {
        console.error("Error validating term:", error);
        setError("An error occurred. Please try again.");
      }
      setLoading(null); // Clear loading state
    };

    const renderListAndForm = (title, list, value, setValue, fieldName, placeholder, error, setError) => (
        <div>
            <h3 className="text-slate-800 font-semibold text-lg text-shadow-sm">{title}</h3>
            <ul className="flex flex-wrap gap-2 mb-3">
                {list?.map((item, index) => (
                    <li key={index} className="bg-gradient-to-r from-purple-400/80 to-purple-700/80 text-white font-bold rounded-full px-4 py-2 shadow-md flex justify-between items-center">
                        {item}
                        <button onClick={() => handleDeleteItem(fieldName, item)} className="ml-2 font-extrabold text-white/70 hover:text-white">&times;</button>                    </li>
                ))}
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); handleAddItem(fieldName, value, setValue, setError); }} className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-4 py-2 text-slate-800 placeholder-gray-700 bg-white/30 border border-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder={placeholder}
                    disabled={loading === fieldName}
                />
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-gradient-to-br from-blue-600/80 to-blue-900/80 hover:from-blue-600 hover:to-blue-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50"
                  disabled={loading === fieldName}
                >
                  {loading === fieldName ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Add'
                  )}
                </button>
            </form>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-5xl font-bold text-center animated-gradient-header">Your Profile</h2>            
            <div>
                <label htmlFor="gender-select" className="block mb-2 text-slate-800 font-semibold text-lg text-shadow-sm">Gender</label>
                {isEditingGender ? (
                    <select
                        id="gender-select"
                        value={userData.gender || ''}
                        onChange={handleGenderChange}
                        onBlur={() => setIsEditingGender(false)} // Optional: hide select on losing focus
                        className="w-full px-4 py-2 text-slate-800 bg-white/30 border border-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">Prefer not to say</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            disabled
                            value={userData.gender || 'Not set'}
                            className="w-full px-4 py-2 text-slate-800 placeholder-gray-700 bg-white/30 border border-white/40 rounded-md disabled:opacity-70"
                        />
                        <button onClick={() => setIsEditingGender(true)} className="px-4 py-2 bg-gradient-to-br from-blue-600/80 to-blue-900/80 hover:from-blue-600 hover:to-blue-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95">
                            Edit
                        </button>
                    </div>
                )}
            </div>

            {renderListAndForm('Allergies', userData.allergies, newAllergy, setNewAllergy, 'allergies', 'Add Allergy', allergyError, setAllergyError)}
            {renderListAndForm('Current Medications', userData.current_meds, newMed, setNewMed, 'current_meds', 'Add Medication', medError, setMedError)}
            {renderListAndForm('Pre-existing Conditions', userData.conditions, newCondition, setNewCondition, 'conditions', 'Add Condition', conditionError, setConditionError)}
        </div>
    );
};

export { Profile };