import React, { useEffect, useState } from "react";
import { FiChevronLeft, FiLoader, FiSave, FiPlus, FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import Loading from "../components/Loading";
import { useTheme } from '../context/ThemeContext';
import { clearCurrentClass, editClassDetails, fetchClassDetails } from "../redux/slices/classSlice";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const classStatuses = ['active', 'inactive', 'archived']; // Define available statuses

// Helper to parse schedule string into object with arrays of times
const parseScheduleString = (scheduleString) => {
    const initialSchedule = {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [],
        Friday: [], Saturday: [], Sunday: []
    };
    if (!scheduleString) return initialSchedule;

    const scheduleParts = scheduleString.split(',').map(part => part.trim());
    const daysMap = {
        Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
        Fri: "Friday", Sat: "Saturday", Sun: "Sunday"
    };

    scheduleParts.forEach(part => {
        const match = part.match(/^(\w{3})\s+(\d{2}:\d{2})$/);
        if (match) {
            const dayAbbr = match[1];
            const time = match[2];
            const fullDay = daysMap[dayAbbr];
            if (fullDay) {
                // Add time to the array for that day
                if (!initialSchedule[fullDay]) {
                    initialSchedule[fullDay] = [];
                }
                initialSchedule[fullDay].push(time);
            }
        }
    });
    // Ensure days with times are sorted (optional but good practice)
    Object.keys(initialSchedule).forEach(day => {
        if (initialSchedule[day]?.length > 0) {
            initialSchedule[day].sort();
        }
    });
    return initialSchedule;
};

// Helper to format schedule object (with arrays) back into string
const formatScheduleObject = (scheduleObject) => {
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const abbrMap = {
        Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
        Friday: "Fri", Saturday: "Sat", Sunday: "Sun"
    };
    let parts = [];
    daysOrder.forEach(day => {
        if (scheduleObject[day] && scheduleObject[day].length > 0) {
            // Sort times before formatting
            const sortedTimes = [...scheduleObject[day]].sort();
            sortedTimes.forEach(time => {
                parts.push(`${abbrMap[day]} ${time}`);
            });
        }
    });
    return parts.join(', ');
};

// Helper to initialize or merge schedule data into the { Day: [times] } format
const initializeScheduleObject = (scheduleData) => {
    const initialSchedule = {};
    daysOfWeek.forEach(day => initialSchedule[day] = []); // Initialize all days with empty arrays

    if (Array.isArray(scheduleData)) {
        scheduleData.forEach(slot => {
            if (slot && daysOfWeek.includes(slot.day) && Array.isArray(slot.timing)) {
                // Ensure times are valid format (e.g., HH:MM) - Basic check
                const validTimings = slot.timing.filter(t => /^\d{2}:\d{2}$/.test(t));
                initialSchedule[slot.day] = [...validTimings].sort();
            }
        });
    }
    return initialSchedule;
};

// Helper to convert internal { Day: [times] } object to backend array format [{day, timing}]
const convertScheduleToArray = (scheduleObject) => {
     return Object.entries(scheduleObject)
         .filter(([_, times]) => times.length > 0) // Only include days with timings
         .map(([day, times]) => ({
             day: day,
             timing: [...times].sort() // Ensure times are sorted before sending
         }));
}

const EditClass = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isDarkMode } = useTheme();

    const { currentClass, loading, error } = useSelector((state) => state.class);
    const user = useSelector((state) => state.auth.user);

    // Initialize with the structured schedule object
    const [formData, setFormData] = useState({
        className: '',
        schedule: initializeScheduleObject(null), // Use { Day: [times] } format internally
        batch: '',
        status: 'active' // Add status with default
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // State for the current schedule slot being added
    const [currentScheduleDay, setCurrentScheduleDay] = useState(daysOfWeek[0]);
    const [currentScheduleTimings, setCurrentScheduleTimings] = useState('');
    const [scheduleEditError, setScheduleEditError] = useState('');

    // Fetch class details
    useEffect(() => {
        if (classId) {
            dispatch(fetchClassDetails(classId));
        }
        return () => {
            dispatch(clearCurrentClass());
        };
    }, [dispatch, classId]);

    // Populate form when class details load
    useEffect(() => {
        if (currentClass) {
            setFormData({
                className: currentClass.className || '',
                schedule: initializeScheduleObject(currentClass.schedule), // Populate internal format
                batch: currentClass.batch || '',
                status: currentClass.status || 'active' // Populate status
            });
        }
    }, [currentClass]);

    // Handler to add schedule slot
    const handleAddScheduleSlot = () => {
        setScheduleEditError('');
        // Basic validation for HH:MM format
        const timeRegex = /^\d{2}:\d{2}$/;
        const timingsArray = currentScheduleTimings.split(',')
            .map(t => t.trim())
            .filter(t => t !== '');

        const invalidTimings = timingsArray.filter(t => !timeRegex.test(t));
        if (invalidTimings.length > 0) {
             setScheduleEditError(`Invalid time format found: ${invalidTimings.join(', ')}. Use HH:MM.`);
             return;
        }

        if (timingsArray.length === 0) {
            setScheduleEditError("Please enter valid timings (e.g., '09:00, 14:30').");
            return;
        }

        setFormData(prev => {
            const newSchedule = { ...prev.schedule };
            // Overwrite existing times for the selected day
            newSchedule[currentScheduleDay] = [...new Set(timingsArray)].sort(); // Use Set to remove duplicates, then sort
            return { ...prev, schedule: newSchedule };
        });
        setCurrentScheduleTimings(''); // Reset only the timings input
    };

    // Handler to remove schedule slot (clears times for that day)
    const handleRemoveScheduleSlot = (dayToRemove) => {
        setFormData(prev => {
            const newSchedule = { ...prev.schedule };
            newSchedule[dayToRemove] = []; // Set timings array to empty
            return { ...prev, schedule: newSchedule };
        });
    };

    // Handler for other form fields (className, batch, status)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!user?.user?._id || !currentClass?.teacherId?._id) {
            setSubmitError("Authentication or class data missing. Please refresh.");
            return;
        }
        if (currentClass.teacherId._id !== user.user._id) {
             setSubmitError("You are not authorized to edit this class.");
             return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        setScheduleEditError('');

        // Convert the internal schedule object to the array format for backend
        const scheduleForBackend = convertScheduleToArray(formData.schedule);

        if (scheduleForBackend.length === 0) {
            setSubmitError("Schedule cannot be empty. Please add at least one time slot.");
            setIsSubmitting(false);
            return;
        }
        const yearRegex = /^\d{4}$/;
        if (!formData.batch || !yearRegex.test(formData.batch.trim())) {
            setSubmitError("Batch is required and must be a valid 4-digit year (e.g., 2024).");
            setIsSubmitting(false);
            return;
        }
        if (!formData.className || formData.className.trim().length < 3) {
             setSubmitError("Class Name is required and must be at least 3 characters.");
             setIsSubmitting(false);
             return;
        }
        if (!formData.status || !classStatuses.includes(formData.status)) {
            setSubmitError("Please select a valid class status.");
            setIsSubmitting(false);
            return;
        }

        const updates = {
            className: formData.className.trim(),
            schedule: scheduleForBackend, // Send the correct array format
            batch: formData.batch.trim(),
            status: formData.status // Send the selected status
        };

        dispatch(editClassDetails({ classId, updates }))
            .unwrap()
            .then(() => {
                alert("Class updated successfully!");
                navigate(`/class/${classId}`);
            })
            .catch((err) => {
                const errorMessage = typeof err === 'string' ? err : (err?.message || "Failed to update class.");
                setSubmitError(errorMessage);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    // Helper classes for dark mode form styling
    const labelClass = `block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;
    const subLabelClass = `block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`;
    const inputBaseClass = "w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150";
    const inputLightClass = "bg-white border-gray-300 text-gray-900 placeholder-gray-400";
    const inputDarkClass = "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-offset-gray-800";
    const selectBaseClass = `${inputBaseClass} appearance-none`; // Base select includes input styles + appearance-none
    const selectLightClass = inputLightClass; // Inherits light input style
    const selectDarkClass = inputDarkClass; // Inherits dark input style

    if (loading && !currentClass) return <Loading />;
    if (error) return <div className={`p-6 text-center rounded-md border ${isDarkMode ? 'text-red-300 bg-red-900/50 border-red-700' : 'text-red-500 bg-red-100 border-red-400'}`}>Error loading class details: {error}</div>;
    if (!currentClass) return <div className="p-6 text-center text-gray-500">Class not found or you don&apos;t have access.</div>;
    if (currentClass.teacherId?._id !== user?.user?._id) {
        return <div className="p-6 text-center text-red-500">You are not authorized to edit this class.</div>;
    }

    // Convert schedule object to array for easy display mapping
    const scheduleToDisplay = convertScheduleToArray(formData.schedule);

    return (
        <div className={`min-h-screen pb-24  ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <div className="p-4 sm:p-6 max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center mb-6 sm:mb-8">
                    <button onClick={() => navigate(-1)} className={`mr-3 p-2 rounded-full transition-colors duration-150 ${isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-100' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`} aria-label="Go back">
                        <FiChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className={`text-2xl sm:text-3xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        Edit Class: {currentClass.className}
                        {loading && <FiLoader className="animate-spin h-5 w-5 text-indigo-500" />}
                    </h1>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleSubmit} className={`p-6 sm:p-8 rounded-lg shadow-md border space-y-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    {/* Class Name */}
                    <div>
                        <label htmlFor="className" className={labelClass}>Class Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            id="className"
                            name="className"
                            value={formData.className}
                            onChange={handleChange}
                            required
                            minLength="3"
                            maxLength="50"
                            className={`${inputBaseClass} ${isDarkMode ? inputDarkClass : inputLightClass}`}
                        />
                    </div>

                    {/* Schedule Section */}
                    <fieldset className={`border rounded-lg p-4 pt-2 space-y-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                         <legend className={`text-sm font-medium px-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Schedule <span className="text-red-500">*</span></legend>

                         {/* Display Added Schedule Slots */}
                         <div className={`space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2 border-b pb-3 mb-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                             {scheduleToDisplay.length === 0 && (
                                 <p className={`text-xs italic text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>No schedule slots added yet.</p>
                             )}
                             {scheduleToDisplay.map((slot) => (
                                 <div key={slot.day} className={`flex justify-between items-center p-2 rounded border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
                                     <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                                         <span className="font-medium">{slot.day}:</span> {slot.timing.join(', ')}
                                     </p>
                                     <button
                                        type="button"
                                        onClick={() => handleRemoveScheduleSlot(slot.day)}
                                        className={`p-0.5 rounded ${isDarkMode ? 'text-red-400 hover:bg-red-900/50' : 'text-red-500 hover:bg-red-100'}`}
                                        aria-label={`Remove ${slot.day} schedule`}
                                     >
                                         <FiX size={16} />
                                     </button>
                                 </div>
                             ))}
                         </div>

                         {/* Inputs to Add a New Schedule Slot */}
                         <div className="flex flex-col sm:flex-row gap-3 items-end">
                             <div className="flex-grow w-full sm:w-auto">
                                 <label htmlFor="currentScheduleDay" className={subLabelClass}>Day</label>
                                 <div className="relative">
                                     <select
                                         id="currentScheduleDay" value={currentScheduleDay} onChange={(e) => setCurrentScheduleDay(e.target.value)}
                                         className={`${selectBaseClass} ${isDarkMode ? selectDarkClass : selectLightClass}`}
                                     >
                                         {daysOfWeek.map(day => (<option key={day} value={day}>{day}</option>))}
                                     </select>
                                 </div>
                             </div>
                             <div className="flex-grow w-full sm:w-auto">
                                 <label htmlFor="currentScheduleTimings" className={subLabelClass}>Timings (HH:MM)</label>
                                 <input
                                     id="currentScheduleTimings" type="text" placeholder="e.g., 09:00, 14:30" value={currentScheduleTimings} onChange={(e) => setCurrentScheduleTimings(e.target.value)}
                                     className={`${inputBaseClass} ${isDarkMode ? inputDarkClass : inputLightClass}`}
                                 />
                                 <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Comma-separated, 24h format</p>
                             </div>
                             <button
                                 type="button" onClick={handleAddScheduleSlot}
                                 className={`w-full sm:w-auto px-3 py-2 text-sm font-medium rounded-md transition-all shadow-sm flex items-center justify-center gap-1 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500' : 'bg-indigo-500 hover:bg-indigo-600 text-white focus:ring-indigo-500'}`} >
                                 <FiPlus size={16}/> Add/Update Day
                             </button>
                         </div>
                         {scheduleEditError && <p className={`text-xs mt-2 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{scheduleEditError}</p>}
                    </fieldset>

                    {/* Batch */}
                    <div>
                        <label htmlFor="batch" className={labelClass}>Batch <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            id="batch"
                            name="batch"
                            value={formData.batch}
                            onChange={handleChange}
                            required
                            placeholder="Enter 4-digit year (e.g., 2024)"
                            maxLength="4"
                            pattern="\d{4}" // HTML5 pattern validation
                            className={`${inputBaseClass} ${isDarkMode ? inputDarkClass : inputLightClass}`}
                        />
                    </div>

                    {/* Status Dropdown */}
                    <div>
                        <label htmlFor="status" className={labelClass}>Status <span className="text-red-500">*</span></label>
                        <div className="relative">
                             <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                required
                                className={`${selectBaseClass} ${isDarkMode ? selectDarkClass : selectLightClass}`}
                            >
                                {classStatuses.map(status => (
                                    <option key={status} value={status} className="capitalize">
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Submit Error */}
                    {submitError && <p className={`text-sm font-medium text-center p-2 rounded ${isDarkMode ? 'text-red-300 bg-red-900/40' : 'text-red-600 bg-red-100'}`}>{submitError}</p>}

                    {/* Submit Button */}
                    <div className="pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">
                         <button
                            type="submit"
                            disabled={isSubmitting || loading}
                            className={`w-full flex justify-center items-center gap-2 px-6 py-2.5 font-semibold rounded-md shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed ${
                                isDarkMode
                                ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-offset-gray-800'
                                : 'bg-green-600 hover:bg-green-700 text-white focus:ring-offset-white'
                            }`}
                         >
                            {isSubmitting ? (
                                <> <FiLoader className="animate-spin h-5 w-5"/> Updating... </>
                             ) : (
                                <> <FiSave className="h-5 w-5"/> Save Changes </>
                             )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditClass; 