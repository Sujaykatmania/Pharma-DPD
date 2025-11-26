import { getToken } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { messaging, db } from "../firebase";

export const requestNotificationPermission = async (uid) => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_VAPID_KEY
      });

      if (token) {
        // Save token to user's document
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token)
        });
        console.log("Notification permission granted and token saved.");
        return token;
      }
    } else {
      console.log("Notification permission denied.");
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
  }
  return null;
};
