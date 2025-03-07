import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "https://electrothon.onrender.com/api/v1" + "/class"; // Change this to your backend URL

// Async thunk to fetch attendance frequency
export const fetchAttendancefrequency = createAsyncThunk(
  "attendance/fetchfrequency",  
  async (classId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/get-attendance-frequency`,
        {
          params: { classId },
        }
      );
      return response.data.frequency; // Return fetched frequency
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch frequency"
      );
    }
  }
);

const attendanceSlice = createSlice({
  name: "attendance",
  initialState: {
    frequency: [],
    status: "idle", // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendancefrequency.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAttendancefrequency.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.frequency = action.payload;
      })
      .addCase(fetchAttendancefrequency.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default attendanceSlice.reducer;
