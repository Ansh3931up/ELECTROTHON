import React, { createContext, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';

// 1. Create Context
const ThemeContext = createContext();

// Helper function to get initial theme
const getInitialTheme = () => {
    // Check localStorage first
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
        return storedTheme === 'dark';
    }
    // Fallback to system preference if no stored theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
    }
    // Default to light mode
    return false;
};

// 2. Create Provider Component
export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);

    // Function to toggle theme
    const toggleDarkMode = () => {
        setIsDarkMode(prevMode => !prevMode);
    };

    // Effect to apply class to HTML and save preference
    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]); // Depend on isDarkMode changes

    // Value provided by the context
    const value = {
        isDarkMode,
        toggleDarkMode,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

// Add prop types validation for ThemeProvider
ThemeProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

// 3. Create Custom Hook for easy consumption
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};