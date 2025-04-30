import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { FiBarChart2, FiBell, FiBook, FiCalendar, FiClock, FiMoon, FiSun, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import BottomNavBar from '../components/BottomNavBar';
import { useTheme } from '../context/ThemeContext';
import { fetchStudentTotalAttendance, getStudentClasses } from '../redux/slices/classSlice';

const getGradients = (isDarkMode) => ({
  blue: {
    from: isDarkMode ? 'blue-600' : 'blue-400',
    to: isDarkMode ? 'indigo-800' : 'indigo-600'
  },
  green: {
    from: isDarkMode ? 'emerald-600' : 'emerald-400',
    to: isDarkMode ? 'teal-800' : 'teal-600'
  },
  purple: {
    from: isDarkMode ? 'purple-600' : 'purple-400',
    to: isDarkMode ? 'fuchsia-800' : 'fuchsia-600'
  },
  red: {
    from: isDarkMode ? 'rose-600' : 'rose-400',
    to: isDarkMode ? 'red-800' : 'red-600'
  }
});

const StatCard = ({ icon: Icon, title, value, trend, gradientKey }) => {
  const { isDarkMode } = useTheme();
  const gradients = getGradients(isDarkMode);
  const gradient = gradients[gradientKey];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3.5 rounded-2xl bg-gradient-to-br from-${gradient.from} to-${gradient.to} backdrop-blur-sm border border-${gradient.from}/10`}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-xl bg-white/10">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
          trend > 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
        }`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      </div>
      <h3 className="mt-2.5 text-xl font-bold text-white">
        {value}
      </h3>
      <p className="text-xs text-white/80 mt-0.5">{title}</p>
    </motion.div>
  );
};

StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  trend: PropTypes.number.isRequired,
  gradientKey: PropTypes.string.isRequired
};

