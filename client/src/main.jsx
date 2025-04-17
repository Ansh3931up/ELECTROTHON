import "./index.css";

import React from 'react';
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import NavBar from "./components/NavBar.jsx";
import { ThemeProvider } from './context/ThemeContext';
import store from "./redux/store.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <NavBar />
          <App />
          <Toaster />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
