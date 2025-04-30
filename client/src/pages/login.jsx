import { useState } from 'react';
import { FiEye, FiEyeOff, FiArrowRight, FiMail, FiLock } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { loginUser } from '../redux/slices/authSlice';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo1112.png';

const Login = () => {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [focused, setFocused] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const validateField = (name, value) => {
    let errors = { ...validationErrors };
    
    switch(name) {
      case 'email':
        if (!value || !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.email = 'Valid email is required';
        } else {
          delete errors.email;
        }
        break;
      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 6) {
          errors.password = 'Password must be at least 6 characters';
        } else {
          delete errors.password;
        }
        break;
      default:
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateForm = () => {
    let isValid = true;
    
    // Validate all fields
    ['email', 'password'].forEach(field => {
      if (!validateField(field, formData[field])) {
        isValid = false;
      }
    });
    
    return isValid;
  };

  const handleFocus = (name) => {
    setFocused({ ...focused, [name]: true });
  };

  const handleBlur = (name) => {
    setFocused({ ...focused, [name]: false });
    validateField(name, formData[name]);
  };

  const getInputClassName = (fieldName) => {
    const baseClass = `w-full py-3.5 pl-12 pr-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 ${
      isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    }`;
    
    if (validationErrors[fieldName] && focused[fieldName] !== true) {
      return `${baseClass} border-2 border-red-500 focus:ring-red-400`;
    }
    
    return `${baseClass} border border-transparent focus:ring-indigo-500 ${
      isDarkMode ? 'focus:border-indigo-500' : 'focus:border-indigo-500'
    }`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      // Dispatch the loginUser action with user credentials
      const result = await dispatch(loginUser({ 
        email: formData.email, 
        password: formData.password, 
        role: formData.role 
      })).unwrap();
      
      if (result) {
        // Check if face verification is required
        const user = result.user;
        if  (user?.user && user.user.isFaceRegistered === false)  {
          // Redirect to face registration
          navigate('/face-registration');
        } else {
          // Face is already verified, navigate based on role
          navigate(formData.role === 'teacher' ? '/teacher-home' : '/student-home');
        }
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-[#003B8E] via-[#0056B3] to-[#1A75FF]">
      {/* Header Section - 1/7th height */}
      <div className="h-[14.285vh] flex items-center justify-center">
        <div className="text-center">
          <img 
            src={logo} 
            alt="Logo" 
            className="w-12 h-12 mx-auto rounded-xl bg-white/5 p-2 shadow-lg"
          />
        </div>
      </div>

      {/* Main Content - Floating Card */}
      <div className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-full"
        >
          <div className="text-center text-white py-2">
            <h2 className="text-2xl font-bold text-white/95">
              Welcome Back!
            </h2>
            <p className="text-white/80 text-sm">
              Enter your credentials to access your account
            </p>
          </div>

          <div className={`${
            isDarkMode ? 'bg-gray-800/95' : 'bg-white/95'
          } backdrop-blur-sm rounded-t-[32px] shadow-xl p-6 h-[calc(100vh-14.285vh-80px)] mt-2`}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl mb-6 bg-red-50 border border-red-100 text-red-700"
              >
                <div className="font-medium">{error}</div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                  <FiMail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => handleFocus('email')}
                  onBlur={() => handleBlur('email')}
                  placeholder="Email"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#8B85FF] focus:ring-1 focus:ring-[#8B85FF]' 
                      : 'bg-gray-100 border border-gray-300 focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF]'
                  } transition-colors`}
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                  <FiLock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => handleFocus('password')}
                  onBlur={() => handleBlur('password')}
                  placeholder="Password"
                  className={`w-full pl-12 pr-12 py-3 rounded-xl ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#8B85FF] focus:ring-1 focus:ring-[#8B85FF]' 
                      : 'bg-gray-100 border border-gray-300 focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF]'
                  } transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center"
                >
                  {showPassword ? (
                    <FiEyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <FiEye className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Role Selection */}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'student' })}
                  className={`flex-1 py-3 px-4 rounded-xl border transition-colors ${
                    formData.role === 'student'
                      ? 'bg-[#003B8E] text-white border-transparent'
                      : isDarkMode
                        ? 'border-gray-600 text-gray-300 hover:border-[#0056B3]'
                        : 'border-gray-300 text-gray-600 hover:border-[#003B8E]'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'teacher' })}
                  className={`flex-1 py-3 px-4 rounded-xl border transition-colors ${
                    formData.role === 'teacher'
                      ? 'bg-[#003B8E] text-white border-transparent'
                      : isDarkMode
                        ? 'border-gray-600 text-gray-300 hover:border-[#0056B3]'
                        : 'border-gray-300 text-gray-600 hover:border-[#003B8E]'
                  }`}
                >
                  Teacher
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-[#003B8E] to-[#0056B3] hover:from-[#00337A] hover:to-[#004799]'
                    : 'bg-gradient-to-r from-[#003B8E] to-[#0056B3] hover:from-[#00337A] hover:to-[#004799]'
                } text-white font-medium transition-colors disabled:opacity-70`}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/forgot-password"
                className={`font-medium transition-colors ${
                  isDarkMode 
                    ? 'text-[#1A75FF] hover:text-[#4D94FF]' 
                    : 'text-[#003B8E] hover:text-[#0056B3]'
                }`}
              >
                Forgot Password?
              </Link>
              <div className="mt-2">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Don't have an account?{' '}
                </span>
                <Link
                  to="/signup"
                  className={`font-medium transition-colors ${
                    isDarkMode 
                      ? 'text-[#1A75FF] hover:text-[#4D94FF]' 
                      : 'text-[#003B8E] hover:text-[#0056B3]'
                  }`}
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
