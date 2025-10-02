import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import {
  calculateBMI,
  calculateProteinTarget,
  calculateFluidTarget,
  calculateIdealBodyWeight,
  daysSinceSurgery,
} from '../lib/calculators';
import {
  Heart,
  TrendingDown,
  Droplets,
  Utensils,
  Pill,
  Target,
  Activity,
  Plus,
  MessageCircle,
} from 'lucide-react';

export function DashboardPage() {
  const profile = useUserProfile().profile;
  const [todayStats, setTodayStats] = useState({
    protein: 0,
    proteinTarget: 80,
    water: 0,
    waterTarget: 1800,
    meals: 0,
  });

  useEffect(() => {
    if (!profile) return;

    async function fetchTodayStats() {
      const today = new Date().toISOString().split('T')[0];
      const ibw = calculateIdealBodyWeight(profile.height_cm || 170, (profile.gender as any) || 'female');
      const proteinTargets = calculateProteinTarget(profile.current_weight_kg || 80, ibw.ibwKg, 'regular');
      const fluidTargets = calculateFluidTarget(profile.current_weight_kg || 80, 'regular');

      const mealsData = await supabase.from('meal_entries').select('total_protein_g').eq('user_id', profile.id).gte('logged_at', today);
      const waterData = await supabase.from('water_logs').select('amount_ml').eq('user_id', profile.id).gte('logged_at', today);

      const totalProtein = mealsData.data?.reduce((sum, m) => sum + (m.total_protein_g || 0), 0) || 0;
      const totalWater = waterData.data?.reduce((sum, w) => sum + w.amount_ml, 0) || 0;

      setTodayStats({
        protein: totalProtein,
        proteinTarget: proteinTargets.dailyGrams,
        water: totalWater,
        waterTarget: fluidTargets.dailyMl,
        meals: mealsData.data?.length || 0,
      });
    }

    fetchTodayStats();
    const interval = setInterval(fetchTodayStats, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </Layout>
    );
  }

  const bmi = profile.current_weight_kg && profile.height_cm ? calculateBMI(profile.current_weight_kg, profile.height_cm) : null;
  const daysPostOp = profile.surgery_date ? daysSinceSurgery(profile.surgery_date) : null;
  const proteinPct = (todayStats.protein / todayStats.proteinTarget) * 100;
  const waterPct = (todayStats.water / todayStats.waterTarget) * 100;
  const weightLost = profile.baseline_weight_kg && profile.current_weight_kg ? profile.baseline_weight_kg - profile.current_weight_kg : 0;

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile.name || 'there'}!</h1>
              <p className="text-gray-600 mt-1">{daysPostOp !== null ? 'Day ' + daysPostOp + ' post-surgery' : 'Pre-surgery phase'}</p>
            </div>
            <div className="text-left md:text-right mt-4 md:mt-0">
              <div className="text-sm text-gray-600">Current Phase</div>
              <div className="text-xl font-semibold text-teal-600">Regular</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Weight</p>
                  <p className="text-2xl font-bold text-gray-900">{profile.current_weight_kg?.toFixed(1) || '--'} kg</p>
                  {bmi && <p className="text-sm text-gray-600 mt-1">BMI: {bmi.bmi}</p>}
                </div>
                <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Weight Lost</p>
                  <p className="text-2xl font-bold text-gray-900">{weightLost.toFixed(1)} kg</p>
                  {profile.baseline_weight_kg && <p className="text-sm text-gray-600 mt-1">{((weightLost / profile.baseline_weight_kg) * 100).toFixed(1)}%</p>}
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Surgery Type</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{profile.surgery_type || 'Not set'}</p>
                  {profile.surgery_date && <p className="text-sm text-gray-600 mt-1">{new Date(profile.surgery_date).toLocaleDateString()}</p>}
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Utensils className="w-5 h-5 mr-2 text-teal-600" />
                Daily Protein
              </h2>
              <span className="text-sm text-gray-600">{todayStats.protein.toFixed(0)}g / {todayStats.proteinTarget}g</span>
            </div>
            <div className="relative pt-1">
              <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                <div style={{ width: Math.min(proteinPct, 100) + '%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-600 transition-all duration-500"></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{proteinPct.toFixed(0)}% of daily target</p>
            </div>
            <div className="mt-4 p-3 bg-teal-50 rounded-lg">
              <p className="text-sm text-teal-800"><strong>Tip:</strong> Prioritize protein at every meal to support healing.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Droplets className="w-5 h-5 mr-2 text-blue-600" />
                Daily Hydration
              </h2>
              <span className="text-sm text-gray-600">{todayStats.water}ml / {todayStats.waterTarget}ml</span>
            </div>
            <div className="relative pt-1">
              <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                <div style={{ width: Math.min(waterPct, 100) + '%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{waterPct.toFixed(0)}% of daily target</p>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800"><strong>Reminder:</strong> Sip water throughout the day.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-teal-600" />
              Today's Activity
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Utensils className="w-5 h-5 text-gray-600 mr-3" />
                  <span className="text-gray-700">Meals Logged</span>
                </div>
                <span className="text-xl font-semibold text-teal-600">{todayStats.meals}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Pill className="w-5 h-5 text-gray-600 mr-3" />
                  <span className="text-gray-700">Supplements</span>
                </div>
                <span className="text-xl font-semibold text-teal-600">0 / 5</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg p-6 text-white">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Heart className="w-5 h-5 mr-2" fill="white" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <a href="/nutrition" className="flex items-center justify-between w-full bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 font-semibold transition-all">
                <span>Log a Meal</span>
                <Plus className="w-5 h-5" />
              </a>
              <a href="/water" className="flex items-center justify-between w-full bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 font-semibold transition-all">
                <span>Log Water</span>
                <Plus className="w-5 h-5" />
              </a>
              <a href="/weight" className="flex items-center justify-between w-full bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 font-semibold transition-all">
                <span>Log Weight</span>
                <Plus className="w-5 h-5" />
              </a>
              <a href="/assistant" className="flex items-center justify-between w-full bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 font-semibold transition-all">
                <span>AI Assistant</span>
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
