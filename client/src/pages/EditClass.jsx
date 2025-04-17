import { useEffect, useState } from "react";
import { FiChevronLeft, FiLoader,FiSave } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";
import { useNavigate,useParams } from "react-router-dom";

import { clearCurrentClass,editClassDetails, fetchClassDetails } from "../redux/slices/classSlice";

const EditClass = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { currentClass, loading, error } = useSelector((state) => state.class);
    const user = useSelector((state) => state.auth.user.user); // Get logged-in user for verification

    // State for form fields
    const [formData, setFormData] = useState({
        className: '',
        classType: 'lecture',
        time: '',
        status: 'active'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Fetch class details on mount
    useEffect(() => {
        if (classId) {
            dispatch(fetchClassDetails(classId));
        }
        // Cleanup: Clear currentClass when leaving the page
        return () => {
            dispatch(clearCurrentClass());
        };
    }, [dispatch, classId]);

    // Populate form when class details load
    useEffect(() => {
        if (currentClass) {
            // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
            const formattedDate = currentClass.time
                ? new Date(new Date(currentClass.time).getTime() - new Date().getTimezoneOffset() * 60000) // Adjust for timezone
                      .toISOString()
                      .slice(0, 16)
                : '';

            setFormData({
                className: currentClass.className || '',
                classType: currentClass.classType || 'lecture',
                time: formattedDate,
                status: currentClass.status || 'active'
            });
        }
    }, [currentClass]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!user?._id) {
            setSubmitError("Authentication error. Please log in again.");
            return;
        }
        // Basic check if user is the teacher of the current class
        if (currentClass?.teacherId?._id !== user._id) {
             setSubmitError("You are not authorized to edit this class.");
             return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        // Prepare updates object - only include fields that might have changed
        const updates = {
            className: formData.className,
            classType: formData.classType,
            time: formData.time ? new Date(formData.time).toISOString() : null, // Send ISO string or null
            status: formData.status,
        };

        dispatch(editClassDetails({ classId, updates, teacherId: user._id }))
            .unwrap()
            .then(() => {
                alert("Class updated successfully!");
                navigate(`/class/${classId}`); // Go back to details page
            })
            .catch((err) => {
                setSubmitError(err || "Failed to update class.");
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    if (loading) return <loading/>;
    if (error) return <div className="p-6 text-center text-red-500 bg-red-100 border border-red-400 rounded-md">Error: {error}</div>;
    if (!currentClass) return <div className="p-6 text-center text-gray-500">Class not found or you don&apos;t have access.</div>;
    // Authorization check after loading
     if (currentClass && currentClass.teacherId?._id !== user?._id) {
         return <div className="p-6 text-center text-red-500">You are not authorized to edit this class.</div>;
     }

    return (
        <div className="min-h-screen bg-gray-100 pb-24">
            <div className="p-4 sm:p-6 max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center mb-6 sm:mb-8">
                    <button onClick={() => navigate(-1)} className="mr-3 text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-200 transition-colors duration-150" aria-label="Go back">
                        <FiChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Class: {currentClass.className}</h1>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200 space-y-6">
                    {/* Class Name */}
                    <div>
                        <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                        <input
                            type="text"
                            id="className"
                            name="className"
                            value={formData.className}
                            onChange={handleChange}
                            required
                            minLength="3"
                            maxLength="50"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Class Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class Type</label>
                        <select
                            id="classType"
                            name="classType"
                            value={formData.classType}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                            <option value="lecture">Lecture</option>
                            <option value="lab">Lab</option>
                        </select>
                    </div>

                    {/* Time */}
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time</label>
                        <input
                            type="datetime-local"
                            id="time"
                            name="time"
                            value={formData.time}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                     {/* Status */}
                     <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    {/* Submit Error */}
                    {submitError && <p className="text-sm text-red-600">{submitError}</p>}

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-gray-200">
                         <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex justify-center items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
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