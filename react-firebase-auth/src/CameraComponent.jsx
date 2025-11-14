import React, { useState, useRef, useCallback } from 'react';
import Webcam from "react-webcam";
import PropTypes from 'prop-types';

const CameraComponent = ({ onPhotoTaken, onCancel }) => {
  const webcamRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);

  // Function to capture the photo
  const capture = useCallback(() => {
    const newImageSrc = webcamRef.current.getScreenshot();
    setImageSrc(newImageSrc);
  }, [webcamRef]);

  // Function to accept the photo
  const handleAccept = () => {
    if (imageSrc) {
      onPhotoTaken(imageSrc);
    }
  };

  // Function to retake the photo
  const handleRetake = () => {
    setImageSrc(null); // This will make the <Webcam> component re-appear
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg aspect-video rounded-lg overflow-hidden shadow-lg border border-white/30">
        {imageSrc ? (
          // 2. Show the preview
          <img src={imageSrc} alt="Captured preview" className="w-full h-full object-cover" />
        ) : (
          // 1. Show the live camera
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            videoConstraints={{ facingMode: "environment" }} // Use the back camera on phones
          />
        )}
      </div>
      
      {/* --- Button Controls --- */}
      <div className="flex justify-center items-center mt-6 gap-8">
        {imageSrc ? (
          // --- Show Accept/Retake buttons ---
          <>
            <button 
              onClick={handleRetake} 
              className="text-white text-lg font-semibold py-3 px-6 rounded-lg bg-gray-600 hover:bg-gray-500 transition-all"
            >
              Retake
            </button>
            <button 
              onClick={handleAccept} 
              className="text-white text-lg font-semibold py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 transition-all"
            >
              Accept
            </button>
          </>
        ) : (
          // --- Show Capture button ---
          <button 
            onClick={capture} 
            className="w-20 h-20 rounded-full bg-white border-4 border-gray-400"
            aria-label="Take photo"
          ></button>
        )}
      </div>

      {/* --- Close Button --- */}
      <button 
        onClick={onCancel} 
        className="absolute top-4 right-4 text-white text-3xl font-bold"
        aria-label="Close camera"
      >
        &times;
      </button>
    </div>
  );
};

CameraComponent.propTypes = {
    onPhotoTaken: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

export default CameraComponent;