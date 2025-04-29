import "./index.css";

import React, { useEffect } from 'react';
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { Provider, useDispatch } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { NotificationProvider } from "./components/NotificationSystem.jsx";
import { ThemeProvider } from './context/ThemeContext';
import { checkAuthStatus } from "./redux/slices/authSlice.js";
import store from "./redux/store.js";

// Component to handle auth status check on app initialization
const AuthWrapper = ({ children }) => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    // Check authentication status when app loads
    dispatch(checkAuthStatus());
  }, [dispatch]);
  
  return children;
};

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AuthWrapper>
              <App />
              <Toaster />
            </AuthWrapper>
          </BrowserRouter>
        </NotificationProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
