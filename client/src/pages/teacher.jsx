import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTeacherClasses, createClass, generatefrequency } from "../redux/slices/classSlice";
import { playSound } from "../helpers/playSound";
import NavBar from "../components/NavBar";

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
  console.log("use", user);
  const { classes, loading, error } = useSelector((state) => state.class);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClass, setNewClass] = useState({
    className: "",  
    time: "",
    studentIds: "",
  });
  const [classFrequencies, setClassFrequencies] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});

  useEffect(() => {
    if (user?._id) {
      console.log(user._id,"inside");
      const resp=dispatch(getTeacherClasses(user._id));
      console.log(resp,"class");
    }
  }, [dispatch, user]);

  const handleCreateClass = (e) => {
    e.preventDefault();
    const classData = {
      teacherId: user._id,
      ...newClass,
      studentIds: newClass.studentIds.split(',').map(id => id.trim()),
    };
    dispatch(createClass(classData));
    setShowCreateForm(false);
    setNewClass({ className: "", time: "", studentIds: "" });
  };

  const handleGenerateFrequency = async (classId) => {
    setDisabledButtons(prev => ({ ...prev, [classId]: true }));
    setTimeout(() => {
      setDisabledButtons(prev => ({ ...prev, [classId]: false }));
    }, 5000); // Disable button for 5 seconds

    const newFrequency =await  generateRandomFrequency();
    console.log(newFrequency,"frequency");
    const result = await dispatch(generatefrequency({ 
      classId, 
      teacherId: user._id,
      frequency: newFrequency // Send the generated frequency to backend
    }));
    if (generatefrequency.fulfilled.match(result)) {
      console.log(result.payload,"loaded");
      setClassFrequencies(prev => ({ ...prev, [classId]: result.payload }));
    }
  };

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Teacher Dashboard</h1>

        {/* Create Class Button */}
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        >
          Create New Class
        </button>

        {/* Create Class Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <form onSubmit={handleCreateClass} className="bg-white p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Create New Class</h2>
              <input
                type="text"
                placeholder="Class Name"
                value={newClass.className}
                onChange={(e) => setNewClass({ ...newClass, className: e.target.value })}
                className="block w-full mb-2 p-2 border rounded"
              />
              <input
                type="datetime-local"
                value={newClass.time}
                onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                className="block w-full mb-2 p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Student IDs (comma-separated)"
                value={newClass.studentIds}
                onChange={(e) => setNewClass({ ...newClass, studentIds: e.target.value })}
                className="block w-full mb-4 p-2 border rounded"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Classes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {classes.map((cls) => (
            <div key={cls._id} className="border rounded-lg p-4 shadow">
              <h3 className="font-bold text-lg">{cls.className}</h3>
              <p className="text-gray-600">Time: {new Date(cls.time).toLocaleString()}</p>
              <p className="text-gray-600">Students: {cls.studentList.length}</p>
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
