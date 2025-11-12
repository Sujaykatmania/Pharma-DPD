import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const RemindersPage = () => {
  const [currentMeds, setCurrentMeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const unsub = onSnapshot(docRef, (doc) => {
          if (doc.exists()) {
            setCurrentMeds(doc.data().current_meds || []);
          }
          setLoading(false);
        });
        return () => unsub();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50">
        Your Medications
      </h2>
      {loading ? (
        <p className="text-center text-white/80">Loading...</p>
      ) : currentMeds.length > 0 ? (
        <div className="space-y-4">
          {currentMeds.map((med, index) => (
            <div key={index} className="bg-white/30 p-4 rounded-lg shadow-md border border-white/40">
              <p className="text-xl font-bold text-slate-800">{med}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-white/80">You have no current medications.</p>
      )}
    </div>
  );
};

export { RemindersPage };
