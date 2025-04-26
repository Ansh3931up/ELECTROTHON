# 📦 NeuraCampus – Socket.IO Migration Guide

This document outlines how to migrate your frontend code to work with the new socket-based real-time attendance system.

## 🔄 Socket Event Naming Changes

We've updated the socket event naming to follow a more consistent pattern that makes it clear who should emit each event:

| Old Event Name | New Event Name | Who Emits | Description |
|---------------|----------------|-----------|-------------|
| `initiateAttendance` | `teacher:startAttendance` | Teacher | Start attendance session |
| `endAttendance` | `teacher:endAttendance` | Teacher | End attendance session |
| `attendanceMarked` | `student:markAttendance` | Student | Mark attendance |
| `joinClass` | `student:joinClass` | Student | Join class room |
| `leaveClass` | `student:leaveClass` | Student | Leave class room |

> Note: The socket utility file has been updated to handle both old and new event names for backward compatibility.

## 📝 Server Response Events

The server emits these events to notify clients of changes:

| Event Name | When Emitted | Data |
|------------|--------------|------|
| `attendanceStarted` | When teacher starts attendance | `{ classId, teacherId, sessionType, timestamp, message }` |
| `attendanceEnded` | When teacher ends attendance | `{ classId, sessionType, timestamp, message }` |
| `attendanceUpdate` | When student marks attendance | `{ classId, studentId, studentName, status, sessionType, timestamp }` |
| `attendance:initiated` | Confirmation to teacher | `{ success, classId, sessionType, message }` |
| `attendance:ended` | Confirmation to teacher | `{ success, classId, sessionType, message }` |
| `attendance:error` | When an error occurs | `{ message }` |
| `attendanceData` | Response to data request | `{ success, exists, classId, date, sessionType, message, data }` |

## 🔄 Updated Socket Utility Functions

We've updated the socket utility functions to work with the new event names. The updated functions are:

```javascript
joinClassRoom(classId, userId)
leaveClassRoom(classId, userId)
initiateAttendance(classId, frequency, teacherId, sessionType)
endAttendance(classId, teacherId, sessionType)
markAttendance(classId, studentId, studentName, status, sessionType)
fetchAttendanceData(classId, date, sessionType)
```

## 🧰 New useAttendanceSocket Hook

We've created a new React hook that makes it easy to work with the socket-based attendance system. This hook handles:

- Socket connection and disconnection
- Joining and leaving class rooms
- Listening for attendance events
- Starting and ending attendance sessions
- Marking attendance
- Fetching attendance data

### Using the Hook

```javascript
import useAttendanceSocket from '../utils/useAttendanceSocket';

function MyComponent() {
  const { 
    connected,
    attendanceActive,
    activeSessionType,
    attendanceUpdates,
    error,
    startAttendance,
    endAttendance,
    markAttendance,
    fetchAttendance,
    clearAttendanceUpdates
  } = useAttendanceSocket(classId, userId, role);

  // Start attendance (teacher only)
  const handleStartAttendance = () => {
    startAttendance('lecture');
  };

  // Mark attendance (student)
  const handleMarkAttendance = () => {
    markAttendance(studentName);
  };

  // Fetch attendance data
  const handleFetchAttendance = async () => {
    try {
      const data = await fetchAttendance('2023-08-01', 'lecture');
      console.log(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      {connected ? 'Connected' : 'Disconnected'}
      {attendanceActive && <p>Attendance active for {activeSessionType}</p>}
      {error && <p>Error: {error}</p>}
      
      {/* Teacher controls */}
      {role === 'teacher' && (
        <>
          <button onClick={handleStartAttendance}>Start Attendance</button>
          <button onClick={() => endAttendance('lecture')}>End Attendance</button>
        </>
      )}
      
      {/* Student controls */}
      {role === 'student' && attendanceActive && (
        <button onClick={handleMarkAttendance}>Mark Present</button>
      )}
      
      {/* Attendance updates */}
      <h3>Recent Attendance Updates</h3>
      <ul>
        {attendanceUpdates.map((update, index) => (
          <li key={index}>{update.studentName} marked {update.status}</li>
        ))}
      </ul>
    </div>
  );
}
```

## 🚀 Migration Checklist

1. ✅ Update your socket event listeners
   - Listen for `attendanceStarted` instead of custom events
   - Listen for `attendanceEnded` to know when sessions end
   - Listen for `attendanceUpdate` for real-time updates

2. ✅ Update your socket event emitters
   - Use the updated utility functions which handle both old and new event names
   - If emitting events directly, follow the new naming convention

3. ✅ Consider using the new `useAttendanceSocket` hook
   - Simplifies socket management
   - Handles connection, joining rooms, and cleanup
   - Provides consistent interface for attendance operations

4. ✅ Test both teacher and student flows
   - Ensure teachers can start and end attendance
   - Ensure students can join and mark attendance
   - Verify real-time updates work for all users

## 📈 Future Improvements

- Add offline support and reconnection handling
- Implement notification toasts for important events
- Add analytics and tracking for attendance patterns
- Enhance security with JWT token validation for socket connections 