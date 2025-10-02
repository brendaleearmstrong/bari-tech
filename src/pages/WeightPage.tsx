import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { WeightProgressChart } from '../components/WeightProgressChart';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { calculateBMI } from '../lib/calculators';
import { Weight, TrendingDown, Target, Plus, X } from 'lucide-react';

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
  const [showLogForm, setShowLogForm] = useState(false);
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
      .order('achieved_at', { ascending: false});

    setMilestones(milestonesData || []);

    const { data: goalData } = await supabase
      .from('weight_goals')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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
        title: 'First 5kg Lost',
        description: 'Amazing start to your journey',
      });
    }

    if (weightLost >= 10 && !existingMilestones.has('10kg_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '10kg_lost',
        milestone_weight_kg: newWeight,
        title: '10kg Milestone',
        description: 'Double digits - incredible progress',
      });
    }

    if (weightLost >= 20 && !existingMilestones.has('20kg_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '20kg_lost',
        milestone_weight_kg: newWeight,
        title: '20kg Achievement',
        description: 'You are crushing your goals',
      });
    }

    if (weightLost >= 30 && !existingMilestones.has('30kg_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '30kg_lost',
        milestone_weight_kg: newWeight,
        title: '30kg Success',
        description: 'Your dedication is paying off',
      });
    }

    if (percentLost >= 10 && !existingMilestones.has('10_percent_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '10_percent_lost',
        milestone_weight_kg: newWeight,
        title: '10% Weight Loss',
        description: 'First percentage milestone achieved',
      });
    }

    if (percentLost >= 25 && !existingMilestones.has('25_percent_lost')) {
      milestonesToCreate.push({
        user_id: profile.id,
        milestone_type: '25_percent_lost',
        milestone_weight_kg: newWeight,
        title: 'Quarter Way There',
        description: '25% of your weight lost',
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
          title: 'Halfway to Goal',
          description: '50% of the way to your goal weight',
        });
      }

      if (newWeight <= profile.goal_weight_kg && !existingMilestones.has('goal_reached')) {
        milestonesToCreate.push({
          user_id: profile.id,
          milestone_type: 'goal_reached',
          milestone_weight_kg: newWeight,
          title: 'Goal Reached',
          description: 'You have reached your goal weight',
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
      setShowLogForm(false);
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

  const goalProgress = profile?.baseline_weight_kg && profile?.goal_weight_kg && profile?.current_weight_kg
    ? ((profile.baseline_weight_kg - profile.current_weight_kg) / (profile.baseline_weight_kg - profile.goal_weight_kg)) * 100
    : 0;

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Weight Tracker</h1>
            <p className="text-gray-600 mt-1">Monitor your progress and celebrate milestones</p>
          </div>
          <button
            onClick={() => setShowLogForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            Log Weight
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center">
                <Weight className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Current Weight</div>
                <div className="text-3xl font-bold text-gray-900 mt-0.5">
                  {profile?.current_weight_kg?.toFixed(1) || '--'} <span className="text-xl text-gray-500">kg</span>
                </div>
              </div>
            </div>
            {profile?.height_cm && profile?.current_weight_kg && (
              <div className="pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  BMI: <span className="font-semibold text-gray-900">{calculateBMI(profile.current_weight_kg, profile.height_cm).bmi}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Total Lost</div>
                <div className="text-3xl font-bold text-emerald-600 mt-0.5">
                  {weightLost.toFixed(1)} <span className="text-xl">kg</span>
                </div>
              </div>
            </div>
            {profile?.baseline_weight_kg && weightLost > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-emerald-600">{((weightLost / profile.baseline_weight_kg) * 100).toFixed(1)}%</span> of starting weight
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500">Goal Weight</div>
                {profile?.goal_weight_kg ? (
                  <div className="text-3xl font-bold text-gray-900 mt-0.5">
                    {profile.goal_weight_kg.toFixed(1)} <span className="text-xl text-gray-500">kg</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowGoalForm(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-1"
                  >
                    Set your goal →
                  </button>
                )}
              </div>
            </div>
            {profile?.goal_weight_kg && goalProgress > 0 && (
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold text-indigo-600">{Math.min(goalProgress, 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(goalProgress, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {showLogForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Log Weight Entry</h2>
                <button
                  onClick={() => setShowLogForm(false)}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    step="0.1"
                    placeholder="70.5"
                    className="w-full px-4 py-4 text-lg border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                  {bmiInfo && (
                    <p className="text-sm text-gray-600 mt-2">
                      BMI: {bmiInfo.bmi} ({bmiInfo.category})
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Date</label>
                    <input
                      type="date"
                      value={measureDate}
                      onChange={(e) => setMeasureDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Time</label>
                    <input
                      type="time"
                      value={measureTime}
                      onChange={(e) => setMeasureTime(e.target.value)}
                      className="w-full px-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="How are you feeling today?"
                    rows={4}
                    className="w-full px-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  onClick={handleLogWeight}
                  disabled={!weight || loading}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-2xl shadow-sm transition-colors"
                >
                  {loading ? 'Logging...' : 'Log Weight Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showGoalForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-8 max-w-xl w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Set Goal Weight</h2>
                <button
                  onClick={() => setShowGoalForm(false)}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Goal Weight (kg)</label>
                  <input
                    type="number"
                    value={goalWeight}
                    onChange={(e) => setGoalWeight(e.target.value)}
                    step="0.1"
                    placeholder="75.0"
                    className="w-full px-4 py-4 text-lg border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Target Date (optional)</label>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleSetGoal}
                  disabled={!goalWeight || loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-2xl shadow-sm transition-colors"
                >
                  {loading ? 'Setting...' : 'Set Goal'}
                </button>
              </div>
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

        {profile?.baseline_weight_kg && weightHistory.length > 0 && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Journey Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Starting Weight</div>
                <div className="text-2xl font-bold text-gray-900">{profile.baseline_weight_kg.toFixed(1)} kg</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Weight Lost</div>
                <div className="text-2xl font-bold text-emerald-600">{weightLost.toFixed(1)} kg</div>
                <div className="text-xs text-gray-600 mt-1">
                  {((weightLost / profile.baseline_weight_kg) * 100).toFixed(1)}% of starting weight
                </div>
              </div>
              {profile.goal_weight_kg && (
                <>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">Remaining to Goal</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {profile.current_weight_kg && profile.current_weight_kg > profile.goal_weight_kg
                        ? (profile.current_weight_kg - profile.goal_weight_kg).toFixed(1)
                        : '0.0'} kg
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">Progress to Goal</div>
                    <div className="text-2xl font-bold text-indigo-600">{Math.min(goalProgress, 100).toFixed(0)}%</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {profile.current_weight_kg && profile.current_weight_kg <= profile.goal_weight_kg
                        ? 'Goal achieved!'
                        : 'Keep going!'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {weightHistory.length > 0 && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Entries</h2>
            <div className="space-y-3">
              {weightHistory.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">{entry.weight_kg} kg</div>
                    {entry.bmi && (
                      <div className="text-sm text-gray-600 mt-0.5">BMI: {entry.bmi.toFixed(1)}</div>
                    )}
                    {entry.notes && (
                      <div className="text-sm text-gray-600 mt-1">{entry.notes}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">
                      {new Date(entry.measured_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(entry.measured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
