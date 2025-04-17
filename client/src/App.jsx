import "./App.css";

import PropTypes from 'prop-types';
import { Navigate, Route, Routes } from "react-router-dom";

// Import the animation component
import BackgroundAnimation from "./components/BackgroundAnimation";
import { useTheme } from "./context/ThemeContext";
import ClassDetails from './pages/ClassDetails';
import EditClass from './pages/EditClass';
import Home from "./pages/Home.jsx";
import Login from "./pages/login.jsx";
import Signup from "./pages/signUp.jsx";
import Student from "./pages/student.jsx";
import Teacher from "./pages/teacher.jsx";
import TeacherTimetable from './pages/TeacherTimetable';

function App() {
  // const { isDarkMode } = useTheme(); // Keep if needed for other things

  // const { user, isAuthenticated } = useSelector((state) => state.auth);
  // const role = user?.user?.role || user?.role;

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
    // Main container - no background styles needed here for the animation
    <div className="min-h-screen w-full relative">
      {/* Render the animation component - it will position itself with 'fixed' */}
      <BackgroundAnimation />

      {/* Routes are rendered normally. Their individual backgrounds will show, with bubbles floating over them */}
      <div className="relative z-0"> {/* Content stays at z-0 */}
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
          <Route
            path="/teacher"
            element={
              <ProtectedRoute>
                <Teacher />
              </ProtectedRoute>
            }
          />
          <Route
            path="/class/:classId"
            element={
              <ProtectedRoute>
                <ClassDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/class/:classId/edit"
            element={
              <ProtectedRoute>
                <EditClass />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <ProtectedRoute>
                <TeacherTimetable />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={getUserRole() ? (getUserRole() === 'teacher' ? '/teacher' : '/student') : '/login'} />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
