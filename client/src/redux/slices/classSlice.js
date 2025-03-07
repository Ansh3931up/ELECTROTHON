import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_BASE_URL + "/class";

export const generatefrequency = createAsyncThunk(
  "class/generatefrequency",
  async ({ classId, teacherId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/generate-attendance`,
        { classId, teacherId },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Store frequency in localStorage with classId
      localStorage.setItem(`frequency_${classId}`, JSON.stringify(response.data.frequency));
      
      return response.data.frequency;
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
    frequency: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
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

export default classSlice.reducer;
