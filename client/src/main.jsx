import "./index.css";

import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import NavBar from "./components/NavBar.jsx";

import App from "./App.jsx";
import store from "./redux/store.js";

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
    <NavBar />
      <App />
      <Toaster />
    </BrowserRouter>
  </Provider>
);
