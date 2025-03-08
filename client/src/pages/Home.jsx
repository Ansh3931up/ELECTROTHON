import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Home() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('home');

  const features = [
    {
      title: "Smart Attendance",
      description: "Sound-based face recognition system for foolproof attendance tracking",
      icon: "📱"
    },
    {
      title: "Resource Hub",
      description: "Digital access to lab equipment, library resources, and study materials",
      icon: "📚"
    },
    {
      title: "Career Connect",
      description: "LinkedIn-style platform for students to showcase work and connect with recruiters",
      icon: "🤝"
    },
    {
      title: "Inter-College Network",
      description: "Collaborate with other institutions for events and resource sharing",
      icon: "🌐"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-16">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">
            Welcome to <span className="text-blue-600">NeuraCampus</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-700 mb-6 md:mb-8 px-4 max-w-2xl mx-auto">
            Revolutionizing educational management with smart attendance, resource sharing, and career networking
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:scale-105"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="w-full sm:w-auto bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-md hover:scale-105"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-blue-900 mb-8">Key Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-3 text-blue-800">{feature.title}</h3>
              <p className="text-blue-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-blue-100">
        <div className="flex justify-around items-center py-3">
          {[
            { icon: "🏠", label: "Home", id: 'home' },
            { icon: "📊", label: "Dashboard", id: 'dashboard' },
            { icon: "📚", label: "Resources", id: 'resources' },
            { icon: "👥", label: "Network", id: 'network' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center space-y-1 ${
                activeSection === item.id ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default Home; 