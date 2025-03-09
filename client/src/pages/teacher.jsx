import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTeacherClasses, createClass, generatefrequency } from "../redux/slices/classSlice";
import { fetchAllStudents } from "../redux/slices/authSlice";
import { playSound } from "../helpers/playSound";
import NavBar from "../components/NavBar";
import OfflineToggle from "../components/OfflineToggle";
import { sendFrequencySMS, storeOfflineFrequency } from "../utils/offlineMode";

const generateRandomFrequency = () => {
  const minFreq = 1000; // 1 kHz
  const maxFreq = 8000; // 8 kHz
  const frequency = new Set();

  while (frequency.size < 1) {
    const randomFreq = Math.floor(Math.random() * (maxFreq - minFreq + 1)) + minFreq;
    frequency.add(randomFreq);
  }

  return Array.from(frequency);
};

const Teacher = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user.user);
  const students = useSelector((state) => state.auth.students);
  console.log("students",students);
  const { classes, loading, error } = useSelector((state) => state.class);
  console.log(user,"user")
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClass, setNewClass] = useState({
    className: "",  
    time: "",
    studentIds: [],
  });
  const [classFrequencies, setClassFrequencies] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  const [isOffline, setIsOffline] = useState(false);
  const [studentPhone, setStudentPhone] = useState("");
  const [showSMSForm, setShowSMSForm] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);

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
  console.log("classes",classes);
  const handleOfflineModeChange = (offline) => {
    setIsOffline(offline);
  };

  const handleGenerateFrequency = async (classId) => {
    setDisabledButtons(prev => ({ ...prev, [classId]: true }));
    setTimeout(() => {
      setDisabledButtons(prev => ({ ...prev, [classId]: false }));
    }, 5000);

    const newFrequency = await generateRandomFrequency();
    
    if (isOffline) {
      setSelectedClassId(classId);
      setShowSMSForm(true);
      setClassFrequencies(prev => ({ ...prev, [classId]: newFrequency }));
      storeOfflineFrequency(newFrequency);
    } else {
      const result = await dispatch(generatefrequency({ 
        classId, 
        teacherId: user._id,
        frequency: newFrequency
      }));
      if (generatefrequency.fulfilled.match(result)) {
        setClassFrequencies(prev => ({ ...prev, [classId]: result.payload }));
      }
    }
  };

  const handleSendSMS = async () => {
    if (!studentPhone || !selectedClassId) return;

    const frequency = classFrequencies[selectedClassId];
    const success = await sendFrequencySMS(frequency, studentPhone);
    
    if (success) {
      setShowSMSForm(false);
      setStudentPhone("");
      setSelectedClassId(null);
    }
  };

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <OfflineToggle onModeChange={handleOfflineModeChange} />
        </div>

        {/* Create Class Button */}
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        >
          Create New Class
        </button>

        {/* Enhanced Create Class Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
              {/* Modal Header */}
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

              {/* Modal Body */}
              <form onSubmit={handleCreateClass} className="p-6 space-y-6">
                {/* Class Name Input */}
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

                {/* Class Time Input */}
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

                {/* Student Selection */}
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

                {/* Modal Footer */}
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

        {/* SMS Form Modal */}
        {showSMSForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-semibold mb-4">Send Frequency via SMS</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Phone Number
                </label>
                <input
                  type="tel"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSMSForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendSMS}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Send SMS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Classes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {classes.map((cls) => (
            <div key={cls._id} className="border rounded-lg p-4 shadow">
              <h3 className="font-bold text-lg">{cls.className}</h3>
              <p className="text-gray-600">Time: {new Date(cls.time).toLocaleString()}</p>
              <p className="text-gray-600">Students: {cls.studentList?.length}</p>
              <button
                onClick={() => handleGenerateFrequency(cls._id)}
                className="bg-green-500 text-white px-4 py-2 rounded mt-2 mr-2"
                disabled={disabledButtons[cls._id]}
              >
                Generate Frequency
              </button>
              {classFrequencies[cls._id] && (
                <div className="bg-gray-100 p-4 rounded-lg mt-2">
                  <h2 className="text-lg font-semibold mb-2">Active Frequency</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {classFrequencies[cls._id].map((freq, index) => (
                      <div key={index} className="bg-white p-3 rounded-md shadow text-center">
                        <span className="text-blue-600 font-mono text-lg">{freq} Hz</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {classFrequencies[cls._id] && (
                <button
                  onClick={() => playSound(classFrequencies[cls._id])}
                  className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                >
                  Play Sound
                </button>
              )}
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default Teacher;
