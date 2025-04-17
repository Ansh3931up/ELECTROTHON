import { 
FiBell, FiBook, FiFileText,   FiGrid, FiHelpCircle,
FiLogOut,   FiMessageSquare,   FiSettings, FiUser,
FiX
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

import logo from '../assets/logo1112.png';

const SidebarNav = ({ 
  user, 
  isSidebarOpen, 
  setSidebarOpen, 
  isDarkMode, 
  handleLogout 
}) => {
  if (!user) return null;

  // Main navigation items with react-icons
  const mainNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <FiGrid size={18} /> },
    { label: 'Classes', path: '/classes', icon: <FiBook size={18} /> },
    { label: 'Reports', path: '/reports', icon: <FiFileText size={18} /> },
  ];

  // Account & Settings navigation items with react-icons
  const accountNavItems = [
    { label: 'My Profile', path: '/profile', icon: <FiUser size={18} /> },
    { label: 'Account Settings', path: '/account', icon: <FiSettings size={18} /> },
    { label: 'Notifications', path: '/notifications', icon: <FiBell size={18} />, badge: 3 },
  ];

  // Support & Help navigation items with react-icons
  const supportNavItems = [
    { label: 'Help Center', path: '/help', icon: <FiHelpCircle size={18} /> },
    { label: 'Contact Support', path: '/contact', icon: <FiMessageSquare size={18} /> },
  ];

  return (
    <>
      <div 
        className={`sidebar fixed top-0 right-0 h-full w-full sm:w-80 ${isDarkMode ? 'bg-gray-900' : 'bg-[#002550]'} shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Sidebar header with matching size to navbar */}
        <div className={`${isDarkMode ? 'bg-gradient-to-r from-gray-900 to-gray-800' : 'bg-gradient-to-r from-[#002040] to-[#003065]'} px-4 py-2.5 flex justify-between items-center`}>
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
            <FiX size={20} />
          </button>
        </div>
        
        {/* User profile section */}
        <div className="px-4 py-5">
          <div className={`flex items-center ${isDarkMode ? 'bg-gray-800' : 'bg-[#0a3677]'} rounded-lg px-4 py-3.5`}>
            <div className={`w-10 h-10 ${isDarkMode ? 'bg-gray-700' : 'bg-[#1e4c8a]'} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="ml-3">
              <p className="text-white font-medium">{user.name || 'User'}</p>
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
                  className={`flex items-center px-4 py-2.5 rounded-lg text-white hover:${isDarkMode ? 'bg-gray-700/70' : 'bg-blue-700/30'} active:${isDarkMode ? 'bg-gray-700' : 'bg-blue-700/40'} transition-colors`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className={`w-8 h-8 flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-blue-600/30'} rounded-md mr-3`}>
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
                  className={`flex items-center px-4 py-2.5 rounded-lg text-white hover:${isDarkMode ? 'bg-gray-700/70' : 'bg-blue-700/30'} active:${isDarkMode ? 'bg-gray-700' : 'bg-blue-700/40'} transition-colors`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className={`w-8 h-8 flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-blue-600/30'} rounded-md mr-3`}>
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
                  className={`flex items-center px-4 py-2.5 rounded-lg text-white hover:${isDarkMode ? 'bg-gray-700/70' : 'bg-blue-700/30'} active:${isDarkMode ? 'bg-gray-700' : 'bg-blue-700/40'} transition-colors`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className={`w-8 h-8 flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-blue-600/30'} rounded-md mr-3`}>
                    <span className="text-white">{item.icon}</span>
                  </div>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Sign out button at bottom */}
        <div className="absolute bottom-24 sm:bottom-6 left-4 right-4">
          <button 
            onClick={handleLogout}
            className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center font-medium"
          >
            <FiLogOut size={18} className="mr-2" /> Sign Out
          </button>
        </div>
      </div>

      {/* Mobile-friendly overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </>
  );
};

export default SidebarNav; 