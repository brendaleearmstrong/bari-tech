import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { WeightChart } from '../components/WeightChart';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { calculateBMI } from '../lib/calculators';
import { Weight, TrendingDown, Check } from 'lucide-react';

export function WeightPage() {
  const { profile, updateProfile } = useUserProfile();
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [measureDate, setMeasureDate] = useState(new Date().toISOString().split('T')[0]);
  const [measureTime, setMeasureTime] = useState(new Date().toTimeString().slice(0, 5));
  const [loading, setLoading] = useState(false);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;

    async function fetchWeightHistory() {
      const { data } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', profile!.id)
        .order('measured_at', { ascending: false })
        .limit(10);

      setWeightHistory(data || []);
    }

    fetchWeightHistory();
  }, [profile]);

  const handleLogWeight = async () => {
    if (!profile || !weight) return;

    setLoading(true);
    try {
      const measuredAt = `${measureDate}T${measureTime}:00`;
      const bmiCalc = profile.height_cm ? calculateBMI(parseFloat(weight), profile.height_cm) : null;

      const { error } = await supabase.from('weight_entries').insert([
        {
          user_id: profile.id,
          weight_kg: parseFloat(weight),
          measured_at: measuredAt,
          source: 'manual',
          bmi: bmiCalc ? parseFloat(bmiCalc.bmi) : null,
          notes: notes || null,
        },
      ]);

      if (error) throw error;

      const isToday = measureDate === new Date().toISOString().split('T')[0];
      if (isToday) {
        await updateProfile({ current_weight_kg: parseFloat(weight) });
      }

      const { data } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('measured_at', { ascending: false })
        .limit(10);

      setWeightHistory(data || []);
      setWeight('');
      setNotes('');
      setMeasureDate(new Date().toISOString().split('T')[0]);
      setMeasureTime(new Date().toTimeString().slice(0, 5));
    } catch (error) {
      alert('Failed to log weight');
    } finally {
      setLoading(false);
    }
  };

  const bmiInfo = weight && profile?.height_cm
    ? calculateBMI(parseFloat(weight), profile.height_cm)
    : null;

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <Weight className="w-8 h-8 mr-3 text-teal-600" />
            Weight Tracker
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-100">
              <p className="text-sm text-gray-600 mb-1">Current Weight</p>
              <p className="text-4xl font-bold text-gray-900">
                {profile?.current_weight_kg?.toFixed(1) || '--'} kg
              </p>
              {profile?.baseline_weight_kg && profile?.current_weight_kg && (
                <p className="text-sm text-teal-600 mt-2 flex items-center">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  {(profile.baseline_weight_kg - profile.current_weight_kg).toFixed(1)} kg lost
                </p>
              )}
            </div>

            {profile?.height_cm && profile?.current_weight_kg && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                <p className="text-sm text-gray-600 mb-1">Current BMI</p>
                <p className="text-4xl font-bold text-gray-900">
                  {calculateBMI(profile.current_weight_kg, profile.height_cm).bmi}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {calculateBMI(profile.current_weight_kg, profile.height_cm).category}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Log New Weight</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  step="0.1"
                  placeholder="70.5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                {bmiInfo && (
                  <p className="text-sm text-gray-600 mt-2">
                    New BMI: {bmiInfo.bmi} ({bmiInfo.category})
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={measureDate}
                    onChange={(e) => setMeasureDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={measureTime}
                    onChange={(e) => setMeasureTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How are you feeling today?"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleLogWeight}
                disabled={!weight || loading}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-lg"
              >
                {loading ? 'Logging...' : 'Log Weight'}
              </button>
            </div>
          </div>

          {weightHistory.length > 0 && (
            <div className="mb-6">
              <WeightChart entries={weightHistory} baselineWeight={profile?.baseline_weight_kg || undefined} />
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Weight History</h3>
            {weightHistory.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No weight entries yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weightHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center flex-1">
                      <Check className="w-5 h-5 text-teal-600 mr-3" />
                      <div>
                        <p className="font-semibold text-gray-900">{entry.weight_kg} kg</p>
                        {entry.bmi && (
                          <p className="text-sm text-gray-600">BMI: {entry.bmi.toFixed(1)}</p>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(entry.measured_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
