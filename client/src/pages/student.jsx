import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getfrequencyByClassId } from "../redux/slices/classSlice";
import detectSound from "../helpers/detectSound";

const Student = () => {
  const dispatch = useDispatch();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Waiting for permission...");
  const [classId, setClassId] = useState("67c6202b033e6402a14f807b");
  const { frequency, loading, error } = useSelector((state) => state.class);
  console.log('frequency',frequency)
  useEffect(() => {
    if (classId) {
      console.log("Fetching frequency for classId:", classId);
      dispatch(getfrequencyByClassId(classId));
    }
  }, [classId, dispatch]);

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
      <h1 className="text-2xl font-bold mb-4">Welcome, Student!</h1>

      {/* frequency Display */}
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">Expected frequency</h2>
        {loading ? (
          <p>Loading frequency...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : frequency.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {frequency.map((freq, index) => (
              <div key={index} className="bg-white p-3 rounded-md shadow text-center">
                <span className="text-blue-600 font-mono text-lg">{freq} Hz</span>
                <div className="text-xs text-gray-500">Frequency {index + 1}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No frequency available</p>
        )}
      </div>
      
      <div className="flex gap-4 items-center mb-4">
        <input
          type="text"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Enter Class ID"
          className="border p-2 rounded"
        />

        <button
          onClick={() => dispatch(getfrequencyByClassId(classId))}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          disabled={loading}
        >
          Refresh frequency
        </button>

        <button
          onClick={handleStartListening}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={listening || !frequency.length}
        >
          {listening ? "Listening..." : "Mark Attendance"}
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <p className="font-semibold">{status}</p>
      </div>

      <canvas id="frequencyData" className="w-full border rounded-lg"></canvas>
    </div>
  );
};

export default Student;
