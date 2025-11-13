import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
// --- FIX 1: We need 'updateDoc' and 'doc' for the new toggle button ---
import { doc, onSnapshot, collection, query, orderBy, updateDoc } from 'firebase/firestore';

const RemindersPage = () => {
  const [currentMeds, setCurrentMeds] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  // This useEffect (from your code) is perfect. It correctly
  // listens to both the user doc and the reminders sub-collection.
  useEffect(() => {
    setLoading(true);
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

  // --- FIX 2: This is the new function to toggle a reminder on/off ---
  const handleToggleReminder = async (id, currentStatus) => {
    if (auth.currentUser) {
      const reminderDocRef = doc(db, "users", auth.currentUser.uid, "reminders", id);
      try {
        await updateDoc(reminderDocRef, {
          isActive: !currentStatus
        });
      } catch (error) {
        console.error("Error toggling reminder: ", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50">
        Your Medications
      </h2>

      {loading ? (
        <p className="text-center text-slate-700">Loading...</p>
      ) : (
        <>
          {/* This is your existing "current_meds" list. It's perfect. */}
          {currentMeds.length > 0 ? (
            <div className="space-y-4">
              {currentMeds.map((med, index) => (
                <div key={index} className="bg-white/30 p-4 rounded-lg shadow-md border border-white/40">
                  <p className="text-xl font-bold text-slate-800">{med}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-700">You have no current medications saved.</p>
          )}

          {/* --- FIX 3: This "Reminders" section is upgraded --- */}
          <div className="mt-6">
            <h3 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50 mb-3">
              Scheduled Reminders
            </h3>
            {reminders.length === 0 ? (
              <p className="text-center text-slate-700">No reminders yet. Create one from the Scanner page after confirming a scan.</p>
            ) : (
              <div className="space-y-3">
                {/* We now render the new, smart data */}
                {reminders.map((r) => (
                  <div key={r.id} className="bg-white/30 p-4 rounded-lg shadow-md border border-white/40">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xl font-bold text-slate-800">{r.medName}</p>
                        <p className="text-slate-700">
                          {r.timesPerDay > 0 
                            ? `${r.timesPerDay} times per day for ${r.durationInDays} days`
                            : `As needed (PRN) for ${r.durationInDays} days`
                          }
                        </p>
                        <p className="text-slate-700"><strong>Dosage:</strong> {r.dosage}</p>
                      </div>
                      <button 
                        onClick={() => handleToggleReminder(r.id, r.isActive)}
                        className={`px-3 py-1 rounded-full text-white font-semibold shadow-md ${
                          r.isActive 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-gray-500 hover:bg-gray-600'
                        }`}
                      >
                        {r.isActive ? 'Active' : 'Paused'}
                      </button>
                    </div>
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