import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Aurora from './Aurora'; // <-- Keeping this
import './Aurora.css';       // <-- Keeping this

const SplashScreen = ({ onAnimationComplete }) => {
    const [stage, setStage] = useState('intro');

    const handlePillClick = () => {
        // Only allow click if in the 'intro' stage
        if (stage !== 'intro') return;

        setStage('split');
        
        // After split animation (1s), reveal text
        setTimeout(() => {
            setStage('reveal');
        }, 1000); // Duration of split animation
        
        // After text is revealed (2s), fade out
        setTimeout(() => {
            setStage('outro');
        }, 3000); // 1s (split) + 2s (reveal) = 3s total
    };

    useEffect(() => {
        // When 'outro' stage begins, wait 1s for fade-out, then call complete
        if (stage === 'outro') {
            const timer = setTimeout(() => {
                onAnimationComplete();
            }, 1000); // Corresponds to the fade-out duration
            return () => clearTimeout(timer);
        }
    }, [stage, onAnimationComplete]);

    return (
        // This main container handles the layout and fade-out
        <div 
            className={`fixed inset-0 flex flex-col items-center justify-center z-50 transition-opacity duration-1000 ${
                stage === 'outro' ? 'opacity-0' : 'opacity-100'
            }`}
        >
            {/* The Aurora background lives *behind* everything */}
            <Aurora
                colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
                blend={0.7}
                amplitude={0.8}
                speed={0.5}
            />

            {/* --- FIX 1: Text Color & Size --- */}
            {/* Changed to 'text-white' and 'text-6xl' to pop against the Aurora */}
            <div
                className={`transition-opacity duration-1000 ${
                    stage === 'outro' ? 'opacity-0' : 'opacity-100'
                }`}
            >
                <h1 className="text-white text-6xl font-extrabold mb-10 text-shadow-sm">
                    Pharma-DPD
                </h1>
            </div>

            {/* --- FIX 2: Container Size --- */}
            {/* Enlarged to 'w-72 h-36' to fit the single-line text */}
            <div className="relative w-72 h-36 flex items-center justify-center"> 
                
                {/* --- FIX 3: Realistic Pill --- */}
                {/* Added 'bg-gradient-to-br' for 3D effect */}
                <button
                    onClick={handlePillClick}
                    className={`absolute inset-0 rounded-full overflow-hidden flex z-20 transition-all duration-1000 ease-in-out shadow-lg ${
                        stage === 'outro' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
                    }`}
                    disabled={stage !== 'intro'}
                >
                    {/* Red half with gradient */}
                    <div
                        className={`w-1/2 h-full bg-gradient-to-br from-red-400 to-red-600 transition-transform duration-1000 ease-in-out ${
                            stage === 'split' || stage === 'reveal' || stage === 'outro' ? '-translate-x-full' : ''
                        }`}
                    ></div>
                    {/* Blue half with gradient */}
                    <div
                        className={`w-1/2 h-full bg-gradient-to-br from-blue-400 to-blue-600 transition-transform duration-1000 ease-in-out ${
                            stage === 'split' || stage === 'reveal' || stage === 'outro' ? 'translate-x-full' : ''
                        }`}
                    ></div>
                </button>

                {/* --- FIX 1 (Again): Text Color & Size --- */}
                {/* Changed to 'text-white' and 'text-3xl' */}
                <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${
                        stage === 'reveal' ? 'opacity-100' : 'opacity-0'
                    } z-10`}
                >
                    <h2 className="text-gray-450 text-3xl font-bold whitespace-nowrap text-shadow-sm">
                        Doctors Prescription Deciphered
                    </h2>
                </div>
            </div>
        </div>
    );
};

SplashScreen.propTypes = {
    onAnimationComplete: PropTypes.func.isRequired,
};

export { SplashScreen };