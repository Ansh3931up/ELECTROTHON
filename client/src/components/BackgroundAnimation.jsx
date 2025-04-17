import React from 'react';

const BackgroundAnimation = () => {
  // Generate properties for multiple bubbles
  const bubbles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    size: `${Math.random() * 2 + 0.5}rem`, // size between 0.5rem and 2.5rem
    left: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 10 + 10}s`, // duration between 10s and 20s
    animationDelay: `${Math.random() * 5}s`,
  }));

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Large Wave/Shape Element */}
      <div
        className="absolute bottom-0 left-0 w-[150%] h-[60%] bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-950 rounded-t-full translate-x-[-20%] translate-y-[30%] opacity-80 dark:opacity-70 animate-wave"
        style={{ animationDuration: '15s' }} // Control wave speed
      />
       <div
        className="absolute bottom-0 right-0 w-[120%] h-[50%] bg-gradient-to-tl from-cyan-500 via-blue-500 to-blue-600 dark:from-cyan-700 dark:via-blue-800 dark:to-blue-900 rounded-t-full translate-x-[25%] translate-y-[40%] opacity-60 dark:opacity-50 animate-wave-reverse"
        style={{ animationDuration: '18s' }} // Control wave speed (slightly different)
      />


      {/* Floating Bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute bottom-[-5rem] rounded-full bg-blue-200/40 dark:bg-blue-300/30 animate-float"
          style={{
            width: bubble.size,
            height: bubble.size,
            left: bubble.left,
            animationDuration: bubble.animationDuration,
            animationDelay: bubble.animationDelay,
          }}
        />
      ))}
    </div>
  );
};

export default BackgroundAnimation;
