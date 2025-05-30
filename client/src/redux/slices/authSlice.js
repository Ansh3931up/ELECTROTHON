import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// API URL (adjust based on your backend)
const API_URL = "https://35-154-255-213.nip.io/api/v1" + "/user";

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

// export const registerFace = createAsyncThunk( 
//   "auth/registerFace",
//   async ({ faceData, userId }, { rejectWithValue }) => {
//     try {
//       const response = await axios.post(`${API_URL}/face-data`, { faceData, userId }, {
//         headers: { "Content-Type": "application/json" },
//         withCredentials: true,
//       });
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || "Failed to register face");
//     }
//   }
// );

export const updateFaceData = createAsyncThunk(
  "auth/updateFaceData",
  async (faceData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/face-data`, faceData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update face data");
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

// Add new thunk for fetching students
export const fetchAllStudents = createAsyncThunk(
  "auth/fetchStudents",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/students`);
      console.log("Received students:", response.data);
      return response.data.students;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch students");
    }
  }
);

export const getUserProfile = createAsyncThunk(
  "auth/getUserProfile",
  async ({ userId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/profile/${userId}`, {
        withCredentials: true,
      });
      console.log("user profile",response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch user profile");
    }
  }
);

// Add this with other thunks at the top
export const fetchTeachersBySchool = createAsyncThunk(
  "auth/fetchTeachersBySchool",
  async (schoolCode, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/teachers/school/${schoolCode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // console.log("Teachers:", response);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch teachers");
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/forgot-password`, { email });
      console.log("forgotPassword",response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/verify-otp`, { email, otp });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, otp, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/reset-password`, {
        email,
        otp,
        newPassword
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Retrieve user from localStorage
const storedUser = JSON.parse(localStorage.getItem('user')) || null;
console.log("storedUser",storedUser);
const storedToken = localStorage.getItem('token');

// Auth Slice
const authSlice = createSlice({
  name: "auth",
  initialState: { 
    user: storedUser, 
    loading: false, 
    error: null, 
    students: [],
    teachers: [],
    isAuthenticated: !!storedToken, // Use token to determine if authenticated
  },
  reducers: {
    // Add a reducer to check authentication status directly
    checkAuthStatus: (state) => {
      const token = localStorage.getItem('token');
      state.isAuthenticated = !!token && !!state.user;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.isAuthenticated = true;
        
        // Ensure proper user data structure
        state.user = {
          user: action.payload.user,
          token: action.payload.token
        };
        
        // Save to localStorage with consistent structure
        localStorage.setItem('user', JSON.stringify({
          user: action.payload.user,
          token: action.payload.token
        }));
        localStorage.setItem('token', action.payload.token);
        
        // Save role from the correct location
        const userRole = action.payload.user?.role;
        if (userRole) {
          localStorage.setItem('userRole', userRole);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
        state.isAuthenticated = false;
      })
      
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        // Note: Not setting isAuthenticated here since signup doesn't automatically log in
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false; // Clear authentication on logout
        localStorage.removeItem('user'); // Remove the user data
        localStorage.removeItem('token'); // Remove the token
        localStorage.removeItem('userRole'); // Remove the role
      })

      .addCase(fetchAllStudents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllStudents.fulfilled, (state, action) => {
        // console.log("Received students:", action.payload);
        state.students = action.payload;
        state.loading = false;
      })
      .addCase(fetchAllStudents.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(updateFaceData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFaceData.fulfilled, (state, action) => {
        // Update the user's face data
        if (state.user && state.user.faceData) {
          state.user.faceData.verificationStatus = 'pending';
          if (!state.user.faceData.faceImages) {
            state.user.faceData.faceImages = [];
          }
          state.user.faceData.faceImages.push(action.payload.faceData);
          state.user.faceData.lastUpdated = new Date().toISOString();
        }
        state.loading = false;
        
        // Update localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData && userData.user) {
          userData.user = state.user;
          localStorage.setItem('user', JSON.stringify(userData));
        }
      })
      .addCase(updateFaceData.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      // .addCase(registerFace.pending, (state) => {
      //   state.loading = true;
      //   state.error = null;
      // })
      // .addCase(registerFace.fulfilled, (state) => {
      //   // Update the user with registered face data
      //   if (state.user) {
      //     state.user.hasFaceRegistration = true;
      //     if (!state.user.faceData) {
      //       state.user.faceData = {};
      //     }
      //     state.user.faceData.registrationStatus = 'completed';
      //     state.user.faceData.lastUpdated = new Date().toISOString();
      //   }
      //   state.loading = false;
        
      //   // Update localStorage
      //   const userData = JSON.parse(localStorage.getItem('user'));
      //   if (userData && userData.user) {
      //     userData.user = state.user;
      //     localStorage.setItem('user', JSON.stringify(userData));
      //   }
      // })
      // .addCase(registerFace.rejected, (state, action) => {
      //   state.error = action.payload;
      //   state.loading = false;
      // })
      .addCase(getUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.loading = false;
        
        // Update localStorage with the latest user data
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData) {
          userData.user = action.payload.user;
          localStorage.setItem('user', JSON.stringify(userData));
        }
      })
      .addCase(getUserProfile.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(fetchTeachersBySchool.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeachersBySchool.fulfilled, (state, action) => {
        state.loading = false;
        state.teachers = action.payload.data;
      })
      .addCase(fetchTeachersBySchool.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to send OTP';
      })
      .addCase(verifyOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to verify OTP';
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to reset password';
      });
  },
});

// Export action creators
export const { checkAuthStatus } = authSlice.actions;

export default authSlice.reducer;
