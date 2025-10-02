import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { Activity, Plus, Flame, Clock, TrendingUp } from 'lucide-react';

export function ExercisePage() {
  const { profile } = useUserProfile();
  const [activityType, setActivityType] = useState('walking');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('moderate');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logTime, setLogTime] = useState(new Date().toTimeString().slice(0, 5));
  const [loading, setLoading] = useState(false);
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState({ totalMinutes: 0, totalCalories: 0, activities: 0 });

  const activityTypes = [
    { value: 'walking', label: 'Walking', caloriesPerMin: 4 },
    { value: 'running', label: 'Running', caloriesPerMin: 10 },
    { value: 'cycling', label: 'Cycling', caloriesPerMin: 7 },
    { value: 'swimming', label: 'Swimming', caloriesPerMin: 8 },
    { value: 'yoga', label: 'Yoga', caloriesPerMin: 3 },
    { value: 'strength_training', label: 'Strength Training', caloriesPerMin: 6 },
    { value: 'dancing', label: 'Dancing', caloriesPerMin: 5 },
    { value: 'stretching', label: 'Stretching', caloriesPerMin: 2 },
    { value: 'other', label: 'Other', caloriesPerMin: 4 },
  ];

  useEffect(() => {
    if (!profile) return;

    async function fetchExerciseLogs() {
      const { data } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', profile!.id)
        .order('logged_at', { ascending: false })
        .limit(10);

      if (data) {
        setExerciseLogs(data);

        const today = new Date().toISOString().split('T')[0];
        const todayLogs = data.filter(log => log.logged_at.startsWith(today));
        const totalMinutes = todayLogs.reduce((sum, log) => sum + log.duration_minutes, 0);
        const totalCalories = todayLogs.reduce((sum, log) => sum + (log.calories_burned || 0), 0);

        setTodayStats({
          totalMinutes,
          totalCalories,
          activities: todayLogs.length,
        });
      }
    }

    fetchExerciseLogs();
    const interval = setInterval(fetchExerciseLogs, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  const calculateCalories = (type: string, durationMin: number, intensityLevel: string) => {
    const activity = activityTypes.find(a => a.value === type);
    if (!activity) return 0;

    let multiplier = 1;
    if (intensityLevel === 'light') multiplier = 0.7;
    if (intensityLevel === 'vigorous') multiplier = 1.5;

    return Math.round(activity.caloriesPerMin * durationMin * multiplier);
  };

  const handleLogExercise = async () => {
    if (!profile || !duration) return;

    setLoading(true);
    try {
      const loggedAt = `${logDate}T${logTime}:00`;
      const calories = calculateCalories(activityType, parseInt(duration), intensity);

      const { error } = await supabase.from('exercise_logs').insert([
        {
          user_id: profile.id,
          activity_type: activityType,
          duration_minutes: parseInt(duration),
          calories_burned: calories,
          intensity,
          distance_km: distance ? parseFloat(distance) : null,
          logged_at: loggedAt,
          notes: notes || null,
          source: 'manual',
        },
      ]);

      if (error) throw error;

      const { data } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', profile.id)
        .order('logged_at', { ascending: false })
        .limit(10);

      if (data) {
        setExerciseLogs(data);

        const today = new Date().toISOString().split('T')[0];
        const todayLogs = data.filter(log => log.logged_at.startsWith(today));
        const totalMinutes = todayLogs.reduce((sum, log) => sum + log.duration_minutes, 0);
        const totalCalories = todayLogs.reduce((sum, log) => sum + (log.calories_burned || 0), 0);

        setTodayStats({
          totalMinutes,
          totalCalories,
          activities: todayLogs.length,
        });
      }

      setActivityType('walking');
      setDuration('');
      setIntensity('moderate');
      setDistance('');
      setNotes('');
      setLogDate(new Date().toISOString().split('T')[0]);
      setLogTime(new Date().toTimeString().slice(0, 5));
    } catch (error) {
      alert('Failed to log exercise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <Activity className="w-8 h-8 mr-3 text-orange-600" />
            Exercise & Activity
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Activities</p>
                  <p className="text-4xl font-bold text-gray-900">{todayStats.activities}</p>
                </div>
                <Activity className="w-12 h-12 text-orange-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Minutes</p>
                  <p className="text-4xl font-bold text-gray-900">{todayStats.totalMinutes}</p>
                </div>
                <Clock className="w-12 h-12 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Calories Burned</p>
                  <p className="text-4xl font-bold text-gray-900">{todayStats.totalCalories}</p>
                </div>
                <Flame className="w-12 h-12 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Log Activity</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {activityTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Intensity</label>
                  <select
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="vigorous">Vigorous</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="30"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {duration && (
                    <p className="text-sm text-gray-600 mt-1">
                      Estimated calories: ~{calculateCalories(activityType, parseInt(duration), intensity)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Distance (km) - Optional</label>
                  <input
                    type="number"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="5.0"
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={logTime}
                    onChange={(e) => setLogTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did you feel during this activity?"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleLogExercise}
                disabled={!duration || loading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-lg flex items-center justify-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                {loading ? 'Logging...' : 'Log Activity'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Recent Activities</h3>
            {exerciseLogs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No activities logged yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exerciseLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100"
                  >
                    <div className="flex items-center flex-1">
                      <Activity className="w-5 h-5 text-orange-600 mr-3" />
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {log.activity_type.replace('_', ' ')}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {log.duration_minutes} min
                          </span>
                          {log.calories_burned > 0 && (
                            <span className="flex items-center">
                              <Flame className="w-4 h-4 mr-1" />
                              {log.calories_burned} cal
                            </span>
                          )}
                          {log.distance_km && (
                            <span className="flex items-center">
                              <TrendingUp className="w-4 h-4 mr-1" />
                              {log.distance_km} km
                            </span>
                          )}
                        </div>
                        {log.notes && (
                          <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500">
                        {new Date(log.logged_at).toLocaleDateString()}
                      </span>
                      <p className="text-xs text-gray-500 capitalize">{log.intensity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800">
              <strong>Tip:</strong> Regular physical activity supports your recovery and helps maintain muscle mass during weight loss. Start slow and gradually increase intensity.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
