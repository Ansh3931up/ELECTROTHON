import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "https://electrothon.onrender.com/api/v1" + "/class";

// Get teacher's classes
export const getTeacherClasses = createAsyncThunk(
  "class/getTeacherClasses",
  async (teacherId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/teacher/${teacherId}`);
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
      const response = await axios.post(
        `${API_URL}/generate-attendance`,
        { classId, teacherId, frequency },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

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

const classSlice = createSlice({
  name: "class",
  initialState: {
    classes: [],
    frequency: [],
    loading: false,
    error: null,
    selectedClass: null,
  },
  reducers: {
    setSelectedClass: (state, action) => {
      state.selectedClass = action.payload;
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
      });
  },
});

export const { setSelectedClass } = classSlice.actions;
export default classSlice.reducer;
