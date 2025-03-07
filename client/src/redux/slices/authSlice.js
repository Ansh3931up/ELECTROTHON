import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// API URL (adjust based on your backend)
const API_URL = "https://electrothon.onrender.com/api/v1" + "/user";

// Thunks for async requests
export const loginUser = createAsyncThunk(
  "auth/login",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/login`, userData, {
        withCredentials: true,
      });
      return response.data; // Return the entire response data
    } catch (error) {
      return rejectWithValue(error.response.data.message || "Login failed");
    }
  }
);

export const signupUser = createAsyncThunk(
  "auth/signup",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/register`, userData, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Signup failed");
    }
  }
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
  return null;
});

// Retrieve user from localStorage
const storedUser = JSON.parse(localStorage.getItem('user')) || null;

// Auth Slice
const authSlice = createSlice({
  name: "auth",
  initialState: { user: storedUser, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.loading = false;
        localStorage.setItem('user', JSON.stringify(action.payload)); // Save the user data
        localStorage.setItem('token', action.payload.token); // Save the token
        localStorage.setItem('userRole', action.payload.role); // Save the role
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        localStorage.removeItem('user'); // Remove the user data
        localStorage.removeItem('token'); // Remove the token
        localStorage.removeItem('userRole'); // Remove the role
      });
  },
});

export default authSlice.reducer;
