import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getStudentClasses, getfrequencyByClassId } from "../redux/slices/classSlice";
import detectSound from "../helpers/detectSound";
import NavBar from "../components/NavBar";

const Student = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user.user);
  console.log("this is :", user);
  const { classes, loading, error } = useSelector((state) => state.class);
  const [listeningClasses, setListeningClasses] = useState({}); // State to manage listening status per class
  const [status, setStatus] = useState("Select a class to check frequency");
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classFrequencies, setClassFrequencies] = useState({}); // State to store frequencies for each class

  useEffect(() => {
    if (user?._id) {
      dispatch(getStudentClasses(user._id));
    }
  }, [dispatch, user]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedClassId) {
        dispatch(getfrequencyByClassId(selectedClassId)).then((result) => {
          if (getfrequencyByClassId.fulfilled.match(result)) {
            setClassFrequencies((prev) => ({
              ...prev,
              [selectedClassId]: result.payload,
            }));
          }
        });
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [dispatch, selectedClassId]);

  const handleFetchFrequency = async (classId) => {
    setSelectedClassId(classId);
    setStatus("Fetching frequency...");

    const result = await dispatch(getfrequencyByClassId(classId));
    if (getfrequencyByClassId.fulfilled.match(result)) {
      setClassFrequencies((prev) => ({
        ...prev,
        [classId]: result.payload,
      }));
      setStatus("Frequency fetched. You can now mark attendance.");
    }
  };

  const handleStartListening = async (classId) => {
    if (!classFrequencies[classId] || classFrequencies[classId].length === 0) {
      setStatus("No frequency available for this class");
      return;
    }

    setStatus("Requesting microphone access...");
    const success = await detectSound(setStatus, classFrequencies[classId]);
    setListeningClasses((prev) => ({
      ...prev,
      [classId]: success,
    }));
  };

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>

        {/* Classes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {classes.map((cls) => (
            <div
              key={cls._id}
              className={`border rounded-lg p-4 shadow ${
                selectedClassId === cls._id ? 'border-blue-500 border-2' : ''
              }`}
            >
              <h3 className="font-bold text-lg">{cls.className}</h3>
              <p className="text-gray-600">Time: {new Date(cls.time).toLocaleString()}</p>
              <p className="text-gray-600">Teacher: {cls.teacherId[0].fullName}</p>

              {/* Two-step attendance process */}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => handleFetchFrequency(cls._id)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  disabled={loading}
                >
                  {loading && selectedClassId === cls._id
                    ? "Fetching..."
                    : "Fetch Frequency"
                  }
                </button>

                <button
                  onClick={() => handleStartListening(cls._id)}
                  className={`px-4 py-2 rounded ${
                    classFrequencies[cls._id] && selectedClassId === cls._id
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!classFrequencies[cls._id] || selectedClassId !== cls._id || listeningClasses[cls._id]}
                >
                  {listeningClasses[cls._id] ? "Listening..." : "Mark Attendance"}
                </button>
              </div>

              {/* Frequency Display */}
              {classFrequencies[cls._id] && (
                <div className="bg-gray-100 p-4 rounded-lg mt-2">
                  <h2 className="text-lg font-semibold mb-2">Expected Frequency</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {classFrequencies[cls._id].map((freq, index) => (
                      <div key={index} className="bg-white p-3 rounded-md shadow text-center">
                        <span className="text-blue-600 font-mono text-lg">{freq} Hz</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Status Display */}
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <p className="font-semibold">{status}</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-2">
            {error}
          </div>
        )}

        <canvas id="frequencyData" className="w-full border rounded-lg mt-4"></canvas>
      </div>
    </div>
  );
};

export default Student;
