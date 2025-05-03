import "./App.css";

import PropTypes from 'prop-types';
import { useSelector } from "react-redux";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import BackgroundAnimation from './components/BackgroundAnimation';
import MainLayout from "./components/MainLayout";
// Page Imports
import ClassDetails from './pages/ClassDetails';
import ContactSupport from "./pages/ContactSupport";
import EditClass from './pages/EditClass';
import FaceRegistration from './pages/FaceRegistration';
import ForgotPassword from "./pages/ForgotPassword";
import HelpCenter from "./pages/HelpCenter";
import HomePage from "./pages/HomePage";
import Login from './pages/login';
import Signup from './pages/signUp';
import SignupCheck from './pages/SignupCheck';
import SplashScreen from './pages/SplashScreen';
import Student from './pages/student';
import StudentAttendance from "./pages/StudentAttendance";
import StudentFindClasses from './pages/StudentFindClasses';
import Teacher from './pages/Teacher'; //teacher page
import TeacherHome from "./pages/TeacherHome";
import TeacherTimetable from './pages/TeacherTimetable';

const FaceCheckRoute = () => {
  // Use Redux state instead of localStorage directly
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const userRole = user?.user?.role || localStorage.getItem('userRole');
  
  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If user exists and face is not registered, redirect to face registration
  if (user?.user && user.user.isFaceRegistered === false) {
    return <Navigate to="/face-registration" replace />;
  }
  
  // If user is authenticated and face is verified, redirect to dashboard
  if (userRole === 'teacher') {
    return <Navigate to="/teacher-home" replace />;
  } else if (userRole === 'student') {
    return <Navigate to="/student-home" replace />;
  }
  
  // Fallback
  return <Navigate to="/login" replace />;
};

// Protected route component
const ProtectedRoute = () => {
  // Use Redux state for authentication checks
  const { user, isAuthenticated } = useSelector(state => state.auth);
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If user exists and face is not registered, redirect to face registration
  if (user?.user && user.user.isFaceRegistered === false) {
    return <Navigate to="/face-registration" replace />;
  }
  
  // If authenticated and face verified, render outlet (child routes)
  return <Outlet />;
};

// Guest-only route component (for login, signup, splash pages)
const GuestOnlyRoute = () => {
  // Use Redux state for authentication checks
  const { isAuthenticated } = useSelector(state => state.auth);
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
  // Use Redux state and localStorage as fallback
  const { user } = useSelector(state => state.auth);
  const userRole = user?.user?.role || localStorage.getItem('userRole');
  
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
          {/* Public Routes (accessible to everyone) */}
          <Route element={<GuestOnlyRoute />}>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/check-signup" element={<SignupCheck />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
          <Route path="/help-center" element={<HelpCenter />} />
          <Route path="/contact-support" element={<ContactSupport />} />

          {/* Face Registration Route */}
          <Route path="/face-registration" element={<FaceRegistration />} />

          {/* Face verification check route */}
          <Route path="/verify-face" element={<FaceCheckRoute />} />
          
          {/* Protected Routes - Wrapped with MainLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* Teacher Routes */}
              <Route element={<RoleRoute allowedRoles={["teacher"]} />}>
                <Route path="/teacher" element={<Teacher />} />
                <Route path="/teacher-timetable" element={<TeacherTimetable />} />
                <Route path="/teacher-home" element={<TeacherHome />} />
                <Route path="/class/:id" element={<ClassDetails />} />
                <Route path="/edit-class/:id" element={<EditClass />} />
              
              </Route>
              
              {/* Student Routes */}
              <Route element={<RoleRoute allowedRoles={["student"]} />}>
                <Route path="/student" element={<Student />} />
                <Route path="/student-home" element={<HomePage />} />
                <Route path="/student-attendance" element={<StudentAttendance />} />
                <Route path="/student-find-classes" element={<StudentFindClasses />} />
              
              </Route>
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
