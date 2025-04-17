import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo1112.png';
import { logoutUser } from '../redux/slices/authSlice';
import BottomNavBar from './BottomNavBar';
import { FiAlignRight } from 'react-icons/fi';

const NavBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLogoAnimating, setIsLogoAnimating] = useState(false);
  const [currentPage, setCurrentPage] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

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
      const pageName = path.split('/').pop();
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

  // Main navigation items
  const mainNavItems = [
    { 
      label: 'Dashboard', 
      path: '/dashboard', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 5C4 4.44772 4.44772 4 5 4H9C9.55228 4 10 4.44772 10 5V9C10 9.55228 9.55228 10 9 10H5C4.44772 10 4 9.55228 4 9V5Z" fill="currentColor" />
          <path d="M14 5C14 4.44772 14.4477 4 15 4H19C19.5523 4 20 4.44772 20 5V9C20 9.55228 19.5523 10 19 10H15C14.4477 10 14 9.55228 14 9V5Z" fill="currentColor" />
          <path d="M4 15C4 14.4477 4.44772 14 5 14H9C9.55228 14 10 14.4477 10 15V19C10 19.5523 9.55228 20 9 20H5C4.44772 20 4 19.5523 4 19V15Z" fill="currentColor" />
          <path d="M14 15C14 14.4477 14.4477 14 15 14H19C19.5523 14 20 14.4477 20 15V19C20 19.5523 19.5523 20 19 20H15C14.4477 20 14 19.5523 14 19V15Z" fill="currentColor" />
        </svg>
      ),
    },
    { 
      label: 'Classes', 
      path: '/classes', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278V19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278V19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    { 
      label: 'Reports', 
      path: '/reports', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

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
  console.log("user is : ",user);

  return (
    <>
      {/* Mobile-optimized navbar with gradient */}
      <nav className="bg-gradient-to-r from-[#003065]  to-[#002040] rounded-b-sm shadow-lg text-white fixed top-0 left-0 right-0 z-50">
        <div className="max-w-screen-sm mx-auto px-4 py-2.5 flex justify-between items-center">
          {/* Logo and page title */}
          <div className="flex items-center">
            <div 
              className="relative flex items-center group cursor-pointer"
              onClick={handleLogoClick}
            >
              <div className={`w-8 h-8 flex items-center justify-center overflow-hidden glow-container ${isLogoAnimating ? 'animate-glow glow-active' : ''}`}>
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className={`text-lg font-medium ml-2.5 tracking-wide ${isLogoAnimating ? 'animate-glow' : ''}`}>
                  <span className="font-semibold text-white">Neura<span className='text-sky-400'>Campus </span></span>
                </h1>
                {currentPage && (
                  <span className="text-xs ml-2.5 text-blue-200 font-medium tracking-wider">
                    {currentPage}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Hamburger menu button - only shows when user is logged in */}
        {user ? (
              <button 
                className="hamburger-btn relative p-2 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle menu"
              >
                <div className="w-5 h-5 relative">
                 <FiAlignRight size={22} />
                 </div>
          </button>
        ) : (
              <button 
                onClick={() => navigate('/login')} 
                className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-1.5 rounded-full text-sm font-medium shadow-md hover:shadow-lg hover:from-green-500 hover:to-green-600 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 border border-green-400/10"
                aria-label="Login"
              >
            Login
          </button>
        )}
          </div>
        </div>
      </nav>

      {/* Enhanced mobile sidebar with full width */}
      {user && (
        <div 
          className={`sidebar fixed top-0 right-0 h-full w-full sm:w-80 bg-[#002550] shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* Sidebar header with matching size to navbar */}
          <div className="bg-gradient-to-r from-[#002040] to-[#003065] px-4 py-2.5 flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-lg font-medium ml-2.5 tracking-wide">
                <span className="font-semibold text-white">Attendance App</span>
              </h1>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              {closeIcon}
            </button>
          </div>
          
          {/* User profile section */}
          <div className="px-4 py-5">
            <div className="flex items-center bg-[#0a3677] rounded-lg px-4 py-3.5">
              <div className="w-10 h-10 bg-[#1e4c8a] rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="ml-3">
                <p className="text-white font-medium">User</p>
                <p className="text-white/60 text-xs">{user.email || 'user@example.com'}</p>
              </div>
            </div>
          </div>

          {/* Main Navigation Section */}
          <div className="py-2">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider px-5 py-2">
              MAIN
            </div>
            <ul className="space-y-1 px-3">
              {mainNavItems.map((item, index) => (
                <li key={index}>
                  <Link 
                    to={item.path} 
                    className="flex items-center px-4 py-2.5 rounded-lg text-white hover:bg-blue-700/30 active:bg-blue-700/40 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-600/30 rounded-md mr-3">
                      <span className="text-white">{item.icon}</span>
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account & Settings Section */}
          <div className="py-2">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider px-5 py-2">
              ACCOUNT & SETTINGS
            </div>
            <ul className="space-y-1 px-3">
              {accountNavItems.map((item, index) => (
                <li key={index}>
                  <Link 
                    to={item.path} 
                    className="flex items-center px-4 py-2.5 rounded-lg text-white hover:bg-blue-700/30 active:bg-blue-700/40 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-600/30 rounded-md mr-3">
                      <span className="text-white">{item.icon}</span>
                    </div>
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <div className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {item.badge}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Help Section */}
          <div className="py-2">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider px-5 py-2">
              SUPPORT & HELP
            </div>
            <ul className="space-y-1 px-3">
              {supportNavItems.map((item, index) => (
                <li key={index}>
                  <Link 
                    to={item.path} 
                    className="flex items-center px-4 py-2.5 rounded-lg text-white hover:bg-blue-700/30 active:bg-blue-700/40 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-600/30 rounded-md mr-3">
                      <span className="text-white">{item.icon}</span>
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sign out button at bottom */}
          <div className="absolute bottom-6 left-4 right-4">
            <button 
              onClick={handleLogout}
              className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center font-medium"
            >
              {signOutIcon} Sign Out
        </button>
      </div>
        </div>
      )}

      {/* Mobile-friendly overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Add spacing to prevent content from hiding under the navbar */}
      <div className="pt-[3.25rem]"></div>

      {/* Add the BottomNavBar component with user role */}
      <BottomNavBar 
        user={user} 
        isDarkMode={isDarkMode} 
        setSidebarOpen={setSidebarOpen} 
      />

      {/* Add padding to the bottom to account for the bottom navigation */}
      <div className="pb-2"></div>
    </>
  );
};

export default NavBar;