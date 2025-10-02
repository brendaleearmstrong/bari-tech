import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { Pill, Check, Plus, X, Clock, CreditCard as Edit2, Trash2 } from 'lucide-react';

interface Supplement {
  id: string;
  name: string;
  dose: string;
  schedule_type: string;
  schedule_times: string[];
  start_date: string;
  end_date?: string;
  notes?: string;
}

interface SupplementLog {
  id: string;
  supplement_id: string;
  scheduled_time: string;
  taken_at?: string;
  status: string;
}

const COMMON_SUPPLEMENTS = [
  { name: 'Multivitamin', defaultDose: '1 tablet', defaultTimes: ['morning'] },
  { name: 'Calcium Citrate', defaultDose: '500mg', defaultTimes: ['morning', 'evening'] },
  { name: 'Vitamin D3', defaultDose: '2000 IU', defaultTimes: ['morning'] },
  { name: 'Vitamin B12', defaultDose: '500mcg', defaultTimes: ['morning'] },
  { name: 'Iron', defaultDose: '45mg', defaultTimes: ['morning'] },
  { name: 'Biotin', defaultDose: '5000mcg', defaultTimes: ['morning'] },
  { name: 'Magnesium', defaultDose: '400mg', defaultTimes: ['evening'] },
  { name: 'Probiotic', defaultDose: '1 capsule', defaultTimes: ['morning'] },
];

