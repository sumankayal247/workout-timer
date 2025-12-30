import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppStatus } from './types';
import RainbowButton from './components/RainbowButton';

// Using the verified working link provided
const WORKOUT_AUDIO_URL = 'https://sts-christtube-dev.s3.ap-south-1.amazonaws.com/audios/1767094336449_correct_1-10_rest_1-10_done.mp3'; 

const App: React.FC = () => {
  const [roundsInput, setRoundsInput] = useState<number>(3);
  const [status, setStatus] = useState<AppStatus>(AppStatus.SETUP);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // new: keep available voices
  const voicesRef = useRef<SpeechSynthesisVoice[] | null>(null);
  useEffect(() => {
    // Guard against environments / browsers that don't support Speech Synthesis
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // new: speak helper that returns a Promise
  const speak = (text: string) => {
    return new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      const voices = voicesRef.current && voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
      // prefer Google-branded voices when available
      const preferred = voices.find(v => /google/i.test(v.name)) || voices[0];
      if (preferred) utter.voice = preferred;
      // small tweaks (optional)
      utter.rate = 1;
      utter.pitch = 1;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      // cancel any in-progress TTS before speaking
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
      window.speechSynthesis.speak(utter);
    });
  };

  const startWorkout = async () => {
    if (roundsInput < 1) return;
    setAudioError(null);

    if (audioRef.current) {
      try {
        // announce round first, then play audio
        setCurrentRound(1);
        await speak(`Round ${1}.`);
        // Reset state and attempt play
        audioRef.current.currentTime = 0;
        await audioRef.current.play();

        setStatus(AppStatus.PLAYING);
        setProgress(0);
      } catch (err: any) {
        console.error("Playback Error:", err?.message || "Check your internet connection.");
        setAudioError("Unable to start audio. Please check your connection.");
      }
    }
  };
console.log(`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⡴⣆⠀⠀⠀⠀⠀⣠⡀⠀⠀⠀⠀⠀⠀⣼⣿⡗⠀⠀⠀⠀
⠀⠀⠀⣠⠟⠀⠘⠷⠶⠶⠶⠾⠉⢳⡄⠀⠀⠀⠀⠀⣧⣿⠀⠀⠀⠀⠀
⠀⠀⣰⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⣤⣤⣤⣤⣤⣤⣿⢿⣄⠀⠀⠀⠀
⠀⠀⡇⠀⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣧⠀⠀⠀⠀⠀⠀⠙⣷⡴⠶⣦
⠀⠀⢱⡀⠀⠉⠉⠀⠀⠀⠀⠛⠃⠀⢠⡟⠂⠀⠀⢀⣀⣠⣤⠿⠞⠛⠋
⣠⠾⠋⠙⣶⣤⣤⣤⣤⣤⣀⣠⣤⣾⣿⠴⠶⠚⠋⠉⠁⠀⠀⠀⠀⠀⠀
⠛⠒⠛⠉⠉⠀⠀⠀⣴⠟⣣⡴⠛⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠛⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`);

  const togglePlayPause = () => {
    if (status === AppStatus.PLAYING) {
      setStatus(AppStatus.PAUSED);
      audioRef.current?.pause();
    } else if (status === AppStatus.PAUSED) {
      setStatus(AppStatus.PLAYING);
      audioRef.current?.play().catch(err => console.error("Resume failed:", err?.message));
    }
  };

  const resetToSetup = useCallback(() => {
    setStatus(AppStatus.SETUP);
    setCurrentRound(0);
    setProgress(0);
    setAudioError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // make handler async so we can announce next round before playing
  const handleAudioEnded = async () => {
    if (currentRound < roundsInput) {
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      if (audioRef.current) {
        // announce next round, then restart audio
        try {
          await speak(`Round ${nextRound}.`);
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
        } catch (err: any) {
          console.error("Round transition failed:", err?.message);
          setAudioError("Auto-play blocked for next round.");
        }
      }
    } else {
      setStatus(AppStatus.COMPLETED);
      // Brief delay before returning to setup to show success state
      setTimeout(() => {
        resetToSetup();
      }, 3000);
    }
  };

  const updateProgress = () => {
    if (audioRef.current && audioRef.current.duration) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const renderSetup = () => (
    <div className="flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-500 w-full max-w-sm mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-extralight tracking-tighter text-gray-900">Workout Timer</h1>
        <p className="text-gray-400 font-light tracking-widest uppercase text-[10px]">Minimalist Exercise Timer</p>
      </div>

      <div className="w-full flex flex-col items-center space-y-10 px-4">
        <div className="flex flex-col items-center space-y-4">
          <label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Total Rounds</label>
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setRoundsInput(Math.max(1, roundsInput - 1))}
              className="w-14 h-14 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors text-3xl text-gray-300 font-light active:scale-90"
            >
              −
            </button>
            <span className="text-8xl font-thin w-28 text-center text-gray-800 tabular-nums">
              {roundsInput}
            </span>
            <button 
              onClick={() => setRoundsInput(roundsInput + 1)}
              className="w-14 h-14 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors text-3xl text-gray-300 font-light active:scale-90"
            >
              +
            </button>
          </div>
        </div>

        <div className="w-full space-y-4">
          <RainbowButton 
            onClick={startWorkout} 
            className="w-full h-20 shadow-xl"
          >
            <span className="text-2xl uppercase tracking-[0.3em] font-light">Play</span>
          </RainbowButton>

          {audioError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] text-center border border-red-100">
              {audioError}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderActive = () => (
    <div className="flex flex-col items-center justify-center w-full animate-in zoom-in duration-500 max-w-md">
      <div className="text-center h-32 flex flex-col justify-center">
        <div className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-bold mb-1">Round</div>
        <div className="text-8xl font-thin text-gray-800 tabular-nums flex items-baseline justify-center">
          {currentRound} 
          <span className="text-gray-200 text-3xl mx-3 font-normal">/</span> 
          <span className="text-gray-300 text-4xl">{roundsInput}</span>
        </div>
      </div>

      <div className="relative w-80 h-80 my-8 flex items-center justify-center flex-shrink-0">
        <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="94"
            stroke="#f9fafb"
            strokeWidth="2.5"
            fill="transparent"
          />
          <circle
            cx="100"
            cy="100"
            r="94"
            stroke="#1f2937"
            strokeWidth="2.5"
            fill="transparent"
            strokeDasharray={590.6}
            strokeDashoffset={590.6 - (590.6 * progress) / 100}
            strokeLinecap="round"
            className="transition-all duration-300 ease-linear"
          />
        </svg>

        <div className="z-10 w-44 h-44">
          <RainbowButton 
            onClick={togglePlayPause}
            className="w-full h-full shadow-2xl"
          >
            <div className="w-full h-full flex items-center justify-center">
              {status === AppStatus.PLAYING ? (
                <svg className="w-14 h-14 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="5" width="4" height="14" rx="1.5" />
                  <rect x="14" y="5" width="4" height="14" rx="1.5" />
                </svg>
              ) : (
                <svg className="w-14 h-14 text-gray-800 ml-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5.14v14l11-7-11-7z" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </RainbowButton>
        </div>
      </div>

      <div className="h-12 flex items-center">
        <button 
          onClick={resetToSetup}
          className="text-gray-300 hover:text-gray-500 transition-colors uppercase tracking-[0.3em] text-[10px] font-bold border-b border-transparent hover:border-gray-200 pb-1"
        >
          Cancel Workout
        </button>
      </div>
    </div>
  );

  const renderCompleted = () => (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in bounce-in duration-700">
      <div className="w-32 h-32 bg-gray-50 border border-gray-100 text-gray-200 rounded-full flex items-center justify-center shadow-inner">
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-extralight text-gray-900">Session Finished</h2>
        <p className="text-gray-400 font-light tracking-wide italic">Great job!</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-gray-800 overflow-hidden">
      <main className="w-full flex items-center justify-center">
        {status === AppStatus.SETUP && renderSetup()}
        {(status === AppStatus.PLAYING || status === AppStatus.PAUSED) && renderActive()}
        {status === AppStatus.COMPLETED && renderCompleted()}
      </main>

      <audio 
        ref={audioRef}
        src={WORKOUT_AUDIO_URL}
        onEnded={handleAudioEnded}
        onTimeUpdate={updateProgress}
        preload="auto"
        onError={() => {
           console.error("Audio engine encountered an error loading the remote stream.");
        }}
      />
    </div>
  );
};

export default App;
