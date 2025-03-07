import { configureStore } from "@reduxjs/toolkit";

import attendanceReducer from "./slices/attendanceSlice";
import authReducer from "./slices/authSlice";
import classReducer from "./slices/classSlice"; // Import your class slice
const store = configureStore({
  reducer: {
    auth: authReducer,
    class: classReducer, // Add class reducer
    attendance: attendanceReducer,
  },
});

export default store;
