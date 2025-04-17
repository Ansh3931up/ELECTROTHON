import "./App.css";

import PropTypes from 'prop-types';
import { Navigate, Route, Routes } from "react-router-dom";

import ClassDetails from './pages/ClassDetails';
import EditClass from './pages/EditClass';
import Home from "./pages/Home.jsx";
import Login from "./pages/login.jsx";
import Signup from "./pages/signUp.jsx";
import Student from "./pages/student.jsx";
import Teacher from "./pages/teacher.jsx";

function App() {
  // Function to check if user is authenticated from localStorage
  const getUserRole = () => {
    // Get role from localStorage (will be set during login)
    console.log(localStorage.getItem('userRole'));
    return localStorage.getItem('userRole');
  };

  // Protected Route component
  const ProtectedRoute = ({ children }) => {
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

  // Add prop types validation
  ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
  };

  // Role-based redirect after login
  // const RoleBasedRedirect = () => {
  //   const role = getUserRole();
  //   if (role === "teacher") {
  //     return <Navigate to="/teacher" />;
  //   } else if (role === "student") {
  //     return <Navigate to="/student" />;
  //   }
  //   return <Navigate to="/login" />;
  // };

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/teacher/attendance"
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
        <Route path="/teacher" element={<Teacher />} />
        <Route path="/class/:classId" element={<ClassDetails />} />
        <Route path="/class/:classId/edit" element={<EditClass />} />
        {/* <Route path="/redirect" element={<RoleBasedRedirect />} /> */}
      </Routes>
    </>
  );
}

export default App;
