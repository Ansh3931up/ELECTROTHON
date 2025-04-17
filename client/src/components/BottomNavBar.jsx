import { 
FiBell,
FiBook, FiCalendar,
FiFileText,   FiHome, FiMenu, FiPlusCircle, 
  FiSearch,   FiUser} from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';

const BottomNavBar = ({ user, isDarkMode, setSidebarOpen, onCreateClass }) => {
  const location = useLocation();
  
  // Determine if user is a teacher or student
  const isTeacher = user?.role === 'teacher';
  
  // Bottom navigation items for teachers
  const teacherNavItems = [
    { label: 'Home', path: '/dashboard', icon: <FiHome size={20} /> },
    { label: 'Classes', path: '/classes', icon: <FiBook size={20} /> },
    { 
      label: 'Add', 
      icon: <FiPlusCircle size={24} />,
      action: () => onCreateClass()
    },
    { label: 'Search', path: '/search', icon: <FiSearch size={20} /> },
    { label: 'Attendence', path: '/teacher/attendance', icon: <FiMenu size={20} />},
  ];
  
  // Bottom navigation items for students
  const studentNavItems = [
    { label: 'Home', path: '/dashboard', icon: <FiHome size={20} /> },
    { label: 'Classes', path: '/classes', icon: <FiBook size={20} /> },
    { label: 'Attendance', path: '/attendance', icon: <FiCalendar size={20} /> },
    { label: 'Profile', path: '/profile', icon: <FiUser size={20} /> },
    // { label: 'Menu', path: '#', icon: <FiMenu size={20} />, action: () => setSidebarOpen(true) },
  ];
  
  // Select the appropriate navigation items based on user role
  const bottomNavItems = isTeacher ? teacherNavItems : studentNavItems;

  if (!user) return null;

  return (
    <div className={`fixed bg-gradient-to-r from-[#003065]  to-[#002040]  -bottom-2 left-0 right-0 ${isDarkMode ? 'bg-gray-900' : 'bg-[#002040]'} shadow-lg z-40 border-t ${isDarkMode ? 'border-gray-700' : 'border-blue-800'}`}>
      <div className="flex justify-between items-center max-w-screen-sm mx-auto">
        {bottomNavItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const isAddButton = isTeacher && item.label === 'Add';
          
          return (
            <div key={index} className={`flex-1 ${isAddButton ? 'flex justify-center -mt-8' : ''}`}>
              {item.action ? (
                <button
                  onClick={item.action}
                  className={`${isAddButton ? 'w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-400 shadow-lg text-white flex flex-col items-center justify-center' : 
                    `w-full py-5 flex flex-col items-center justify-center transition-colors 
                    ${isActive ? 'text-blue-400' : 'text-white/70 hover:text-white'}`}`}
                >
                  <div className={isAddButton ? '' : `${isActive && !isDarkMode ? 'text-blue-400' : isActive && isDarkMode ? 'text-blue-300' : ''}`}>
                    {item.icon}
                  </div>
                  {/* <span className="text-xs mt-1">{item.label}</span> */}
                </button>
              ) : (
                <Link
                  to={item.path}
                  className={`w-full py-3 flex flex-col items-center justify-center transition-colors 
                    ${isActive ? 'text-blue-400' : 'text-white/70 hover:text-white'}`}
                >
                  <div className={`${isActive && !isDarkMode ? 'text-blue-400' : isActive && isDarkMode ? 'text-blue-300' : ''}`}>
                    {item.icon}
                  </div>
                  <span className="text-xs mt-1">{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavBar; 