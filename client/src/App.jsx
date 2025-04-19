import "./App.css";

import PropTypes from 'prop-types';
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import BackgroundAnimation from './components/BackgroundAnimation';
// Page Imports
import ClassDetails from './pages/ClassDetails';
import EditClass from './pages/EditClass';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SignupCheck from './pages/SignupCheck';
import SplashScreen from './pages/SplashScreen';
import Student from './pages/Student';
import Teacher from './pages/Teacher';
import TeacherTimetable from './pages/TeacherTimetable';

// Protected route component
const ProtectedRoute = () => {
  // Check if user is authenticated by looking for token
  const isAuthenticated = !!localStorage.getItem('token');
  
  // If authenticated, render outlet (child routes)
  // Otherwise, redirect to login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// Guest-only route component (for login, signup, splash pages)
const GuestOnlyRoute = () => {
  // Check if user is already authenticated
  const isAuthenticated = !!localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  // If authenticated, redirect to appropriate dashboard based on role
  if (isAuthenticated) {
    if (userRole === 'teacher') {
      return <Navigate to="/teacher" replace />;
    } else if (userRole === 'student') {
      return <Navigate to="/student" replace />;
    }
  }
  
  // If not authenticated, allow access to login/signup pages
  return <Outlet />;
};

// Role-based route component
const RoleRoute = ({ allowedRoles }) => {
  // Get user role from localStorage
  const userRole = localStorage.getItem('userRole');
  
  // If user has an allowed role, render outlet (child routes)
  // Otherwise, redirect to appropriate dashboard or login
  if (allowedRoles.includes(userRole)) {
    return <Outlet />;
  }
  
  // Redirect based on role
  if (userRole === 'teacher') {
    return <Navigate to="/teacher" replace />;
  } else if (userRole === 'student') {
    return <Navigate to="/student" replace />;
  }
  
  // If no role or invalid role, redirect to login
  return <Navigate to="/login" replace />;
};

// PropTypes validation
RoleRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired
};

function App() {
  return (
    <div className="min-h-screen w-full relative">
      {/* Background Animation - will appear on all pages */}
      <BackgroundAnimation />
      
      {/* Main Content */}
      <div className="relative z-10">
        <Routes>
          {/* Public Routes (accessible only to guests/non-logged-in users) */}
          <Route element={<GuestOnlyRoute />}>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/check-signup" element={<SignupCheck />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Teacher Routes */}
            <Route element={<RoleRoute allowedRoles={["teacher"]} />}>
              <Route path="/teacher" element={<Teacher />} />
              <Route path="/teacher-timetable" element={<TeacherTimetable />} />
              <Route path="/class/:id" element={<ClassDetails />} />
              <Route path="/edit-class/:id" element={<EditClass />} />
            </Route>
            
            {/* Student Routes */}
            <Route element={<RoleRoute allowedRoles={["student"]} />}>
              <Route path="/student" element={<Student />} />
            </Route>
          </Route>
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
