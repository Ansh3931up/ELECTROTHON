import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Learning Management System
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A platform for teachers and students to manage their learning journey
          </p>
          <div className="space-x-4">
            <button
              onClick={() => navigate("/login")}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Our Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <h3 className="text-xl font-semibold mb-4">For Teachers</h3>
              <p className="text-gray-600">
                Create and manage courses, track student progress, and provide feedback
              </p>
            </div>
            <div className="text-center p-6">
              <h3 className="text-xl font-semibold mb-4">For Students</h3>
              <p className="text-gray-600">
                Access course materials, submit assignments, and track your progress
              </p>
            </div>
            <div className="text-center p-6">
              <h3 className="text-xl font-semibold mb-4">Interactive Learning</h3>
              <p className="text-gray-600">
                Engage with course content through various interactive features
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home; 