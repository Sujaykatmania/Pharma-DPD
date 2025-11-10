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
            <h3 className="text-lg font-semibold text-white mb-3 text-pop">{title}</h3>
            <ul className="flex flex-wrap gap-2 mb-3">
                {list?.map((item, index) => (
                    <li key={index} className="bg-blue-100/30 rounded-md p-2 my-1 border border-white/20 shadow-sm text-slate-800">
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
                <button type="submit" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-md transition duration-200">
                    Add
                </button>
            </form>
        </div>
    );

    return (
        <div className="text-white space-y-6">
            <h2 className="text-3xl font-bold text-center text-pop">Your Profile</h2>
            <div>
                <label htmlFor="gender-select" className="block mb-2 text-lg font-semibold text-pop">Gender</label>
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
