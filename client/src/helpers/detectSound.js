const detectSound = async (setStatus, expectedFrequencies, onDetectionComplete) => {
  if (!window.isSecureContext) {
    setStatus("ERROR: App must be run over HTTPS or localhost.");
    return false;
  }

  // Cleanup previous audio context if it exists
  if (window.currentAudioContext) {
    window.currentAudioContext.close();
  }

  try {
    // Request microphone access and notification permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if ('Notification' in window) {
      await Notification.requestPermission();
    }

    setStatus("Permissions granted! Starting audio analysis...");

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    window.currentAudioContext = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);

    const sampleRate = audioContext.sampleRate;
    const binSize = sampleRate / analyser.fftSize;
    const threshold = 120;
    
    // Detection tracking
    let lastDetectionTime = 0;
    const detectionTimeout = 5000;
    const notificationCooldown = 5000;
    let lastNotificationTime = 0;
    let notificationShown = false;
    const consecutiveDetections = new Map();
    const requiredDetections = 5;
    const detectedFrequencies = new Set();
    let isDetecting = true; // Flag to control detection

    setStatus("Listening for signals...");

    const canvas = document.getElementById("frequencyData");
    const ctx = canvas.getContext("2d");
    canvas.width = bufferLength;
    canvas.height = 200;

    const updateFrequencyIndicator = (frequency, detected) => {
      const element = document.getElementById(`freq${frequency}`);
      if (element) {
        if (detected) {
          element.classList.add('detected');
          element.textContent = `${frequency} Hz: Detected!`;
        } else {
          element.classList.remove('detected');
          element.textContent = `${frequency} Hz: Waiting`;
        }
      }
    };

    const playSuccessSound = () => {
      const beep = new AudioContext();
      const oscillator = beep.createOscillator();
      const gainNode = beep.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(beep.destination);
      oscillator.frequency.value = 1000;
      gainNode.gain.value = 0.2;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
    };

    const detectTone = () => {
      if (!isDetecting) return; // Stop detection if isDetecting is false

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      expectedFrequencies.forEach(targetFreq => {
        const targetBin = Math.floor(targetFreq / binSize);
        const binRange = 4;
        let maxAmplitude = 0;
        let averageAmplitude = 0;
        let samplesCount = 0;

        // Calculate amplitude
        for (let i = targetBin - binRange; i <= targetBin + binRange; i++) {
          if (i >= 0 && i < bufferLength) {
            const amplitude = dataArray[i];
            maxAmplitude = Math.max(maxAmplitude, amplitude);
            averageAmplitude += amplitude;
            samplesCount++;
          }
        }
        averageAmplitude /= samplesCount;

        // Calculate noise floor
        const noiseRange = 10;
        let noiseFloor = 0;
        let noiseSamples = 0;
        for (let i = targetBin - noiseRange - binRange; i <= targetBin + noiseRange + binRange; i++) {
          if (i >= 0 && i < bufferLength && (i < targetBin - binRange || i > targetBin + binRange)) {
            noiseFloor += dataArray[i];
            noiseSamples++;
          }
        }
        noiseFloor /= noiseSamples;

        const dynamicThreshold = Math.max(threshold, noiseFloor * 1.5);

        // Visualize frequency data
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i];
          const isTargetArea = Math.abs(i - targetBin) <= binRange;
          ctx.fillStyle = isTargetArea ? 'rgb(255, 50, 50)' : 'rgb(50, 50, 255)';
          ctx.fillRect(i, canvas.height - barHeight, 1, barHeight);
        }

        // Check for detection
        if (averageAmplitude > dynamicThreshold && maxAmplitude > threshold) {
          const currentDetections = consecutiveDetections.get(targetFreq) || 0;
          consecutiveDetections.set(targetFreq, currentDetections + 1);
          detectedFrequencies.add(targetFreq);
          updateFrequencyIndicator(targetFreq, true);
          lastDetectionTime = Date.now();
        } else {
          const currentDetections = consecutiveDetections.get(targetFreq) || 0;
          consecutiveDetections.set(targetFreq, Math.max(0, currentDetections - 0.5));
          if (currentDetections <= 0) {
            detectedFrequencies.delete(targetFreq);
            updateFrequencyIndicator(targetFreq, false);
          }
        }
      });

      // Check for successful detection
      const now = Date.now();
      const allFrequenciesDetected = expectedFrequencies.every(freq =>
        (consecutiveDetections.get(freq) || 0) >= requiredDetections
      );

      console.log("Detected frequencies", consecutiveDetections);
      console.log("Required",requiredDetections)

      if (allFrequenciesDetected &&
          now - lastNotificationTime > notificationCooldown &&
          !notificationShown) {
        setStatus("All Frequencies Detected! Attendance Marked! 🎉");
        
        if (Notification.permission === "granted" && !notificationShown) {
          new Notification("Attendance Marked!", {
            body: "All frequencies detected. Your attendance has been recorded.",
            requireInteraction: false,
            silent: false
          });
          notificationShown = true;
        }
        
        lastNotificationTime = now;
        playSuccessSound();

        // Stop detection
        isDetecting = false; // Set the flag to false to stop detection
        source.disconnect(); // Disconnect the audio source

        // Reset after success
        setTimeout(() => {
          notificationShown = false;
          consecutiveDetections.clear();
          detectedFrequencies.clear();
          expectedFrequencies.forEach(freq => updateFrequencyIndicator(freq, false));
          setStatus("Listening for signals...");
        }, notificationCooldown);

        // Call the callback with success
        onDetectionComplete(true);
      }

      // Reset if no detection for a while
      if (now - lastDetectionTime > detectionTimeout) {
        consecutiveDetections.clear();
        detectedFrequencies.clear();
        expectedFrequencies.forEach(freq => updateFrequencyIndicator(freq, false));
      }

      requestAnimationFrame(detectTone);
    };

    detectTone();
    return true;
  } catch (error) {
    console.error("Error accessing microphone:", error);
    setStatus("Error: " + error.message);
    onDetectionComplete(false);
    return false;
  }
};

export default detectSound;
