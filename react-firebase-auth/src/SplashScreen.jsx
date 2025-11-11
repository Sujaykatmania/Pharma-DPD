import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const SplashScreen = ({ onAnimationComplete }) => {
    const [stage, setStage] = useState('intro');

    useEffect(() => {
        if (stage === 'outro') {
            const timer = setTimeout(() => {
                onAnimationComplete();
            }, 1000); // Corresponds to the fade-out duration
            return () => clearTimeout(timer);
        }
    }, [stage, onAnimationComplete]);

    const handlePillClick = () => {
        setStage('split');
        setTimeout(() => {
            setStage('reveal');
        }, 500); // Let the split animation run a bit
        setTimeout(() => {
            setStage('outro');
        }, 2500); // 2 seconds after reveal
    };

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
            <div
                className={`transition-opacity duration-1000 ${
                    stage === 'intro' ? 'opacity-100' : 'opacity-0'
                }`}
            >
                <h1 className="text-white text-4xl mb-4">Pharma-DPD</h1>
            </div>

            <div
                className={`transition-opacity duration-1000 ${
                    stage === 'reveal' ? 'opacity-100' : 'opacity-0'
                }`}
            >
                <h2 className="text-white text-xl">Doctors Prescription Decipher</h2>
            </div>

            <button
                onClick={handlePillClick}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 rounded-full overflow-hidden flex transition-all duration-500 ease-in-out
                    ${stage === 'outro' ? 'opacity-0' : 'opacity-100'}`}
                disabled={stage !== 'intro'}
            >
                <div
                    className={`w-1/2 h-full bg-red-500 transition-transform duration-1000 ease-in-out ${
                        stage === 'split' || stage === 'reveal' || stage === 'outro' ? '-translate-x-full' : ''
                    }`}
                ></div>
                <div
                    className={`w-1/2 h-full bg-blue-500 transition-transform duration-1000 ease-in-out ${
                        stage === 'split' || stage === 'reveal' || stage === 'outro' ? 'translate-x-full' : ''
                    }`}
                ></div>
            </button>
        </div>
    );
};

SplashScreen.propTypes = {
    onAnimationComplete: PropTypes.func.isRequired,
};

export { SplashScreen };
