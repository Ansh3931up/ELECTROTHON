import { useEffect, useState } from 'react';
import { FiCalendar, FiClock } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';

import Loading from '../components/Loading';
import { useTheme } from '../context/ThemeContext';
import { fetchTeacherSchedule } from '../redux/slices/classSlice';

// Define the structure for the timetable
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Define hourly time slots (adjust range as needed)
const timeSlots = Array.from({ length: 10 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`); // 08:00 to 17:00

// Function to get today's day name
const getTodayDayName = () => {
    const today = new Date();
    const dayIndex = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    // Convert to our daysOfWeek array index (which starts with Monday at index 0)
    return daysOfWeek[dayIndex === 0 ? 6 : dayIndex - 1];
};

// Helper to parse time string "HH:MM" or "H:MM" to minutes since midnight for sorting
const timeToMinutes = (timeStr) => {
    const match = timeStr?.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return Infinity; // Invalid format sorts last
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
};

// Helper to format time array
const formatCardTiming = (timingArray) => {
    if (!timingArray || timingArray.length === 0) return 'N/A';
    // Simple HH:MM join
    return timingArray.map(t => t.startsWith('0') ? t.substring(1) : t).join(' | '); // Remove leading zero for display
};

// Helper to get formatted date range for a week
const getWeekDateRange = (weekOffset = 0) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
    // Calculate the date of the Monday of the current week
    const monday = new Date(today);
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // If today is Sunday, go back 6 days
    monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
    
    // Calculate the date of the Sunday of the current week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // Format dates as Month DD
    const formatDate = (date) => {
        const month = date.toLocaleString('default', { month: 'short' });
        const day = date.getDate();
        return `${month} ${day}`;
    };
    
    return {
        monday,
        sunday,
        formatted: `${formatDate(monday)} - ${formatDate(sunday)}`
    };
};

const TeacherTimetable = () => {
    const dispatch = useDispatch();
    const { isDarkMode } = useTheme();
    const { data: scheduleData, loading, error } = useSelector((state) => state.class.teacherSchedule);
    
    // --- State for View Mode and Week Navigation ---
    const [viewMode] = useState('grid'); // Default to 'grid' view
    const [weekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
    
    // Get today's day name
    const todayDay = getTodayDayName();
    
    // Set today as default selected day
    const [selectedDay, setSelectedDay] = useState(todayDay);
    
    // Current week date range
    const weekRange = getWeekDateRange(weekOffset);

    useEffect(() => {
        dispatch(fetchTeacherSchedule());
    }, [dispatch]);

    // --- Transform data for CARD view ---
    const transformScheduleForCards = (classes) => {
        const groupedByDay = daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: [] }), {});
        if (!Array.isArray(classes)) return groupedByDay;
        classes.forEach(cls => {
            if (Array.isArray(cls.schedule)) {
                cls.schedule.forEach(slot => {
                    if (slot.day && Array.isArray(slot.timing) && slot.timing.length > 0 && groupedByDay[slot.day]) {
                        const earliestTime = slot.timing.reduce((min, current) => Math.min(min, timeToMinutes(current)), Infinity);
                        groupedByDay[slot.day].push({
                            id: cls._id + '-' + slot.day + '-' + earliestTime,
                            className: cls.className,
                            timing: slot.timing,
                            status: cls.status || 'active',
                            startTimeMinutes: earliestTime,
                        });
                    }
                });
            }
        });
        Object.keys(groupedByDay).forEach(day => groupedByDay[day].sort((a, b) => a.startTimeMinutes - b.startTimeMinutes));
        return groupedByDay;
    };

    // --- Transform data for TABLE view ---
    const transformScheduleForTable = (classes) => {
        const grid = daysOfWeek.reduce((acc, day) => {
            acc[day] = timeSlots.reduce((timeAcc, slot) => ({ ...timeAcc, [slot]: null }), {});
            return acc;
        }, {});
        if (!Array.isArray(classes)) return grid;
        classes.forEach(cls => {
            if (Array.isArray(cls.schedule)) {
                cls.schedule.forEach(slot => {
                    if (slot.day && Array.isArray(slot.timing) && grid[slot.day]) {
                        slot.timing.forEach(time => {
                            const hourMatch = time.match(/^(\d{1,2}):\d{2}$/);
                            if (hourMatch) {
                                const hour = hourMatch[1];
                                const slotKey = `${String(hour).padStart(2, '0')}:00`;
                                if (Object.prototype.hasOwnProperty.call(grid[slot.day], slotKey) && grid[slot.day][slotKey] === null) {
                                    grid[slot.day][slotKey] = {
                                        className: cls.className,
                                        status: cls.status || 'active',
                                        fullTiming: slot.timing.join(', '),
                                    };
                                } else if (Object.prototype.hasOwnProperty.call(grid[slot.day], slotKey)) {
                                    console.warn(`Time slot clash detected: ${slot.day} ${slotKey} already filled.`);
                                }
                            } else {
                                console.warn(`Invalid time format detected: "${time}" in class "${cls.className}"`);
                            }
                        });
                    }
                });
            }
        });
        return grid;
    };

    // --- FIX: Choose data transformation based on viewMode ---
    const timetableData = viewMode === 'grid'
        ? transformScheduleForCards(scheduleData)
        : transformScheduleForTable(scheduleData);
    // ---------------------------------------------------------

    // Get filtered days based on selection
    const getFilteredDays = () => {
        // If selectedDay is set, only show that day
        if (selectedDay) {
            return [selectedDay];
        }
        return daysOfWeek.filter(day => day !== 'Sunday');
    };

    if (loading) return <Loading message="Loading schedule..." />;

    // Define reusable transition classes
    const transitionClasses = 'transition-all duration-300 ease-in-out';
    const hoverScaleClasses = 'hover:scale-105 transform';
    const commonCardClasses = 'rounded-lg p-3 cursor-default relative overflow-hidden';

    // Enhanced day gradients with more vibrant colors
    const getDayGradient = (day) => {
        if (isDarkMode) {
            switch (day) {
                case 'Monday': return 'from-blue-700 via-blue-600 to-blue-800';
                case 'Tuesday': return 'from-cyan-700 via-cyan-600 to-cyan-800';
                case 'Wednesday': return 'from-emerald-700 via-emerald-600 to-emerald-800';
                case 'Thursday': return 'from-amber-700 via-amber-600 to-amber-800';
                case 'Friday': return 'from-red-700 via-red-600 to-red-800';
                case 'Saturday': return 'from-fuchsia-700 via-fuchsia-600 to-fuchsia-800';
                case 'Sunday': return 'from-indigo-700 via-indigo-600 to-indigo-800';
                default: return 'from-gray-800 via-gray-700 to-gray-900';
            }
        } else {
            switch (day) {
                case 'Monday': return 'from-violet-500 via-purple-400 to-indigo-500';
                case 'Tuesday': return 'from-blue-500 via-cyan-400 to-sky-500';
                case 'Wednesday': return 'from-emerald-500 via-green-400 to-teal-500';
                case 'Thursday': return 'from-amber-400 via-orange-400 to-yellow-500';
                case 'Friday': return 'from-red-500 via-rose-400 to-pink-500';
                case 'Saturday': return 'from-fuchsia-500 via-purple-400 to-violet-500';
                case 'Sunday': return 'from-indigo-500 via-blue-400 to-cyan-500';
                default: return 'from-gray-500 via-slate-400 to-gray-500';
            }
        }
    };

    // Enhanced styles for day tabs
    const getDayTabStyle = (day) => {
        const isSelected = day === selectedDay;
        const isToday = day === todayDay;
        
        // Base classes
        let classes = `px-4 py-2.5 rounded-xl text-sm font-medium relative ${transitionClasses}`;
        
        // Selection state
        if (isSelected) {
            classes += isDarkMode 
                ? ` bg-gradient-to-r ${getDayGradient(day)} text-white shadow-lg shadow-${day.toLowerCase()}-900/30` 
                : ` bg-gradient-to-r ${getDayGradient(day)} text-white shadow-md`;
        } else {
            classes += isDarkMode 
                ? ' bg-black/80 text-gray-300 hover:bg-gray-900/90 hover:shadow-md' 
                : ' bg-white/80 text-gray-700 hover:bg-gray-50 hover:shadow-sm';
        }
        
        // Today indicator
        if (isToday && !isSelected) {
            classes += isDarkMode 
                ? ' ring-2 ring-green-500/50 ring-offset-1 ring-offset-black/10' 
                : ' ring-2 ring-green-500/50 ring-offset-1 ring-offset-gray-100/10';
        }
        
        return classes;
    };

    // Enhanced card status styles with glass effect
    const getCardStatusIndicator = (status) => {
        switch (status) {
            case 'active':
                return {
                    cardClasses: `${commonCardClasses} bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-600 text-white ${hoverScaleClasses} shadow-lg shadow-indigo-500/20 border border-indigo-500/20`,
                    textClass: 'text-white/90',
                    timeClass: 'text-white/75'
                };
            case 'inactive':
                return {
                    cardClasses: `${commonCardClasses} ${isDarkMode ? 'bg-gray-700/60 shadow-inner border border-gray-600/40' : 'bg-gray-100/80 shadow-inner border border-gray-200/70'} ${hoverScaleClasses}`,
                    textClass: isDarkMode ? 'text-gray-300' : 'text-gray-600',
                    timeClass: isDarkMode ? 'text-gray-400' : 'text-gray-500'
                };
            case 'archived':
                return {
                    cardClasses: `${commonCardClasses} ${isDarkMode ? 'bg-gray-800/30 border-gray-700/40' : 'bg-gray-50/60 border-gray-200/50'} opacity-70 ${hoverScaleClasses}`,
                    textClass: isDarkMode ? 'text-gray-400' : 'text-gray-500',
                    timeClass: isDarkMode ? 'text-gray-500' : 'text-gray-400'
                };
            default:
                return {
                    cardClasses: `${commonCardClasses} ${isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-gray-200/80'} ${hoverScaleClasses}`,
                    textClass: isDarkMode ? 'text-gray-300' : 'text-gray-700',
                    timeClass: isDarkMode ? 'text-gray-400' : 'text-gray-500'
                };
        }
    };

    // Filtered days
    const filteredDays = getFilteredDays();

    // --- Table Style Helpers ---
    const getTableCellStyles = (status) => {
        // Base styles for all cells
        const baseStyle = {
            transition: 'all 0.3s ease',
            borderRadius: '8px',
            position: 'relative',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            fontWeight: '500',
            textAlign: 'center',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '10px',
            margin: '4px',
            minHeight: '80px'
        };

        // Status-specific styles
        if (status === 'free') {
            return {
                ...baseStyle,
                backgroundColor: 'rgba(72, 187, 120, 0.08)',
                color: '#2F855A',
                border: '1px solid rgba(72, 187, 120, 0.3)',
                '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 6px 12px rgba(72, 187, 120, 0.15)',
                    backgroundColor: 'rgba(72, 187, 120, 0.12)',
                }
            };
        } 
        else if (status === 'occupied') {
            return {
                ...baseStyle,
                backgroundColor: 'rgba(229, 62, 62, 0.08)',
                color: '#C53030',
                border: '1px solid rgba(229, 62, 62, 0.3)',
                '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 6px 12px rgba(229, 62, 62, 0.15)',
                    backgroundColor: 'rgba(229, 62, 62, 0.12)',
                }
            };
        } 
        else {
            return {
                ...baseStyle,
                backgroundColor: 'rgba(160, 174, 192, 0.08)',
                color: '#4A5568',
                border: '1px solid rgba(160, 174, 192, 0.3)',
                '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 6px 12px rgba(160, 174, 192, 0.15)',
                    backgroundColor: 'rgba(160, 174, 192, 0.12)',
                }
            };
        }
    };

    const getTimeSlotCellStyle = () => {
        return {
            backgroundColor: 'rgba(66, 153, 225, 0.08)',
            color: '#2B6CB0',
            fontWeight: '600',
            padding: '10px',
            borderRadius: '8px',
            margin: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            border: '1px solid rgba(66, 153, 225, 0.3)',
            minHeight: '60px'
        };
    };

    const getHeaderCellStyle = () => {
        return {
            backgroundColor: 'rgba(49, 130, 206, 0.1)',
            color: '#2C5282',
            fontWeight: '700',
            padding: '12px',
            borderRadius: '8px',
            margin: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.875rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            border: '1px solid rgba(49, 130, 206, 0.3)',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };
    };

    return (
        <div className={`min-h-screen pb-20 pt-4  bg-transparent`}>
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                {/* Day Selector Tabs - Horizontal scrollable row */}
                <div className="flex items-center overflow-x-auto pb-2 mb-6 hide-scrollbar border-b border-gray-200 dark:border-gray-800">
                    {
                        daysOfWeek.map(day => {
                            const isToday = day === todayDay;
                            // Get the date for this day of the week
                            const dayIndex = daysOfWeek.indexOf(day);
                            const dayDate = new Date(weekRange.monday);
                            dayDate.setDate(weekRange.monday.getDate() + dayIndex);
                            const dateNum = dayDate.getDate();
                            
                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={getDayTabStyle(day)}
                                >
                                    <span className="block text-center">{day}</span>
                                    <span className="block text-center text-xs mt-1 opacity-80">{dateNum}</span>
                                    
                                    {/* Today badge with improved animation */}
                                    {isToday && (
                                        <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full shadow-lg
                                            ${isDarkMode 
                                                ? 'bg-green-500 text-white animate-pulse shadow-green-500/30' 
                                                : 'bg-green-500 text-white animate-pulse shadow-green-500/30'}`}>
                                            Today
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    }
                </div>

                {error && (
                     <div className={`p-4 mb-6 text-sm rounded-lg border backdrop-blur-sm ${isDarkMode ? 'text-red-300 bg-red-900/30 border-red-700/50' : 'text-red-700 bg-red-50/90 border-red-300'}`} role="alert">
                         <span className="font-medium">Error:</span> {error}
                     </div>
                )}

                {/* Conditional Rendering based on viewMode */}
                {viewMode === 'grid' ? (
                    /* --- Card Grid View --- */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-6">
                        {filteredDays.map((day) => {
                            const classesForDay = timetableData[day] || [];
                            // Get the date for this day of the week
                            const dayIndex = daysOfWeek.indexOf(day);
                            const dayDate = new Date(weekRange.monday);
                            dayDate.setDate(weekRange.monday.getDate() + dayIndex);
                            const formattedDate = dayDate.getDate();
                            const isToday = day === todayDay;
                            
                            return (
                                <div key={day} className={`rounded-2xl border flex flex-col min-h-[200px] backdrop-blur-sm ${transitionClasses} ${hoverScaleClasses} ${
                                    isDarkMode 
                                        ? 'bg-gray-900/90 border-gray-800/90 shadow-lg shadow-black/30 hover:shadow-xl hover:shadow-black/40' 
                                        : 'bg-white/90 border-gray-200/90 shadow-xl shadow-gray-400/30 hover:shadow-2xl hover:shadow-gray-400/40'
                                }`}>
                                    <h3 className={`text-lg font-bold px-5 py-3 border-b bg-gradient-to-r ${getDayGradient(day)} relative
                                        ${isDarkMode 
                                            ? 'border-gray-800 text-white rounded-t-2xl' 
                                            : 'border-gray-200/80 text-white rounded-t-2xl'
                                        }`}>
                                        {day} <span className="text-sm ml-1 opacity-80">{formattedDate}</span>
                                        
                                        {/* Improved today indicator in card header */}
                                        {isToday && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs bg-white/20 text-white rounded-full shadow-inner backdrop-blur-sm">
                                                Today
                                            </span>
                                        )}
                                    </h3>
                                    <div className="p-4 space-y-4 flex-grow">
                                        {classesForDay.length > 0 ? (
                                            classesForDay.map((entry, i) => {
                                                // Alternate between different card styles for variety
                                                const altStyles = [
                                                    'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400',
                                                    'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500',
                                                    'bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-500'
                                                ];
                                                
                                                // Get default styles
                                                const { cardClasses, textClass, timeClass } = getCardStatusIndicator(entry.status);
                                                
                                                // Enhanced active card styling with alternating gradients
                                                const finalCardClasses = entry.status === 'active'
                                                    ? `${commonCardClasses} ${altStyles[i % altStyles.length]} border-transparent ${isDarkMode ? 'shadow-lg shadow-black/30' : 'shadow-xl shadow-indigo-300/50'} ${hoverScaleClasses} hover:shadow-2xl transform ${transitionClasses}`
                                                    : `${cardClasses} ${hoverScaleClasses} hover:shadow-lg transform ${transitionClasses}`;
                                                
                                                return (
                                                    <div key={entry.id} className={finalCardClasses}>
                                                        <p className={`text-sm leading-snug break-words ${entry.status === 'active' ? 'text-white font-semibold' : textClass}`}>
                                                            {entry.className}
                                                        </p>
                                                        <div className={`flex items-center text-xs mt-1.5 ${entry.status === 'active' ? 'text-white/90' : timeClass}`}>
                                                            <FiClock size={12} className="mr-1.5 flex-shrink-0 opacity-80"/>
                                                            <span>{formatCardTiming(entry.timing)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center py-8 transition-all duration-500 ease-in-out">
                                                <div className="p-6 rounded-full bg-gradient-to-br from-indigo-100/20 to-purple-100/10 mb-5 shadow-inner">
                                                    <FiCalendar size={40} className={`${isDarkMode ? 'text-indigo-300' : 'text-indigo-500'} animate-pulse opacity-80`} />
                                                </div>
                                                <p className={`text-lg font-medium ${isDarkMode ? 'text-indigo-200' : 'text-indigo-600'}`}>No classes scheduled</p>
                                                <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Try selecting another day</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* --- Table View --- */
                     <div className={`rounded-lg border overflow-auto relative max-h-[calc(100vh-12rem)] backdrop-blur-sm custom-scrollbar transition-all duration-300 ease-in-out ${
                        isDarkMode 
                            ? 'bg-gray-800/80 border-gray-700/80 shadow-lg shadow-gray-900/30' 
                            : 'bg-white/90 border-gray-200/90 shadow-xl shadow-gray-400/40'
                     }`}>
                        <table className={`min-w-full border-collapse table-fixed ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                            <thead>
                                <tr>
                                    <th style={getHeaderCellStyle()}>Time</th>
                                    {filteredDays.map((day) => {
                                        // Get the date for this day of the week
                                        const dayIndex = daysOfWeek.indexOf(day);
                                        const dayDate = new Date(weekRange.monday);
                                        dayDate.setDate(weekRange.monday.getDate() + dayIndex);
                                        const formattedDate = dayDate.getDate();
                                        const isToday = day === todayDay;
                                        
                                        return (
                                            <th key={day} style={getHeaderCellStyle()} className={`${
                                                selectedDay === day 
                                                    ? isDarkMode ? 'bg-indigo-900/50 text-indigo-200' : 'bg-indigo-100 text-indigo-700'
                                                    : ''
                                            } relative`}>
                                                {day} <span className="block text-xs opacity-75">{formattedDate}</span>
                                                
                                                {/* Today indicator in table header */}
                                                {isToday && (
                                                    <span className="absolute top-0 right-0 px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-bl-md shadow-sm">
                                                        Today
                                                    </span>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {timeSlots.map((timeSlot, i) => (
                                    <tr key={timeSlot} className={i % 2 === 0 ? (isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50/50') : ''}>
                                        <td style={getTimeSlotCellStyle()}>{timeSlot}</td>
                                        {filteredDays.map(day => {
                                            const cellData = timetableData[day][timeSlot];
                                            const status = cellData ? 'occupied' : 'free';
                                            
                                            return (
                                                <td 
                                                    key={`${day}-${timeSlot}`} 
                                                    style={getTableCellStyles(status)}
                                                    onClick={() => setSelectedDay(day)}
                                                >
                                                    {cellData && (
                                                        <>
                                                            <div className="font-medium">{cellData.className}</div>
                                                            <div className="text-xs opacity-80">{cellData.fullTiming}</div>
                                                        </>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherTimetable; 