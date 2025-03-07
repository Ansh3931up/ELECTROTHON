import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTeacherClasses, createClass, generatefrequency } from "../redux/slices/classSlice";
import { playSound } from "../helpers/playSound";

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
  const { user } = useSelector((state) => state.auth);
  const { classes, loading, error, frequency } = useSelector((state) => state.class);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClass, setNewClass] = useState({
    className: "",
    time: "",
    studentIds: "",
  });

  useEffect(() => {
    // if (user?._id) {
      dispatch(getTeacherClasses("67c61a646bc06ce3fe558d7a"));
    // }
  }, [dispatch, user]);

  const handleCreateClass = (e) => {
    e.preventDefault();
    const classData = {
      teacherId: "67c61a646bc06ce3fe558d7a",
      ...newClass,
      studentIds: newClass.studentIds.split(',').map(id => id.trim()),
    };
    dispatch(createClass(classData));
    setShowCreateForm(false);
    setNewClass({ className: "", time: "", studentIds: "" });
  };

  const handleGenerateFrequency = (classId) => {
    const newFrequency = generateRandomFrequency();
    dispatch(generatefrequency({ 
      classId, 
      teacherId: "67c61a646bc06ce3fe558d7a",
      frequency: newFrequency // Send the generated frequency to backend
    }));
  };

  return (
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
            >
              Generate Frequency
            </button>
            {frequency.length > 0 && (
              <button
                onClick={() => playSound(frequency)}
                className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
              >
                Play Sound
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Frequency Display */}
      {frequency.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Active Frequency</h2>
          <div className="grid grid-cols-3 gap-4">
            {frequency.map((freq, index) => (
              <div key={index} className="bg-white p-3 rounded-md shadow text-center">
                <span className="text-blue-600 font-mono text-lg">{freq} Hz</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default Teacher;
