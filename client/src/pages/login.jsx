import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from 'react-router-dom';
import axios from "axios";

import { loginUser } from "../redux/slices/authSlice";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const [redirectTo, setRedirectTo] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "student", // Default role selection
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    console.log("Form Data:", formData); // Log form data
    e.preventDefault();

    dispatch(loginUser(formData)).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        
        console.log('Full Response:', result.payload); // Log full response
       
        window.location.href = userRole === "teacher" ? "/teacher" : "/student";
      }
    }).catch((error) => {
      console.error('Login error:', error); // Log error
    });
  };

  if (redirectTo) {
    return <Navigate to={redirectTo} replace={true} />;
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-white rounded-lg shadow-lg w-96"
      >
        <h2 className="text-xl font-bold mb-4">Login</h2>
        {error && <p className="text-red-500">{error}</p>}

        <input
          name="email"
          placeholder="Email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="input-field"
        />
        <input
          name="password"
          placeholder="Password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          className="input-field"
        />

        {/* Role Selection */}
        <div className="flex justify-between my-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="student"
              checked={formData.role === "student"}
              onChange={handleChange}
              className="mr-2"
            />
            Student
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="teacher"
              checked={formData.role === "teacher"}
              onChange={handleChange}
              className="mr-2"
            />
            Teacher
          </label>
        </div>

        <button type="submit" disabled={loading} className="btn">
          {loading ? "Logging in..." : "Login"}
        </button>
        <button type="button" onClick={() => navigate(-1)} className="btn ml-4">
          Back
        </button>
      </form>
    </div>
  );
};

export default Login;
