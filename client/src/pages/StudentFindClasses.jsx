import { useEffect, useState } from 'react';
import { FiSearch, FiBook, FiUser, FiClock, FiHash, FiX, FiUsers } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';

import { useTheme } from '../context/ThemeContext';
import { fetchTeachersBySchool } from '../redux/slices/authSlice';
import { joinClass} from '../redux/slices/classSlice';

const StudentFindClasses = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const user = useSelector((state) => state.auth.user);
  const { teachers, loading, error } = useSelector((state) => state.auth);
  console.log("teachers",teachers);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningClass, setJoiningClass] = useState(null);
  const [searchType, setSearchType] = useState('all'); // 'all', 'code', 'teacher', 'class'
  console.log("user 2221",user);
  useEffect(() => {
    if (user?.user?.schoolCode) {
      dispatch(fetchTeachersBySchool(user.user.schoolCode));
    }
  }, [user, dispatch]);

  const handleJoinClass = async (classId) => {
    try {
      setJoiningClass(classId);
      await dispatch(joinClass({ classId, studentId: user._id })).unwrap();
      // Refresh the teachers list after joining
      dispatch(fetchTeachersBySchool(user.schoolCode));
    } catch (err) {
      console.error(err);
    } finally {
      setJoiningClass(null);
    }
  };

  // Enhanced filtering logic
  const filteredTeachers = Array.isArray(teachers) ? teachers.filter(teacher => {
    const searchLower = searchQuery.toLowerCase().trim();
    
    if (!searchLower) return true;

    // If searching by class code specifically
    if (searchType === 'code') {
      return teacher.classes.some(cls => 
        cls.classCode.toLowerCase() === searchLower
      );
    }

    // If searching by teacher name
    if (searchType === 'teacher') {
      return teacher.fullName.toLowerCase().includes(searchLower) ||
             teacher.email.toLowerCase().includes(searchLower);
    }

    // If searching by class name
    if (searchType === 'class') {
      return teacher.classes.some(cls => 
        cls.className.toLowerCase().includes(searchLower)
      );
    }

    // General search (all fields)
    return (
      teacher.fullName.toLowerCase().includes(searchLower) ||
      teacher.email.toLowerCase().includes(searchLower) ||
      teacher.classes.some(cls => 
        cls.className.toLowerCase().includes(searchLower) ||
        cls.classCode.toLowerCase().includes(searchLower) ||
        cls.batch.toString().toLowerCase().includes(searchLower) ||
        cls.schedule.some(s => s.day.toLowerCase().includes(searchLower))
      )
    );
  }).map(teacher => ({
    ...teacher,
    // Filter classes if searching by class code or name
    classes: teacher.classes.filter(cls => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase().trim();
      
      if (searchType === 'code') {
        return cls.classCode.toLowerCase() === searchLower;
      }
      if (searchType === 'class') {
        return cls.className.toLowerCase().includes(searchLower);
      }
      return true;
    })
  })).filter(teacher => teacher.classes.length > 0) : [];

  const clearSearch = () => {
    setSearchQuery('');
    setSearchType('all');
  };

  // Detect if input looks like a class code
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    // Automatically switch to code search if input matches class code pattern
    if (/^[A-Za-z]{2,}\d*$/.test(value.trim())) {
      setSearchType('code');
    } else {
      setSearchType('all');
    }
  };

  // Function to get random gradient class - Updated with mobile-friendly colors
  const getRandomGradient = () => {
    const gradients = [
      'from-violet-400 to-purple-500',
      'from-blue-400 to-indigo-500',
      'from-emerald-400 to-teal-500',
      'from-rose-400 to-pink-500',
      'from-amber-400 to-orange-500',
      'from-cyan-400 to-blue-500'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50/30'}`}>
      {/* Mobile-optimized Hero Section */}
      <div className="bg-gradient-to-r py-6 ">
        <div className="px-4">
          <h1 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Find Classes
          </h1>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Discover and join your favorite classes
          </p>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Mobile-optimized Search Bar */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={`w-full px-4 py-3 pl-10 pr-10 rounded-xl border-0 text-base
                ${isDarkMode 
                  ? 'bg-gray-800/50 text-white placeholder-gray-400' 
                  : 'bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm`}
            />
            <FiSearch className="absolute left-3 top-3.5 h-5 w-5 text-purple-500" />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-3.5 p-0.5 rounded-full hover:bg-gray-200/20"
              >
                <FiX className="h-4 w-4 text-purple-500" />
              </button>
            )}
          </div>

          {/* Mobile-optimized Filter Pills - Scrollable */}
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {[
              { id: 'all', label: 'All', icon: FiSearch },
              { id: 'code', label: 'Code', icon: FiHash },
              { id: 'teacher', label: 'Teacher', icon: FiUser },
              { id: 'class', label: 'Class', icon: FiBook }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSearchType(filter.id)}
                className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1.5
                  ${searchType === filter.id
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow'
                    : isDarkMode
                      ? 'bg-gray-800/50 text-gray-300'
                      : 'bg-white text-gray-700'
                  }`}
              >
                <filter.icon className="h-3.5 w-3.5" />
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Teachers Section with 2-column grid for classes */}
        <div className="space-y-6">
          {filteredTeachers.map(teacher => (
            <div key={teacher._id} className="space-y-4">
              {/* Teacher Header - More compact */}
              <div className="flex items-center space-x-3 px-2">
                <div className="p-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500">
                  <FiUser className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {teacher.fullName}
                  </h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {teacher.email}
                  </p>
                </div>
              </div>

              {/* Classes Grid - 2 columns */}
              <div className="grid grid-cols-2 gap-3 px-2">
                {teacher.classes.map(cls => {
                  const gradientClass = getRandomGradient();
                  return (
                    <div 
                      key={cls._id}
                      className={`rounded-xl transition-all duration-300 bg-gradient-to-br ${gradientClass} 
                        active:scale-95 touch-manipulation relative overflow-hidden flex flex-col h-[160px]
                        shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200`}
                    >
                      {/* Main content with padding */}
                      <div className="p-3 flex-1 relative z-10">
                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-white leading-tight drop-shadow-sm">
                            {cls.className}
                          </h3>

                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-1.5 text-white/90">
                              <FiHash className="h-3 w-3 drop-shadow" />
                              <p className="text-xs drop-shadow">
                                {cls.classCode}
                              </p>
                            </div>

                            <div className="flex items-center space-x-1.5 text-white/90">
                              <FiClock className="h-3 w-3 drop-shadow" />
                              <p className="text-xs truncate drop-shadow">
                                {cls.schedule.map(s => `${s.day} (${s.timing[0]})`)[0]}
                              </p>
                            </div>

                            {cls.students && (
                              <div className="flex items-center space-x-1.5 text-white/90">
                                <FiUsers className="h-3 w-3 drop-shadow" />
                                <p className="text-xs drop-shadow">
                                  {cls.students.length} Students
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Updated Join button with enhanced shadows and highlights */}
                      <button
                        onClick={() => handleJoinClass(cls._id)}
                        disabled={joiningClass === cls._id}
                        className={`w-full py-2.5 px-3 transition-all duration-200 font-medium text-sm relative
                          ${joiningClass === cls._id
                            ? isDarkMode
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-200 text-gray-500'
                            : isDarkMode
                              ? 'bg-white/95 hover:bg-white text-purple-600 hover:text-purple-700 active:bg-white/90'
                              : 'bg-white hover:bg-purple-50 text-purple-600 hover:text-purple-700 active:bg-purple-100'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                          border-t border-white/10 backdrop-blur-sm
                          shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.15)]
                          ${isDarkMode ? 'shadow-dark' : 'shadow-light'}
                        `}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          {joiningClass === cls._id ? (
                            <>
                              <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              <span>Joining...</span>
                            </>
                          ) : (
                            <span className="drop-shadow-sm">Join Class</span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredTeachers.length === 0 && (
            <div className={`text-center py-8 rounded-xl ${
              isDarkMode 
                ? 'bg-gray-800/50' 
                : 'bg-white'
            } shadow-sm`}>
              <FiSearch className="w-8 h-8 mx-auto mb-3 text-purple-500 opacity-50" />
              <p className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                No classes found
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Try adjusting your search
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add this style to hide scrollbar but keep functionality */}
      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .shadow-light {
          box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .shadow-dark {
          box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default StudentFindClasses; 