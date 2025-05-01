import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { 
FiBook, FiCalendar,
FiHome, FiMenu, FiPlus,FiPlusCircle, 
FiUser, FiX} from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import {  NavLink,useLocation, useNavigate } from 'react-router-dom';

import { useTheme } from '../context/ThemeContext'; // Import useTheme
import { fetchAllStudents } from '../redux/slices/authSlice';
import { createClass } from '../redux/slices/classSlice';

// Define days of the week
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const BottomNavBar = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const students = useSelector((state) => state.auth.students);
  const { isDarkMode } = useTheme(); // Use context for dark mode state

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState(''); // For displaying form errors

  const [newClass, setNewClass] = useState({
    className: "",
    schedule: [], // Now an array of { day: String, timing: [String] }
    classCode: "",
    batch: "",
    status: "active",
    studentIds: [],
  });

  // --- State for the *current* schedule slot being added ---
  const [currentScheduleDay, setCurrentScheduleDay] = useState(daysOfWeek[0]); // Default to Monday
  const [currentScheduleTimings, setCurrentScheduleTimings] = useState(''); // Input field for comma-separated times

  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (isTeacher) {
      dispatch(fetchAllStudents());
    }
  }, [dispatch, isTeacher]);

  // --- Function to add the current schedule slot to the main schedule array ---
  const handleAddScheduleSlot = () => {
    setFormError(''); // Clear previous errors
    const timingsArray = currentScheduleTimings.split(',')
        .map(t => t.trim()) // Trim whitespace
        .filter(t => t !== ''); // Remove empty entries

    if (timingsArray.length === 0) {
        setFormError("Please enter at least one valid timing for the selected day (e.g., '4:00 PM' or '16:00, 17:00').");
        return;
    }

    // Check if a slot for this day already exists
    const existingIndex = newClass.schedule.findIndex(slot => slot.day === currentScheduleDay);

    if (existingIndex > -1) {
        // Option 1: Replace existing timings for the day
        // setNewClass(prev => ({
        //     ...prev,
        //     schedule: prev.schedule.map((slot, index) =>
        //         index === existingIndex ? { ...slot, timing: timingsArray } : slot
        //     )
        // }));

        // Option 2: Merge timings (avoid duplicates) - More complex UI might be needed
        // For simplicity, let's prevent adding the same day twice for now
        setFormError(`Schedule already exists for ${currentScheduleDay}. Remove it first to add new timings.`);
        return;

    } else {
        // Add new schedule slot
        setNewClass(prev => ({
            ...prev,
            schedule: [...prev.schedule, { day: currentScheduleDay, timing: timingsArray }]
        }));
    }

    // Reset input fields for the next slot
    // setCurrentScheduleDay(daysOfWeek[0]); // Optional: reset day dropdown
    setCurrentScheduleTimings('');
  };

  // --- Function to remove a schedule slot ---
  const handleRemoveScheduleSlot = (dayToRemove) => {
    setNewClass(prev => ({
        ...prev,
        schedule: prev.schedule.filter(slot => slot.day !== dayToRemove)
    }));
  };

  const handleCreateClass = (e) => {
    e.preventDefault();
    setFormError(''); // Clear previous errors
    console.log("user011", user);
    if (!user?._id) { // Use direct _id access
      console.error("User ID not found in user prop for creating class.");
      setFormError("Authentication error. Please log in again.");
      return;
    }
    // Batch validation (simple check for 4-digit year)
    const yearRegex = /^\d{4}$/;
    if (!yearRegex.test(newClass.batch)) {
        setFormError("Batch must be a valid 4-digit year (e.g., 2024).");
        return;
    }
    // Ensure at least one schedule slot has been added
    if (newClass.schedule.length === 0) {
        setFormError("Please add at least one schedule slot (day and timing).");
        return;
    }

    const classData = {
      className: newClass.className,
      schedule: newClass.schedule, // Send the array of slots
      classCode: newClass.classCode,
      batch: newClass.batch,
      status: newClass.status,
      studentIds: newClass.studentIds,
    };
    console.log("Dispatching createClass with data:", classData);
    dispatch(createClass(classData))
      .unwrap()
      .then(() => {
          console.log("Class created successfully!");
          setShowCreateForm(false);
          // Reset state including the schedule array
          setNewClass({
            className: "",
            schedule: [], // Reset schedule
            classCode: "",
            batch: "",
            status: "active",
            studentIds: []
          });
          setCurrentScheduleTimings(''); // Reset temporary inputs too
          setCurrentScheduleDay(daysOfWeek[0]);
          setFormError('');
      })
      .catch((error) => {
           const errorMsg = error?.message || error || "An unknown error occurred.";
           console.error("Failed to create class:", errorMsg);
           setFormError(`Failed to create class: ${errorMsg}`); // Display error to user
      });
  };

  const handleStudentSelection = (studentId) => {
    setNewClass(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter(id => id !== studentId)
        : [...prev.studentIds, studentId]
    }));
  };
  
  const teacherNavItems = [
    { label: 'Home', path: '/teacher-home', icon: <FiHome size={20} /> },
    { label: 'Classes', path: '/teacher', icon: <FiBook size={20} /> },
    { 
      label: 'Add', 
      icon: <FiPlusCircle size={28} />,
      action: () => {
        setShowCreateForm(true);
        setFormError(''); // Clear errors when opening modal
      },
      isAddButton: true
    },
    { label: 'Timetable', path: '/teacher-timetable', icon: <FiCalendar size={20} /> },
    { label: 'Attendance', path: '/teacher', icon: <FiMenu size={20} />},
  ];
  
  const studentNavItems = [
    { label: 'Home', path: '/student-home', icon: <FiHome size={20} /> },
    { label: 'Classes', path: '/student-classes', icon: <FiBook size={20} /> },
    { 
      label: 'Add', 
      icon: <FiPlusCircle size={28} />,
      action: () => {
        navigate('/student-find-classes');
      },
      isAddButton: true
    },
    { label: 'Attendance', path: '/student-attendance', icon: <FiCalendar size={20} /> },
    { label: 'Mark', path: '/student', icon: <FiUser size={20} /> },
  ];
  
  const bottomNavItems = isTeacher ? teacherNavItems : studentNavItems;

  if (!user) return null;

  // --- Common input/select classes for dark mode ---
  const inputBaseClass = "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-sm";
  const inputLightClass = "bg-white border-gray-300 text-gray-900 placeholder-gray-400";
  const inputDarkClass = "bg-gray-700 border-gray-500 text-gray-100 placeholder-gray-400 focus:ring-offset-gray-800"; // Added focus offset

  const selectBaseClass = "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-sm appearance-none"; // Added appearance-none for custom arrow later if needed
  const selectLightClass = "bg-white border-gray-300 text-gray-900";
  const selectDarkClass = "bg-gray-700 border-gray-500 text-gray-100 focus:ring-offset-gray-800";

  const labelClass = `block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;
  const subLabelClass = `block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`;
  const textMutedClass = `text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;

  return (
    <>
      <div className={`fixed rounded-t-3xl bg-gradient-to-r shadow-lg z-40 border-t -bottom-2 left-0 right-0 ${
          isDarkMode
          ? 'from-gray-800 to-gray-900 border-gray-700'
          : 'from-[#003065] to-[#002040] border-blue-800'
      }`}>
        <div className="flex justify-between items-center max-w-screen-sm mx-auto">
          {bottomNavItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const isAddButton = item.isAddButton;
            
            const activeClass = isDarkMode ? 'text-blue-300' : 'text-blue-400';
            const inactiveClass = isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-white/70 hover:text-white';
            
            return (
              <div key={index} className={`flex-1 ${isAddButton ? 'flex justify-center -mt-8' : ''}`}>
                {item.action ? (
                  <button
                    onClick={item.action}
                    className={`${isAddButton ? 'w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 shadow-lg text-white flex items-center justify-center transform transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-xl' : 
                      `w-full py-5 flex flex-col items-center justify-center transition-colors 
                      ${isActive ? activeClass : inactiveClass}`}`}
                  >
                    <div className={isAddButton ? 'drop-shadow-md' : `${isActive ? activeClass : inactiveClass}`}>
                      {item.icon}
                    </div>
                  </button>
                ) : (
                  <NavLink
                    to={item.path}
                    className={`w-full py-3 flex flex-col items-center justify-center transition-colors ${isActive ? activeClass : inactiveClass}`}
                  >
                    <div className={`${isActive ? activeClass : ''}`}>
                      {item.icon}
                    </div>
                    <span className="text-xs mt-1">{item.label}</span>
                  </NavLink>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isTeacher && showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4 py-6 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-xl w-full max-w-lg transform transition-all max-h-[90vh] flex flex-col border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-transparent' // Darker bg, subtle border
          }`}>
            <div className={`border-b px-6 py-4 flex items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Create New Class</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className={`p-1 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-400 hover:bg-gray-100'}`}
                aria-label="Close modal"
              >
                <FiX size={20} />
              </button>
            </div>

            <form id="create-class-form" onSubmit={handleCreateClass} className="p-6 space-y-5 overflow-y-auto flex-grow custom-scrollbar">
              <div>
                <label htmlFor="className" className={labelClass}>
                  Class Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="className"
                  type="text"
                  placeholder="e.g., Intro to Programming"
                  value={newClass.className}
                  onChange={(e) => setNewClass({ ...newClass, className: e.target.value })}
                  className={`${inputBaseClass} ${isDarkMode ? inputDarkClass : inputLightClass}`}
                  required
                />
              </div>

              {/* --- Schedule Section Start --- */}
              <fieldset className={`border rounded-lg p-4 pt-2 space-y-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                 <legend className={`text-sm font-medium px-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Schedule <span className="text-red-500">*</span></legend>

                 {/* Display Added Schedule Slots */}
                 <div className="space-y-2 max-h-24 overflow-y-auto custom-scrollbar pr-2">
                     {newClass.schedule.length === 0 && (
                         <p className={`text-xs italic text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>No schedule slots added yet.</p>
                     )}
                     {newClass.schedule.map((slot) => (
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
                 <div className="flex flex-col sm:flex-row gap-3 items-end pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">
                    {/* Day Selection */}
                    <div className="flex-grow w-full sm:w-auto">
                       <label htmlFor="currentScheduleDay" className={subLabelClass}>Day</label>
                       <select
                         id="currentScheduleDay"
                         value={currentScheduleDay}
                         onChange={(e) => setCurrentScheduleDay(e.target.value)}
                         className={`${selectBaseClass} ${isDarkMode ? selectDarkClass : selectLightClass}`}
                       >
                         {daysOfWeek.map(day => (
                           <option key={day} value={day}>{day}</option>
                         ))}
                       </select>
                    </div>
                    {/* Timings Input */}
                    <div className="flex-grow w-full sm:w-auto">
                       <label htmlFor="currentScheduleTimings" className={subLabelClass}>Timings</label>
                       <input
                         id="currentScheduleTimings"
                         type="text"
                         placeholder="e.g., 4:00 PM, 5:00 PM"
                         value={currentScheduleTimings}
                         onChange={(e) => setCurrentScheduleTimings(e.target.value)}
                         className={`${inputBaseClass} ${isDarkMode ? inputDarkClass : inputLightClass}`}
                       />
                        <p className={textMutedClass}>Comma-separated</p>
                    </div>
                    {/* Add Button */}
                    <button
                       type="button"
                       onClick={handleAddScheduleSlot}
                       className={`w-full sm:w-auto px-3 py-2 text-sm font-medium rounded-md transition-all shadow-sm flex items-center justify-center gap-1 ${isDarkMode ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500' : 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500'}`}
                    >
                       <FiPlus size={16}/> Add Slot
                    </button>
                 </div>
              </fieldset>
              {/* --- Schedule Section End --- */}

              <div>
                <label htmlFor="classCode" className={labelClass}>
                  Class Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="classCode"
                  type="text"
                  placeholder="e.g., CS101"
                  value={newClass.classCode}
                  onChange={(e) => setNewClass({ ...newClass, classCode: e.target.value })}
                  className={`${inputBaseClass} ${isDarkMode ? inputDarkClass : inputLightClass}`}
                  required
                />
                 <p className={textMutedClass}>Must be unique.</p>
              </div>

              <div>
                <label htmlFor="batch" className={labelClass}>
                  Batch / Year <span className="text-red-500">*</span>
                </label>
                <input
                  id="batch"
                  type="text"
                  placeholder="e.g., 2024"
                  value={newClass.batch}
                  onChange={(e) => setNewClass({ ...newClass, batch: e.target.value })}
                  className={`${inputBaseClass} ${isDarkMode ? inputDarkClass : inputLightClass} ${formError.includes('Batch') ? (isDarkMode ? 'border-red-500/50' : 'border-red-500') : ''}`}
                  required
                  maxLength={4}
                />
                 {formError.includes('Batch') && <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{formError}</p>}
                 {!formError.includes('Batch') && <p className={textMutedClass}>Enter the 4-digit year.</p>}
              </div>

              <div>
                <label htmlFor="status" className={labelClass}>
                    Status <span className="text-red-500">*</span>
                </label>
                <select
                    id="status"
                    value={newClass.status}
                    onChange={(e) => setNewClass({ ...newClass, status: e.target.value })}
                    className={`${selectBaseClass} ${isDarkMode ? selectDarkClass : selectLightClass}`}
                    required
                >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="ended">Ended</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Select Students <span className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}> (Optional)</span>
                </label>
                <div className={`max-h-40 overflow-y-auto border rounded-lg ${isDarkMode ? 'border-gray-600 bg-gray-700/40' : 'border-gray-300 bg-gray-50/50'}`}>
                  {students && students.length > 0 ? (
                     students.map((student) => (
                        <div
                            key={student._id}
                            className={`flex items-center p-3 border-b last:border-b-0 transition-colors ${isDarkMode ? 'border-gray-700 hover:bg-gray-600/50' : 'border-gray-200 hover:bg-blue-50'}`}
                        >
                            <input
                                type="checkbox"
                                id={`student-${student._id}`}
                                checked={newClass.studentIds.includes(student._id)}
                                onChange={() => handleStudentSelection(student._id)}
                                className={`w-4 h-4 rounded border-gray-300 dark:border-gray-500 focus:ring-blue-500 dark:focus:ring-blue-600 dark:focus:ring-offset-gray-800 transition-colors mr-3 flex-shrink-0 cursor-pointer ${isDarkMode ? 'bg-gray-600 checked:bg-blue-500' : 'text-blue-600'}`}
                            />
                            <label htmlFor={`student-${student._id}`} className="flex-1 cursor-pointer">
                                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{student.fullName}</div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{student.email}</div>
                            </label>
                        </div>
                    ))
                  ) : (
                     <p className={`text-sm p-3 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Loading students or none available...</p>
                  )}
                </div>
                <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Selected: {newClass.studentIds.length} student(s)
                </div>
              </div>

              {formError && !formError.includes('Batch') && (
                <p className={`text-sm p-3 rounded border text-center ${isDarkMode ? 'text-red-300 bg-red-900/30 border-red-700/50' : 'text-red-600 bg-red-100 border-red-300'}`}>{formError}</p>
              )}
            </form>

            <div className={`flex items-center justify-end space-x-3 p-4 border-t rounded-b-2xl ${isDarkMode ? 'border-gray-700 bg-gray-800/90' : 'border-gray-200 bg-gray-50'}`}>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-200 hover:bg-gray-500 focus:ring-offset-gray-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-offset-white'}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-class-form"
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 focus:ring-offset-gray-800' : 'bg-blue-600 hover:bg-blue-700 focus:ring-offset-white'}`}
              >
                Create Class
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

BottomNavBar.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string,
    role: PropTypes.string
  }),
};

export default BottomNavBar; 