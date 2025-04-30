import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { FiArrowRight, FiChevronDown, FiGlobe, FiHelpCircle, FiHome,FiMapPin, FiPhone, FiSearch, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { useTheme } from '../context/ThemeContext';

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isDarkMode } = useTheme();

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`border-b ${isDarkMode ? 'border-[#1A75FF]/20' : 'border-[#003B8E]/10'}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full py-4 flex items-center justify-between text-left transition-colors duration-200 rounded-lg px-4 ${
          isDarkMode ? 'hover:bg-[#1A75FF]/10' : 'hover:bg-[#003B8E]/5'
        }`}
      >
        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-[#003B8E]'}`}>{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FiChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-[#003B8E]'}`} />
        </motion.div>
      </button>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden px-4"
      >
        <p className={`pb-4 ${isDarkMode ? 'text-white/80' : 'text-[#0056B3]/80'}`}>{answer}</p>
      </motion.div>
    </motion.div>
  );
};

FAQItem.propTypes = {
  question: PropTypes.string.isRequired,
  answer: PropTypes.string.isRequired,
};

const CompanyInfo = ({ icon: Icon, label, value, color }) => {
  const { isDarkMode } = useTheme();
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`flex items-center gap-3 p-4 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
        isDarkMode 
          ? `bg-[${color}]/10 border-[${color}]/20 hover:shadow-lg hover:shadow-[${color}]/20`
          : `bg-white/80 border-[${color}]/10 hover:shadow-lg hover:shadow-[${color}]/10`
      }`}
    >
      <div className={`p-2.5 rounded-xl bg-[${color}]/10`}>
        <Icon className={`w-5 h-5 ${isDarkMode ? 'text-white' : `text-[${color}]`}`} />
      </div>
      <div>
        <p className={`text-sm ${isDarkMode ? 'text-white/60' : `text-[${color}]/60`}`}>{label}</p>
        <p className={`font-medium ${isDarkMode ? 'text-white' : `text-[${color}]`}`}>{value}</p>
      </div>
    </motion.div>
  );
};

