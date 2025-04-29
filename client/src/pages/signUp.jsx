import { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from "react-redux";
import { FiEye, FiEyeOff, FiArrowRight, FiUser, FiMail, FiPhone, FiLock, FiBookmark } from 'react-icons/fi';
import { signupUser } from "../redux/slices/authSlice";
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { error: signupApiError, loading: signupLoading } = useSelector((state) => state.auth);
  const { isDarkMode } = useTheme();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    role: "student",
    schoolCode: "",
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const validateField = (name, value) => {
    let errors = { ...validationErrors };
    
    switch(name) {
      case 'fullName':
        if (!value || value.trim() === '') {
          errors.fullName = 'Full name is required';
        } else if (value.length < 3) {
          errors.fullName = 'Name must be at least 3 characters';
        } else {
          delete errors.fullName;
        }
        break;
      case 'email':
        if (!value || !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.email = 'Valid email is required';
        } else {
          delete errors.email;
        }
        break;
      case 'phone':
        if (!value || value.trim() === '') {
          errors.phone = 'Phone number is required';
        } else if (!value.match(/^\d{10}$/)) {
          errors.phone = 'Enter a valid 10-digit phone number';
        } else {
          delete errors.phone;
        }
        break;
      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 6) {
          errors.password = 'Password must be at least 6 characters';
        } else if (!value.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)) {
          errors.password = 'Password must contain uppercase, lowercase and numbers';
        } else {
          delete errors.password;
        }
        break;
      case 'schoolCode':
        if (!value || value.trim() === '') {
          errors.schoolCode = 'School code is required';
        } else {
          delete errors.schoolCode;
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
    Object.keys(formData).forEach(field => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitSuccess(false);

    try {
      const response = await dispatch(signupUser(formData)).unwrap();
      console.log("signup response", response);
      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Signup error:', err);
      setSubmitSuccess(false);
    }
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

  return (
    <div className={`min-h-screen pb-20 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} relative overflow-hidden`}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-transparent opacity-10 pointer-events-none"></div>
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500 opacity-10 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-purple-500 opacity-10 blur-3xl"></div>
      
      {/* Main container */}
      <div className="max-w-md mx-auto px-6 py-12 h-full flex flex-col">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 mb-10"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-14 w-14 rounded-xl flex items-center justify-center shadow-lg">
            <div className="bg-white h-7 w-7 rounded-md opacity-90"></div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1"
        >
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Create Account
          </h1>
          <p className={`text-sm mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please enter your information to create your account
          </p>
          
          {/* Display API errors */}
          {signupApiError && !submitSuccess && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-lg mb-6 flex items-center ${
                isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'
              }`}
            >
              <div className="mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>{signupApiError}</div>
            </motion.div>
          )}

          {/* Display success message */}
          {submitSuccess && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-lg mb-6 flex items-center ${
                isDarkMode ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-700'
              }`}
            >
              <div className="mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>Account created successfully! Redirecting to login...</div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name input */}
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                validationErrors.fullName && focused.fullName !== true ? 'text-red-500' : 'text-indigo-500'
              }`}>
                <FiUser size={20} />
              </div>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                onFocus={() => handleFocus('fullName')}
                onBlur={() => handleBlur('fullName')}
                placeholder="Full Name"
                className={getInputClassName('fullName')}
              />
              {validationErrors.fullName && focused.fullName !== true && (
                <p className="text-xs mt-1.5 ml-1 text-red-500 font-medium">
                  {validationErrors.fullName}
                </p>
              )}
            </div>
            
            {/* Email input */}
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                validationErrors.email && focused.email !== true ? 'text-red-500' : 'text-indigo-500'
              }`}>
                <FiMail size={20} />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => handleFocus('email')}
                onBlur={() => handleBlur('email')}
                placeholder="Email"
                className={getInputClassName('email')}
              />
              {validationErrors.email && focused.email !== true && (
                <p className="text-xs mt-1.5 ml-1 text-red-500 font-medium">
                  {validationErrors.email}
                </p>
              )}
            </div>
            
            {/* Phone input */}
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                validationErrors.phone && focused.phone !== true ? 'text-red-500' : 'text-indigo-500'
              }`}>
                <FiPhone size={20} />
              </div>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onFocus={() => handleFocus('phone')}
                onBlur={() => handleBlur('phone')}
                placeholder="Phone Number (10 digits)"
                className={getInputClassName('phone')}
              />
              {validationErrors.phone && focused.phone !== true && (
                <p className="text-xs mt-1.5 ml-1 text-red-500 font-medium">
                  {validationErrors.phone}
                </p>
              )}
            </div>
            
            {/* School Code input */}
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                validationErrors.schoolCode && focused.schoolCode !== true ? 'text-red-500' : 'text-indigo-500'
              }`}>
                <FiBookmark size={20} />
              </div>
              <input
                type="text"
                name="schoolCode"
                value={formData.schoolCode}
                onChange={handleChange}
                onFocus={() => handleFocus('schoolCode')}
                onBlur={() => handleBlur('schoolCode')}
                placeholder="School/College Code"
                className={getInputClassName('schoolCode')}
              />
              {validationErrors.schoolCode && focused.schoolCode !== true && (
                <p className="text-xs mt-1.5 ml-1 text-red-500 font-medium">
                  {validationErrors.schoolCode}
                </p>
              )}
            </div>
            
            {/* Password input */}
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                validationErrors.password && focused.password !== true ? 'text-red-500' : 'text-indigo-500'
              }`}>
                <FiLock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => handleFocus('password')}
                onBlur={() => handleBlur('password')}
                placeholder="Password"
                className={getInputClassName('password')}
              />
              <div 
                className={`absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer ${
                  validationErrors.password && focused.password !== true ? 'text-red-500' : 'text-gray-500'
                }`}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </div>
              {validationErrors.password && focused.password !== true && (
                <p className="text-xs mt-1.5 ml-1 text-red-500 font-medium">
                  {validationErrors.password}
                </p>
              )}
            </div>
            
            {/* Role selection */}
            <div className="mt-2">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Role
              </label>
              <div className={`flex rounded-lg overflow-hidden shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <label 
                  className={`flex-1 py-3.5 px-4 text-center cursor-pointer transition-all duration-200 ${
                    formData.role === 'student' 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium shadow-lg' 
                      : isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="role" 
                    value="student" 
                    checked={formData.role === 'student'} 
                    onChange={handleChange} 
                    className="sr-only"
                  />
                  Student
                </label>
                <label 
                  className={`flex-1 py-3.5 px-4 text-center cursor-pointer transition-all duration-200 ${
                    formData.role === 'teacher' 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium shadow-lg' 
                      : isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="teacher" 
                    checked={formData.role === 'teacher'} 
                    onChange={handleChange}
                    className="sr-only"
                  />
                  Teacher
                </label>
              </div>
            </div>

            {/* Create button */}
            <motion.div 
              className="relative mt-8"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <button
                type="submit"
                disabled={signupLoading}
                className={`w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-3.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-md transition-all duration-200 ${
                  signupLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {signupLoading ? 'Creating Account...' : 'Create Account'}
                <FiArrowRight size={20} className="absolute right-5 top-1/2 transform -translate-y-1/2 text-white" />
              </button>
            </motion.div>
          </form>

          {/* Login link */}
          <div className="mt-8 text-center">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Already have an account?
            </p>
            <Link to="/login" className={`mt-1 inline-block font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200`}>
              Login to your account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;