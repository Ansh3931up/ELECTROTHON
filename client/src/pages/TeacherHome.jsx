import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import { 
  FiBarChart2,
  FiBook,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiUsers} from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import Slider from 'react-slick';

import { useTheme } from '../context/ThemeContext';
import { fetchTeacherDashboard } from '../redux/slices/classSlice';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Welcome section component with updated styling
const WelcomeSection = ({ isDarkMode, teacherName = "Teacher" }) => (
  <div className="mb-4">
    <div className="flex items-center gap-2">
      <h1 className={`text-3xl md:text-2xl font-bold ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Hello 👋 {teacherName}
      </h1>
    </div>
    <p className={`mt-1 text-xs md:text-sm ${
      isDarkMode ? 'text-gray-400' : 'text-gray-600'
    }`}>
      Here&apos;s what&apos;s happening in your classes
    </p>
  </div>
);

WelcomeSection.propTypes = {
  isDarkMode: PropTypes.bool.isRequired,
  teacherName: PropTypes.string
};

// Update color palette for a more modern look
const cardColors = {
  students: { 
    bg: 'bg-gradient-to-br from-[#FF7D90] to-[#FF5D73]', 
    icon: 'bg-pink-400/20',
    border: 'border-pink-400/20'
  },
  classes: { 
    bg: 'bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]', 
    icon: 'bg-purple-400/20',
    border: 'border-purple-400/20'
  },
  attendance: { 
    bg: 'bg-gradient-to-br from-[#10B981] to-[#059669]', 
    icon: 'bg-emerald-400/20',
    border: 'border-emerald-400/20'
  },
  sessions: { 
    bg: 'bg-gradient-to-br from-[#F59E0B] to-[#D97706]', 
    icon: 'bg-amber-400/20',
    border: 'border-amber-400/20'
  }
};

const StatCard = ({ title, value, icon, type }) => (
  <div className={`p-4 rounded-2xl shadow-lg ${cardColors[type].bg} transform transition-all duration-300 hover:scale-102 hover:-translate-y-1 relative overflow-hidden`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
    <div className="flex items-center space-x-3 relative z-10">
      <div className={`p-2.5 rounded-xl ${cardColors[type].icon} backdrop-blur-sm`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-white/90 mb-1">
          {title}
        </p>
        <p className="text-lg font-bold text-white">
          {value}
        </p>
      </div>
    </div>
  </div>
);

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['students', 'classes', 'attendance', 'sessions']).isRequired
};

const ScheduleCard = ({ classInfo, isDarkMode }) => (
  <div className={`p-5 rounded-2xl shadow-xl ${
    isDarkMode ? 'bg-gray-800/90 backdrop-blur border border-gray-700/50' : 'bg-white border border-gray-100'
  } transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}>
    <div className="flex items-center justify-between">
      <div className="w-full">
        <h3 className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {classInfo.className}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium shadow-sm">
            {classInfo.classCode}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-medium shadow-sm">
            {classInfo.batch}
          </span>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium shadow-sm ${
            classInfo.status === 'active' 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {classInfo.status}
          </span>
        </div>
        <div className="mt-4">
          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {classInfo.studentCount} Students
          </p>
          <div className="mt-3 space-y-2">
            {classInfo.schedule.map((slot, index) => (
              <p key={index} className={`text-sm flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <FiClock className="mr-3 h-4 w-4 text-blue-500" />
                {slot.day}: {slot.timing.join(', ')}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

ScheduleCard.propTypes = {
  classInfo: PropTypes.shape({
    className: PropTypes.string.isRequired,
    classCode: PropTypes.string.isRequired,
    batch: PropTypes.string.isRequired,
    studentCount: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    schedule: PropTypes.arrayOf(PropTypes.shape({
      day: PropTypes.string.isRequired,
      timing: PropTypes.arrayOf(PropTypes.string).isRequired
    })).isRequired
  }).isRequired,
  isDarkMode: PropTypes.bool.isRequired
};

const ExpandableSection = ({ title, children, isDarkMode }) => {
  return (
    <div className={`mb-6 rounded-2xl overflow-hidden ${
      isDarkMode 
        ? 'bg-white/5 border border-white/5' 
        : 'bg-white border border-gray-100/80 shadow-lg shadow-gray-100/50'
    }`}>
      <div className={`w-full p-4 ${
        isDarkMode ? 'bg-white/5' : 'bg-gray-50/50'
      }`}>
        <h3 className={`text-sm font-semibold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  );
};

ExpandableSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  isDarkMode: PropTypes.bool.isRequired
};

const RecentActivityCard = ({ activity, isDarkMode }) => (
  <div className={`p-4 rounded-2xl ${
    isDarkMode 
      ? 'bg-white/10 backdrop-blur-sm border border-white/5' 
      : 'bg-white border border-gray-100/80 shadow-lg shadow-gray-100/50'
  } transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1`}>
    <div className="flex items-start space-x-3">
      <div className={`p-2 rounded-xl shrink-0 ${
        activity.type === 'lecture' 
          ? 'bg-gradient-to-br from-[#7C3AED]/10 to-[#5B21B6]/10 text-[#7C3AED]' 
          : 'bg-gradient-to-br from-[#F59E0B]/10 to-[#D97706]/10 text-[#F59E0B]'
      }`}>
        <FiCalendar className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm`}>
            {activity.className}
          </h4>
          <span className={`text-xs px-2 py-1 rounded-full ml-2 font-medium ${
            activity.type === 'lecture' 
              ? 'bg-[#7C3AED]/10 text-[#7C3AED]' 
              : 'bg-[#F59E0B]/10 text-[#F59E0B]'
          }`}>
            {activity.type}
          </span>
        </div>
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {new Date(activity.date).toLocaleDateString()}
        </p>
        <div className="mt-2">
          <div className="flex items-center">
            <div className="flex-1 h-2 bg-gray-200/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#10B981] to-[#059669] rounded-full"
                style={{ width: `${(activity.attendance.present/activity.attendance.total) * 100}%` }}
              />
            </div>
            <span className={`ml-2 text-xs font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {((activity.attendance.present/activity.attendance.total) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

RecentActivityCard.propTypes = {
  activity: PropTypes.shape({
    className: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    attendance: PropTypes.shape({
      present: PropTypes.number.isRequired,
      total: PropTypes.number.isRequired
    }).isRequired
  }).isRequired,
  isDarkMode: PropTypes.bool.isRequired
};

const ClassAttendanceCard = ({ classData, isDarkMode }) => {
  const getColorClass = (percentage) => {
    if (percentage >= 75) return 'from-[#10B981] to-[#059669]';
    if (percentage >= 60) return 'from-[#F59E0B] to-[#D97706]';
    return 'from-[#EF4444] to-[#DC2626]';
  };

  const getTextColorClass = (percentage) => {
    if (percentage >= 75) return 'text-[#10B981]';
    if (percentage >= 60) return 'text-[#F59E0B]';
    return 'text-[#EF4444]';
  };

  return (
    <div className={`p-4 rounded-2xl ${
      isDarkMode 
        ? 'bg-white/10 backdrop-blur-sm border border-white/5' 
        : 'bg-white border border-gray-100/80 shadow-lg shadow-gray-100/50'
    } transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1`}>
      <div className="flex items-center justify-between">
        <h4 className={`font-semibold text-sm truncate mr-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {classData.className}
        </h4>
        <span className={`text-sm font-bold shrink-0 ${getTextColorClass(classData.percentage)}`}>
          {classData.percentage.toFixed(1)}%
        </span>
      </div>
      <div className="mt-2">
        <div className="h-2 bg-gray-200/30 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getColorClass(classData.percentage)} rounded-full transition-all duration-300`}
            style={{ width: `${classData.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

ClassAttendanceCard.propTypes = {
  classData: PropTypes.shape({
    className: PropTypes.string.isRequired,
    present: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    percentage: PropTypes.number.isRequired
  }).isRequired,
  isDarkMode: PropTypes.bool.isRequired
};

// Carousel Component
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

// Charts Component
const DashboardCharts = ({ dashboardData, isDarkMode }) => {
  const attendanceData = {
    labels: dashboardData.attendanceStats.byClass.map(cls => cls.className),
    datasets: [
      {
        label: 'Attendance %',
        data: dashboardData.attendanceStats.byClass.map(cls => cls.percentage),
        backgroundColor: [
          '#FF7D90',  // Pink
          '#7C3AED',  // Purple
          '#10B981',  // Green
          '#3B82F6',  // Blue
        ],
        borderWidth: 0,
      },
    ],
  };

  const attendanceHistory = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Average Attendance',
        data: [75, 82, 78, 85],
        borderColor: '#7C3AED',
        backgroundColor: '#7C3AED20',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDarkMode ? '#fff' : '#000',
          font: {
            size: 12,
          },
          padding: 20,
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#000',
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#000',
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className={`p-4 rounded-2xl ${
        isDarkMode 
          ? 'bg-[#1E1E2D] border border-gray-800' 
          : 'bg-white border border-gray-100 shadow-lg'
      }`}>
        <h3 className={`text-sm font-semibold mb-4 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Class Attendance Distribution
        </h3>
        <div className="h-[300px] flex items-center justify-center">
          <Pie data={attendanceData} options={pieOptions} />
        </div>
      </div>

      <div className={`p-4 rounded-2xl ${
        isDarkMode 
          ? 'bg-[#1E1E2D] border border-gray-800' 
          : 'bg-white border border-gray-100 shadow-lg'
      }`}>
        <h3 className={`text-sm font-semibold mb-4 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Attendance Trend
        </h3>
        <div className="h-[300px] flex items-center justify-center">
          <Line data={attendanceHistory} options={lineOptions} />
        </div>
      </div>
    </div>
  );
};

DashboardCharts.propTypes = {
  dashboardData: PropTypes.object.isRequired,
  isDarkMode: PropTypes.bool.isRequired
};

const TeacherHome = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const { data: dashboardData, loading, error } = useSelector((state) => state.class.dashboard);

  useEffect(() => {
    dispatch(fetchTeacherDashboard());
  }, [dispatch]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen p-3 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`p-3 rounded-xl ${
          isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-800'
        }`}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className={`min-h-screen p-4 ${
      isDarkMode ? 'bg-[#151521]/30 text-white' : 'bg-gray-50/30 text-gray-900'
    }`}>
      <div>
        {/* Welcome Section - Now above carousel */}
        <WelcomeSection isDarkMode={isDarkMode} teacherName={dashboardData.teacherName} />

        {/* Advertisement Carousel */}
        <AdvertisementCarousel />
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Total Students"
          value={dashboardData.overview.totalStudents}
          icon={<FiUsers className="w-4 h-4 text-white" />}
          type="students"
        />
        <StatCard
          title="Active Classes"
          value={`${dashboardData.overview.activeClasses}/${dashboardData.overview.totalClasses}`}
          icon={<FiBook className="w-4 h-4 text-white" />}
          type="classes"
        />
        <StatCard
          title="Attendance"
          value={`${dashboardData.attendanceStats.overall.percentage.toFixed(0)}%`}
          icon={<FiCheckCircle className="w-4 h-4 text-white" />}
          type="attendance"
        />
        <StatCard
          title="Sessions"
          value={dashboardData.overview.totalAttendanceSessions}
          icon={<FiBarChart2 className="w-4 h-4 text-white" />}
          type="sessions"
        />
      </div>

      {/* Charts Section */}
      <div className="max-w-6xl mx-auto">
        <DashboardCharts dashboardData={dashboardData} isDarkMode={isDarkMode} />
      </div>

      {/* Activity and Class Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ExpandableSection title="Recent Activity" isDarkMode={isDarkMode}>
            <div className="space-y-2">
              {dashboardData.recentActivity.lastAttendanceSessions.slice(0, 3).map((activity, index) => (
                <RecentActivityCard
                  key={index}
                  activity={activity}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          </ExpandableSection>
        </div>
        <div>
          <ExpandableSection title="Class Attendance" isDarkMode={isDarkMode}>
            <div className="space-y-2">
              {dashboardData.attendanceStats.byClass
                .filter(cls => cls.total > 0)
                .map((classData, index) => (
                  <ClassAttendanceCard
                    key={index}
                    classData={classData}
                    isDarkMode={isDarkMode}
                  />
                ))}
            </div>
          </ExpandableSection>
        </div>
      </div>

      {/* Class Details */}
      <ExpandableSection title="Class Details" isDarkMode={isDarkMode}>
        <div className="grid grid-cols-1 gap-2">
          {dashboardData.classDetails.map((classInfo, index) => (
            <ScheduleCard
              key={index}
              classInfo={classInfo}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </ExpandableSection>
    </div>
  );
};

export default TeacherHome; 