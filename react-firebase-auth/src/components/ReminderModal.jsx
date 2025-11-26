import React, { useState, useEffect } from 'react';

const ReminderModal = ({ isOpen, onClose, initialData, onSave }) => {
    const [medicineName, setMedicineName] = useState('');
    const [dosage, setDosage] = useState('');
    const [isSOS, setIsSOS] = useState(false);
    const [frequency, setFrequency] = useState(1);
    const [times, setTimes] = useState(['09:00']);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setMedicineName(initialData.name || '');
            setDosage(initialData.dosage || '');
            setIsSOS(initialData.isSOS || false);
            setFrequency(initialData.frequency || 1);
            // If times are provided, use them, otherwise default based on frequency
            if (initialData.times && initialData.times.length > 0) {
                setTimes(initialData.times);
            } else {
                updateTimes(initialData.frequency || 1);
            }
        } else if (isOpen) {
            // Reset to defaults if no initialData
            setMedicineName('');
            setDosage('');
            setIsSOS(false);
            setFrequency(1);
            setTimes(['09:00']);
        }
    }, [isOpen, initialData]);

    const updateTimes = (freq) => {
        let newTimes = [];
        switch (parseInt(freq)) {
            case 1: newTimes = ['09:00']; break;
            case 2: newTimes = ['09:00', '21:00']; break;
            case 3: newTimes = ['09:00', '14:00', '21:00']; break;
            case 4: newTimes = ['08:00', '12:00', '16:00', '20:00']; break;
            default: newTimes = ['09:00']; break;
        }
        setTimes(newTimes);
    };

    const handleFrequencyChange = (e) => {
        const newFreq = parseInt(e.target.value);
        setFrequency(newFreq);
        updateTimes(newFreq);
    };

    const handleTimeChange = (index, value) => {
        const newTimes = [...times];
        newTimes[index] = value;
        setTimes(newTimes);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const data = {
            medName: medicineName,
            dosage: dosage,
            isSOS: isSOS,
            frequency: isSOS ? 0 : frequency,
            scheduledTimes: isSOS ? [] : times,
        };

        if (!isSOS && times.length > 0) {
            // Calculate nextScheduledRun
            const now = new Date();
            let nextRun = null;
            
            // Sort times to find the earliest next time
            const sortedTimes = [...times].sort();
            
            for (const timeStr of sortedTimes) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const potentialDate = new Date();
                potentialDate.setHours(hours, minutes, 0, 0);
                
                if (potentialDate > now) {
                    nextRun = potentialDate;
                    break;
                }
            }

            // If no time is later today, pick the first time tomorrow
            if (!nextRun) {
                const [hours, minutes] = sortedTimes[0].split(':').map(Number);
                nextRun = new Date();
                nextRun.setDate(nextRun.getDate() + 1);
                nextRun.setHours(hours, minutes, 0, 0);
            }
            
            data.nextScheduledRun = nextRun;
        }

        await onSave(data);
        setIsSaving(false);
        onClose();
    };

    if (!isOpen) return null;


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-4">
                    <h3 className="text-xl font-bold text-white">
                        {initialData?.name ? 'Set Reminder' : 'Add Medication'}
                    </h3>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* Medicine Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Medicine Name</label>
                        <input
                            type="text"
                            value={medicineName}
                            onChange={(e) => setMedicineName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="e.g. Amoxicillin"
                        />
                    </div>

                    {/* Dosage */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Dosage</label>
                        <input
                            type="text"
                            value={dosage}
                            onChange={(e) => setDosage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="e.g. 500mg"
                        />
                    </div>

                    {/* SOS Toggle */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isSOS"
                            checked={isSOS}
                            onChange={(e) => setIsSOS(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="isSOS" className="text-sm font-semibold text-gray-700 select-none cursor-pointer">
                            Take as needed (SOS)
                        </label>
                    </div>

                    {/* Frequency & Times (Hidden if SOS) */}
                    {!isSOS && (
                        <div className="space-y-4 pt-2 border-t border-gray-100">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Frequency</label>
                                <select
                                    value={frequency}
                                    onChange={handleFrequencyChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                >
                                    <option value={1}>Once a day</option>
                                    <option value={2}>Twice a day</option>
                                    <option value={3}>3 times a day</option>
                                    <option value={4}>4 times a day</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Schedule Times</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {times.map((time, index) => (
                                        <input
                                            key={index}
                                            type="time"
                                            value={time}
                                            onChange={(e) => handleTimeChange(index, e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !medicineName}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : 'Save Schedule'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReminderModal;
