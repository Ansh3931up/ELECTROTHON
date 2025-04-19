import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux'; // To get user data if needed by NavBars

import NavBar from './NavBar';
import BottomNavBar from './BottomNavBar';
// Import useTheme if NavBars need it passed (though they should use context directly now)
// import { useTheme } from '../context/ThemeContext';

const MainLayout = () => {
  // Get user data if NavBars still need it (check NavBar/BottomNavBar implementations)
  const user = useSelector((state) => state.auth.user);
  // const { isDarkMode } = useTheme(); // If needed

  // Check if user exists and has the nested user structure
  const actualUser = user?.user;

  return (
    // The main App component might handle the global background
    <div className="relative min-h-screen">
      {/* Render NavBars ONLY if user data is present */}
      {actualUser && <NavBar />}

      {/* Main content area with padding for NavBars */}
      {/* The pt/pb values should match your NavBar/BottomNavBar heights */}
      <main className={`pt-[3.25rem] pb-16`}> {/* Adjust pb value based on BottomNavBar height */}
          <Outlet /> {/* Nested route component renders here */}
      </main>

      {/* Render BottomNavBar ONLY if user data is present */}
      {actualUser && <BottomNavBar user={actualUser} />}
    </div>
  );
};

export default MainLayout;
