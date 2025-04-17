import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "http://localhost:5014/api/v1" + "/class";

// Get teacher's classes
export const getTeacherClasses = createAsyncThunk(
  "class/getTeacherClasses",
  async (teacherId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/teacher/${teacherId}`);
      console.log("Received classes:", response.data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch classes");
    }
  }
);

// Get student's classes
export const getStudentClasses = createAsyncThunk(
  "class/getStudentClasses",
  async (studentId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/${studentId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch classes");
    }
  }
);

// Create new class
export const createClass = createAsyncThunk(
  "class/createClass",
  async (classData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/create-class`, classData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to create class");
    }
  }
);

export const generatefrequency = createAsyncThunk(
  "class/generatefrequency",
  async ({ classId, teacherId, frequency }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/generate-attendance`,
        { classId, teacherId, frequency },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Received frequency:", response.data);
      // Store frequency in localStorage with classId
      localStorage.setItem(`frequency_${classId}`, JSON.stringify(frequency));
      
      return frequency;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to generate frequency");
    }
  }
);

export const getfrequencyByClassId = createAsyncThunk(
  "class/getfrequency",
  async (classId, { rejectWithValue }) => {
    try {
      console.log("Fetching frequency for class:", classId);
      const response = await axios.get(`${API_URL}/frequency/${classId}`);
      console.log("Received frequency:", response.data);
      return response.data.frequency;
    } catch (error) {
      console.error("Error fetching frequency:", error);
      return rejectWithValue(error.response?.data?.message || "Failed to fetch frequency");
    }
  }
);

// Fetches details for a single class by ID
export const fetchClassDetails = createAsyncThunk(
  "class/fetchDetails",
  async (classId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token"); // Or however you get the auth token
      const response = await axios.get(`${API_URL}/${classId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data; // Assuming the API returns the class object directly, e.g., { success: true, class: {...} } or just {...}
    } catch (error) {
      // Handle potential errors (network, server response, etc.)
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return rejectWithValue(message);
    }
  }
);

// Update saveDailyAttendance thunk payload
export const saveDailyAttendance = createAsyncThunk(
  "class/saveAttendance",
  // Expects { classId, date, sessionType, attendanceList, recordedBy }
  async (attendanceData, { rejectWithValue }) => {
    try {
      const { classId, ...payload } = attendanceData; // payload now includes date, sessionType, attendanceList, recordedBy
      const token = localStorage.getItem("token");

      const response = await axios.post(`${API_URL}/${classId}/attendance`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return { classId, date: payload.date, sessionType: payload.sessionType, responseData: response.data };
    } catch (error) {
      // Handle errors
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      // Include the original data for potential UI feedback
      return rejectWithValue({ message, originalData: attendanceData });
    }
  }
);

// <<< NEW THUNK for student marking >>>
export const markStudentPresentByFrequency = createAsyncThunk(
  "class/markStudentPresent",
  // Expects { classId, studentId, detectedFrequency }
  async (markData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token"); // Or however student auth is handled

      // Call the new backend endpoint
      const response = await axios.post(`${API_URL}/attendance/mark-by-frequency`, markData, {
        headers: {
          Authorization: `Bearer ${token}`, // If student needs auth
          'Content-Type': 'application/json',
        },
      });
      return response.data; // Return success message or relevant data
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return rejectWithValue(message);
    }
  }
);

