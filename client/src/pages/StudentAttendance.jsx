import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';

import BottomNavBar from '../components/BottomNavBar';
import { useTheme } from '../context/ThemeContext';
import { fetchStudentTotalAttendance } from '../redux/slices/classSlice';

const StudentAttendance = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const user = useSelector((state) => state.auth.user);
  const { totalAttendance, fetchingTotalAttendance, totalAttendanceError } = useSelector((state) => state.class);

  useEffect(() => {
    if (user?.user?._id) {
      dispatch(fetchStudentTotalAttendance(user.user._id));
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
    return (
      <div className={`min-h-screen p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-800'}`}>
          Error: {totalAttendanceError}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto p-4">
        {/* Overall Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl shadow-lg p-6 mb-6 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}
        >
          <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            Overall Attendance
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Classes</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {totalAttendance?.totalClasses || 0}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Overall Attendance</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {totalAttendance?.overallStats?.attendancePercentage?.toFixed(1) || 0}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Lectures</h3>
              <div className={`space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <p>Total: {totalAttendance?.overallStats?.totalLectures || 0}</p>
                <p>Present: {totalAttendance?.overallStats?.presentLectures || 0}</p>
                <p>Percentage: {((totalAttendance?.overallStats?.presentLectures || 0) / (totalAttendance?.overallStats?.totalLectures || 1) * 100).toFixed(1)}%</p>
              </div>
            </div>
            
            <div>
              <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Labs</h3>
              <div className={`space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <p>Total: {totalAttendance?.overallStats?.totalLabs || 0}</p>
                <p>Present: {totalAttendance?.overallStats?.presentLabs || 0}</p>
                <p>Percentage: {((totalAttendance?.overallStats?.presentLabs || 0) / (totalAttendance?.overallStats?.totalLabs || 1) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Class-wise Stats */}
        <div className="space-y-4">
          <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            Class-wise Attendance
          </h2>
          
          {totalAttendance?.classesAttendance?.map((classData, index) => (
            <motion.div
              key={classData.classId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-lg shadow-md p-4 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`}
            >
              <div className="mb-3">
                <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                  {classData.className}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {classData.classCode}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Lectures
                  </h4>
                  <div className={`space-y-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p>Present: {classData.lectures.present}/{classData.lectures.total}</p>
                    <p>Percentage: {classData.lectures.percentage.toFixed(1)}%</p>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${classData.lectures.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Labs
                  </h4>
                  <div className={`space-y-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p>Present: {classData.labs.present}/{classData.labs.total}</p>
                    <p>Percentage: {classData.labs.percentage.toFixed(1)}%</p>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${classData.labs.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <BottomNavBar user={user} />
    </div>
  );
};

export default StudentAttendance; 