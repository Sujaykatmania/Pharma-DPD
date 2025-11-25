import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { doc, onSnapshot, collection, query, orderBy, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import ReminderModal from './components/ReminderModal';

const RemindersPage = () => {
  const [currentMeds, setCurrentMeds] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [error, setError] = useState(null);

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

  const handleMarkAsComplete = async (id) => {
    if (auth.currentUser) {
      const reminderDocRef = doc(db, "users", auth.currentUser.uid, "reminders", id);
      try {
        setError(null);
        await deleteDoc(reminderDocRef);
      } catch (error) {
        console.error("Error marking reminder as complete: ", error);
        setError("Failed to mark reminder as complete. Please try again.");
      }
    }
  };

  const handleSaveReminder = async (data) => {
    if (!auth.currentUser) return;

    try {
      const reminderDoc = {
        ...data,
        createdAt: serverTimestamp(),
        isActive: true,
      };

      await addDoc(collection(db, `users/${auth.currentUser.uid}/reminders`), reminderDoc);
      setIsReminderModalOpen(false);
    } catch (error) {
      console.error("Error adding reminder:", error);
      setError("Failed to save reminder.");
    }
  };

  return (
    <div className="space-y-6">
      {/* --- ADD BUTTON --- */}
      <div className="flex justify-end px-4">
        <button
            onClick={() => setIsReminderModalOpen(true)}
            className="flex items-center gap-2 py-3 px-6 bg-gradient-to-br from-indigo-600/90 to-purple-900/90 hover:from-indigo-600 hover:to-purple-900 text-white font-bold rounded-full shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95"
        >
            <span className="text-xl">➕</span> Add Medication
        </button>
      </div>

      <h2 className="text-5xl font-bold text-center animated-gradient-header">
          Your Medications
      </h2>

      {loading ? (
        <p className="text-center text-slate-700">Loading...</p>
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
            <p className="text-center text-slate-700">You have no current medications saved.</p>
          )}

          <div className="mt-6">
            <h3 className="text-3xl font-bold text-center animated-gradient-header mb-4">
              Scheduled Reminders
            </h3>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            {reminders.length === 0 ? (
              <p className="text-center text-slate-700">No reminders yet. Create one from the Scanner page or click Add Medication.</p>
            ) : (
              <div className="space-y-3">
                {reminders.map((r) => (
                  <div key={r.id} className="bg-white/30 p-4 rounded-lg shadow-md border border-white/40">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xl font-bold text-slate-800">{r.medName}</p>
                        <p className="text-slate-700">
                          {r.isSOS
                            ? `Take as needed (SOS)`
                            : `${r.frequency} times per day (${r.scheduledTimes?.join(', ')})`
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
                          onClick={() => handleMarkAsComplete(r.id)}
                          className="ml-2 px-4 py-2 bg-gradient-to-br from-indigo-500/80 to-indigo-700/80 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95"
                        >
                          Mark as Complete
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
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSave={handleSaveReminder}
      />
    </div>
  );
};

export { RemindersPage };