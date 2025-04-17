import React from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext'; // Import the hook

const ThemeToggleButton = () => {
    const { isDarkMode, toggleDarkMode } = useTheme(); // Use the context

    return (
        <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isDarkMode
                ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600 focus:ring-offset-gray-800' // Added dark offset
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200 focus:ring-offset-white' // Added light offset
            }`}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDarkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>
    );
};

export default ThemeToggleButton;
