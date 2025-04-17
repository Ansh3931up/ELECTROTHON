import { useEffect, useState } from "react";
import { FiCalendar, FiUsers, FiSearch, FiCircle } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import BottomNavBar from "../components/BottomNavBar";
// import OfflineToggle from "../components/OfflineToggle"; // Keep if needed elsewhere
import { fetchAllStudents } from "../redux/slices/authSlice";
// Removed createClass import
import { getTeacherClasses } from "../redux/slices/classSlice";
import { useTheme } from "../context/ThemeContext"; // Import useTheme

const Teacher = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Ensure you select the correct user object path from your state
  const user = useSelector((state) => state.auth.user); // Simplified user selection assuming state.auth.user holds the direct user object
  // Removed students selector here, as BottomNavBar fetches it
  const { classes, error, loading } = useSelector((state) => state.class);
  
  // Removed modal state and handlers
  // const [showCreateForm, setShowCreateForm] = useState(false);
  // const [newClass, setNewClass] = useState({ ... });
  // const [isOffline, setIsOffline] = useState(false); // Keep if needed
  const { isDarkMode } = useTheme(); // Use the theme context
  // const [isSidebarOpen, setSidebarOpen] = useState(false); // Keep if needed by NavBar, not BottomNavBar
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('active'); // State for the active status filter, default to 'active'

  useEffect(() => {
    // Use optional chaining for safer access
    if (user?.user?._id) {
      dispatch(getTeacherClasses(user.user._id));
      // No need to fetch students here anymore, BottomNavBar does it
      // dispatch(fetchAllStudents());
    }
    // Dependency array should ideally include user object if it changes, or user._id
  }, [dispatch, user?.user?._id]);

  // Removed handleCreateClass function
  // Removed handleStudentSelection function

  // const handleOfflineModeChange = (offline) => { // Keep if needed
  //   setIsOffline(offline);
  // };

  const handleClassClick = (cls) => {
    navigate(`/class/${cls._id}`);
  };
  console.log("classes",classes);
  // --- Updated Filtering Logic ---
  const filteredClasses = (classes || []) // Ensure classes is an array
    // 1. Filter by status first (if not 'all')
    .filter(cls => activeFilter === 'all' || cls.status === activeFilter)
    // 2. Then filter by search term
    .filter(cls =>
      cls.className?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  console.log("filteredClasses",filteredClasses);
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Simplified user object check
  if (!user) {
      // Optional: show a loading state or redirect
      return <div className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading user data...</div>;
  }

  // --- Function to format schedule for display ---
  const formatSchedule = (scheduleArray) => {
      // Add check to ensure scheduleArray is actually an array
      if (!scheduleArray || !Array.isArray(scheduleArray) || scheduleArray.length === 0) {
          return "No schedule";
      }

      // Map and filter out invalid entries
      const formattedSlots = scheduleArray
          .map(slot => {
              // Check if slot exists, day is a non-empty string, and timing is an array
              if (slot && typeof slot.day === 'string' && slot.day.trim() && Array.isArray(slot.timing)) {
                  // Safely create the string
                  return `${slot.day.substring(0, 3)}: ${slot.timing.join('/')}`;
              }
              // Return null or an indicator for invalid slots
              console.warn("Invalid schedule slot found:", slot); // Log invalid data
              return null;
          })
          .filter(Boolean); // Remove any null entries resulting from invalid slots

      // Join valid entries or return a message if none were valid
      const joinedString = formattedSlots.join(' | ');
      const maxLength = 35; // Shorter for this design
      return joinedString.length > maxLength ? joinedString.substring(0, maxLength) + '...' : joinedString;
  };

  // --- Get status color - simpler version for dot ---
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-400';
      case 'inactive':
        return 'bg-yellow-400';
      case 'ended':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  // --- Helper to get badge styles based on status ---
  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'; // Fallback
    }
  };

  // --- Define Lighter/Subtler Palettes ---
  const palettes = [
    // Adjusted gradients to be less intense (e.g., 400/500 instead of 500/600)
    // Adjusted highlight opacity
    { gradient: 'from-purple-400 to-indigo-500', highlight: 'bg-pink-500/50', text: 'text-white' },
    { gradient: 'from-blue-400 to-cyan-500', highlight: 'bg-emerald-400/50', text: 'text-white' },
    { gradient: 'from-green-400 to-teal-500', highlight: 'bg-lime-400/40', text: 'text-white' },
    { gradient: 'from-orange-400 to-red-500', highlight: 'bg-yellow-400/50', text: 'text-white' },
    { gradient: 'from-pink-400 to-rose-500', highlight: 'bg-fuchsia-400/40', text: 'text-white' },
    { gradient: 'from-sky-400 to-blue-500', highlight: 'bg-violet-400/50', text: 'text-white' },
  ];

  // --- Filter Button Data ---
  const filterOptions = ['active', 'inactive', 'ended', 'all'];

  return (
    <div className={`pb-20 pt-4 min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-slate-100'} transition-colors duration-300`}>
      <div className="p-4 max-w-4xl mx-auto">
        {/* <div className="flex justify-end items-center mb-6 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm">
          <OfflineToggle onModeChange={handleOfflineModeChange} />
        </div> */}

        <div className="mb-8 relative">
          <input
            type="text"
            placeholder="Search classes..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={`w-full px-4 py-3 pl-11 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-base ${
                isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
            }`}
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <FiSearch className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
        </div>

        {/* --- Sleek Filter Toggle --- */}
        <div className={`mb-8 p-1 rounded-xl flex items-center justify-start sm:justify-center space-x-1 overflow-x-auto custom-scrollbar w-full ${
            isDarkMode ? 'bg-gray-800' : 'bg-gray-200/60' // Darker container bg
        }`}>
          {filterOptions.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 sm:px-5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 ${
                activeFilter === filter
                  ? 'bg-blue-600 text-white shadow' // Active state is the same for both modes
                  : isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700' // Dark Inactive: Lighter text, darker hover bg
                  : 'text-gray-600 hover:bg-white/60' // Light Inactive
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && <p className={`text-center mt-8 text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading classes...</p>}

        {/* Class Grid - 2 Columns, Updated Card Style */}
        {!loading && (
          <div className="grid grid-cols-2 gap-5"> {/* Fixed 2 columns, adjusted gap */}
            {filteredClasses.length > 0 ? (
              filteredClasses.map((cls, index) => {
                const palette = palettes[index % palettes.length];
                const statusColor = getStatusColor(cls.status);
                const studentCount = cls.studentList?.length || 0;
                const displaySchedule = formatSchedule(cls.schedule);
                const displayBatch = cls.batch || ''; // Empty string if N/A

                return (
                  <div
                    key={cls._id}
                    // Main Card Styling - gradient uses updated palette
                    className={`relative group bg-gradient-to-br ${palette.gradient} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden aspect-[3/2] flex flex-col justify-between p-5 ${palette.text}`}
                    onClick={() => handleClassClick(cls)}
                  >
                    {/* Abstract Shapes - Slightly reduced opacity */}
                    <div className={`absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 rounded-full ${palette.highlight} opacity-40 blur-lg group-hover:opacity-50 transition-opacity duration-400`}></div>
                    <div className={`absolute -top-10 -left-10 w-1/2 h-1/2 rounded-full ${palette.highlight} opacity-30 blur-md`}></div>
                    <div className={`absolute top-1/3 left-1/4 w-1/3 h-1/3 rounded-full ${palette.highlight} opacity-20 blur-xl`}></div>

                     {/* Top Section: Title & Status */}
                    <div className="relative z-10 flex justify-between items-start">
                        <h3 className="font-semibold text-lg sm:text-xl leading-tight">{cls.className || 'Unnamed Class'}</h3>
                         {/* Status Dot */}
                         <div className="flex items-center space-x-1.5 mt-1" title={cls.status ? cls.status.charAt(0).toUpperCase() + cls.status.slice(1) : 'Unknown'}>
                             <span className={`w-2.5 h-2.5 rounded-full ${statusColor} shadow-sm`}></span> {/* Added subtle shadow to dot */}
                         </div>
                    </div>

                    {/* Bottom Section: Details */}
                    <div className="relative z-10 space-y-1.5 text-sm opacity-90 mt-auto"> {/* Pushes to bottom */}
                         {/* Batch / Code */}
                         {(cls.classCode || displayBatch) && (
                             <p className="text-xs opacity-80">{cls.classCode || ''} {cls.classCode && displayBatch ? <span className="opacity-70 mx-1">·</span> : ''} {displayBatch}</p>
                         )}
                         {/* Schedule */}
                          <p className="flex items-center">
                           <FiCalendar className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 opacity-80" />
                           <span>{displaySchedule}</span>
                         </p>
                         {/* Students */}
                          <p className="flex items-center">
                           <FiUsers className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 opacity-80" />
                           {studentCount} Student{studentCount !== 1 ? 's' : ''}
                         </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className={`col-span-2 text-center mt-8 text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {searchTerm
                  ? `No classes found matching "${searchTerm}" ${activeFilter !== 'all' ? `with status "${activeFilter}"` : ''}.`
                  : `No ${activeFilter !== 'all' ? activeFilter : ''} classes found.`}
              </p>
            )}
          </div>
        )}

        {error && <p className={`text-red-600 dark:text-red-400 mt-4 text-center p-3 rounded ${isDarkMode ? 'bg-red-900/30' : 'bg-red-100/70'}`}> {/* Adjusted dark error bg */}
          {typeof error === 'string' ? error : 'An error occurred loading classes.'}
        </p>}

        <BottomNavBar user={user} />
      </div>
    </div>
  );
};

export default Teacher;
