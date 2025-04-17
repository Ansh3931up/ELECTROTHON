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

const classSlice = createSlice({
  name: "class",
  initialState: {
    classes: [],
    frequency: [],
    loading: false,
    error: null,
    selectedClass: null,
    currentClass: null,
  },
  reducers: {
    setSelectedClass: (state, action) => {
      state.selectedClass = action.payload;
    },
    clearCurrentClass: (state) => {
      state.currentClass = null;
      state.error = null;
    },
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
      });
  },
});

export const { setSelectedClass, clearCurrentClass } = classSlice.actions;
export default classSlice.reducer;
