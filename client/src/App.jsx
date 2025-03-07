import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import Home from "./pages/Home.jsx";
import Login from "./pages/login.jsx";
import Signup from "./pages/signUp.jsx";
import Student from "./pages/student.jsx";
import Teacher from "./pages/teacher.jsx";

function App() {
  // Function to check if user is authenticated from cookies
  const isAuthenticated = () => {
    return document.cookie.includes('token');
  };

  const getUserRole = () => {
    // Get role from sessionStorage (will be set during login)
    console.log(sessionStorage.getItem('userRole'));
    return sessionStorage.getItem('userRole');
  };

  // Protected Route component
  const ProtectedRoute = ({ children }) => {
    // if (!isAuthenticated()) {
    //   return <Navigate to="/login" />;
    // }
    
    const role = getUserRole();
    if (!role) {
      return <Navigate to="/login" />;
    }

    // Ensure users can only access their role-specific routes
    if (window.location.pathname === '/teacher' && role !== 'teacher') {
      return <Navigate to="/student" />;
    }
    if (window.location.pathname === '/student' && role !== 'student') {
      return <Navigate to="/teacher" />;
    }

    return children;
  };

  // Role-based redirect after login
  const RoleBasedRedirect = () => {
    const role = getUserRole();
    if (role === "teacher") {
      return <Navigate to="/teacher" />;
    } else if (role === "student") {
      return <Navigate to="/student" />;
    }
    return <Navigate to="/login" />;
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/teacher"
          element={
            <ProtectedRoute>
              <Teacher />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student"
          element={
            <ProtectedRoute>
              <Student />
            </ProtectedRoute>
          }
        />
        <Route path="/redirect" element={<RoleBasedRedirect />} />
      </Routes>
    </>
  );
}

export default App;
