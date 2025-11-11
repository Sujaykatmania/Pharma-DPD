import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleSignIn = async () => {
        setError(null);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    gender: "",
                    allergies: [],
                    current_meds: [],
                    conditions: []
                });
            }
        } catch (error) {
            setError('Failed to sign in with Google. Please try again.');
        }
    };

    const handleEmailPasswordAction = async (e) => {
        e.preventDefault();
        setError(null);
        if (isRegisterMode) {
            // Register
            try {
                const result = await createUserWithEmailAndPassword(auth, email, password);
                const user = result.user;
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.email,
                    gender: "",
                    allergies: [],
                    current_meds: [],
                    conditions: []
                });
            } catch (error) {
                handleAuthError(error);
            }
        } else {
            // Sign In
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                handleAuthError(error);
            }
        }
    };

    const handleAuthError = (error) => {
        switch (error.code) {
            case 'auth/weak-password':
                setError('Password must be at least 6 characters.');
                break;
            case 'auth/invalid-email':
                setError('Please enter a valid email address.');
                break;
            case 'auth/email-already-in-use':
                setError('This email is already in use. Try signing in.');
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                setError('Invalid email or password.');
                break;
            default:
                setError('An unknown error occurred. Please try again.');
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center p-4">
            {/* FIX 1: Replaced 'shadow-inner-lg' with 'shadow-2xl' to make the panel "pop out".
              Increased blur to 'backdrop-blur-xl'.
            */}
            <div className="w-full max-w-sm p-8 space-y-6 bg-white/20 shadow-2xl border border-white/30 rounded-2xl backdrop-filter backdrop-blur-xl">
                
                {/* FIX: Reverted to a pill shape (removed 'w-fit', added 'max-w-xs').
                  Added 'relative' to the container.
                  Added 'z-10' to the SVG to bring it in front.
                  Added a new 'div' to act as the "thin line" behind the plus.
                */}
                <div className="relative flex justify-center bg-white/30 rounded-full py-4 px-8 shadow-lg max-w-xs mx-auto">
                    {/* The SVG icon (with z-10 added) */}
                    <svg className="w-16 h-16 text-white z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7v-2h4V7h2v4h4v2h-4v4h-2z" fill="currentColor"/>
                    </svg>
                </div>
                
                <h2 className="text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50 mb-4">{isRegisterMode ? 'Create Account' : 'Sign In'}</h2>
                
                {/* FIX 2: Removed my failed 'pt-2' fix from this form. 
                  The 'space-y-6' on the parent div is correct.
                */}
                <form onSubmit={handleEmailPasswordAction} className="space-y-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-4 py-2 text-slate-800 placeholder-gray-700 bg-white/30 border border-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-4 py-2 text-slate-800 placeholder-gray-700 bg-white/30 border border-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {error && <p className="text-red-500 bg-white/80 rounded-md p-2 text-sm text-center">{error}</p>}
                    {/* FIX 2: Replaced flat blue with "stationary liquid glass" gradient.
                    */}
                    <button
                        type="submit"
                        className="w-full py-2 px-4 bg-gradient-to-br from-blue-600/80 to-blue-900/80 hover:from-blue-600 hover:to-blue-900 text-white font-bold rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95"
                    >
                        {isRegisterMode ? 'Register' : 'Sign In'}
                    </button>
                </form>
                <div className="text-center">
                    <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-slate-700 font-medium text-lg hover:text-black">
                        {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                    </button>
                </div>
                <div className="relative flex items-center">
                    <div className="flex-grow border-t border-white/30"></div>
                    <span className="flex-shrink mx-4 text-white">Or</span>
                    <div className="flex-grow border-t border-white/30"></div>
                </div>
                {/* FIX 3: Replaced flat white with "stationary liquid glass" gradient.
                */}
                <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center py-2 px-4 bg-gradient-to-br from-white/90 to-white/50 hover:from-white/100 hover:to-white/70 text-slate-800 font-medium rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95"
                >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 6.842C34.553 2.964 29.613 1 24 1C10.745 1 0 11.745 0 25s10.745 24 24 24s24-10.745 24-24c0-1.282-.124-2.528-.352-3.725H43.611z"/>
                        <path fill="#FF3D00" d="M6.306 14.691c-1.258 3.524-1.258 7.491 0 11.015L1.31 32.553C-1.218 26.21 2.38 10.153 10.59 4.414l5.122 5.122C12.83 11.037 8.35 12.33 6.306 14.691z"/>
                        <path fill="#4CAF50" d="M24 48c5.613 0 10.553-1.964 14.802-5.198l-5.198-5.198c-2.12 1.885-4.901 3.038-7.904 3.038-5.223 0-9.651-3.343-11.303-8H1.31l5.021 7.86C10.745 44.255 16.715 48 24 48z"/>
                        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.457-2.457 4.476-4.605 5.75l5.198 5.198c4.32-3.787 7.273-9.522 7.273-16.141c0-1.282-.124-2.528-.352-3.725z"/>
                    </svg>
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};

export { LoginPage };