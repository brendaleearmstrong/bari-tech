import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { calculateFluidTarget } from '../lib/calculators';
import { Droplets, Plus, Check } from 'lucide-react';

export function WaterPage() {
  const { profile } = useUserProfile();
  const [amount, setAmount] = useState('');
  const [todayTotal, setTodayTotal] = useState(0);
  const [target, setTarget] = useState(1800);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const quickAmounts = [100, 250, 500, 750];

  useEffect(() => {
    if (!profile) return;

    const fluidTarget = calculateFluidTarget(profile.current_weight_kg || 80, 'regular');
    setTarget(fluidTarget.dailyMl);

    async function fetchWaterLogs() {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', profile!.id)
        .gte('logged_at', today)
        .order('logged_at', { ascending: false });

      if (data) {
        setRecentLogs(data);
        const total = data.reduce((sum, log) => sum + log.amount_ml, 0);
        setTodayTotal(total);
      }
    }

    fetchWaterLogs();
    const interval = setInterval(fetchWaterLogs, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  const handleLogWater = async (ml: number) => {
    if (!profile) return;

    const { error } = await supabase.from('water_logs').insert([
      {
        user_id: profile.id,
        amount_ml: ml,
        logged_at: new Date().toISOString(),
        source: 'manual',
      },
    ]);

    if (!error) {
      setTodayTotal(todayTotal + ml);
      setAmount('');
      const { data } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', profile.id)
        .gte('logged_at', new Date().toISOString().split('T')[0])
        .order('logged_at', { ascending: false });
      setRecentLogs(data || []);
    }
  };

  const progress = (todayTotal / target) * 100;

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <Droplets className="w-8 h-8 mr-3 text-blue-600" />
            Water Tracker
          </h1>

          <div className="mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold text-gray-900">Today's Progress</span>
              <span className="text-2xl font-bold text-blue-600">{todayTotal}ml / {target}ml</span>
            </div>
            <div className="relative pt-1">
              <div className="overflow-hidden h-6 text-xs flex rounded-full bg-white">
                <div
                  style={{ width: Math.min(progress, 100) + '%' }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{progress.toFixed(0)}% of daily target</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Amount (ml)</label>
            <div className="flex gap-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => amount && handleLogWater(parseInt(amount))}
                disabled={!amount}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Add</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickAmounts.map((ml) => (
                <button
                  key={ml}
                  onClick={() => handleLogWater(ml)}
                  className="bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border border-blue-200 rounded-xl p-6 text-center transition-all hover:shadow-md"
                >
                  <Droplets className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{ml}ml</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Today's Logs</h3>
            {recentLogs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No water logged yet today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <Check className="w-5 h-5 text-blue-600 mr-3" />
                      <span className="font-medium text-gray-900">{log.amount_ml}ml</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {new Date(log.logged_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Remember:</strong> Stay hydrated by sipping water throughout the day. Avoid drinking 30 minutes before and after meals to optimize digestion.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
