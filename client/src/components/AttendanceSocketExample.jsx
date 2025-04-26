import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import useAttendanceSocket from '../utils/useAttendanceSocket';

/**
 * Example component showing how to use the useAttendanceSocket hook
 * for both teacher and student attendance workflows
 */
const AttendanceSocketExample = ({ classId }) => {
  const [studentList, setStudentList] = useState([]);
  const user = useSelector(state => state.user?.user);
  const userId = user?._id;
  const role = user?.role;
  const userName = user?.fullName || user?.name || 'User';
  
  // Initialize attendance socket hook
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
  
  // Fetch student list when component mounts
  useEffect(() => {
    // In a real app, fetch students from API or Redux store
    setStudentList([
      { id: '1', name: 'Student 1', attendance: 'pending' },
      { id: '2', name: 'Student 2', attendance: 'pending' },
      { id: '3', name: 'Student 3', attendance: 'pending' }
    ]);
  }, []);
  
  // Update student list when attendance updates come in
  useEffect(() => {
    if (attendanceUpdates.length > 0 && role === 'teacher') {
      setStudentList(prevList => {
        return prevList.map(student => {
          // Find if this student has an update
          const update = attendanceUpdates.find(
            update => update.studentId === student.id
          );
          
          if (update) {
            return { ...student, attendance: update.status };
          }
          return student;
        });
      });
    }
  }, [attendanceUpdates, role]);
  
  // Function to handle starting attendance (teacher only)
  const handleStartAttendance = (sessionType) => {
    startAttendance(sessionType);
  };
  
  // Function to handle ending attendance (teacher only)
  const handleEndAttendance = () => {
    if (activeSessionType) {
      endAttendance(activeSessionType);
    }
  };
  
  // Function to handle marking attendance (student only)
  const handleMarkAttendance = () => {
    markAttendance(userName);
  };
  
  // Function to fetch attendance data for a specific date
  const handleFetchAttendance = async () => {
    try {
      // Today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      const data = await fetchAttendance(today, 'lecture');
      console.log('Fetched attendance data:', data);
      
      // In a real app, update UI with fetched data
      if (data.exists && data.data.records) {
        // Update student list with fetched records
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };
  
  // Render teacher view
  const renderTeacherView = () => (
    <div className="teacher-attendance-panel">
      <h3>Teacher Attendance Panel</h3>
      
      {!attendanceActive ? (
        <div className="attendance-controls">
          <h4>Start Attendance</h4>
          <div className="button-group">
            <button 
              className="btn btn-primary" 
              onClick={() => handleStartAttendance('lecture')}
              disabled={!connected}
            >
              Start Lecture Attendance
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleStartAttendance('lab')}
              disabled={!connected}
            >
              Start Lab Attendance
            </button>
          </div>
        </div>
      ) : (
        <div className="attendance-active">
          <div className="alert alert-info">
            <strong>Attendance Active: {activeSessionType}</strong>
          </div>
          <button 
            className="btn btn-danger" 
            onClick={handleEndAttendance}
          >
            End Attendance
          </button>
        </div>
      )}
      
      <div className="student-list">
        <h4>Student List</h4>
        <button 
          className="btn btn-sm btn-secondary mb-2" 
          onClick={handleFetchAttendance}
        >
          Refresh Attendance
        </button>
        
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {studentList.map(student => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>
                  <span className={`badge ${student.attendance === 'present' ? 'bg-success' : student.attendance === 'absent' ? 'bg-danger' : 'bg-secondary'}`}>
                    {student.attendance === 'pending' ? 'Pending' : student.attendance}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="live-updates">
        <h4>Live Updates</h4>
        {attendanceUpdates.length === 0 ? (
          <p>No recent updates</p>
        ) : (
          <ul className="list-group">
            {attendanceUpdates.map((update, index) => (
              <li key={index} className="list-group-item">
                <strong>{update.studentName}</strong> marked {update.status} for {update.sessionType}
                <br />
                <small className="text-muted">
                  {new Date(update.timestamp).toLocaleTimeString()}
                </small>
              </li>
            ))}
          </ul>
        )}
        {attendanceUpdates.length > 0 && (
          <button 
            className="btn btn-sm btn-outline-secondary mt-2" 
            onClick={clearAttendanceUpdates}
          >
            Clear Updates
          </button>
        )}
      </div>
    </div>
  );
  
  // Render student view
  const renderStudentView = () => (
    <div className="student-attendance-panel">
      <h3>Student Attendance Panel</h3>
      
      <div className="connection-status mb-4">
        <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        {error && (
          <div className="alert alert-danger mt-2">
            Error: {error}
          </div>
        )}
      </div>
      
      {attendanceActive ? (
        <div className="mark-attendance">
          <div className="alert alert-warning">
            <strong>Attendance is now active for {activeSessionType}</strong>
            <p>Please mark your attendance</p>
          </div>
          
          <button 
            className="btn btn-lg btn-success" 
            onClick={handleMarkAttendance}
            disabled={!connected}
          >
            Mark Present
          </button>
          
          {attendanceUpdates.some(update => update.studentId === userId) && (
            <div className="alert alert-success mt-3">
              <strong>Your attendance has been recorded!</strong>
            </div>
          )}
        </div>
      ) : (
        <div className="no-attendance-active">
          <div className="alert alert-info">
            No active attendance session
          </div>
        </div>
      )}
      
      <div className="class-updates mt-4">
        <h4>Class Updates</h4>
        {attendanceUpdates.length === 0 ? (
          <p>No recent updates</p>
        ) : (
          <ul className="list-group">
            {attendanceUpdates.map((update, index) => (
              <li key={index} className="list-group-item">
                <strong>{update.studentName}</strong> marked {update.status}
                <br />
                <small className="text-muted">
                  {new Date(update.timestamp).toLocaleTimeString()}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="attendance-socket-example">
      <div className="card">
        <div className="card-header">
          <h2>Real-time Attendance</h2>
          <div className="connection-status">
            <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="card-body">
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}
          
          {role === 'teacher' ? renderTeacherView() : renderStudentView()}
        </div>
      </div>
    </div>
  );
};

export default AttendanceSocketExample; 