export function SupplementsPage() {
  const { profile } = useUserProfile();
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [todayLogs, setTodayLogs] = useState<SupplementLog[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    dose: '',
    schedule_times: ['morning'],
    notes: '',
  });

  useEffect(() => {
    if (profile) {
      fetchSupplements();
      fetchTodayLogs();
    }
  }, [profile]);

  const fetchSupplements = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('supplements')
      .select('*')
      .eq('user_id', profile.id)
      .order('name');

    setSupplements(data || []);
  };

  const fetchTodayLogs = async () => {
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('supplement_logs')
      .select('*')
      .gte('scheduled_time', `${today}T00:00:00`)
      .lte('scheduled_time', `${today}T23:59:59`);

    setTodayLogs(data || []);
  };

  const handleAddSupplement = async () => {
    if (!profile || !formData.name || !formData.dose) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('supplements').insert([
        {
          user_id: profile.id,
          name: formData.name,
          dose: formData.dose,
          schedule_type: 'daily',
          schedule_times: formData.schedule_times,
          start_date: new Date().toISOString().split('T')[0],
          notes: formData.notes || null,
        },
      ]);

      if (error) throw error;

      await fetchSupplements();
      setShowAddForm(false);
      setFormData({ name: '', dose: '', schedule_times: ['morning'], notes: '' });
    } catch (error) {
      alert('Failed to add supplement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSupplement = async () => {
    if (!editingSupplement) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('supplements')
        .update({
          name: formData.name,
          dose: formData.dose,
          schedule_times: formData.schedule_times,
          notes: formData.notes || null,
        })
        .eq('id', editingSupplement.id);

      if (error) throw error;

      await fetchSupplements();
      setEditingSupplement(null);
      setFormData({ name: '', dose: '', schedule_times: ['morning'], notes: '' });
    } catch (error) {
      alert('Failed to update supplement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplement?')) return;

    try {
      const { error } = await supabase.from('supplements').delete().eq('id', id);
      if (error) throw error;
      await fetchSupplements();
    } catch (error) {
      alert('Failed to delete supplement');
    }
  };

  const handleToggleTaken = async (supplement: Supplement, timeOfDay: string) => {
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];
    const scheduledTime = `${today}T${getTimeForPeriod(timeOfDay)}:00`;

    const existingLog = todayLogs.find(
      log => log.supplement_id === supplement.id &&
      new Date(log.scheduled_time).getHours() === new Date(scheduledTime).getHours()
    );

    try {
      if (existingLog) {
        if (existingLog.status === 'taken') {
          await supabase
            .from('supplement_logs')
            .update({ status: 'missed', taken_at: null })
            .eq('id', existingLog.id);
        } else {
          await supabase
            .from('supplement_logs')
            .update({ status: 'taken', taken_at: new Date().toISOString() })
            .eq('id', existingLog.id);
        }
      } else {
        await supabase.from('supplement_logs').insert([
          {
            supplement_id: supplement.id,
            scheduled_time: scheduledTime,
            taken_at: new Date().toISOString(),
            status: 'taken',
          },
        ]);
      }

      await fetchTodayLogs();
    } catch (error) {
      alert('Failed to update log');
    }
  };

  const getTimeForPeriod = (period: string): string => {
    const times: { [key: string]: string } = {
      morning: '08:00',
      afternoon: '14:00',
      evening: '20:00',
      night: '22:00',
    };
    return times[period] || '12:00';
  };

  const isTaken = (supplementId: string, timeOfDay: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    const targetHour = parseInt(getTimeForPeriod(timeOfDay).split(':')[0]);

    return todayLogs.some(
      log =>
        log.supplement_id === supplementId &&
        log.status === 'taken' &&
        new Date(log.scheduled_time).getHours() === targetHour
    );
  };

  const selectCommonSupplement = (common: typeof COMMON_SUPPLEMENTS[0]) => {
    setFormData({
      name: common.name,
      dose: common.defaultDose,
      schedule_times: common.defaultTimes,
      notes: '',
    });
  };

  const takenCount = todayLogs.filter(log => log.status === 'taken').length;
  const totalScheduled = supplements.reduce((acc, supp) => acc + supp.schedule_times.length, 0);
  const complianceRate = totalScheduled > 0 ? (takenCount / totalScheduled) * 100 : 0;

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Supplement Tracker</h1>
            <p className="text-gray-600 mt-1">Manage your daily supplement routine</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Supplement
          </button>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl p-8 border border-teal-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Today's Progress</h2>
              <p className="text-sm text-gray-600 mt-1">
                {takenCount} of {totalScheduled} doses taken
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-teal-600">{complianceRate.toFixed(0)}%</div>
              <div className="text-sm text-gray-600">Compliance</div>
            </div>
          </div>
          <div className="w-full bg-white rounded-full h-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </div>

        {supplements.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 text-center">
            <Pill className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Supplements Added</h3>
            <p className="text-gray-600 mb-6">Start tracking your supplements for better health</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              <Plus className="w-5 h-5" />
              Add Your First Supplement
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {supplements.map(supplement => (
              <div key={supplement.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Pill className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{supplement.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">Dose: {supplement.dose}</p>
                      {supplement.notes && (
                        <p className="text-sm text-gray-500 mt-1">{supplement.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingSupplement(supplement);
                        setFormData({
                          name: supplement.name,
                          dose: supplement.dose,
                          schedule_times: supplement.schedule_times,
                          notes: supplement.notes || '',
                        });
                      }}
                      className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                      <Edit2 className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplement(supplement.id)}
                      className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {supplement.schedule_times.map(time => {
                    const taken = isTaken(supplement.id, time);
                    return (
                      <button
                        key={time}
                        onClick={() => handleToggleTaken(supplement, time)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                          taken
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        {time.charAt(0).toUpperCase() + time.slice(1)}
                        {taken && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {(showAddForm || editingSupplement) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingSupplement ? 'Edit Supplement' : 'Add Supplement'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingSupplement(null);
                    setFormData({ name: '', dose: '', schedule_times: ['morning'], notes: '' });
                  }}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {!editingSupplement && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Quick Select Common Supplements
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMMON_SUPPLEMENTS.map(common => (
                      <button
                        key={common.name}
                        onClick={() => selectCommonSupplement(common)}
                        className="px-4 py-2 bg-gray-100 hover:bg-teal-50 border border-gray-200 hover:border-teal-300 rounded-xl text-sm font-medium text-gray-700 hover:text-teal-700 transition-all text-left"
                      >
                        {common.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Supplement Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Multivitamin"
                    className="w-full px-4 py-4 text-lg border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={formData.dose}
                    onChange={e => setFormData({ ...formData, dose: e.target.value })}
                    placeholder="e.g., 1 tablet, 500mg"
                    className="w-full px-4 py-4 text-lg border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    When do you take this?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['morning', 'afternoon', 'evening', 'night'].map(time => (
                      <button
                        key={time}
                        onClick={() => {
                          const times = formData.schedule_times.includes(time)
                            ? formData.schedule_times.filter(t => t !== time)
                            : [...formData.schedule_times, time];
                          setFormData({ ...formData, schedule_times: times });
                        }}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                          formData.schedule_times.includes(time)
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {time.charAt(0).toUpperCase() + time.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Notes (optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g., Take with food"
                    rows={3}
                    className="w-full px-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  onClick={editingSupplement ? handleUpdateSupplement : handleAddSupplement}
                  disabled={!formData.name || !formData.dose || formData.schedule_times.length === 0 || loading}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-2xl shadow-sm transition-colors"
                >
                  {loading ? 'Saving...' : editingSupplement ? 'Update Supplement' : 'Add Supplement'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
