import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { WeightProgressChart } from '../components/WeightProgressChart';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { calculateBMI } from '../lib/calculators';
import { Weight, TrendingDown, Check, Target, Trophy, Star, Plus, Edit2 } from 'lucide-react';

export function WeightPage() {
  const { profile, updateProfile } = useUserProfile();
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [measureDate, setMeasureDate] = useState(new Date().toISOString().split('T')[0]);
  const [measureTime, setMeasureTime] = useState(new Date().toTimeString().slice(0, 5));
  const [loading, setLoading] = useState(false);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [currentGoal, setCurrentGoal] = useState<any>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalWeight, setGoalWeight] = useState('');
  const [goalDate, setGoalDate] = useState('');

  useEffect(() => {
    if (!profile) return;
    fetchWeightData();
  }, [profile]);

  const fetchWeightData = async () => {
    if (!profile) return;

    const { data: weights } = await supabase
      .from('weight_entries')
      .select('*')
      .eq('user_id', profile.id)
      .order('measured_at', { ascending: false })
      .limit(30);

    setWeightHistory(weights || []);

    const { data: milestonesData } = await supabase
      .from('weight_milestones')
      .select('*')
      .eq('user_id', profile.id)
      .order('achieved_at', { ascending: false });

    setMilestones(milestonesData || []);

    const { data: goalData } = await supabase
      .from('weight_goals')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setCurrentGoal(goalData);
  };

  const checkAndCreateMilestones = async (newWeight: number) => {
    if (!profile || !profile.baseline_weight_kg) return;

    const weightLost = profile.baseline_weight_kg - newWeight;
    const percentLost = (weightLost / profile.baseline_weight_kg) * 100;

    const milestonesToCreate = [];

    const existingMilestones = new Set(milestones.map(m => m.milestone_type));

    if (weightLost >= 5 && !existingMilestones.has('5kg_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '5kg_lost',
        milestone_weight_kg: newWeight,
        title: 'First 5kg Lost!',
        description: 'Amazing start to your journey!',
      });
    }

    if (weightLost >= 10 && !existingMilestones.has('10kg_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '10kg_lost',
        milestone_weight_kg: newWeight,
        title: '10kg Milestone!',
        description: 'Double digits - incredible progress!',
      });
    }

    if (weightLost >= 20 && !existingMilestones.has('20kg_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '20kg_lost',
        milestone_weight_kg: newWeight,
        title: '20kg Achievement!',
        description: 'You are crushing your goals!',
      });
    }

    if (weightLost >= 30 && !existingMilestones.has('30kg_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '30kg_lost',
        milestone_weight_kg: newWeight,
        title: '30kg Success!',
        description: 'Your dedication is paying off!',
      });
    }

    if (percentLost >= 10 && !existingMilestones.has('10_percent_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '10_percent_lost',
        milestone_weight_kg: newWeight,
        title: '10% Weight Loss!',
        description: 'First percentage milestone achieved!',
      });
    }

    if (percentLost >= 25 && !existingMilestones.has('25_percent_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '25_percent_lost',
        milestone_weight_kg: newWeight,
        title: 'Quarter Way There!',
        description: '25% of your weight lost - phenomenal!',
      });
    }

    if (profile.goal_weight_kg) {
      const totalToLose = profile.baseline_weight_kg - profile.goal_weight_kg;
      const progressPercent = (weightLost / totalToLose) * 100;

      if (progressPercent >= 50 && !existingMilestones.has('halfway_to_goal')) {
        milestonesToCreate.push({
          user_id: profile.id,
          milestone_type: 'halfway_to_goal',
          milestone_weight_kg: newWeight,
          title: 'Halfway to Goal!',
          description: 'You are 50% of the way to your goal weight!',
        });
      }

      if (newWeight <= profile.goal_weight_kg && !existingMilestones.has('goal_reached')) {
        milestonesToCreate.push({
          user_id: profile.id,
          milestone_type: 'goal_reached',
          milestone_weight_kg: newWeight,
          title: 'GOAL REACHED!',
          description: 'Congratulations! You have reached your goal weight!',
        });
      }
    }

    if (milestonesToCreate.length > 0) {
      await supabase.from('weight_milestones').insert(milestonesToCreate);
    }
  };

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
        await checkAndCreateMilestones(parseFloat(weight));
      }

      await fetchWeightData();
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

  const handleSetGoal = async () => {
    if (!profile || !goalWeight) return;

    setLoading(true);
    try {
      await supabase.from('weight_goals').update({ is_active: false }).eq('user_id', profile.id);

      const { error } = await supabase.from('weight_goals').insert([
        {
          user_id: profile.id,
          goal_weight_kg: parseFloat(goalWeight),
          goal_date: goalDate || null,
          is_active: true,
        },
      ]);

      if (error) throw error;

      await updateProfile({ goal_weight_kg: parseFloat(goalWeight) });
      await fetchWeightData();
      setShowGoalForm(false);
      setGoalWeight('');
      setGoalDate('');
    } catch (error) {
      alert('Failed to set goal');
    } finally {
      setLoading(false);
    }
  };

  const bmiInfo = weight && profile?.height_cm
    ? calculateBMI(parseFloat(weight), profile.height_cm)
    : null;

  const weightLost = profile?.baseline_weight_kg && profile?.current_weight_kg
    ? profile.baseline_weight_kg - profile.current_weight_kg
    : 0;

  const motivationalMessages = [
    "Every pound lost is a victory!",
    "You're doing amazing!",
    "Progress, not perfection!",
    "Your dedication is inspiring!",
    "Keep going - you've got this!",
    "Each day is a new opportunity!",
    "Celebrate every milestone!",
  ];

  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-xl p-8 text-white">
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <Weight className="w-10 h-10 mr-3" />
            Weight Tracker
          </h1>
          <p className="text-teal-100 text-lg">{randomMessage}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-teal-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Current Weight</p>
              <Weight className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              {profile?.current_weight_kg?.toFixed(1) || '--'} kg
            </p>
            {profile?.height_cm && profile?.current_weight_kg && (
              <p className="text-sm text-gray-600 mt-2">
                BMI: {calculateBMI(profile.current_weight_kg, profile.height_cm).bmi}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Lost</p>
              <TrendingDown className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-4xl font-bold text-green-700">
              {weightLost.toFixed(1)} kg
            </p>
            {profile?.baseline_weight_kg && weightLost > 0 && (
              <p className="text-sm text-green-600 mt-2">
                {((weightLost / profile.baseline_weight_kg) * 100).toFixed(1)}% of starting weight
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Goal Weight</p>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            {profile?.goal_weight_kg ? (
              <>
                <p className="text-4xl font-bold text-blue-700">
                  {profile.goal_weight_kg.toFixed(1)} kg
                </p>
                {profile.current_weight_kg && (
                  <p className="text-sm text-blue-600 mt-2">
                    {(profile.current_weight_kg - profile.goal_weight_kg).toFixed(1)} kg to go
                  </p>
                )}
              </>
            ) : (
              <button
                onClick={() => setShowGoalForm(true)}
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center mt-2"
              >
                <Plus className="w-5 h-5 mr-1" />
                Set Goal
              </button>
            )}
          </div>
        </div>

        {showGoalForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Set Your Goal Weight</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goal Weight (kg)</label>
                <input
                  type="number"
                  value={goalWeight}
                  onChange={(e) => setGoalWeight(e.target.value)}
                  step="0.1"
                  placeholder="75.0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Date (optional)</label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSetGoal}
                disabled={!goalWeight || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg"
              >
                {loading ? 'Setting...' : 'Set Goal'}
              </button>
              <button
                onClick={() => setShowGoalForm(false)}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {profile && (
          <WeightProgressChart
            entries={weightHistory}
            baselineWeight={profile.baseline_weight_kg}
            goalWeight={profile.goal_weight_kg || currentGoal?.goal_weight_kg}
            milestones={milestones}
          />
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Log New Weight</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                step="0.1"
                placeholder="70.5"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={measureTime}
                  onChange={(e) => setMeasureTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How are you feeling today?"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="md:col-span-2">
              <button
                onClick={handleLogWeight}
                disabled={!weight || loading}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                {loading ? 'Logging...' : 'Log Weight'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Entries</h3>
          {weightHistory.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Weight className="w-16 h-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No weight entries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weightHistory.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 rounded-lg border border-teal-200 transition-colors"
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
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(entry.measured_at).toLocaleDateString()}
                    </span>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.measured_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Star className="w-6 h-6 mr-2 text-purple-600" />
            Pro Tips for Success
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Weigh yourself at the same time each day for consistency</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Morning weight (after bathroom, before breakfast) is most accurate</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Weight fluctuates daily - focus on the trend, not single measurements</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Celebrate non-scale victories: energy levels, clothing fit, health improvements</span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
