import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '../context/ThemeContext'; // Optional for consistent background

const SignupCheck = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme(); // Optional

  useEffect(() => {
    // Check if a token exists (assuming token means user has signed up/logged in before)
    const token = localStorage.getItem('token');

    if (token) {
      // User has likely signed up/logged in before, needs to Login
      navigate('/login', { replace: true });
    } else {
      // No token, assume new user, needs to Signup
      navigate('/signup', { replace: true });
    }
    // This effect should only run once on mount
  }, [navigate]);

  // Render minimal loading state while redirecting
  return (
     <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
       <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Checking setup...</p>
     </div>
  );
};

export default SignupCheck;