// <<< NEW THUNK for editing class >>>
export const editClassDetails = createAsyncThunk(
  "class/editDetails",
  // Expects { classId, updates: { className?, classType?, time?, status? }, teacherId (for verification) }
  async ({ classId, updates, teacherId }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      // Include teacherId in the body for backend verification
      const payload = { ...updates, teacherId };

      const response = await axios.patch(`${API_URL}/${classId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data; // Expects { success: true, class: updatedClass }
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Failed to update class";
      return rejectWithValue(message);
    }
  }
);

const classSlice = createSlice({
  name: "class",
  initialState: {
    classes: [],
    frequency: [],
    loading: false,
    error: null,
    selectedClass: null,
    currentClass: null,
    attendanceSaving: false, // <<< NEW: Specific loading state for saving
    attendanceError: null,   // <<< NEW: Specific error state for saving
  },
  reducers: {
    setSelectedClass: (state, action) => {
      state.selectedClass = action.payload;
    },
    clearCurrentClass: (state) => {
      state.currentClass = null;
      state.error = null;
    },
    clearAttendanceError: (state) => {
        state.attendanceError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle getTeacherClasses
      .addCase(getTeacherClasses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTeacherClasses.fulfilled, (state, action) => {
        state.loading = false;
        state.classes = action.payload;
      })
      .addCase(getTeacherClasses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Handle getStudentClasses
      .addCase(getStudentClasses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStudentClasses.fulfilled, (state, action) => {
        state.loading = false;
        state.classes = action.payload;
      })
      .addCase(getStudentClasses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Handle createClass
      .addCase(createClass.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createClass.fulfilled, (state, action) => {
        state.loading = false;
        state.classes.push(action.payload);
      })
      .addCase(createClass.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generatefrequency.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generatefrequency.fulfilled, (state, action) => {
        state.loading = false;
        state.frequency = action.payload;
      })
      .addCase(generatefrequency.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getfrequencyByClassId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getfrequencyByClassId.fulfilled, (state, action) => {
        state.loading = false;
        state.frequency = action.payload;
      })
      .addCase(getfrequencyByClassId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchClassDetails.pending, (state) => {
        state.loading = true;
        state.currentClass = null;
        state.error = null;
      })
      .addCase(fetchClassDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentClass = action.payload.class || action.payload;
      })
      .addCase(fetchClassDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentClass = null;
      })
      // <<< NEW CASES for saveDailyAttendance >>>
      .addCase(saveDailyAttendance.pending, (state) => {
        state.attendanceSaving = true; // Set specific loading state
        state.attendanceError = null; // Clear previous save errors
      })
      .addCase(saveDailyAttendance.fulfilled, (state, action) => {
        state.attendanceSaving = false;
        state.attendanceError = null;
        // NOTE: Updating the nested attendanceRecords in the Redux state
        // becomes much more complex here. It's often simpler to just
        // re-fetch the class details after a successful save to ensure consistency,
        // rather than trying to merge the updates manually in the reducer.
        console.log("Attendance saved successfully via Redux:", action.payload);
      })
      .addCase(saveDailyAttendance.rejected, (state, action) => {
        state.attendanceSaving = false;
        state.attendanceError = action.payload.message; // Store specific save error
        console.error("Attendance save failed via Redux:", action.payload);
      })
      // <<< Add Cases for markStudentPresentByFrequency (optional) >>>
      // You might not need specific loading/error state for this in the *class* slice,
      // as the primary feedback is just success/failure to the student component.
      // But you could add them if needed.
      .addCase(markStudentPresentByFrequency.pending, (/* state */) => {
         console.log("Attempting to mark present via frequency...");
         // Optionally set a specific loading state if UI needs it
      })
      .addCase(markStudentPresentByFrequency.fulfilled, (state, action) => {
         console.log("Successfully marked present:", action.payload?.message);
         // No direct state update needed here unless caching attendance
      })
      .addCase(markStudentPresentByFrequency.rejected, (state, action) => {
         console.error("Failed to mark present:", action.payload);
         // Optionally set an error state if UI needs it
      })
      // <<< Add cases for editClassDetails >>>
      .addCase(editClassDetails.pending, (state) => {
        state.loading = true; // Or a specific 'updating' state
        state.error = null;
      })
      .addCase(editClassDetails.fulfilled, (state, action) => {
        state.loading = false;
        // Update the currentClass if it's the one being edited
        if (state.currentClass && state.currentClass._id === action.payload.class._id) {
          state.currentClass = action.payload.class;
        }
        // Update the class in the classes list as well
        const index = state.classes.findIndex(c => c._id === action.payload.class._id);
        if (index !== -1) {
          state.classes[index] = action.payload.class;
        }
      })
      .addCase(editClassDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload; // Store the error message
      });
  },
});

export const { setSelectedClass, clearCurrentClass, clearAttendanceError } = classSlice.actions;
export default classSlice.reducer;