const ScheduleCard = ({ time, subject, type, students, code, gradientKey }) => {
  const { isDarkMode } = useTheme();
  const gradients = getGradients(isDarkMode);
  const gradient = gradients[gradientKey];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-2xl bg-gradient-to-br from-${gradient.from} to-${gradient.to} border border-${gradient.from}/10`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">{subject}</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-white/80">
                <FiClock className="w-4 h-4 mr-1" />
                <span className="text-sm">{time}</span>
              </div>
              <div className="flex items-center text-white/80">
                <FiUsers className="w-4 h-4 mr-1" />
                <span className="text-sm">{students} Students</span>
              </div>
            </div>
          </div>
          <span className="px-2 py-1 rounded-lg bg-white/20 text-white text-sm backdrop-blur-sm">
            {code}
          </span>
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-white/80 font-medium">
            {type}
          </span>
          <span className="px-2 py-1 rounded-lg bg-black/20 text-white/90 text-sm backdrop-blur-sm">
            Room 301
          </span>
        </div>
      </div>
    </motion.div>
  );
};

ScheduleCard.propTypes = {
  time: PropTypes.string.isRequired,
  subject: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  students: PropTypes.number.isRequired,
  code: PropTypes.string.isRequired,
  gradientKey: PropTypes.string.isRequired
};

const QuickStat = ({ label, value, icon: Icon, gradientKey }) => {
  const { isDarkMode } = useTheme();
  const gradients = getGradients(isDarkMode);
  const gradient = gradients[gradientKey];

  return (
    <div className={`p-3.5 rounded-2xl bg-gradient-to-br from-${gradient.from} to-${gradient.to} border border-${gradient.from}/10`}>
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-white/10">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-white/80">{label}</p>
          <p className="text-lg font-bold text-white leading-tight mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
};

QuickStat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  gradientKey: PropTypes.string.isRequired
};

const AttendanceChart = ({ data }) => {
  const { isDarkMode } = useTheme();
  return (
    <div className={`p-4 rounded-2xl ${
      isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
    } border`}>
      <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
        Attendance Trend
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDarkMode ? '#4F46E5' : '#6366F1'} stopOpacity={0.4} />
                <stop offset="100%" stopColor={isDarkMode ? '#4F46E5' : '#6366F1'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              tick={{ fill: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 12 }}
              axisLine={{ stroke: isDarkMode ? '#374151' : '#E5E7EB' }}
              tickLine={{ stroke: isDarkMode ? '#374151' : '#E5E7EB' }}
            />
            <YAxis 
              tick={{ fill: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 12 }}
              axisLine={{ stroke: isDarkMode ? '#374151' : '#E5E7EB' }}
              tickLine={{ stroke: isDarkMode ? '#374151' : '#E5E7EB' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                borderRadius: '0.5rem',
                color: isDarkMode ? '#F3F4F6' : '#111827'
              }}
            />
            <Area
              type="monotone"
              dataKey="attendance"
              stroke={isDarkMode ? '#4F46E5' : '#4F46E5'}
              fill="url(#attendanceGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

AttendanceChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    attendance: PropTypes.number.isRequired
  })).isRequired
};

// Add AdvertisementCarousel component
const AdvertisementCarousel = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
    className: 'mb-4',
    appendDots: dots => (
      <div style={{ bottom: '8px' }}>
        <ul>{dots}</ul>
      </div>
    )
  };

  const slides = [
    {
      title: "NeuraCampus",
      description: "Transforming Campuses, Empowering Education 🎓",
      subtext: "AI-driven solutions for smarter campus management",
      bgColor: "from-[#7C3AED] to-[#5B21B6]",
      icon: "🚀"
    },
    {
      title: "Smart Features",
      description: "Proxy-Free Attendance System",
      subtext: "Secure, automated, and tamper-proof tracking",
      bgColor: "from-[#10B981] to-[#059669]",
      icon: "✅"
    },
    {
      title: "AI-Powered",
      description: "Resource Management",
      subtext: "Optimized use of libraries, labs, and learning materials",
      bgColor: "from-[#F59E0B] to-[#D97706]",
      icon: "💡"
    },
    {
      title: "Career Growth",
      description: "Internship & Career Portal",
      subtext: "Connecting students with top industry opportunities",
      bgColor: "from-[#FF7D90] to-[#FF5D73]",
      icon: "🎯"
    },
    {
      title: "Community",
      description: "Smart Networking & Collaboration",
      subtext: "Dynamic space for events and collaborative learning",
      bgColor: "from-[#3B82F6] to-[#2563EB]",
      icon: "🤝"
    }
  ];

  return (
    <div className="mb-4">
      <Slider {...settings}>
        {slides.map((slide, index) => (
          <div key={index} className="px-1">
            <div className={`h-[140px] p-4 rounded-2xl bg-gradient-to-r ${slide.bgColor} text-white relative overflow-hidden`}>
              {/* Background Icon */}
              <div className="absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 opacity-10">
                <span className="text-[100px]">{slide.icon}</span>
              </div>
              
              {/* Content Container */}
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="space-y-1.5">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{slide.icon}</span>
                    <h2 className="text-base font-bold leading-tight">{slide.title}</h2>
                  </div>
                  
                  {/* Description & Subtext */}
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-white/90 line-clamp-1">
                      {slide.description}
                    </p>
                    <p className="text-xs text-white/80 line-clamp-1">
                      {slide.subtext}
                    </p>
                  </div>
                </div>

                {/* Tags - Only on first slide */}
                {index === 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white whitespace-nowrap">
                      #AIinEducation
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white whitespace-nowrap">
                      #SmartCampus
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white whitespace-nowrap">
                      #DigitalTransformation
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

const HomePage = () => {
  const dispatch = useDispatch();
  const { isDarkMode, toggleTheme } = useTheme();
  const user = useSelector((state) => state.auth.user);
  const { classes, totalAttendance, loading } = useSelector((state) => state.class);
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    if (user?.user?._id) {
      dispatch(getStudentClasses(user.user._id))
        .unwrap()
        .then((response) => {
          console.log('Student Classes:', response);
        })
        .catch((error) => {
          console.error('Error fetching classes:', error);
        });

      dispatch(fetchStudentTotalAttendance(user.user._id))
        .unwrap()
        .then((response) => {
          console.log('Total Attendance Data:', response);
        })
        .catch((error) => {
          console.error('Error fetching attendance:', error);
        });
    }
  }, [dispatch, user?.user?._id]);

  // Get today's classes
  const todayClasses = classes?.filter(cls => {
    const today = new Date().getDay();
    return cls.schedule?.some(slot => {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return slot.day.toLowerCase() === days[today];
    });
  }) || [];

  // Get next class
  const getNextClass = () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    return todayClasses.find(cls => {
      return cls.schedule?.some(slot => {
        const [hours, minutes] = slot.timing[0].split(':').map(Number);
        const classTime = hours * 60 + minutes;
        return classTime > currentTime;
      });
    });
  };

  const nextClass = getNextClass();
  const nextClassTime = nextClass?.schedule?.[0]?.timing?.[0] || 'No more classes today';

  // Calculate attendance stats
  const stats = {
    totalClasses: totalAttendance?.totalClasses || '0',
    totalStudents: totalAttendance?.overallStats?.totalStudents || '0',
    avgAttendance: totalAttendance?.overallStats?.attendancePercentage?.toFixed(0) || '0',
    performance: totalAttendance?.overallStats?.performance || '85'
  };

  // Generate sample attendance data for the chart
  const attendanceData = totalAttendance?.classesAttendance?.map(cls => ({
    name: cls.className.split(' ')[0],
    attendance: parseFloat(((cls.lectures.present + cls.labs.present) / 
                        (cls.lectures.total + cls.labs.total) * 100).toFixed(0))
  })) || [];

  // Format class schedule data
  const getScheduleData = () => {
    switch (activeTab) {
      case 'today':
        return todayClasses;
      case 'week':
        return classes || [];
      case 'month':
        return classes || [];
      default:
        return todayClasses;
    }
  };

  const scheduleData = getScheduleData().map(cls => ({
    time: cls.schedule?.[0]?.timing?.[0] || 'N/A',
    subject: cls.className,
    type: cls.type || 'Lecture',
    students: cls.students?.length || 0,
    code: cls.classCode,
    gradientKey: cls.type?.toLowerCase() === 'lab' ? 'green' : 'blue'
  }));

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 ${isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50/30'}`}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header with Welcome and Theme Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Hello, {user?.user?.fullName?.split(' ')[0] || 'User'} 👋
            </h1>
            <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
        </div>

        {/* Advertisement Carousel */}
        <AdvertisementCarousel />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <QuickStat
            label="Today's Classes"
            value={`${todayClasses.length} Classes`}
            icon={FiBook}
            gradientKey="blue"
          />
          <QuickStat
            label="Next Class"
            value={nextClassTime}
            icon={FiClock}
            gradientKey="green"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard
            icon={FiBook}
            title="Total Classes"
            value={stats.totalClasses}
            trend={5}
            gradientKey="blue"
          />
          <StatCard
            icon={FiUsers}
            title="Total Students"
            value={stats.totalStudents}
            trend={2.5}
            gradientKey="green"
          />
          <StatCard
            icon={FiBarChart2}
            title="Avg. Attendance"
            value={`${stats.avgAttendance}%`}
            trend={parseFloat(stats.avgAttendance) >= 75 ? 1.2 : -1.2}
            gradientKey={parseFloat(stats.avgAttendance) >= 75 ? "green" : "red"}
          />
          <StatCard
            icon={FiTrendingUp}
            title="Performance"
            value={`${stats.performance}%`}
            trend={3.1}
            gradientKey="purple"
          />
        </div>

        {/* Attendance Chart */}
        {attendanceData.length > 0 && (
          <div className="mb-8">
            <AttendanceChart data={attendanceData} />
          </div>
        )}

        {/* Schedule Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Class Schedule
            </h2>
            <div className={`flex rounded-2xl p-1 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } text-sm shadow-sm border ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              {['today', 'week', 'month'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    activeTab === tab
                      ? isDarkMode 
                        ? 'bg-gray-700 text-white' 
                        : 'bg-gray-100 text-gray-900'
                      : isDarkMode
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {scheduleData.length > 0 ? (
              scheduleData.map((schedule, index) => (
                <ScheduleCard key={index} {...schedule} />
              ))
            ) : (
              <div className={`text-center py-12 rounded-2xl border ${
                isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'
              }`}>
                No classes scheduled for {activeTab}
              </div>
            )}
          </div>
        </div>

        {/* Attendance Alerts */}
        <div className={`rounded-2xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        } p-6 mb-8`}>
          <h2 className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          } mb-4`}>
            Attendance Alerts
          </h2>
          <div className="space-y-4">
            {totalAttendance?.classesAttendance?.filter(cls => 
              parseFloat(cls.lectures.percentage) < 75 || parseFloat(cls.labs.percentage) < 75
            ).map((cls, index) => (
              <div key={index} className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 border border-rose-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/10">
                      <FiCalendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{cls.className}</p>
                      <p className="text-sm text-white/80">
                        Attendance below threshold
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-black/20 text-white/90 text-sm backdrop-blur-sm">
                    Important
                  </span>
                </div>
              </div>
            ))}
            {(!totalAttendance?.classesAttendance || totalAttendance.classesAttendance.every(cls => 
              parseFloat(cls.lectures.percentage) >= 75 && parseFloat(cls.labs.percentage) >= 75
            )) && (
              <div className={`text-center py-8 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No attendance alerts at this time
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNavBar user={user} />
    </div>
  );
};

export default HomePage; 