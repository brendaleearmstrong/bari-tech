import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Timer, Play, Pause, RotateCcw, Clock, Utensils, Droplets } from 'lucide-react';

export function TimersPage() {
  const [biteTimerActive, setBiteTimerActive] = useState(false);
  const [biteSeconds, setBiteSeconds] = useState(0);
  const [biteInterval, setBiteInterval] = useState(30);

  const [mealTimerActive, setMealTimerActive] = useState(false);
  const [mealSeconds, setMealSeconds] = useState(0);
  const [mealDuration, setMealDuration] = useState(20);

  const [waterTimerActive, setWaterTimerActive] = useState(false);
  const [waterSeconds, setWaterSeconds] = useState(0);
  const [waterSeparation, setWaterSeparation] = useState(30);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0qToHh8b5xJgU3j9fz0oU2Bx5uwO/nmVENC0+C4fG/cCYGN4/X89KFNgcebs==');
  }, []);

  useEffect(() => {
    let interval: any;
    if (biteTimerActive) {
      interval = setInterval(() => {
        setBiteSeconds((prev) => {
          const newValue = prev + 1;
          if (newValue >= biteInterval) {
            audioRef.current?.play();
            return 0;
          }
          return newValue;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [biteTimerActive, biteInterval]);

  useEffect(() => {
    let interval: any;
    if (mealTimerActive) {
      interval = setInterval(() => {
        setMealSeconds((prev) => {
          const newValue = prev + 1;
          if (newValue >= mealDuration * 60) {
            audioRef.current?.play();
            setMealTimerActive(false);
            return mealDuration * 60;
          }
          return newValue;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mealTimerActive, mealDuration]);

  useEffect(() => {
    let interval: any;
    if (waterTimerActive) {
      interval = setInterval(() => {
        setWaterSeconds((prev) => {
          const newValue = prev + 1;
          if (newValue >= waterSeparation * 60) {
            audioRef.current?.play();
            setWaterTimerActive(false);
            return waterSeparation * 60;
          }
          return newValue;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [waterTimerActive, waterSeparation]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetBiteTimer = () => {
    setBiteTimerActive(false);
    setBiteSeconds(0);
  };

  const resetMealTimer = () => {
    setMealTimerActive(false);
    setMealSeconds(0);
  };

  const resetWaterTimer = () => {
    setWaterTimerActive(false);
    setWaterSeconds(0);
  };

  const getBiteProgress = () => (biteSeconds / biteInterval) * 100;
  const getMealProgress = () => (mealSeconds / (mealDuration * 60)) * 100;
  const getWaterProgress = () => (waterSeconds / (waterSeparation * 60)) * 100;

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <Timer className="w-8 h-8 mr-3 text-purple-600" />
            Eating & Hydration Timers
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Utensils className="w-6 h-6 mr-2 text-purple-600" />
                  Bite Timer
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Pace your eating by taking breaks between bites. This helps prevent overeating and aids digestion.
              </p>

              <div className="relative mb-4">
                <div className="w-40 h-40 mx-auto relative">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="#9333ea"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - getBiteProgress() / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-gray-900">{biteSeconds}</span>
                    <span className="text-sm text-gray-600">/ {biteInterval}s</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interval: {biteInterval} seconds
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="5"
                    value={biteInterval}
                    onChange={(e) => setBiteInterval(parseInt(e.target.value))}
                    disabled={biteTimerActive}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>15s</span>
                    <span>30s</span>
                    <span>60s</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setBiteTimerActive(!biteTimerActive)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {biteTimerActive ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetBiteTimer}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Clock className="w-6 h-6 mr-2 text-orange-600" />
                  Meal Timer
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Take your time eating. Meals should last 20-30 minutes to allow proper digestion and satiety signals.
              </p>

              <div className="relative mb-4">
                <div className="w-40 h-40 mx-auto relative">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="#ea580c"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - getMealProgress() / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-gray-900">{formatTime(mealSeconds)}</span>
                    <span className="text-sm text-gray-600">/ {mealDuration}m</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration: {mealDuration} minutes
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="45"
                    step="5"
                    value={mealDuration}
                    onChange={(e) => setMealDuration(parseInt(e.target.value))}
                    disabled={mealTimerActive}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>15m</span>
                    <span>30m</span>
                    <span>45m</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setMealTimerActive(!mealTimerActive)}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {mealTimerActive ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetMealTimer}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Droplets className="w-6 h-6 mr-2 text-blue-600" />
                  Water Timer
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Wait 30 minutes after meals before drinking water to optimize digestion and prevent discomfort.
              </p>

              <div className="relative mb-4">
                <div className="w-40 h-40 mx-auto relative">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="#0ea5e9"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - getWaterProgress() / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-gray-900">{formatTime(waterSeconds)}</span>
                    <span className="text-sm text-gray-600">/ {waterSeparation}m</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wait time: {waterSeparation} minutes
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="15"
                    value={waterSeparation}
                    onChange={(e) => setWaterSeparation(parseInt(e.target.value))}
                    disabled={waterTimerActive}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>15m</span>
                    <span>30m</span>
                    <span>60m</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setWaterTimerActive(!waterTimerActive)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {waterTimerActive ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetWaterTimer}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-gray-900 mb-2">Why use a bite timer?</h4>
              <p className="text-sm text-gray-600">
                Taking breaks between bites helps prevent overeating, reduces the risk of dumping syndrome, and allows your body to register fullness signals.
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-gray-900 mb-2">Why eat slowly?</h4>
              <p className="text-sm text-gray-600">
                Eating meals over 20-30 minutes aids digestion, helps identify fullness cues, and reduces discomfort from eating too quickly.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-2">Why separate water and food?</h4>
              <p className="text-sm text-gray-600">
                Waiting 30 minutes before and after meals prevents liquid from washing food through too quickly, optimizing nutrient absorption and preventing discomfort.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
