import { motion } from 'framer-motion';
import { useState } from 'react';
import { FaCheck, FaEnvelope, FaEye, FaEyeSlash, FaKey, FaLock } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import logo from '../assets/logo1112.png';
import { useTheme } from '../context/ThemeContext';
import { forgotPassword, resetPassword, verifyOTP } from '../redux/slices/authSlice';

const ForgotPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false
  });
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await dispatch(forgotPassword(formData.email)).unwrap();
      toast.success('OTP sent to your email');
      setStep(2);
    } catch (error) {
      toast.error(error || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      await dispatch(verifyOTP({ email: formData.email, otp: formData.otp })).unwrap();
      toast.success('OTP verified successfully');
      setStep(3);
    } catch (error) {
      toast.error(error || 'Invalid OTP');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await dispatch(resetPassword({
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.newPassword
      })).unwrap();
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (error) {
      toast.error(error || 'Failed to reset password');
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
              {step === 1 ? 'Reset Password' :
               step === 2 ? 'Verify OTP' :
               'Set New Password'}
            </h2>
            <p className="text-white/80 text-sm">
              {step === 1 ? 'Enter your email to receive OTP' :
               step === 2 ? 'Enter the OTP sent to your email' :
               'Create your new password'}
            </p>
          </div>

          <div className={`${
            isDarkMode ? 'bg-gray-800/95' : 'bg-white/95'
          } backdrop-blur-sm rounded-t-[32px] shadow-xl p-6 h-[calc(100vh-14.285vh-80px)] mt-2`}>
            {step === 1 && (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                      <FaEnvelope className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full pl-12 pr-4 py-3 rounded-xl ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#0056B3] focus:ring-1 focus:ring-[#0056B3]' 
                          : 'bg-gray-100 border border-gray-300 focus:border-[#003B8E] focus:ring-1 focus:ring-[#003B8E]'
                      } transition-colors`}
                      placeholder="Email"
                      required
                    />
                  </div>
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
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                      <FaCheck className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="otp"
                      value={formData.otp}
                      onChange={handleChange}
                      className={`w-full pl-12 pr-4 py-3 rounded-xl ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#0056B3] focus:ring-1 focus:ring-[#0056B3]' 
                          : 'bg-gray-100 border border-gray-300 focus:border-[#003B8E] focus:ring-1 focus:ring-[#003B8E]'
                      } transition-colors`}
                      placeholder="Enter OTP"
                      required
                    />
                  </div>
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
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                      <FaLock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword.newPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className={`w-full pl-12 pr-12 py-3 rounded-xl ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#0056B3] focus:ring-1 focus:ring-[#0056B3]' 
                          : 'bg-gray-100 border border-gray-300 focus:border-[#003B8E] focus:ring-1 focus:ring-[#003B8E]'
                      } transition-colors`}
                      placeholder="New Password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('newPassword')}
                      className="absolute inset-y-0 right-4 flex items-center"
                    >
                      {showPassword.newPassword ? (
                        <FaEyeSlash className="w-5 h-5 text-gray-400" />
                      ) : (
                        <FaEye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                      <FaKey className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword.confirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full pl-12 pr-12 py-3 rounded-xl ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#0056B3] focus:ring-1 focus:ring-[#0056B3]' 
                          : 'bg-gray-100 border border-gray-300 focus:border-[#003B8E] focus:ring-1 focus:ring-[#003B8E]'
                      } transition-colors`}
                      placeholder="Confirm Password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      className="absolute inset-y-0 right-4 flex items-center"
                    >
                      {showPassword.confirmPassword ? (
                        <FaEyeSlash className="w-5 h-5 text-gray-400" />
                      ) : (
                        <FaEye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
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
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className={`font-medium transition-colors ${
                  isDarkMode 
                    ? 'text-[#1A75FF] hover:text-[#4D94FF]' 
                    : 'text-[#003B8E] hover:text-[#0056B3]'
                }`}
              >
                Back to Login
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword; 