import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiClock, FiInfo, FiGrid, FiList } from 'react-icons/fi';

import Loading from '../components/Loading';
import { useTheme } from '../context/ThemeContext';
import { fetchTeacherSchedule } from '../redux/slices/classSlice';

// Define the structure for the timetable
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Define hourly time slots (adjust range as needed)
const timeSlots = Array.from({ length: 10 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`); // 08:00 to 17:00

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

const TeacherTimetable = () => {
    const dispatch = useDispatch();
    const { isDarkMode } = useTheme();
    const { data: scheduleData, loading, error } = useSelector((state) => state.class.teacherSchedule);
    // console.log("Raw Schedule Data from Redux:", scheduleData);

    // --- State for View Mode ---
    const [viewMode, setViewMode] = useState('grid'); // Default to 'grid' view

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

    if (loading) return <Loading message="Loading schedule..." />;

    // --- BRIGHTER Card Style helpers ---
    const getCardStatusIndicator = (status) => {
        let cardClasses = '';
        let textClass = '';
        let timeClass = '';
        const commonCardClasses = 'p-3 rounded-lg border shadow-sm transition-all duration-150 hover:shadow-md'; // Base for all cards

        switch (status) {
            case 'active':
                 // Brighter blue gradient, white/light text
                 cardClasses = isDarkMode
                     ? 'bg-gradient-to-br from-blue-600 to-cyan-600 border-blue-500/70 hover:border-cyan-400'
                     : 'bg-gradient-to-br from-blue-500 to-cyan-500 border-blue-400 hover:border-cyan-400';
                 textClass = 'text-white font-semibold'; // White bold text
                 timeClass = isDarkMode ? 'text-cyan-200' : 'text-blue-100'; // Light cyan/blue for time
                 break;
            case 'inactive':
                // Keep inactive subdued for contrast
                 cardClasses = isDarkMode
                    ? 'bg-gray-700/50 border-gray-600/60 hover:border-gray-500/80 opacity-75'
                    : 'bg-gray-100 border-gray-300/80 hover:border-gray-400 opacity-80';
                 textClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
                 timeClass = isDarkMode ? 'text-gray-500' : 'text-gray-400';
                break;
            case 'archived':
                 // Keep archived subdued, add line-through
                 cardClasses = isDarkMode
                    ? 'bg-red-900/30 border-red-700/40 hover:border-red-600/60 opacity-65'
                    : 'bg-red-50 border-red-200/80 hover:border-red-300 opacity-75';
                 textClass = isDarkMode ? 'text-red-400/80 line-through' : 'text-red-600/90 line-through';
                 timeClass = isDarkMode ? 'text-red-500/70' : 'text-red-500/80';
                break;
            default:
                cardClasses = isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200';
                textClass = isDarkMode ? 'text-gray-300' : 'text-gray-700';
                timeClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
        }
        return { cardClasses: `${commonCardClasses} ${cardClasses}`, textClass, timeClass };
    };

    // --- Table Style Helpers (Unchanged) ---
    const getTableCellStyles = (cellData) => {
        const baseStyle = `p-2.5 border text-center transition-colors duration-150 h-20 align-top overflow-hidden relative`;
        let statusStyle = '', textColor = '';
        if (!cellData) return `${baseStyle} ${isDarkMode ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-200 hover:bg-gray-50/50'}`;
        switch (cellData.status) {
            case 'active': statusStyle = isDarkMode ? 'bg-indigo-900/30 border-indigo-700/40' : 'bg-indigo-50 border-indigo-200/80'; textColor = isDarkMode ? 'text-indigo-200' : 'text-indigo-900'; break;
            case 'inactive': statusStyle = isDarkMode ? 'bg-gray-700/60 border-gray-600/50 opacity-60' : 'bg-gray-100 border-gray-300/80 opacity-70'; textColor = isDarkMode ? 'text-gray-400' : 'text-gray-500'; break;
            case 'archived': statusStyle = isDarkMode ? 'bg-red-900/40 border-red-700/40 opacity-60' : 'bg-red-50 border-red-200/80 opacity-70'; textColor = isDarkMode ? 'text-red-400' : 'text-red-600'; break;
            default: statusStyle = isDarkMode ? 'bg-gray-700/40 border-gray-600/60' : 'bg-white border-gray-200/80';
        }
        return `${baseStyle} ${statusStyle} ${textColor}`;
    };

    const getTimeSlotCellStyle = () => `px-3 py-2 border text-xs font-semibold whitespace-nowrap sticky left-0 z-10 ${isDarkMode ? 'border-gray-600 text-gray-400 bg-gray-800' : 'border-gray-300 text-gray-500 bg-gray-100'}`;
    const getHeaderCellStyle = () => `px-3 py-3 border-b border-t text-left text-xs font-semibold uppercase tracking-wider sticky top-0 z-10 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300' : 'border-gray-300 bg-gray-200 text-gray-600'}`;

    // --- RE-ADD Button styles ---
    const commonButtonClass = `p-2 rounded-md border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1`;
    const activeButtonClass = isDarkMode ? `bg-indigo-600 border-indigo-500 text-white focus:ring-indigo-400 focus:ring-offset-gray-900` : `bg-indigo-600 border-indigo-700 text-white focus:ring-indigo-500 focus:ring-offset-gray-100`;
    const inactiveButtonClass = isDarkMode ? `bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-gray-200 focus:ring-gray-500 focus:ring-offset-gray-900` : `bg-white border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-indigo-500 focus:ring-offset-gray-100`;
    // --------------------------

    return (
        <div className={`min-h-screen pb-20 pt-4 bg-transparent`}>
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header and Toggle Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <h1 className="text-2xl sm:text-3xl text-white font-bold">My Timetable</h1>
                    <div className={`flex space-x-2 p-1 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`${commonButtonClass} ${viewMode === 'grid' ? activeButtonClass : inactiveButtonClass}`}
                            aria-pressed={viewMode === 'grid'}
                            title="Grid View"
                        >
                            <FiGrid size={18}/>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`${commonButtonClass} ${viewMode === 'table' ? activeButtonClass : inactiveButtonClass}`}
                            aria-pressed={viewMode === 'table'}
                            title="Table View"
                        >
                            <FiList size={18}/>
                        </button>
                    </div>
                </div>

                {error && (
                     <div className={`p-4 mb-4 text-sm rounded-lg border ${isDarkMode ? 'text-red-400 bg-red-900/30 border-red-700/50' : 'text-red-700 bg-red-100 border-red-300'}`} role="alert">
                         <span className="font-medium">Error:</span> {error}
                     </div>
                )}

                {/* Conditional Rendering based on viewMode */}
                {viewMode === 'grid' ? (
                    /* --- Card Grid View --- */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-6">
                        {daysOfWeek.map(day => {
                            const classesForDay = timetableData[day] || [];
                            return (
                                <div key={day} className={`rounded-xl shadow-lg border flex flex-col min-h-[200px] ${isDarkMode ? 'bg-gray-800/80 border-gray-700/80 backdrop-blur-sm' : 'bg-white/90 border-gray-200 backdrop-blur-sm'}`}>
                                    <h3 className={`text-lg font-bold px-5 py-3 border-b ${isDarkMode ? 'border-gray-700 text-blue-300 bg-gray-700/60' : 'border-gray-200/80 text-blue-700 bg-blue-50/70'}`}>
                                        {day}
                                    </h3>
                                    <div className="p-4 space-y-4 flex-grow">
                                        {classesForDay.length > 0 ? (
                                            classesForDay.map((entry) => {
                                                const { cardClasses, textClass, timeClass } = getCardStatusIndicator(entry.status);
                                                return (
                                                    <div key={entry.id} className={cardClasses}>
                                                        <p className={`text-sm leading-snug break-words ${textClass}`}>{entry.className}</p>
                                                        <div className={`flex items-center text-xs mt-1.5 ${timeClass}`}>
                                                            <FiClock size={12} className="mr-1.5 flex-shrink-0 opacity-80"/>
                                                            <span>{formatCardTiming(entry.timing)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center py-4">
                                                <FiInfo size={28} className={`mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                                                <p className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No classes</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* --- Table View --- */
                     <div className={`shadow-lg ${isDarkMode ? 'bg-gray-800/80 border-gray-700/80 backdrop-blur-sm' : 'bg-white/90 border-gray-200 backdrop-blur-sm'} rounded-lg border overflow-auto relative max-h-[calc(100vh-12rem)] custom-scrollbar`}> {/* Adjusted max-h */}
                        <table className={`min-w-full border-collapse table-fixed ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                            <thead>
                                <tr>
                                    <th className={`w-28 ${getHeaderCellStyle()}`}>Time</th>
                                    {daysOfWeek.map(day => (
                                        <th key={day} className={getHeaderCellStyle()}>{day}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={`${isDarkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}`}>
                                {timeSlots.map(timeSlot => (
                                    <tr key={timeSlot} className={isDarkMode ? 'hover:bg-gray-700/20' : 'hover:bg-gray-50/50'}>
                                        <td className={getTimeSlotCellStyle()}>{timeSlot}</td>
                                        {daysOfWeek.map(day => {
                                            const cellData = timetableData[day]?.[timeSlot]; // Use timetableData
                                            return (
                                                <td key={`${day}-${timeSlot}`} className={getTableCellStyles(cellData)}>
                                                    {cellData && (
                                                        <div className="flex flex-col justify-start h-full">
                                                            <div className="font-semibold text-xs sm:text-sm leading-tight break-words mb-1">{cellData.className}</div>
                                                            <div className={`text-[0.65rem] sm:text-[0.7rem] opacity-90 ${cellData.status !== 'active' ? 'line-through' : ''}`}>{cellData.fullTiming}</div>
                                                        </div>
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