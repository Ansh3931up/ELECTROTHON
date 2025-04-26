# NeuraCampus WebSocket Events Documentation

This document outlines all WebSocket events used in the NeuraCampus attendance system.

## Authentication Events

| Event | Data | Description |
|-------|------|-------------|
| `identify` | `{ userId, role }` | Sent by client to identify the user after connection |

## Class Room Events

| Event | Data | Description |
|-------|------|-------------|
| `joinClass` | `{ userId, classId }` | User joins a class room for real-time updates |
| `leaveClass` | `{ userId, classId }` | User leaves a class room |
| `userJoined` | `{ userId, message }` | Notifies room members that a user has joined |
| `userLeft` | `{ userId, message }` | Notifies room members that a user has left |

## Attendance Events

### Teacher Events

| Event | Data | Description |
|-------|------|-------------|
| `initiateAttendance` | `{ classId, teacherId, sessionType, frequency }` | Teacher initiates attendance for a class |
| `endAttendance` | `{ classId, teacherId, sessionType }` | Teacher ends an attendance session |
| `attendance:initiated` | `{ success, classId, sessionType, message }` | Response confirming attendance initiated |
| `attendance:ended` | `{ success, classId, sessionType, message }` | Response confirming attendance ended |

### Student Events

| Event | Data | Description |
|-------|------|-------------|
| `attendanceMarked` | `{ classId, studentId, studentName, status, sessionType }` | Student marks their attendance |

### Broadcast Events

| Event | Data | Audience | Description |
|-------|------|----------|-------------|
| `attendanceStarted` | `{ classId, teacherId, sessionType, timestamp, message }` | All in class | Notifies that attendance has started |
| `attendanceEnded` | `{ classId, sessionType, timestamp, message }` | All in class | Notifies that attendance has ended |
| `attendanceUpdate` | `{ classId, studentId, studentName, status, sessionType, timestamp }` | All in class | Real-time update when attendance is marked |

### Data Retrieval Events

| Event | Data | Description |
|-------|------|-------------|
| `fetchAttendance` | `{ classId, date, sessionType }` | Request attendance data for a specific date/session |
| `attendanceData` | `{ success, exists, classId, date, sessionType, message, data }` | Response with attendance data |

### Error Events

| Event | Data | Description |
|-------|------|-------------|
| `attendance:error` | `{ message }` | Error response for attendance operations |
| `class:error` | `{ message }` | Error response for class operations |

## Event Flow Examples

### Attendance Session Flow

1. Teacher connects and identifies: `identify`
2. Teacher joins class room: `joinClass`
3. Teacher initiates attendance: `initiateAttendance` 
4. System broadcasts to all students: `attendanceStarted`
5. Students mark attendance: `attendanceMarked`
6. System broadcasts updates: `attendanceUpdate`
7. Teacher ends attendance: `endAttendance`
8. System broadcasts session end: `attendanceEnded`

### Fetching Attendance Data

1. Client requests data: `fetchAttendance`
2. Server responds with: `attendanceData`

## Implementation Notes

- All events that modify data include appropriate error handling
- Server validates user permissions for teacher-only events
- Timestamps are included to ensure proper ordering of events
- Room-based broadcasting ensures notifications only go to relevant users 