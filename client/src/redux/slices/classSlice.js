import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
// import { axiosInstance } from '../../utils/axios';


const API_URL = "https://13-127-217-5.nip.io/api/v1" + "/class";

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
      // Retrieve the token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        // Handle case where token might be missing unexpectedly
        return rejectWithValue("Authentication token not found. Please log in again.");
      }

      // Add the Authorization header to the request config
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json', // Ensure content type is set
        },
      };
      
      // Send classData and the config object with headers
      const response = await axios.post(`${API_URL}/create-class`, classData, config);

      console.log("Class created successfully:", response.data);
      // Assuming backend returns { success: true, data: newClass }
      return response.data.data; // Return the newly created class data
    } catch (error) {
      console.error("Error creating class:", error.response?.data || error.message); // Log more detailed error
      // Extract message from backend response if available
      const message = error.response?.data?.message || error.message || "Failed to create class";
      return rejectWithValue(message);
    }
  }
);

export const generatefrequency = createAsyncThunk(
  "class/generatefrequency",
  async ({ classId, teacherId, frequency, autoActivate = false }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/generate-attendance`,
        { classId, teacherId, frequency, autoActivate },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      console.log("Received frequency response:", response.data);
      
      // Store frequency in localStorage with classId as a backup mechanism
      localStorage.setItem(`frequency_${classId}`, JSON.stringify(frequency));
      
      return frequency;
    } catch (error) {
      console.error("Error generating frequency:", error);
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
// export const saveDailyAttendance = createAsyncThunk(
//   "class/saveAttendance",
//   // Expects { classId, date, sessionType, attendanceList, recordedBy, markCompleted }
//   async (attendanceData, { rejectWithValue }) => {
//     try {
//       const { classId, ...payload } = attendanceData; // payload now includes date, sessionType, attendanceList, recordedBy, markCompleted
//       const token = localStorage.getItem("token");

//       const response = await axios.post(`${API_URL}/${classId}/attendance`, payload, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//       });
      
//       // Check if the response indicates that attendance was already recorded
//       const result = response.data;
//       if (result.alreadyRecorded) {
//         // Return the existing records as part of our response
//         return { 
//           classId, 
//           date: payload.date, 
//           sessionType: payload.sessionType, 
//           alreadyRecorded: true,
//           data: result.data 
//         };
//       }
      
//       // Standard response for newly saved attendance
//       return { 
//         classId, 
//         date: payload.date, 
//         sessionType: payload.sessionType, 
//         alreadyRecorded: false,
//         responseData: result,
//         active: result.active // Include active state from response
//       };
//     } catch (error) {
//       // Handle errors
//       const message =
//         (error.response &&
//           error.response.data &&
//           error.response.data.message) ||
//         error.message ||
//         error.toString();
//       // Include the original data for potential UI feedback
//       return rejectWithValue({ message, originalData: attendanceData });
//     }
//   }
// );
//not in use the above one  


// <<< NEW THUNK for student marking >>>
export const markStudentPresentByFrequency = createAsyncThunk(
  "class/markStudentPresent",
  // Expects { classId, studentId, detectedFrequency, sessionType }
  async (markData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token"); // Or however student auth is handled

      // Ensure we have a session type, defaulting to 'lecture' if not provided
      const dataToSend = {
        ...markData,
        sessionType: markData.sessionType || 'lecture'
      };


      // Call the backend endpoint
      const response = await axios.post(`${API_URL}/attendance/mark-by-frequency`, dataToSend, {
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

// New thunk for starting an attendance session
// export const startAttendanceSession = createAsyncThunk(
//   "class/startAttendanceSession",
//   // Expects { classId, sessionType }
//   async ({ classId, sessionType }, { rejectWithValue }) => {
//     try {
//       const token = localStorage.getItem("token");
//       const response = await axios.post(`${API_URL}/attendance/start-session`, {
//         classId,
//         sessionType
//       }, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//       });
      
//       return response.data;
//     } catch (error) {
//       console.error("Error starting attendance session:", error);
      
//       // Extract the error message to provide more helpful feedback
//       const errorMessage = error.response?.data?.message || 
//                           error.response?.data?.error || 
//                           error.message || 
//                           'Unknown error starting attendance session';
                          
//       return rejectWithValue(errorMessage);
//     }
//   }
// );

// New thunk for ending an attendance session
// export const endAttendanceSession = createAsyncThunk(
//   "class/endAttendanceSession",
//   // Expects { classId, sessionType }
//   async ({ classId, sessionType }, { rejectWithValue }) => {
//     try {
//       const token = localStorage.getItem("token");
//       const response = await axios.post(`${API_URL}/attendance/end-session`, 
//         { classId, sessionType },
//         {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         }
//       );
//       return response.data;
//     } catch (error) {
//       const message = error.response?.data?.message || error.message || error.toString();
//       return rejectWithValue(message);
//     }
//   }
// );

// <<< UPDATED THUNK for editing class >>>
export const editClassDetails = createAsyncThunk(
  "class/editDetails",
  // Expects { classId, updates: { className?, schedule?, batch? } }
  async ({ classId, updates }, { rejectWithValue }) => { // Removed teacherId from params
    try {
      console.log("classId",classId);
      const token = localStorage.getItem("token");
      // Payload is now just the updates object
      const payload = { ...updates }; // Removed teacherId from payload
      console.log("Payload:", payload);
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

// --- NEW Async Thunk ---
export const fetchTeacherSchedule = createAsyncThunk(
    'class/fetchTeacherSchedule',
    async (_, thunkAPI) => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(`${API_URL}/my-schedule`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });// Use your API client
            console.log("Received schedule:", response.data);
            return response.data.data;
        } catch (error) {
            const message =
                (error.response &&
                    error.response.data &&
                    error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// New thunk for fetching ongoing attendance data
export const fetchOngoingAttendance = createAsyncThunk(
  "class/fetchOngoingAttendance",
  // Expects classId and optional sessionType
  async ({ classId, sessionType }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      
      // Build the URL with query parameters if sessionType is provided
      let url = `${API_URL}/${classId}/ongoing-attendance`;
      if (sessionType) {
        url += `?sessionType=${sessionType}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Ongoing attendance:", response);
      
      return response.data.data;
    } catch (error) {
      console.error("Error fetching ongoing attendance:", error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Unknown error fetching attendance data';
                          
      return rejectWithValue(errorMessage);
        }
    }
);

