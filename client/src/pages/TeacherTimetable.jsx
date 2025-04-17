import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Loading from '../components/Loading'; // Assuming Loading component exists
import { useTheme } from '../context/ThemeContext';
import { fetchTeacherSchedule } from '../redux/slices/classSlice'; // Adjust path if needed

// Define the structure for the timetable
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Define hourly time slots (adjust range as needed)
const timeSlots = Array.from({ length: 10 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`); // 08:00 to 17:00

const TeacherTimetable = () => {
    const dispatch = useDispatch();
    const { isDarkMode } = useTheme();
    const { data: scheduleData, loading, error } = useSelector((state) => state.class.teacherSchedule);
    console.log("Raw Schedule Data from Redux:", scheduleData);

    useEffect(() => {
        dispatch(fetchTeacherSchedule());
    }, [dispatch]);

    // --- UPDATED: Transform data into a grid format for the table ---
    const transformScheduleForTable = (classes) => {
        // Initialize grid with null values
        const grid = daysOfWeek.reduce((acc, day) => {
            acc[day] = timeSlots.reduce((timeAcc, slot) => {
                timeAcc[slot] = null; // Represents an empty slot
                return timeAcc;
            }, {});
            return acc;
        }, {});

        if (!Array.isArray(classes)) {
             console.warn("transformScheduleForTable received non-array:", classes);
             return grid; // Return empty grid if data is not an array
        }

        classes.forEach(cls => {
            // if (cls.status !== 'active') return; // Optional filtering

            if (Array.isArray(cls.schedule)) {
                cls.schedule.forEach(slot => {
                    if (slot.day && Array.isArray(slot.timing) && grid[slot.day]) {
                        slot.timing.forEach(time => {
                            // Handle 1 or 2 digit hours
                            const hourMatch = time.match(/^(\d{1,2}):\d{2}$/);
                            if (hourMatch) {
                                const hour = hourMatch[1];
                                const slotKey = `${String(hour).padStart(2, '0')}:00`;

                                // Check if the generated slotKey exists in our defined timeSlots
                                if (grid[slot.day].hasOwnProperty(slotKey) && grid[slot.day][slotKey] === null) {
                                    grid[slot.day][slotKey] = {
                                        className: cls.className,
                                        status: cls.status || 'active',
                                        fullTiming: slot.timing.join(', '),
                                    };
                                } else if (grid[slot.day].hasOwnProperty(slotKey)) {
                                    // Optional: Handle clashes - maybe append name or show indicator
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

    const timetableGrid = transformScheduleForTable(scheduleData);
    console.log("Transformed Timetable Grid:", timetableGrid);

    // --- Render ---
    if (loading) return <Loading message="Loading schedule..." />;

    // Style helpers for table cells based on status
    const getCellStyles = (cellData) => {
        const baseStyle = `p-2 text-xs border text-center transition-colors duration-150 h-16 align-top`; // Added h-16 and align-top
        if (!cellData) {
            return `${baseStyle} ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`;
        }
        let statusStyle = '';
        if (cellData.status === 'active') {
            statusStyle = isDarkMode ? 'bg-blue-900/40 border-blue-700/30 text-blue-200' : 'bg-blue-50 border-blue-200/80 text-blue-800';
        } else if (cellData.status === 'inactive') {
            statusStyle = isDarkMode ? 'bg-gray-700/50 border-gray-600/50 text-gray-400 opacity-70' : 'bg-gray-100 border-gray-300/80 text-gray-500 opacity-80';
        } else if (cellData.status === 'archived') {
            statusStyle = isDarkMode ? 'bg-red-900/30 border-red-700/30 text-red-400 opacity-70' : 'bg-red-50 border-red-200/80 text-red-500 opacity-80';
        } else {
             statusStyle = isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200';
        }
        return `${baseStyle} ${statusStyle}`;
    };

    return (
        <div className={`min-h-screen pb-20 pt-4 ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8"> {/* Changed max-w-7xl to max-w-full */}
                <h1 className="text-3xl font-bold mb-6">My Timetable</h1>

                {error && (
                     <div className={`p-4 mb-4 text-sm rounded-lg ${isDarkMode ? 'text-red-400 bg-red-900/30 border border-red-700/50' : 'text-red-700 bg-red-100 border border-red-300'}`} role="alert">
                         <span className="font-medium">Error:</span> {error}
                     </div>
                )}

                {/* Timetable Table */}
                <div className="shadow-md rounded-lg overflow-x-auto"> {/* Added overflow-x-auto for smaller screens */}
                    <table className={`min-w-full border-collapse table-fixed ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                        <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <tr>
                                <th className={`w-24 px-3 py-3 border text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-600'}`}>Time</th>
                                {daysOfWeek.map(day => (
                                    <th key={day} className={`px-3 py-3 border text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-600'}`}>{day}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className={`${isDarkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                            {timeSlots.map(timeSlot => (
                                <tr key={timeSlot}>
                                    {/* Time Slot Header Cell */}
                                    <td className={`px-3 py-2 border text-xs font-medium whitespace-nowrap ${isDarkMode ? 'border-gray-700 text-gray-300 bg-gray-700/50' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>{timeSlot}</td>
                                    {/* Daily Cells for this Time Slot */}
                                    {daysOfWeek.map(day => {
                                        const cellData = timetableGrid[day]?.[timeSlot];
                                        return (
                                            <td key={`${day}-${timeSlot}`} className={getCellStyles(cellData)}>
                                                {cellData && (
                                                    <div>
                                                        <div className="font-semibold leading-tight break-words">{cellData.className}</div>
                                                        <div className={`text-[0.7rem] mt-0.5 opacity-80 ${cellData.status !== 'active' ? 'line-through' : ''}`}>{cellData.fullTiming}</div>
                                                    </div>
                                                )}
                                                {/* If cellData is null, cell will be empty based on getCellStyles */}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TeacherTimetable; 