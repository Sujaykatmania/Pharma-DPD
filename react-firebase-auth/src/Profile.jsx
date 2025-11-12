import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from './firebase';

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
    };

    const handleAddItem = async (field, value, setValue) => {
        if (value.trim() === "") return;
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userDocRef, {
            [field]: arrayUnion(value)
        });
        setValue("");
    };

    const renderListAndForm = (title, list, value, setValue, fieldName, placeholder) => (
        <div>
            <h3 className="text-slate-800 font-semibold text-lg text-shadow-sm">{title}</h3>
            <ul className="flex flex-wrap gap-2 mb-3">
                {list?.map((item, index) => (
                    <li key={index} className="bg-gradient-to-r from-purple-500/80 to-purple-700/80 text-white font-bold rounded-full px-4 py-2 shadow-md flex justify-between items-center">
                        {item}
                    </li>
                ))}
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); handleAddItem(fieldName, value, setValue); }} className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-4 py-2 text-slate-800 placeholder-gray-700 bg-white/30 border border-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder={placeholder}
                />
                <button type="submit" className="px-4 py-2 bg-gradient-to-br from-blue-600/80 to-blue-900/80 hover:from-blue-600 hover:to-blue-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95">
                    Add
                </button>
            </form>
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50">Your Profile</h2>
            <div>
                <label htmlFor="gender-select" className="block mb-2 text-slate-800 font-semibold text-lg text-shadow-sm">Gender</label>
                <select
                    id="gender-select"
                    value={userData.gender || ''}
                    onChange={handleGenderChange}
                    className="w-full px-4 py-2 text-slate-800 bg-white/30 border border-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            {renderListAndForm('Allergies', userData.allergies, newAllergy, setNewAllergy, 'allergies', 'Add Allergy')}
            {renderListAndForm('Current Medications', userData.current_meds, newMed, setNewMed, 'current_meds', 'Add Medication')}
            {renderListAndForm('Pre-existing Conditions', userData.conditions, newCondition, setNewCondition, 'conditions', 'Add Condition')}
        </div>
    );
};

export { Profile };
