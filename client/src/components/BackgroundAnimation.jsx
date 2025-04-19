import { useTheme } from '../context/ThemeContext';

const BackgroundAnimation = () => {
  const { isDarkMode } = useTheme();
  
  // Generate properties for fewer floating bubbles, positioned near corners
  const bubbles = Array.from({ length: 8 }).map((_, i) => {
    // Determine which corner this bubble belongs to
    const cornerIndex = i % 4; // 0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right
    
    let leftPosition, bottomPosition;
    
    switch (cornerIndex) {
      case 0: // top-left
        leftPosition = `${Math.random() * 15}%`;
        bottomPosition = `${70 + Math.random() * 20}%`;
        break;
      case 1: // top-right
        leftPosition = `${85 + Math.random() * 15}%`;
        bottomPosition = `${70 + Math.random() * 20}%`;
        break;
      case 2: // bottom-left
        leftPosition = `${Math.random() * 15}%`;
        bottomPosition = `${-5 + Math.random() * 10}%`;
        break;
      case 3: // bottom-right
        leftPosition = `${85 + Math.random() * 15}%`;
        bottomPosition = `${-5 + Math.random() * 10}%`;
        break;
      default:
        leftPosition = '50%';
        bottomPosition = '0%';
    }
    
    return {
      id: i,
      size: `${Math.random() * 2 + 0.5}rem`,
      left: leftPosition,
      bottom: bottomPosition,
      animationDuration: `${Math.random() * 5 + 15}s`,
      animationDelay: `${Math.random() * 5}s`,
    };
  });

  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none ${
      isDarkMode ? 'bg-gray-900' : 'bg-white'
    } transition-colors duration-300`}>
      {/* Large Semi-Circle at top-right corner */}
      <div
        className={`absolute -top-[25%] -right-[25%] w-[50%] h-[40%] rounded-full animate-pulse-slow ${
          isDarkMode 
            ? 'bg-gradient-to-bl from-indigo-800/30 via-blue-700/20 to-blue-600/10 opacity-50' 
            : 'bg-gradient-to-bl from-indigo-500/40 via-blue-600/30 to-blue-400/20 opacity-60'
        }`}
        style={{ animationDelay: '1s' }}
      />

      {/* Bubble at top-left corner */}
      <div
        className={`absolute top-[5%] left-[3%] w-[8rem] h-[8rem] rounded-full animate-pulse-slow ${
          isDarkMode 
            ? 'bg-blue-600/15'
            : 'bg-blue-400/30'
        }`}
        style={{ animationDelay: '0s' }}
      />

      {/* Bubble at bottom-left corner */}
      <div
        className={`absolute bottom-[30%] left-[5%] w-[6rem] h-[6rem] rounded-full animate-pulse-slow ${
          isDarkMode 
            ? 'bg-indigo-700/10'
            : 'bg-indigo-500/25'
        }`}
        style={{ animationDelay: '2s' }}
      />

      {/* Wave shapes only at bottom corners */}
      <div
        className={`absolute bottom-0 left-0 w-[40%] h-[30%] rounded-tr-full animate-wave ${
          isDarkMode 
            ? 'bg-gradient-to-tr from-blue-800/40 via-blue-900/30 to-indigo-950/20 opacity-50' 
            : 'bg-gradient-to-tr from-blue-500/60 via-blue-600/40 to-indigo-700/30 opacity-65'
        }`}
        style={{ animationDuration: '15s' }}
      />
      
      <div
        className={`absolute bottom-0 right-0 w-[40%] h-[30%] rounded-tl-full animate-wave-reverse ${
          isDarkMode 
            ? 'bg-gradient-to-tl from-cyan-700/30 via-blue-800/20 to-blue-900/10 opacity-40' 
            : 'bg-gradient-to-tl from-cyan-400/50 via-blue-500/40 to-blue-600/30 opacity-60'
        }`}
        style={{ animationDuration: '18s' }}
      />

      {/* Floating Bubbles in corners */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={`absolute rounded-full animate-float ${
            isDarkMode ? 'bg-blue-300/10' : 'bg-blue-300/30'
          }`}
          style={{
            width: bubble.size,
            height: bubble.size,
            left: bubble.left,
            bottom: bubble.bottom,
            animationDuration: bubble.animationDuration,
            animationDelay: bubble.animationDelay,
          }}
        />
      ))}
      
      {/* Very light gradient overlay */}
      <div className={`absolute inset-0 ${
        isDarkMode 
          ? 'bg-gradient-to-b from-gray-900/60 to-transparent' 
          : 'bg-gradient-to-b from-white/40 to-transparent'
      }`} />
    </div>
  );
};

export default BackgroundAnimation;
