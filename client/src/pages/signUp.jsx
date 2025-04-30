import { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from "react-redux";
import { motion } from 'framer-motion';
import { 
  HiOutlineUser, 
  HiOutlineMail, 
  HiOutlinePhone, 
  HiOutlineLockClosed, 
  HiOutlineAcademicCap,
  HiOutlineEye, 
  HiOutlineEyeOff
} from 'react-icons/hi';
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
      case 'fullName': {
        if (!value || value.trim() === '') {
          errors.fullName = 'Full name is required';
        } else if (value.length < 3) {
          errors.fullName = 'Name must be at least 3 characters';
        } else if (!/^[a-zA-Z\s]*$/.test(value)) {
          errors.fullName = 'Name should only contain letters and spaces';
        } else if (value.length > 50) {
          errors.fullName = 'Name should not exceed 50 characters';
        } else {
          delete errors.fullName;
        }
        break;
      }

      case 'email': {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!value) {
          errors.email = 'Email is required';
        } else if (!emailRegex.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;
      }

      case 'phone': {
        const indianPhoneRegex = /^[6-9]\d{9}$/;
        if (!value) {
          errors.phone = 'Phone number is required';
        } else if (!indianPhoneRegex.test(value)) {
          errors.phone = 'Please enter a valid Indian mobile number';
        } else {
          delete errors.phone;
        }
        break;
      }

      case 'password': {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else if (!passwordRegex.test(value)) {
          errors.password = 'Password must contain: uppercase, lowercase, number, special character';
        } else {
          delete errors.password;
        }
        break;
      }

      case 'schoolCode': {
        const schoolCodeRegex = /^[A-Z0-9]{4,10}$/;
        if (!value) {
          errors.schoolCode = 'School code is required';
        } else if (!schoolCodeRegex.test(value)) {
          errors.schoolCode = 'Enter a valid school code (4-10 alphanumeric characters)';
        } else {
          delete errors.schoolCode;
        }
        break;
      }

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

  // Input field configuration with enhanced icons and validation
  const inputFields = [
    {
      name: 'fullName',
      icon: HiOutlineUser,
      placeholder: 'Full Name',
      type: 'text',
      autoComplete: 'name',
      maxLength: 50
    },
    {
      name: 'email',
      icon: HiOutlineMail,
      placeholder: 'Email Address',
      type: 'email',
      autoComplete: 'email'
    },
    {
      name: 'phone',
      icon: HiOutlinePhone,
      placeholder: 'Mobile Number (Indian)',
      type: 'tel',
      autoComplete: 'tel',
      maxLength: 10,
      pattern: '[6-9]{1}[0-9]{9}'
    },
    {
      name: 'schoolCode',
      icon: HiOutlineAcademicCap,
      placeholder: 'School/College Code',
      type: 'text',
      autoComplete: 'off',
      maxLength: 10
    }
  ];

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
              Create Account
            </h2>
            <p className="text-white/80 text-sm">
              Enter your details to register
            </p>
          </div>

          <div className={`${
            isDarkMode ? 'bg-gray-800/95' : 'bg-white/95'
          } backdrop-blur-sm rounded-t-[32px] shadow-xl p-6 h-[calc(100vh-14.285vh-80px)] mt-2 overflow-y-auto`}>
            {signupApiError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl mb-6 bg-red-50 border border-red-100 text-red-700"
              >
                <div className="font-medium">{signupApiError}</div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {inputFields.map((field) => (
                <div key={field.name} className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                    <field.icon className="w-5 h-5" />
                  </div>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    onFocus={() => handleFocus(field.name)}
                    onBlur={() => handleBlur(field.name)}
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    maxLength={field.maxLength}
                    pattern={field.pattern}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#8B85FF] focus:ring-1 focus:ring-[#8B85FF]' 
                        : 'bg-gray-100 border border-gray-300 focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF]'
                    } transition-colors`}
                  />
                  {validationErrors[field.name] && !focused[field.name] && (
                    <p className="text-xs mt-1 text-red-500">
                      {validationErrors[field.name]}
                    </p>
                  )}
                </div>
              ))}

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                  <HiOutlineLockClosed className="w-5 h-5" />
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
                    <HiOutlineEyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <HiOutlineEye className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {validationErrors.password && !focused.password && (
                  <p className="text-xs mt-1 text-red-500">
                    {validationErrors.password}
                  </p>
                )}
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
                disabled={signupLoading}
                className={`w-full py-3 px-4 rounded-xl ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-[#003B8E] to-[#0056B3] hover:from-[#00337A] hover:to-[#004799]'
                    : 'bg-gradient-to-r from-[#003B8E] to-[#0056B3] hover:from-[#00337A] hover:to-[#004799]'
                } text-white font-medium transition-colors disabled:opacity-70`}
              >
                {signupLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Already have an account?{' '}
              </span>
              <Link
                to="/login"
                className={`font-medium transition-colors ${
                  isDarkMode 
                    ? 'text-[#1A75FF] hover:text-[#4D94FF]' 
                    : 'text-[#003B8E] hover:text-[#0056B3]'
                }`}
              >
                Sign In
              </Link>
            </div>

            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-center"
              >
                <p className="font-medium">Account created successfully! Redirecting to login...</p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;