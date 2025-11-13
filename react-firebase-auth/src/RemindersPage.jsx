import React, { useState, useEffect } from 'react';
import { db, auth, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
// --- FIX 1: We need 'updateDoc' and 'doc' for the new toggle button ---
import { doc, onSnapshot, collection, query, orderBy, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';

const RemindersPage = () => {
  const [currentMeds, setCurrentMeds] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newManualMedName, setNewManualMedName] = useState('');
  const [newManualSchedule, setNewManualSchedule] = useState('');
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [manualError, setManualError] = useState(null);

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

  const handleDeleteReminder = async (id) => {
    if (auth.currentUser) {
      const reminderDocRef = doc(db, "users", auth.currentUser.uid, "reminders", id);
      try {
        await deleteDoc(reminderDocRef);
      } catch (error) {
        console.error("Error deleting reminder: ", error);
      }
    }
  };

  const handleManualAdd = async () => {
    if (!newManualMedName || !newManualSchedule) {
      setManualError("Please fill in both fields.");
      return;
    }
    if (!auth.currentUser) {
      setManualError("You must be logged in to add a reminder.");
      return;
    }

    setIsSavingManual(true);
    setManualError(null);

    try {
      const parseSchedule = httpsCallable(functions, 'parseSchedule');
      const result = await parseSchedule({ dosage: newManualSchedule, duration: newManualSchedule });
      
      const { times_per_day, for_x_days, is_prn } = result.data.data;

      const reminderDoc = {
        medName: newManualMedName,
        dosage: newManualSchedule,
        durationInDays: for_x_days,
        isOngoing: for_x_days === null,
        timesPerDay: times_per_day,
        isPRN: is_prn || false,
        createdAt: serverTimestamp(),
        isActive: true,
      };

      await addDoc(collection(db, `users/${auth.currentUser.uid}/reminders`), reminderDoc);

      setNewManualMedName('');
      setNewManualSchedule('');
    } catch (error) {
      console.error("Error adding manual reminder:", error);
      setManualError("Failed to parse schedule or save reminder. Please check the format.");
    }

    setIsSavingManual(false);
  };

  return (
    <div className="space-y-6">
      {/* --- NEW MANUAL ADD FORM --- */}
      <div className="bg-white/30 p-4 rounded-lg shadow-md border border-white/40">
        <h3 className="text-2xl font-bold text-slate-800 animated-gradient-header mb-3">Add Manual Reminder</h3>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Medicine Name"
            value={newManualMedName}
            onChange={(e) => setNewManualMedName(e.target.value)}
            className="px-3 py-2 rounded-md bg-white/50 border border-white/40 text-slate-800 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="e.g., '1 pill twice a day for 1 week'"
            value={newManualSchedule}
            onChange={(e) => setNewManualSchedule(e.target.value)}
            className="px-3 py-2 rounded-md bg-white/50 border border-white/40 text-slate-800 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleManualAdd}
            disabled={isSavingManual}
            className="w-full py-2 px-4 bg-gradient-to-br from-indigo-600/80 to-indigo-900/80 hover:from-indigo-600 hover:to-indigo-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isSavingManual ? 'Saving...' : 'Save Manual Reminder'}
          </button>
          {manualError && <p className="text-red-500 text-sm mt-1">{manualError}</p>}
        </div>
      </div>

      <h2 className="text-5xl font-bold text-center animated-gradient-header">
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
            <h3 className="text-3xl font-bold text-center animated-gradient-header mb-4">
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
                          {r.isOngoing
                            ? `${r.timesPerDay} times per day (Ongoing)`
                            : r.timesPerDay > 0
                              ? `${r.timesPerDay} times per day for ${r.durationInDays} days`
                              : `As needed (PRN) for ${r.durationInDays} days`
                          }
                        </p>
                        <p className="text-slate-700"><strong>Dosage:</strong> {r.dosage}</p>
                      </div>
                      <div className="flex items-center">
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
                        <button 
                          onClick={() => handleDeleteReminder(r.id)}
                          className="ml-2 text-red-500 font-extrabold text-2xl hover:text-red-700"
                          aria-label="Delete reminder"
                        >
                          &times;
                        </button>
                      </div>
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