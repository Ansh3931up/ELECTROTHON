import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo1112.png';
const SplashScreen = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    // Set a timeout to navigate to the signup check page after 3 seconds
    const timer = setTimeout(() => {
      navigate('/check-signup', { replace: true });
    }, 3000); // 3 seconds

    // Cleanup the timer if component unmounts
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
    } relative overflow-hidden`}>
      {/* Background pattern dots */}
      <div className="absolute top-0 left-0 w-full h-16 flex justify-end">
        <div className="grid grid-cols-10 gap-2 p-4 opacity-20">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-1 w-1 rounded-full bg-blue-500"></div>
          ))}
        </div>
      </div>
      
      {/* Abstract shapes for background */}
      <div className="absolute top-20 right-20 w-32 h-32 rounded-full bg-blue-800/20 blur-xl"></div>
      <div className="absolute bottom-20 left-20 w-40 h-40 rounded-full bg-indigo-800/20 blur-xl"></div>

      {/* Logo */}
      <div className="bg-indigo-600 h-16 w-16 rounded-full flex items-center justify-center mb-8 shadow-lg">
        <div className="bg-indigo-500 h-8 w-8 rounded-full">  <img src={logo} alt="Logo" className="w-full h-full object-contain" /></div>
      </div>
      
      {/* Content */}
      <div className="z-10 text-center px-6">
        <h1 className={`text-5xl font-bold mb-3 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Neura<span className='text-sky-400'>Campus</span>
        </h1>
        <p className={`text-xl mb-10 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Connecting teachers and students
        </p>
        
        {/* Animated spinner */}
        <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-b-3 border-indigo-500 mx-auto"></div>
      </div>
      
      {/* Bottom pattern */}
      <div className="absolute bottom-0 right-0 w-full h-24 opacity-10">
        <div className="h-full w-full bg-gradient-to-tr from-indigo-800 to-transparent"></div>
      </div>
    </div>
  );
};

export default SplashScreen; 