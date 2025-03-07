import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { playSound } from "../helpers/playSound";
import { generatefrequency } from "../redux/slices/classSlice";

const Teacher = () => {
  const dispatch = useDispatch();
  const [classId, setClassId] = useState("67c6202b033e6402a14f807b"); // Teacher should enter Class ID
  const { frequency, loading, error } = useSelector((state) => state.class);

  const handleGeneratefrequency = () => {
    if (!classId) {
      alert("Please enter a class ID");
      return;
    }
    dispatch(
      generatefrequency({ classId, teacherId: "67c61a646bc06ce3fe558d7a" })
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome, Teacher!</h1>

      {/* frequency Display */}
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">Active frequency</h2>
        {frequency.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {frequency.map((freq, index) => (
              <div key={index} className="bg-white p-3 rounded-md shadow text-center">
                <span className="text-blue-600 font-mono text-lg">{freq} Hz</span>
                <div className="text-xs text-gray-500">Frequency {index + 1}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No frequency generated yet</p>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Enter Class ID"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={handleGeneratefrequency}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate frequency"}
        </button>

        <button
          onClick={() => playSound(frequency)}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          disabled={frequency.length === 0}
        >
          Play Sound
        </button>
      </div>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default Teacher;
