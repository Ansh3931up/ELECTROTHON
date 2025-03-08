import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../redux/slices/authSlice';

const NavBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const  user  = useSelector((state) => state.auth.user);
 
  console.log("user",user);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    window.location.reload();
  };

  return (
    <nav className="bg-blue-500 p-4 text-white flex justify-between items-center">
      <h1 className="text-xl font-bold">Attendance App</h1>
      <div className='flex gap-4 justify-center items-center'>
        {user ? (
          <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600">
            Logout
          </button>
        ) : (
          <button onClick={() => navigate('/login')} className="bg-green-500 px-4 py-2 rounded hover:bg-green-600">
            Login
          </button>
        )}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`p-3 rounded-full hover:bg-blue-600 transition-all duration-200 ${
            isRefreshing ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:scale-110'
          }`}
          aria-label="Refresh page"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-8 w-8 text-white transition-transform duration-700 ${
              isRefreshing ? 'animate-spin' : 'hover:rotate-180'
            }`}
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" 
              clipRule="evenodd" 
            />
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default NavBar;