import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from './firebase';

const Profile = () => {
    const [previousAilments, setPreviousAilments] = useState([]);
    const [newAilment, setNewAilment] = useState("");

    useEffect(() => {
        if (auth.currentUser) {
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            const unsubscribe = onSnapshot(userDocRef, (doc) => {
                if (doc.exists()) {
                    setPreviousAilments(doc.data().previous_ailments || []);
                }
            });
            return () => unsubscribe();
        }
    }, []);

    const handleAddAilment = async (e) => {
        e.preventDefault();
        if (newAilment.trim() === "") return;
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        try {
            await updateDoc(userDocRef, {
                previous_ailments: arrayUnion(newAilment)
            });
            setNewAilment("");
        } catch (error) {
            console.error("Error adding ailment: ", error);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Your Previous Ailments</h2>
            <ul>
                {previousAilments.map((ailment, index) => (
                    <li key={index}>{ailment}</li>
                ))}
            </ul>
            <form onSubmit={handleAddAilment} className="mt-4">
                <input
                    type="text"
                    value={newAilment}
                    onChange={(e) => setNewAilment(e.target.value)}
                    className="border p-2 rounded mr-2"
                    placeholder="Add a new ailment"
                />
                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Add Ailment
                </button>
            </form>
        </div>
    );
};

export { Profile };
