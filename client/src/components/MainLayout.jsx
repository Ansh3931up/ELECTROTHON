import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTheme } from '../context/ThemeContext';
import BottomNavBar from './BottomNavBar';
import NavBar from './NavBar';
import { useEffect } from 'react';

/**
 * MainLayout Component
 * Controls the overall layout structure and conditionally renders navigation elements
 * based on authentication status
 */
const MainLayout = () => {
  const { isDarkMode } = useTheme();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  // Get the actual user data
  const actualUser = user?.user;
  
  // Determine if navigation should be shown - check both authentication and user data
  const showNavigation = isAuthenticated && actualUser;

  // Debug logs
  useEffect(() => {
    console.log('Auth State:', { isAuthenticated, user: actualUser });
  }, [isAuthenticated, actualUser]);

  return (
    <div className={`relative min-h-screen ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50/10'}`}>
      {/* Professional background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top right gradient */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full filter blur-3xl transform translate-x-1/2 -translate-y-1/4 
          ${isDarkMode ? 'bg-blue-600/15' : 'bg-blue-500/10'}`}></div>
        
        {/* Bottom left gradient */}
        <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full filter blur-3xl transform -translate-x-1/2 translate-y-1/4
          ${isDarkMode ? 'bg-indigo-700/15' : 'bg-indigo-400/10'}`}></div>
        
        {/* Center gradient (subtle) */}
        <div className={`absolute top-1/2 left-1/2 w-[1000px] h-[1000px] rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2
          ${isDarkMode ? 'bg-blue-900/10' : 'bg-blue-500/5'}`}></div>
        
        {/* Decorative grid patterns */}
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-[url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 20 20%22%3E%3Cg fill=%22%233B82F6%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M0 0h4v4H0V0zm0 8h4v4H0V8zm8 0h4v4H8V8zm8 0h4v4h-4V8zm-8-8h4v4H8V0zm8 0h4v4h-4V0zm0 16h4v4h-4v-4zm-8 0h4v4H8v-4zM0 16h4v4H0v-4z%22/%3E%3C/g%3E%3C/svg%3E")]' : 'bg-[url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 20 20%22%3E%3Cg fill=%22%233B82F6%22 fill-opacity=%220.02%22%3E%3Cpath d=%22M0 0h4v4H0V0zm0 8h4v4H0V8zm8 0h4v4H8V8zm8 0h4v4h-4V8zm-8-8h4v4H8V0zm8 0h4v4h-4V0zm0 16h4v4h-4v-4zm-8 0h4v4H8v-4zM0 16h4v4H0v-4z%22/%3E%3C/g%3E%3C/svg%3E")]'}`}></div>
      </div>
    
      {/* Always render NavBar when authenticated */}
      {showNavigation && <NavBar />}

      {/* Main content area */}
      <main className={`relative z-10 ${showNavigation ? 'pb-16' : 'pt-0 pb-0'}`}>
        <Outlet />
      </main>

      {/* Always render BottomNavBar when authenticated */}
      {showNavigation && <BottomNavBar user={actualUser} />}
    </div>
  );
};

export default MainLayout;