// New thunk for fetching student's total attendance
export const fetchStudentTotalAttendance = createAsyncThunk(
  "class/fetchStudentTotalAttendance",
  async (studentId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/student/${studentId}/total-attendance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data.data;
    } catch (error) {
      console.error("Error fetching total attendance:", error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance data');
    }
  }
);

// Update joinClass thunk
export const joinClass = createAsyncThunk(
  'class/joinClass',
  async ({ classPasscode, studentId }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/join`,
        { classPasscode, studentId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to join class');
    }
  }
);

// Thunks
export const fetchTeacherClasses = createAsyncThunk(
  'class/fetchTeacherClasses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/teacher`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch classes');
    }
  }
);

// Add new thunk for fetching class attendance statistics
export const fetchClassAttendanceStats = createAsyncThunk(
  'class/fetchAttendanceStats',
  async (classId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/${classId}/attendance-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Attendance stats:", response.data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance statistics');
    }
  }
);

// Add new thunk for fetching teacher dashboard data
export const fetchTeacherDashboard = createAsyncThunk(
  'class/fetchTeacherDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/teacher-dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Dashboard data:", response.data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard data');
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
    // --- NEW State for Teacher Schedule ---
    teacherSchedule: {
        data: [],
        loading: false,
        error: null,
    },
    ongoingAttendance: null,
    fetchingOngoingAttendance: false,
    ongoingAttendanceError: null,
    // Add new state for total attendance
    totalAttendance: null,
    fetchingTotalAttendance: false,
    totalAttendanceError: null,
    teachers: [], // Add teachers array to store teachers and their classes
    // Add dashboard state
    dashboard: {
      data: null,
      loading: false,
      error: null
    }
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
    },
    // Potentially add a reducer to clear teacher schedule if needed
    clearTeacherSchedule: (state) => {
         state.teacherSchedule = { data: [], loading: false, error: null };
    },
    clearOngoingAttendance: (state) => {
      state.ongoingAttendance = null;
      state.ongoingAttendanceError = null;
    },
    clearTotalAttendance: (state) => {
      state.totalAttendance = null;
      state.totalAttendanceError = null;
    },
    clearDashboard: (state) => {
      state.dashboard = { data: null, loading: false, error: null };
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
      // .addCase(saveDailyAttendance.pending, (state) => {
      //   state.attendanceSaving = true; // Set specific loading state
      //   state.attendanceError = null; // Clear previous save errors
      // })
      // .addCase(saveDailyAttendance.fulfilled, (state, action) => {
      //   state.attendanceSaving = false;
      //   state.attendanceError = null;
      //   // NOTE: Updating the nested attendanceRecords in the Redux state
      //   // becomes much more complex here. It's often simpler to just
      //   // re-fetch the class details after a successful save to ensure consistency,
      //   // rather than trying to merge the updates manually in the reducer.
      //   console.log("Attendance saved successfully via Redux:", action.payload);
      // })
      // .addCase(saveDailyAttendance.rejected, (state, action) => {
      //   state.attendanceSaving = false;
      //   state.attendanceError = action.payload.message; // Store specific save error
      //   console.error("Attendance save failed via Redux:", action.payload);
      // })
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
      })
      // --- NEW Extra Reducers for Teacher Schedule ---
      .addCase(fetchTeacherSchedule.pending, (state) => {
        state.teacherSchedule.loading = true;
        state.teacherSchedule.error = null;
      })
      .addCase(fetchTeacherSchedule.fulfilled, (state, action) => {
        state.teacherSchedule.loading = false;
        state.teacherSchedule.data = action.payload; // Store the array of classes
      })
      .addCase(fetchTeacherSchedule.rejected, (state, action) => {
        state.teacherSchedule.loading = false;
        state.teacherSchedule.error = action.payload;
        state.teacherSchedule.data = []; // Clear data on error
      })
      // Handle fetchOngoingAttendance states
      .addCase(fetchOngoingAttendance.pending, (state) => {
        state.fetchingOngoingAttendance = true;
        state.ongoingAttendanceError = null;
      })
      .addCase(fetchOngoingAttendance.fulfilled, (state, action) => {
        state.fetchingOngoingAttendance = false;
        state.ongoingAttendance = action.payload;
      })
      .addCase(fetchOngoingAttendance.rejected, (state, action) => {
        state.fetchingOngoingAttendance = false;
        state.ongoingAttendanceError = action.payload;
      })
      // Add cases for fetchStudentTotalAttendance
      .addCase(fetchStudentTotalAttendance.pending, (state) => {
        state.fetchingTotalAttendance = true;
        state.totalAttendanceError = null;
      })
      .addCase(fetchStudentTotalAttendance.fulfilled, (state, action) => {
        state.fetchingTotalAttendance = false;
        state.totalAttendance = action.payload;
      })
      .addCase(fetchStudentTotalAttendance.rejected, (state, action) => {
        state.fetchingTotalAttendance = false;
        state.totalAttendanceError = action.payload;
      })
      .addCase(joinClass.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinClass.fulfilled, (state, action) => {
        state.loading = false;
        // Update the class in the state if it exists
        const index = state.classes.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.classes[index] = action.payload;
        }
      })
      .addCase(joinClass.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Teacher Classes
      .addCase(fetchTeacherClasses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeacherClasses.fulfilled, (state, action) => {
        state.loading = false;
        state.classes = action.payload;
      })
      .addCase(fetchTeacherClasses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add cases for fetchTeacherDashboard
      .addCase(fetchTeacherDashboard.pending, (state) => {
        state.dashboard.loading = true;
        state.dashboard.error = null;
      })
      .addCase(fetchTeacherDashboard.fulfilled, (state, action) => {
        state.dashboard.loading = false;
        
        state.dashboard.data = action.payload;
      })
      .addCase(fetchTeacherDashboard.rejected, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.error = action.payload;
      });
  },
});

export const { 
  setSelectedClass, 
  clearCurrentClass, 
  clearAttendanceError, 
  clearTeacherSchedule, 
  clearOngoingAttendance, 
  clearTotalAttendance,
  clearDashboard 
} = classSlice.actions;
export default classSlice.reducer;
