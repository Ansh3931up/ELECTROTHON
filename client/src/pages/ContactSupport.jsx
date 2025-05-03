import axios from 'axios';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { FiArrowLeft, FiClock, FiMail, FiMessageSquare, FiPhone, FiSend, FiUser, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useTheme } from '../context/ThemeContext';

const ContactSupport = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
const API_URL = "https://electrothon.onrender.com/api/v1" + "/support";
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/messages`, formData);
      
      if (response.data.success) {
        toast.success('Message sent successfully! We will get back to you soon.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          message: ''
        });
      } else {
        throw new Error(response.data.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen pb-20 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460]'
        : 'bg-gradient-to-br from-[#003B8E]/5 via-[#0056B3]/5 to-[#1A75FF]/5'
    }`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link
            to="/help-center"
            className={`inline-flex items-center gap-2 transition-colors ${
              isDarkMode ? 'text-white hover:text-white/80' : 'text-[#003B8E] hover:text-[#0056B3]'
            }`}
          >
            <FiArrowLeft className="w-5 h-5" />
            Back to Help Center
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <h1 className={`text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-[#003B8E]'}`}>Contact Support</h1>
            <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-white/80' : 'text-[#0056B3]/80'}`}>
              Get in touch with our support team. We&apos;re here to help!
            </p>
          </motion.div>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
              isDarkMode
                ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/20 hover:shadow-lg hover:shadow-[#FF6B6B]/20'
                : 'bg-white/80 border-[#FF6B6B]/10 hover:shadow-lg hover:shadow-[#FF6B6B]/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-[#FF6B6B]/10`}>
                <FiPhone className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-[#FF6B6B]'}`} />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-[#FF6B6B]/60'}`}>Phone</p>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-[#FF6B6B]'}`}>925-500-5051</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
              isDarkMode
                ? 'bg-[#4ECDC4]/10 border-[#4ECDC4]/20 hover:shadow-lg hover:shadow-[#4ECDC4]/20'
                : 'bg-white/80 border-[#4ECDC4]/10 hover:shadow-lg hover:shadow-[#4ECDC4]/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-[#4ECDC4]/10`}>
                <FiMail className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-[#4ECDC4]'}`} />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-[#4ECDC4]/60'}`}>Email</p>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-[#4ECDC4]'}`}>support@neuracampus.com</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
              isDarkMode
                ? 'bg-[#FFD166]/10 border-[#FFD166]/20 hover:shadow-lg hover:shadow-[#FFD166]/20'
                : 'bg-white/80 border-[#FFD166]/10 hover:shadow-lg hover:shadow-[#FFD166]/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-[#FFD166]/10`}>
                <FiClock className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-[#FFD166]'}`} />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-[#FFD166]/60'}`}>Response Time</p>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-[#FFD166]'}`}>Within 24 hours</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
              isDarkMode
                ? 'bg-[#06D6A0]/10 border-[#06D6A0]/20 hover:shadow-lg hover:shadow-[#06D6A0]/20'
                : 'bg-white/80 border-[#06D6A0]/10 hover:shadow-lg hover:shadow-[#06D6A0]/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-[#06D6A0]/10`}>
                <FiUsers className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-[#06D6A0]'}`} />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-[#06D6A0]/60'}`}>Support Team</p>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-[#06D6A0]'}`}>Available 24/7</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl backdrop-blur-sm border p-8 shadow-lg transition-all duration-300 ${
            isDarkMode
              ? 'bg-[#1A75FF]/10 border-[#1A75FF]/20 shadow-[#1A75FF]/5'
              : 'bg-white/80 border-[#003B8E]/10 shadow-[#003B8E]/5'
          }`}
        >
          <h2 className={`text-2xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-[#003B8E]'}`}>Send Message</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none ${
                  isDarkMode ? 'text-white/60' : 'text-[#003B8E]/60'
                }`}>
                  <FiUser className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Name"
                  required
                  className={`w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm border transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-[#1A75FF]/10 border-[#1A75FF]/20 focus:border-[#1A75FF] focus:ring-1 focus:ring-[#1A75FF] text-white placeholder-white/40'
                      : 'bg-white/50 border-[#003B8E]/10 focus:border-[#003B8E] focus:ring-1 focus:ring-[#003B8E] text-[#003B8E] placeholder-[#003B8E]/40'
                  }`}
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none ${
                  isDarkMode ? 'text-white/60' : 'text-[#003B8E]/60'
                }`}>
                  <FiMail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  required
                  className={`w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm border transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-[#1A75FF]/10 border-[#1A75FF]/20 focus:border-[#1A75FF] focus:ring-1 focus:ring-[#1A75FF] text-white placeholder-white/40'
                      : 'bg-white/50 border-[#003B8E]/10 focus:border-[#003B8E] focus:ring-1 focus:ring-[#003B8E] text-[#003B8E] placeholder-[#003B8E]/40'
                  }`}
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none ${
                  isDarkMode ? 'text-white/60' : 'text-[#003B8E]/60'
                }`}>
                  <FiPhone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone Number"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm border transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-[#1A75FF]/10 border-[#1A75FF]/20 focus:border-[#1A75FF] focus:ring-1 focus:ring-[#1A75FF] text-white placeholder-white/40'
                      : 'bg-white/50 border-[#003B8E]/10 focus:border-[#003B8E] focus:ring-1 focus:ring-[#003B8E] text-[#003B8E] placeholder-[#003B8E]/40'
                  }`}
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <div className={`absolute top-3 left-4 ${
                  isDarkMode ? 'text-white/60' : 'text-[#003B8E]/60'
                }`}>
                  <FiMessageSquare className="w-5 h-5" />
                </div>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Your Message"
                  required
                  rows={4}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm border transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-[#1A75FF]/10 border-[#1A75FF]/20 focus:border-[#1A75FF] focus:ring-1 focus:ring-[#1A75FF] text-white placeholder-white/40'
                      : 'bg-white/50 border-[#003B8E]/10 focus:border-[#003B8E] focus:ring-1 focus:ring-[#003B8E] text-[#003B8E] placeholder-[#003B8E]/40'
                  }`}
                />
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-[#003B8E] to-[#0056B3] text-white font-medium shadow-lg shadow-[#003B8E]/20 hover:shadow-xl hover:shadow-[#003B8E]/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiSend className="w-5 h-5" />
                  Send Message
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Company Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-12 p-8 rounded-3xl backdrop-blur-sm border shadow-lg transition-all duration-300 ${
            isDarkMode
              ? 'bg-[#1A75FF]/10 border-[#1A75FF]/20 shadow-[#1A75FF]/5'
              : 'bg-white/80 border-[#003B8E]/10 shadow-[#003B8E]/5'
          }`}
        >
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-[#003B8E]'}`}>About Us</h2>
          <p className={`mb-6 text-lg ${isDarkMode ? 'text-white/80' : 'text-[#0056B3]/80'}`}>
            NeuraCampus is revolutionizing campus management with cutting-edge AI-driven solutions. Our intelligent Campus Management System (CMS) seamlessly integrates technology to create a smarter, more connected, and efficient educational ecosystem.
          </p>
          <div className="flex flex-wrap gap-2">
            <motion.span
              whileHover={{ scale: 1.05 }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                isDarkMode
                  ? 'bg-[#1A75FF]/20 text-white hover:bg-[#1A75FF]/30'
                  : 'bg-[#003B8E]/10 text-[#003B8E] hover:bg-[#003B8E]/20'
              }`}
            >
              #AIinEducation
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                isDarkMode
                  ? 'bg-[#1A75FF]/20 text-white hover:bg-[#1A75FF]/30'
                  : 'bg-[#003B8E]/10 text-[#003B8E] hover:bg-[#003B8E]/20'
              }`}
            >
              #SmartCampus
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                isDarkMode
                  ? 'bg-[#1A75FF]/20 text-white hover:bg-[#1A75FF]/30'
                  : 'bg-[#003B8E]/10 text-[#003B8E] hover:bg-[#003B8E]/20'
              }`}
            >
              #DigitalTransformation
            </motion.span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactSupport;