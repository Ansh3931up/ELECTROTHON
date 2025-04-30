import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/logo1112.png';

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has seen splash screen before
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');
    
    if (hasSeenSplash) {
      // If they've seen it before, navigate immediately
      navigate('/check-signup', { replace: true });
    } else {
      // If first time, show splash and set flag
      const timer = setTimeout(() => {
        localStorage.setItem('hasSeenSplash', 'true');
        navigate('/check-signup', { replace: true });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [navigate]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#003B8E] via-[#0056B3] to-[#1A75FF] relative overflow-hidden`}>
      {/* Animated background elements */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiA4YzAgMi4yMS0xLjc5IDQtNCA0cy00LTEuNzktNC00IDEuNzktNCA0LTQgNCAxLjc5IDQgNHptMCA0OGMwIDIuMjEtMS43OSA0LTQgNHMtNC0xLjc5LTQtNCAxLjc5LTQgNC00IDQgMS43OSA0IDR6bTAtMjRjMCAyLjIxLTEuNzkgNC00IDRzLTQtMS43OS00LTQgMS43OS00IDQtNCA0IDEuNzkgNCA0eiIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4=')]"
      />

      {/* Floating circles */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 0.2 }}
        transition={{ duration: 1.5 }}
        className="absolute top-20 right-20 w-32 h-32 rounded-full bg-white/20 blur-xl"
      />
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 0.2 }}
        transition={{ duration: 1.5 }}
        className="absolute bottom-20 left-20 w-40 h-40 rounded-full bg-white/20 blur-xl"
      />

      {/* Logo container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/10 backdrop-blur-sm h-20 w-20 rounded-2xl flex items-center justify-center mb-8 shadow-lg p-2"
      >
        <img src={logo} alt="Logo" className="w-full h-full object-contain" />
      </motion.div>
      
      {/* Content */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="z-10 text-center px-6"
      >
        <h1 className="text-5xl font-bold mb-3 text-white">
          Neura<span className="text-sky-300">Campus</span>
        </h1>
        <p className="text-xl mb-10 text-white/80">
          Connecting teachers and students
        </p>
        
        {/* Animated loading spinner */}
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-4 border-white/30 border-t-white mx-auto"
        />
      </motion.div>
      
      {/* Bottom gradient */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1 }}
        className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent"
      />
    </div>
  );
};

export default SplashScreen; 