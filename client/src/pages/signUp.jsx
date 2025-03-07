import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { signupUser } from "../redux/slices/authSlice";

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    role: "student", // Default role
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(signupUser(formData)).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        const userRole = result.payload.role;
        if (userRole === "teacher") {
          navigate("/teacher");
        } else {
          navigate("/student");
        }
      }
    });
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-white rounded-lg shadow-lg w-96"
      >
        <h2 className="text-xl font-bold mb-4">Signup</h2>
        {error && <p className="text-red-500">{error}</p>}

        <input
          name="fullname"
          placeholder="Full Name"
          type="text"
          value={formData.fullname}
          onChange={handleChange}
          required
          className="input-field"
        />
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
          {loading ? "Signing up..." : "Signup"}
        </button>
      </form>
    </div>
  );
};

export default Signup;
