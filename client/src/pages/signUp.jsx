import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiPhone, FiUserCheck, FiUsers, FiLogIn, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';

import { signupUser } from "../redux/slices/authSlice";
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo1112.png';

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
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName || formData.fullName.trim() === '') 
      errors.fullName = 'Full name is required';
    if (!formData.email || !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) 
      errors.email = 'Valid email is required';
    if (!formData.phone || formData.phone.trim() === '') 
      errors.phone = 'Phone number is required';
    if (!formData.password || formData.password.length < 6) 
      errors.password = 'Password must be at least 6 characters';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitSuccess(false);

    try {
      // Dispatch the signupUser action with form data
      const response = await dispatch(signupUser(formData)).unwrap();
      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Signup error:', err);
      setSubmitSuccess(false);
    }
  };

  const InputField = ({ id, name, type, placeholder, value, onChange, error, icon, children }) => (
    <div className="relative">
      <span className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {icon}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        required
        value={value}
        onChange={onChange}
        className={`block w-full pl-10 pr-3 py-2.5 border rounded-md shadow-sm transition-colors duration-150 text-sm ${
          error
            ? 'border-red-400 dark:border-red-500/70 focus:ring-red-500 focus:border-red-500'
            : `${isDarkMode ? 'border-gray-600 focus:ring-indigo-500 focus:border-indigo-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`
        } ${isDarkMode ? 'bg-gray-700 text-gray-100 placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-1`}
        placeholder={placeholder}
      />
      {children}
      {error && (
        <p className="text-red-500 dark:text-red-400 text-xs mt-1 ml-1">{error}</p>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} relative overflow-hidden`}>
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
        <div className="mt-8 mb-10">
          <div className="bg-indigo-600 h-14 w-14 rounded-full flex items-center justify-center shadow-lg">
            <div className="bg-indigo-500 h-7 w-7 rounded-full"></div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Create Account
          </h1>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please enter valid information to access your account.
          </p>
          
          {/* Display API errors */}
          {signupApiError && !submitSuccess && (
            <div className={`p-3 rounded-md mb-4 ${
              isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'
            }`}>
              {signupApiError}
            </div>
          )}
          
          {/* Display success message */}
          {submitSuccess && (
            <div className={`p-3 rounded-md mb-4 ${
              isDarkMode ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-700'
            }`}>
              Account created successfully! Redirecting to login...
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone input */}
            <div className={`relative rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className={`text-gray-500`}>📱</span>
              </div>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className={`w-full py-3 pl-10 pr-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              />
              {validationErrors.phone && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {validationErrors.phone}
                </p>
              )}
            </div>
            
            {/* Full Name input */}
            <div className={`relative rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className={`text-gray-500`}>👤</span>
              </div>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Full Name"
                className={`w-full py-3 pl-10 pr-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              />
              {validationErrors.fullName && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {validationErrors.fullName}
                </p>
              )}
            </div>
            
            {/* Email input */}
            <div className={`relative rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className={`text-gray-500`}>📧</span>
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className={`w-full py-3 pl-10 pr-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              />
              {validationErrors.email && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {validationErrors.email}
                </p>
              )}
            </div>
            
            {/* Password input */}
            <div className={`relative rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className={`text-gray-500`}>🔒</span>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
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
              {validationErrors.password && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {validationErrors.password}
                </p>
              )}
            </div>
            
            {/* Role selection */}
            <div className={`flex rounded-md overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <label 
                className={`flex-1 py-3 px-4 text-center cursor-pointer transition ${
                  formData.role === 'student' 
                    ? 'bg-indigo-600 text-white' 
                    : isDarkMode ? 'text-gray-300' : 'text-gray-700'
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
                className={`flex-1 py-3 px-4 text-center cursor-pointer transition ${
                  formData.role === 'teacher' 
                    ? 'bg-indigo-600 text-white' 
                    : isDarkMode ? 'text-gray-300' : 'text-gray-700'
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
            
            {/* Create button */}
            <div className="relative mt-6">
              <button
                type="submit"
                disabled={signupLoading}
                className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors ${
                  signupLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {signupLoading ? 'Creating Account...' : 'Create Account'}
              </button>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white">
                <FiArrowRight size={20} />
              </div>
            </div>
          </form>
          
          {/* Login link */}
          <div className="mt-8 text-center">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Already have an account?
            </p>
            <Link to="/login" className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Login
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

export default Signup;
