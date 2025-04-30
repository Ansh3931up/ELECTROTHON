import { useEffect, useState } from 'react';
import { FiAlignRight } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation,useNavigate } from 'react-router-dom';

import logo from '../assets/logo1112.png';
import { useTheme } from '../context/ThemeContext';
import { logoutUser } from '../redux/slices/authSlice';
import BottomNavBar from './BottomNavBar';
import ThemeToggleButton from './ThemeToggleButton';

const NavBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLogoAnimating, setIsLogoAnimating] = useState(false);
  const [currentPage, setCurrentPage] = useState('');
  const { isDarkMode } = useTheme();

  // Debug logs for authentication state
  useEffect(() => {
    console.log('NavBar Auth State:', { user, isAuthenticated });
  }, [user, isAuthenticated]);

  // Get the actual user data
  const actualUser = user?.user;

  // Determine current page name based on URL path
  useEffect(() => {
    const path = location.pathname;
    
    // Map paths to readable page names
    if (path === '/' || path === '/home') {
      setCurrentPage('Home');
    } else if (path === '/dashboard') {
      setCurrentPage('Dashboard');
    } else if (path === '/classes') {
      setCurrentPage('Classes');
    } else if (path === '/reports') {
      setCurrentPage('Reports');
    } else if (path === '/profile') {
      setCurrentPage('My Profile');
    } else if (path === '/account') {
      setCurrentPage('Account Settings');
    } else if (path === '/notifications') {
      setCurrentPage('Notifications');
    } else if (path === '/help') {
      setCurrentPage('Help Center');
    } else if (path === '/contact') {
      setCurrentPage('Contact Support');
    } else if (path === '/login') {
      setCurrentPage('Login');
    } else if (path === '/signup') {
      setCurrentPage('Sign Up');
    } else if (path === '/add') {
      setCurrentPage('Add New');
    } else if (path === '/search') {
      setCurrentPage('Search');
    } else {
      // Extract page name from the path
      const pathSegments = path.split('/').filter(Boolean); // Remove empty segments
      
      // If last segment contains ID (has numbers), use previous segment
      const lastSegment = pathSegments[pathSegments.length - 1];
      let pageName;
      
      if (/\d/.test(lastSegment) && pathSegments.length > 1) {
        // Last segment has numbers, use second-to-last segment
        pageName = pathSegments[pathSegments.length - 2];
        
        // Map common URL segments to better display names
        if (pageName === 'class') pageName = 'Class Details';
        else if (pageName === 'edit-class') pageName = 'Edit Class';
      } else {
        // Use last segment as is
        pageName = lastSegment;
      }
      
      // Capitalize first letter
      setCurrentPage(pageName.charAt(0).toUpperCase() + pageName.slice(1));
    }
  }, [location.pathname]);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSidebarOpen && !event.target.closest('.sidebar') && !event.target.closest('.hamburger-btn')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  const handleLogout = () => {
    dispatch(logoutUser());
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/login');
    setSidebarOpen(false);
  };

  // Handle logo click for refresh and animation
  const handleLogoClick = () => {
    setIsLogoAnimating(true);
    
    // Reset animation after it completes
    setTimeout(() => {
      setIsLogoAnimating(false);
    }, 1000);
    
    // Refresh the page
    window.location.reload();
  };

  // Account & Settings navigation items
  const accountNavItems = [
    { 
      label: 'My Profile', 
      path: '/profile', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    { 
      label: 'Account Settings', 
      path: '/account', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.3246 4.31731C10.751 2.5609 13.249 2.5609 13.6754 4.31731C13.9508 5.45193 15.2507 5.99038 16.2478 5.38285C17.7913 4.44239 19.5576 6.2087 18.6172 7.75218C18.0096 8.74925 18.5481 10.0492 19.6827 10.3246C21.4391 10.751 21.4391 13.249 19.6827 13.6754C18.5481 13.9508 18.0096 15.2507 18.6172 16.2478C19.5576 17.7913 17.7913 19.5576 16.2478 18.6172C15.2507 18.0096 13.9508 18.5481 13.6754 19.6827C13.249 21.4391 10.751 21.4391 10.3246 19.6827C10.0492 18.5481 8.74926 18.0096 7.75219 18.6172C6.2087 19.5576 4.44239 17.7913 5.38285 16.2478C5.99038 15.2507 5.45193 13.9508 4.31731 13.6754C2.5609 13.249 2.5609 10.751 4.31731 10.3246C5.45193 10.0492 5.99037 8.74926 5.38285 7.75218C4.44239 6.2087 6.2087 4.44239 7.75219 5.38285C8.74926 5.99037 10.0492 5.45193 10.3246 4.31731Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    { 
      label: 'Notifications', 
      path: '/notifications', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 17H20L18.5951 15.5951C18.2141 15.2141 18 14.6973 18 14.1585V11C18 8.38757 16.3304 6.16509 14 5.34142V5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5V5.34142C7.66962 6.16509 6 8.38757 6 11V14.1585C6 14.6973 5.78595 15.2141 5.40493 15.5951L4 17H9M15 17V18C15 19.6569 13.6569 21 12 21C10.3431 21 9 19.6569 9 18V17M15 17H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      badge: 3
    },
  ];

  // Support & Help navigation items
  const supportNavItems = [
    { 
      label: 'Help Center', 
      path: '/help', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 16V16.01M12 8V12M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    { 
      label: 'Contact Support', 
      path: '/contact', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 10H8.01M12 10H12.01M16 10H16.01M9 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H15L12 19L9 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];

  // Close icon for sidebar
  const closeIcon = (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Sign out icon
  const signOutIcon = (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 8V6C14 5.46957 13.7893 4.96086 13.4142 4.58579C13.0391 4.21071 12.5304 4 12 4H6C5.46957 4 4.96086 4.21071 4.58579 4.58579C4.21071 4.96086 4 5.46957 4 6V18C4 18.5304 4.21071 19.0391 4.58579 19.4142C4.96086 19.7893 5.46957 20 6 20H12C12.5304 20 13.0391 19.7893 13.4142 19.4142C13.7893 19.0391 14 18.5304 14 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 12H7M20 12L17 9M20 12L17 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  console.log("user is : ",actualUser);

  return (
    <>
      {/* Top Navbar - Made visible with better contrast */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-transparent backdrop-blur-sm shadow-md dark:shadow-none">
        <div className="max-w-screen-sm mx-auto px-4 py-2.5 flex justify-between items-center">
          {/* Logo and page title */}
          <div className="flex items-center">
            <div 
              className="relative flex items-center group cursor-pointer"
              onClick={handleLogoClick}
            >
              
              <div className="flex flex-col">
                <h1 className={`text-lg font-medium ml-2.5 tracking-wide ${isLogoAnimating ? 'animate-glow' : ''}`}>
                  <span className="font-semibold" style={{ color: isDarkMode ? 'white' : '#0c4a6e' }}>
                    Neura<span style={{ color: isDarkMode ? '#38bdf8' : '#2563eb' }}>Campus </span>
                  </span>
                </h1>
                {currentPage && (
                  <span className="text-xs ml-2.5 font-medium tracking-wider" style={{ color: isDarkMode ? '#bfdbfe' : '#374151' }}>
                    {currentPage}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Hamburger menu button */}
            {actualUser && isAuthenticated ? (
              <button 
                className="hamburger-btn relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-black dark:text-white transition-colors flex items-center justify-center"
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle menu"
                style={{ color: isDarkMode ? '#bfdbfe' : '#374151' }}>
                <div className="w-5 h-5 relative">
                  <FiAlignRight size={22} />
                </div>
              </button>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Enhanced mobile sidebar */}
      {actualUser && isAuthenticated && (
        <div
          className={`sidebar fixed top-0 right-0 h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-gray-900' : 'bg-[#002550]'}`}
        >
          {/* Sidebar header with modern styling */}
          <div className={`px-4 py-3 flex justify-between items-center border-b backdrop-blur-sm ${isDarkMode ? 'border-gray-800/50 bg-gray-900/80' : 'border-[#003065]/50 bg-[#002550]/80'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center overflow-hidden rounded-lg ring-2 ring-white/10">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-lg font-medium tracking-wide">
                <span className="font-semibold text-white">Neura<span className='text-sky-400'>Campus</span></span>
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-all duration-200 hover:scale-105"
              aria-label="Close menu"
            >
              {closeIcon}
            </button>
          </div>
          
          {/* Main content area with fixed height and scroll */}
          <div className="flex flex-col h-[calc(100%-3.5rem)]">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* User profile section with modern styling */}
              <div className="px-4 py-4 border-b ${isDarkMode ? 'border-gray-800/50' : 'border-[#003065]/50'}">
                <div className={`flex items-center rounded-xl px-4 py-3 backdrop-blur-sm ${isDarkMode ? 'bg-gray-800/50' : 'bg-[#002040]/50'} transition-all duration-200 hover:bg-opacity-70`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/10 ${isDarkMode ? 'bg-gray-700' : 'bg-[#002550]'}`}>
                    {actualUser?.name ? actualUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="ml-3">
                    <p className="text-white font-medium">{actualUser?.name || 'User'}</p>
                    <p className="text-white/60 text-sm">{actualUser?.email || 'user@example.com'}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Sections with modern styling */}
              <div className="space-y-6 px-4 py-4">
                {/* Account & Settings Section */}
                <div>
                  <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3 px-1">
                    ACCOUNT & SETTINGS
                  </div>
                  <ul className="space-y-1.5">
                    {accountNavItems.map((item, index) => (
                      <li key={index}>
                        <Link 
                          to={item.path} 
                          className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02] ${isDarkMode ? 'text-white hover:bg-gray-800/50 active:bg-gray-700/50' : 'text-white hover:bg-[#002550]/50 active:bg-[#002040]/50'}`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <div className={`w-9 h-9 flex items-center justify-center rounded-lg mr-3 ring-1 ring-white/10 ${isDarkMode ? 'bg-gray-800/50' : 'bg-[#002550]/50'}`}>
                            <span className="text-white">{item.icon}</span>
                          </div>
                          <span className="font-medium">{item.label}</span>
                          {item.badge && (
                            <div className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ring-1 ring-white/20">
                              {item.badge}
                            </div>
                          )}
                        </Link>
                      </li>
                    ))}
                    <li className="px-3 py-2.5 flex items-center justify-between rounded-xl transition-all duration-200 hover:scale-[1.02]">
                      <span className="font-medium text-white">Dark Mode</span>
                      <ThemeToggleButton />
                    </li>
                  </ul>
                </div>

                {/* Support & Help Section */}
                <div>
                  <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3 px-1">
                    SUPPORT & HELP
                  </div>
                  <ul className="space-y-1.5">
                    {supportNavItems.map((item, index) => (
                      <li key={index}>
                        <Link 
                          to={item.path} 
                          className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02] ${isDarkMode ? 'text-white hover:bg-gray-800/50 active:bg-gray-700/50' : 'text-white hover:bg-[#002550]/50 active:bg-[#002040]/50'}`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <div className={`w-9 h-9 flex items-center justify-center rounded-lg mr-3 ring-1 ring-white/10 ${isDarkMode ? 'bg-gray-800/50' : 'bg-[#002550]/50'}`}>
                            <span className="text-white">{item.icon}</span>
                          </div>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Fixed sign out button with modern styling */}
            <div className="px-4 py-4 border-t ${isDarkMode ? 'border-gray-800/50' : 'border-[#003065]/50'} backdrop-blur-sm">
              <button 
                onClick={handleLogout}
                className="w-full py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 hover:scale-[1.02] flex items-center justify-center font-medium ring-1 ring-white/10"
              >
                {signOutIcon} Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Improved mobile overlay with modern blur effect */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Add spacing to prevent content from hiding under the navbar */}
      <div className="pt-[3.25rem]"></div>

      {/* BottomNavBar - Pass user object correctly */}
      <BottomNavBar 
        user={actualUser}
      />

      {/* Add padding to the bottom to account for the bottom navigation */}
      <div className="pb-2"></div>
    </>
  );
};

export default NavBar;