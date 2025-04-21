import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../context/ThemeContext';
import { FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { loginUser } from '../redux/slices/authSlice';

const Login = () => {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // Default to student
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Dispatch the loginUser action with user credentials
      const result = await dispatch(loginUser({ email, password, role })).unwrap();
      
      if (result) {
        // Check if face verification is required
        const user = result.user;
        if (user && (!user.faceData || user.faceData.verificationStatus !== 'verified')) {
          // Redirect to face registration
          navigate('/face-registration');
        } else {
          // Face is already verified, navigate based on role
          navigate(role === 'teacher' ? '/teacher' : '/student');
        }
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className={`min-h-screen pb-20 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} relative overflow-hidden`}>
      {/* Background pattern dots */}
      <div className="absolute top-0 right-0 grid grid-cols-10 gap-2 p-4 opacity-20">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="h-1 w-1 rounded-full bg-blue-500"></div>
        ))}
      </div>
      
      {/* Abstract shapes for background */}
      <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-blue-800/20 blur-xl"></div>
      <div className="absolute bottom-40 right-10 w-40 h-40 rounded-full bg-indigo-800/20 blur-xl"></div>
      
      {/* Main container */}
      <div className="max-w-md mx-auto px-6 py-12 h-screen flex flex-col">
        {/* Logo */}
        <div className="mt-8 mb-12">
          <div className="bg-indigo-600 h-14 w-14 rounded-full flex items-center justify-center shadow-lg">
            <div className="bg-indigo-500 h-7 w-7 rounded-full"></div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Welcome Back!
          </h1>
          <p className={`text-sm mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Enter your email address and password to get access your account.
          </p>
          
          {/* Display error message if login fails */}
          {error && (
            <div className={`p-3 rounded-md mb-4 ${
              isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'
            }`}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email input */}
            <div className={`relative rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className={`text-gray-500`}>📧</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className={`w-full py-3 pl-10 pr-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              />
            </div>
            
            {/* Password input */}
            <div className={`relative rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className={`text-gray-500`}>🔒</span>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className={`w-full py-3 pl-10 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              />
              <div 
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 
                  <FiEyeOff className="text-gray-500" /> : 
                  <FiEye className="text-gray-500" />
                }
              </div>
            </div>
            
            {/* Role selection */}
            <div className={`flex rounded-md overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <label 
                className={`flex-1 py-3 px-4 text-center cursor-pointer transition ${
                  role === 'student' 
                    ? 'bg-indigo-600 text-white' 
                    : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                <input 
                  type="radio" 
                  name="role" 
                  value="student" 
                  checked={role === 'student'} 
                  onChange={() => setRole('student')} 
                  className="sr-only"
                />
                Student
              </label>
              <label 
                className={`flex-1 py-3 px-4 text-center cursor-pointer transition ${
                  role === 'teacher' 
                    ? 'bg-indigo-600 text-white' 
                    : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                <input 
                  type="radio" 
                  name="role" 
                  value="teacher" 
                  checked={role === 'teacher'} 
                  onChange={() => setRole('teacher')} 
                  className="sr-only"
                />
                Teacher
              </label>
            </div>
            
            {/* Forgot password */}
            <div className="flex justify-start">
              <Link to="/forgot-password" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}>
                Forgot?
              </Link>
            </div>
            
            {/* Login button */}
            <div className="relative">
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white">
                <FiArrowRight size={20} />
              </div>
            </div>
          </form>
          
          {/* Create account link */}
          <div className="mt-8 text-center">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Don't have an account?
            </p>
            <Link to="/signup" className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Create account
            </Link>
          </div>
        </div>
        
        {/* Bottom pattern */}
        <div className="absolute bottom-0 right-0 w-full h-24 opacity-10">
          <div className="h-full w-full bg-gradient-to-tr from-indigo-800 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
