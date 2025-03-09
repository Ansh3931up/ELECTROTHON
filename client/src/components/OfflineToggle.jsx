import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getOfflineMode, setOfflineMode, checkNetworkStatus } from '../utils/offlineMode';

const OfflineToggle = ({ onModeChange }) => {
  const [isOffline, setIsOffline] = useState(getOfflineMode());
  const [networkAvailable, setNetworkAvailable] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      const status = await checkNetworkStatus();
      setNetworkAvailable(status);
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    const newMode = !isOffline;
    setIsOffline(newMode);
    setOfflineMode(newMode);
    onModeChange?.(newMode);
  };

  return (
    <div className="flex items-center space-x-2 p-2">
      <button
        onClick={handleToggle}
        className={`px-4 py-2 rounded-lg font-medium ${
          isOffline
            ? 'bg-red-500 text-white'
            : 'bg-green-500 text-white'
        }`}
      >
        {isOffline ? 'Offline Mode' : 'Online Mode'}
      </button>
      {!networkAvailable && (
        <span className="text-red-500 text-sm">
          No network connection available
        </span>
      )}
    </div>
  );
};

OfflineToggle.propTypes = {
  onModeChange: PropTypes.func
};

export default OfflineToggle; 