CompanyInfo.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
};

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { isDarkMode } = useTheme();
  const faqs = [
    {
      question: "What is NeuraCampus?",
      answer: "NeuraCampus is an AI-driven campus management system that revolutionizes educational institutions with smart solutions for attendance tracking, resource management, and community engagement."
    },
    {
      question: "How does the attendance system work?",
      answer: "Our proxy-free attendance system uses secure, automated technology to ensure accurate and tamper-proof tracking of student attendance across all classes and events."
    },
    {
      question: "What career resources are available?",
      answer: "NeuraCampus provides an integrated Internship & Career Portal that connects students with top industry opportunities, along with tools for skill development and professional networking."
    },
    {
      question: "How can I access the community features?",
      answer: "The Community Hub is accessible through your dashboard, offering spaces for discussions, event organization, and collaborative learning with fellow students and faculty."
    }
  ];

  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen pb-20 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460]'
        : 'bg-gradient-to-br from-[#003B8E]/5 via-[#0056B3]/5 to-[#1A75FF]/5'
    }`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              to="/dashboard"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-sm border transition-all duration-200 ${
                isDarkMode
                  ? 'bg-[#1A75FF]/10 border-[#1A75FF]/20 hover:bg-[#1A75FF]/20 text-white'
                  : 'bg-white/80 border-[#003B8E]/10 hover:bg-[#003B8E]/5 text-[#003B8E]'
              }`}
            >
              <FiHome className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              to="/contact-support"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#003B8E] to-[#0056B3] text-white font-medium shadow-lg shadow-[#003B8E]/20 hover:shadow-xl hover:shadow-[#003B8E]/30 transition-all hover:scale-105"
            >
              Contact Support
              <FiArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>

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
            className="flex items-center justify-center gap-3 mb-4"
          >
            <div className={`p-3 rounded-full ${isDarkMode ? 'bg-[#1A75FF]/20' : 'bg-[#003B8E]/10'}`}>
              <FiHelpCircle className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-[#003B8E]'}`} />
            </div>
            <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-[#003B8E]'}`}>Help Center</h1>
          </motion.div>
          <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-white/80' : 'text-[#0056B3]/80'}`}>
            Find answers to common questions and learn more about NeuraCampus
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <FiSearch className={`w-5 h-5 ${isDarkMode ? 'text-white/60' : 'text-[#003B8E]/60'}`} />
            </div>
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm border transition-all duration-200 ${
                isDarkMode
                  ? 'bg-[#1A75FF]/10 border-[#1A75FF]/20 focus:border-[#1A75FF] focus:ring-1 focus:ring-[#1A75FF] text-white placeholder-white/40'
                  : 'bg-white/80 border-[#003B8E]/10 focus:border-[#003B8E] focus:ring-1 focus:ring-[#003B8E] text-[#003B8E] placeholder-[#003B8E]/40'
              }`}
            />
          </div>
        </motion.div>

        {/* Company Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12"
        >
          <CompanyInfo
            icon={FiMapPin}
            label="Headquarters"
            value="Yamunanagar, Haryana"
            color="#FF6B6B"
          />
          <CompanyInfo
            icon={FiPhone}
            label="Contact"
            value="925-500-5051"
            color="#4ECDC4"
          />
          <CompanyInfo
            icon={FiUsers}
            label="Company Size"
            value="2-10 employees"
            color="#FFD166"
          />
          <CompanyInfo
            icon={FiGlobe}
            label="Website"
            value="neuracampus.vercel.app"
            color="#06D6A0"
          />
        </motion.div>

        {/* About Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-12 p-8 rounded-3xl backdrop-blur-sm border shadow-lg transition-all duration-300 ${
            isDarkMode
              ? 'bg-[#1A75FF]/10 border-[#1A75FF]/20 shadow-[#1A75FF]/5'
              : 'bg-white/80 border-[#003B8E]/10 shadow-[#003B8E]/5'
          }`}
        >
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-[#003B8E]'}`}>About NeuraCampus</h2>
          <p className={`mb-6 text-lg ${isDarkMode ? 'text-white/80' : 'text-[#0056B3]/80'}`}>
            NeuraCampus is revolutionizing campus management with cutting-edge AI-driven solutions. Our intelligent Campus Management System (CMS) seamlessly integrates technology to create a smarter, more connected, and efficient educational ecosystem.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-xl transition-colors ${
                isDarkMode ? 'bg-[#1A75FF]/20 hover:bg-[#1A75FF]/30' : 'bg-[#003B8E]/5 hover:bg-[#003B8E]/10'
              }`}
            >
              <p className={`flex items-center gap-2 ${isDarkMode ? 'text-white/80' : 'text-[#0056B3]/80'}`}>
                <span className={isDarkMode ? 'text-white' : 'text-[#003B8E] font-bold'}>✓</span>
                Proxy-Free Attendance System
              </p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-xl transition-colors ${
                isDarkMode ? 'bg-[#1A75FF]/20 hover:bg-[#1A75FF]/30' : 'bg-[#003B8E]/5 hover:bg-[#003B8E]/10'
              }`}
            >
              <p className={`flex items-center gap-2 ${isDarkMode ? 'text-white/80' : 'text-[#0056B3]/80'}`}>
                <span className={isDarkMode ? 'text-white' : 'text-[#003B8E] font-bold'}>✓</span>
                AI-Powered Resource Management
              </p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-xl transition-colors ${
                isDarkMode ? 'bg-[#1A75FF]/20 hover:bg-[#1A75FF]/30' : 'bg-[#003B8E]/5 hover:bg-[#003B8E]/10'
              }`}
            >
              <p className={`flex items-center gap-2 ${isDarkMode ? 'text-white/80' : 'text-[#0056B3]/80'}`}>
                <span className={isDarkMode ? 'text-white' : 'text-[#003B8E] font-bold'}>✓</span>
                Smart Networking & Collaboration
              </p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-xl transition-colors ${
                isDarkMode ? 'bg-[#1A75FF]/20 hover:bg-[#1A75FF]/30' : 'bg-[#003B8E]/5 hover:bg-[#003B8E]/10'
              }`}
            >
              <p className={`flex items-center gap-2 ${isDarkMode ? 'text-white/80' : 'text-[#0056B3]/80'}`}>
                <span className={isDarkMode ? 'text-white' : 'text-[#003B8E] font-bold'}>✓</span>
                Internship & Career Portal
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* FAQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-[#003B8E]'}`}>Frequently Asked Questions</h2>
          <div className={`rounded-2xl backdrop-blur-sm border divide-y ${
            isDarkMode
              ? 'bg-[#1A75FF]/10 border-[#1A75FF]/20 divide-[#1A75FF]/20'
              : 'bg-white/80 border-[#003B8E]/10 divide-[#003B8E]/10'
          }`}>
            {filteredFAQs.map((faq, index) => (
              <FAQItem key={index} {...faq} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HelpCenter; 