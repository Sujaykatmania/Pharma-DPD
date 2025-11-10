import React, { useState, useEffect } from 'react';
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

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
            <div className="mb-4">
                <label htmlFor="gender-select" className="block mb-2">Gender</label>
                <select id="gender-select" value={userData.gender || ''} onChange={handleGenderChange} className="border p-2 rounded">
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div className="mb-4">
                <h3 className="text-xl font-bold mb-2">Allergies</h3>
                <ul>
                    {userData.allergies?.map((allergy, index) => <li key={index}>{allergy}</li>)}
                </ul>
                <form onSubmit={(e) => { e.preventDefault(); handleAddItem('allergies', newAllergy, setNewAllergy); }} className="mt-2">
                    <input type="text" value={newAllergy} onChange={(e) => setNewAllergy(e.target.value)} className="border p-2 rounded mr-2" placeholder="Add Allergy" />
                    <button type="submit" className="bg-blue-500 text-white p-2 rounded">Add Allergy</button>
                </form>
            </div>

            <div className="mb-4">
                <h3 className="text-xl font-bold mb-2">Current Medications</h3>
                <ul>
                    {userData.current_meds?.map((med, index) => <li key={index}>{med}</li>)}
                </ul>
                <form onSubmit={(e) => { e.preventDefault(); handleAddItem('current_meds', newMed, setNewMed); }} className="mt-2">
                    <input type="text" value={newMed} onChange={(e) => setNewMed(e.target.value)} className="border p-2 rounded mr-2" placeholder="Add Medication" />
                    <button type="submit" className="bg-blue-500 text-white p-2 rounded">Add Medication</button>
                </form>
            </div>

            <div>
                <h3 className="text-xl font-bold mb-2">Pre-existing Conditions</h3>
                <ul>
                    {userData.conditions?.map((condition, index) => <li key={index}>{condition}</li>)}
                </ul>
                <form onSubmit={(e) => { e.preventDefault(); handleAddItem('conditions', newCondition, setNewCondition); }} className="mt-2">
                    <input type="text" value={newCondition} onChange={(e) => setNewCondition(e.target.value)} className="border p-2 rounded mr-2" placeholder="Add Condition" />
                    <button type="submit" className="bg-blue-500 text-white p-2 rounded">Add Condition</button>
                </form>
            </div>
        </div>
    );
};

export { Profile };
