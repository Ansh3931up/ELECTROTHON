import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getStudentClasses, getfrequencyByClassId } from "../redux/slices/classSlice";
import detectSound from "../helpers/detectSound";

const Student = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { classes, frequency, loading, error } = useSelector((state) => state.class);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Select a class to check frequency");
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [frequencyFetched, setFrequencyFetched] = useState(false);

  useEffect(() => {
    // if (user?._id) {
      dispatch(getStudentClasses("67c6b72a0704083d1c1f8cbe"));
    // }
  }, [dispatch, user]);

  const handleFetchFrequency = async (classId) => {
    setSelectedClassId(classId);
    setStatus("Fetching frequency...");
    setFrequencyFetched(false);
    
    await dispatch(getfrequencyByClassId(classId));
    setFrequencyFetched(true);
    setStatus("Frequency fetched. You can now mark attendance.");
  };

  const handleStartListening = async () => {
    if (!frequency || frequency.length === 0) {
      setStatus("No frequency available for this class");
      return;
    }

    setStatus("Requesting microphone access...");
    const success = await detectSound(setStatus, frequency);
    setListening(success);
  };

  return (
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
                onClick={handleStartListening}
                className={`px-4 py-2 rounded ${
                  frequencyFetched && selectedClassId === cls._id
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!frequencyFetched || selectedClassId !== cls._id || listening}
              >
                {listening ? "Listening..." : "Mark Attendance"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Status Display */}
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <p className="font-semibold">{status}</p>
      </div>

      {/* Frequency Display */}
      {frequency.length > 0 && selectedClassId && (
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <h2 className="text-lg font-semibold mb-2">Expected Frequency</h2>
          <div className="grid grid-cols-3 gap-4">
            {frequency.map((freq, index) => (
              <div key={index} className="bg-white p-3 rounded-md shadow text-center">
                <span className="text-blue-600 font-mono text-lg">{freq} Hz</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-2">
          {error}
        </div>
      )}
      
      <canvas id="frequencyData" className="w-full border rounded-lg mt-4"></canvas>
    </div>
  );
};

export default Student;
