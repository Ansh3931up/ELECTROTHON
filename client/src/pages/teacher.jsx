import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiSearch } from 'react-icons/fi';

import OfflineToggle from "../components/OfflineToggle";
import { fetchAllStudents } from "../redux/slices/authSlice";
import { createClass, getTeacherClasses } from "../redux/slices/classSlice";
import BottomNavBar from "../components/BottomNavBar";

const Teacher = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user.user);
  const students = useSelector((state) => state.auth.students);
  const { classes, error } = useSelector((state) => state.class);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClass, setNewClass] = useState({
    className: "",  
    time: "",
    studentIds: [],
  });
  const [isOffline, setIsOffline] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?._id) {
      dispatch(getTeacherClasses(user._id));
      dispatch(fetchAllStudents());
    }
  }, [dispatch, user?._id]);

  const handleCreateClass = (e) => {
    e.preventDefault();
    const classData = {
      teacherId: user._id,
      ...newClass,
      studentIds: newClass.studentIds,
    };
    dispatch(createClass(classData));
    setShowCreateForm(false);
    setNewClass({ className: "", time: "", studentIds: [] });
  };

  const handleStudentSelection = (studentId) => {
    setNewClass(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter(id => id !== studentId)
        : [...prev.studentIds, studentId]
    }));
  };

  const handleOfflineModeChange = (offline) => {
    setIsOffline(offline);
  };

  const handleClassClick = (cls) => {
    navigate(`/class/${cls._id}`);
  };

  const filteredClasses = classes.filter(cls =>
    cls.className.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="pb-16 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="p-4">
        {/* <div className="flex justify-end items-center mb-6 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm">
          <OfflineToggle onModeChange={handleOfflineModeChange} />
        </div> */}

        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Search classes..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <FiSearch className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls, index) => {
              const palettes = [
                { bg: 'bg-gradient-to-br from-blue-50 to-blue-100', decor: 'from-blue-200 to-blue-300', shadow: 'from-blue-400 to-indigo-400' },
                { bg: 'bg-gradient-to-br from-purple-50 to-purple-100', decor: 'from-purple-200 to-purple-300', shadow: 'from-purple-400 to-pink-400' },
                { bg: 'bg-gradient-to-br from-green-50 to-green-100', decor: 'from-green-200 to-green-300', shadow: 'from-green-400 to-teal-400' },
                { bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100', decor: 'from-yellow-200 to-yellow-300', shadow: 'from-yellow-400 to-orange-400' },
              ];
              const palette = palettes[index % palettes.length];

              return (
                <div
                  key={cls._id}
                  className="group relative transform transition-all duration-300 hover:-translate-y-1"
                  onClick={() => handleClassClick(cls)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${palette.shadow} rounded-xl transform transition-transform group-hover:scale-[1.01] blur-sm opacity-20`}></div>

                  <div className={`relative ${palette.bg} rounded-xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200/50 overflow-hidden`}>
                    <div className={`absolute top-0 right-0 w-12 h-12 bg-gradient-to-br ${palette.decor} rounded-bl-full rounded-tr-xl opacity-60`}></div>

                    <div className="relative z-10">
                      <h3 className="font-semibold text-md text-gray-800 mb-1 truncate">{cls.className}</h3>
                      <div className="space-y-1 text-xs">
                        <p className="flex items-center text-gray-600">
                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(cls.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="flex items-center text-gray-600">
                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {cls.studentList?.length || 0} Students
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
              <p className="col-span-full text-center text-gray-500 mt-4">No classes found matching your search.</p>
          )}
        </div>

        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-gray-800">Create New Class</h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">Fill in the details to create a new class</p>
              </div>

              <form onSubmit={handleCreateClass} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Name
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter class name"
                      value={newClass.className}
                      onChange={(e) => setNewClass({ ...newClass, className: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Time
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newClass.time}
                    onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Students
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                    {students.map((student) => (
                      <div 
                        key={student._id} 
                        className="flex items-center p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          id={student._id}
                          checked={newClass.studentIds.includes(student._id)}
                          onChange={() => handleStudentSelection(student._id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-colors"
                        />
                        <label htmlFor={student._id} className="ml-3 cursor-pointer flex-1">
                          <div className="text-sm font-medium text-gray-700">{student.fullName}</div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Selected: {newClass.studentIds.length} students
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                  >
                    Create Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 mt-2">{error}</p>}

        <BottomNavBar 
          user={user} 
          isDarkMode={isDarkMode} 
          setSidebarOpen={setSidebarOpen}
          onCreateClass={() => setShowCreateForm(true)}
        />
      </div>
    </div>
  );
};

export default Teacher;
