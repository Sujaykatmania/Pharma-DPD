import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';

const RemindersPage = () => {
  const [currentMeds, setCurrentMeds] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (user) {
        // subscribe to user doc for current_meds
        const docRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setCurrentMeds(docSnap.data().current_meds || []);
          } else {
            setCurrentMeds([]);
          }
          setLoading(false);
        }, (err) => {
          console.error('User doc snapshot error:', err);
          setLoading(false);
        });

        // subscribe to reminders subcollection
        const remindersRef = collection(db, `users/${user.uid}/reminders`);
        const q = query(remindersRef, orderBy('createdAt', 'desc'));
        const unsubRem = onSnapshot(q, (snap) => {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setReminders(items);
        }, (err) => {
          console.error('Reminders snapshot error:', err);
        });

        // cleanup both
        return () => {
          unsubUser();
          unsubRem();
        };
      } else {
        setCurrentMeds([]);
        setReminders([]);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50">
        Your Medications
      </h2>

      {loading ? (
        <p className="text-center text-white/80">Loading...</p>
      ) : (
        <>
          {currentMeds.length > 0 ? (
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

          {/* Reminders created from scans or manually */}
          <div className="mt-6">
            <h3 className="text-2xl font-semibold text-white/90 mb-3">Reminders</h3>
            {reminders.length === 0 ? (
              <p className="text-white/80">No reminders yet. Create one from Scanner after confirming a scan.</p>
            ) : (
              <div className="space-y-3">
                {reminders.map((r) => (
                  <div key={r.id} className="bg-white/30 p-4 rounded-lg shadow-md border border-white/40">
                    <p className="text-xl font-bold text-slate-800">{r.medName}{r.dosage ? ` — ${r.dosage}` : ''}</p>
                    <p className="text-slate-700">Schedule: {r.schedule || 'Not set'}</p>
                    <p className="text-slate-700 text-sm">Source: {r.sourceScanId || 'manual'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export { RemindersPage };
