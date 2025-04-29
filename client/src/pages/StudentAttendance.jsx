import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { FiAlertTriangle, FiBarChart2, FiCheckCircle, FiClock, FiUsers } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';

import BottomNavBar from '../components/BottomNavBar';
import { useTheme } from '../context/ThemeContext';
import { fetchStudentTotalAttendance } from '../redux/slices/classSlice';

const ATTENDANCE_THRESHOLD = 75;

const AttendanceIndicator = ({ percentage, size = 'large', showIcon = true }) => {
  const { isDarkMode } = useTheme();
  const isLow = percentage < ATTENDANCE_THRESHOLD;
  
  const getColor = (percent) => {
    if (percent >= 90) return 'bg-gradient-to-br from-green-400 to-green-600';
    if (percent >= ATTENDANCE_THRESHOLD) return 'bg-gradient-to-br from-blue-400 to-blue-600';
    if (percent >= 60) return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
    return 'bg-gradient-to-br from-red-400 to-red-600';
  };

  const sizeClasses = {
    large: 'w-28 h-28 text-2xl',
    medium: 'w-20 h-20 text-xl',
    small: 'w-16 h-16 text-sm'
  };

  return (
    <div className={`relative ${sizeClasses[size]} bg-transparent rounded-full shadow-lg`}>
      <div className={`absolute inset-0 rounded-full bg-transparent `}></div>
      <div 
        className={`absolute inset-0 rounded-full ${getColor(percentage)} transition-all duration-1000 ease-out`}
        style={{ 
          clipPath: `polygon(50% 50%, -50% -50%, ${percentage > 75 ? '150%' : percentage * 2}% -50%)`,
          transform: 'rotate(-90deg)',
        }}
      ></div>
      <div className={`absolute inset-1.5 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'} flex items-center justify-center shadow-inner`}>
        <span className={`font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      {showIcon && isLow && (
        <div className="absolute -top-1 -right-1">
          <div className={`p-1.5 rounded-full shadow-lg ${isDarkMode ? 'bg-red-500 text-white' : 'bg-red-500 text-white'} animate-pulse`}>
            <FiAlertTriangle size={size === 'large' ? 16 : 12} />
          </div>
        </div>
      )}
    </div>
  );
};

AttendanceIndicator.propTypes = {
  percentage: PropTypes.number.isRequired,
  size: PropTypes.oneOf(['large', 'medium', 'small']),
  showIcon: PropTypes.bool
};

const ClassCard = ({ classData }) => {
  const { isDarkMode } = useTheme();
  const avgAttendance = (classData.lectures.percentage + classData.labs.percentage) / 2;
  const isLow = avgAttendance < ATTENDANCE_THRESHOLD;

  const getGradientClass = () => {
    if (avgAttendance >= 90) return 'from-emerald-400 to-teal-500';
    if (avgAttendance >= ATTENDANCE_THRESHOLD) return 'from-blue-400 to-indigo-500';
    if (avgAttendance >= 60) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-pink-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-2xl shadow-lg ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}
    >
      <div className={`p-4 bg-gradient-to-r ${getGradientClass()}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              {classData.className}
            </h3>
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-white/90">
                <FiClock className="w-4 h-4 mr-1" />
                <span className="text-sm">Mon: 4:00</span>
              </div>
              <div className="flex items-center text-white/90">
                <FiUsers className="w-4 h-4 mr-1" />
                <span className="text-sm">{classData.classCode}</span>
              </div>
            </div>
          </div>
          <AttendanceIndicator percentage={avgAttendance} size="small" showIcon={false} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-xl ${
            isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Lectures
              </span>
              <span className={`text-sm font-bold ${
                classData.lectures.percentage < ATTENDANCE_THRESHOLD
                  ? 'text-red-500'
                  : isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {classData.lectures.percentage.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  classData.lectures.percentage >= ATTENDANCE_THRESHOLD
                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                    : 'bg-gradient-to-r from-red-400 to-red-500'
                }`}
                style={{ width: `${classData.lectures.percentage}%` }}
              />
            </div>
            <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {classData.lectures.present}/{classData.lectures.total} classes
            </p>
          </div>

          <div className={`p-3 rounded-xl ${
            isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Labs
              </span>
              <span className={`text-sm font-bold ${
                classData.labs.percentage < ATTENDANCE_THRESHOLD
                  ? 'text-red-500'
                  : isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                {classData.labs.percentage.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  classData.labs.percentage >= ATTENDANCE_THRESHOLD
                    ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                    : 'bg-gradient-to-r from-red-400 to-red-500'
                }`}
                style={{ width: `${classData.labs.percentage}%` }}
              />
            </div>
            <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {classData.labs.present}/{classData.labs.total} labs
            </p>
          </div>
        </div>

        {isLow && (
          <div className="flex items-center p-2 rounded-lg bg-red-500/10">
            <FiAlertTriangle className="text-red-500 mr-2" />
            <p className="text-sm text-red-500">
              Attendance below {ATTENDANCE_THRESHOLD}% threshold
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

ClassCard.propTypes = {
  classData: PropTypes.shape({
    className: PropTypes.string.isRequired,
    classCode: PropTypes.string.isRequired,
    lectures: PropTypes.shape({
      percentage: PropTypes.number.isRequired,
      present: PropTypes.number.isRequired,
      total: PropTypes.number.isRequired
    }).isRequired,
    labs: PropTypes.shape({
      percentage: PropTypes.number.isRequired,
      present: PropTypes.number.isRequired,
      total: PropTypes.number.isRequired
    }).isRequired
  }).isRequired
};

const StudentAttendance = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const user = useSelector((state) => state.auth.user);
  const { totalAttendance, fetchingTotalAttendance, totalAttendanceError } = useSelector((state) => state.class);

  useEffect(() => {
    if (user?.user?._id) {
      dispatch(fetchStudentTotalAttendance(user.user._id))
        .then((response) => {
          console.log('Total Attendance Data:', response.payload);
        })
        .catch((error) => {
          console.error('Error fetching attendance:', error);
        });
    }
  }, [dispatch, user?.user?._id]);

  if (fetchingTotalAttendance) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (totalAttendanceError) {
    console.error('Attendance Error:', totalAttendanceError);
    return (
      <div className={`min-h-screen p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-800'}`}>
          Error: {totalAttendanceError}
        </div>
      </div>
    );
  }

  const overallPercentage = totalAttendance?.overallStats?.attendancePercentage || 0;
  const lecturePercentage = ((totalAttendance?.overallStats?.presentLectures || 0) / (totalAttendance?.overallStats?.totalLectures || 1) * 100);
  const labPercentage = ((totalAttendance?.overallStats?.presentLabs || 0) / (totalAttendance?.overallStats?.totalLabs || 1) * 100);

  console.log('Overall Stats:', {
    overallPercentage,
    lecturePercentage,
    labPercentage,
    totalClasses: totalAttendance?.totalClasses
  });

  return (
    <div className={`min-h-screen pb-24 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto p-4">
        {/* Main Stats Card */}
        <div className={`mb-6 overflow-hidden rounded-2xl shadow-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className={`p-6 bg-gradient-to-r ${
            overallPercentage >= ATTENDANCE_THRESHOLD
              ? 'from-blue-500 to-indigo-600'
              : 'from-red-500 to-pink-600'
          }`}>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <AttendanceIndicator percentage={overallPercentage} />
              <div className="flex-grow text-center sm:text-left">
                <h1 className="text-2xl font-bold text-white mb-4">
                  Overall Attendance
                </h1>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FiBarChart2 className="text-white mr-2" />
                        <span className="text-white font-medium">Lectures</span>
                      </div>
                      <span className={`font-bold ${
                        lecturePercentage < ATTENDANCE_THRESHOLD ? 'text-red-200' : 'text-white'
                      }`}>
                        {lecturePercentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FiCheckCircle className="text-white mr-2" />
                        <span className="text-white font-medium">Labs</span>
                      </div>
                      <span className={`font-bold ${
                        labPercentage < ATTENDANCE_THRESHOLD ? 'text-red-200' : 'text-white'
                      }`}>
                        {labPercentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {overallPercentage < ATTENDANCE_THRESHOLD && (
            <div className="p-4 bg-red-500/10">
              <div className="flex items-center">
                <FiAlertTriangle className="text-red-500 mr-2" />
                <p className="text-sm text-red-500">
                  Your attendance is below the required {ATTENDANCE_THRESHOLD}% threshold. Please improve your attendance to avoid academic issues.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Class Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {totalAttendance?.classesAttendance?.map((classData) => (
            <ClassCard key={classData.classId} classData={classData} />
          ))}
        </div>
      </div>
      <BottomNavBar user={user} />
    </div>
  );
};

export default StudentAttendance; 