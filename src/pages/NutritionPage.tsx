import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../hooks/useUserProfile';
import { mealDirectory } from '../data/meal-directory';
import { Plus, Search, Utensils, X, Check } from 'lucide-react';

export function NutritionPage() {
  const { profile } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    async function fetchRecentMeals() {
      const { data } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('logged_at', { ascending: false })
        .limit(10);
      setRecentMeals(data || []);
    }
    fetchRecentMeals();
  }, [profile]);

  const filteredMeals = mealDirectory.filter((meal) => {
    const matchesSearch = meal.canonical_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhase = selectedPhase === 'all' || meal.phase_tags.includes(selectedPhase);
    return matchesSearch && matchesPhase;
  });

  const handleLogMeal = async (mealItem: typeof mealDirectory[0]) => {
    if (!profile) return;
    setLoading(true);

    try {
      const mealEntry = {
        user_id: profile.id,
        logged_at: new Date().toISOString(),
        meal_type: 'snack',
        total_protein_g: mealItem.protein_g_per_portion,
        total_calories: mealItem.calories_per_portion,
        total_carbs_g: mealItem.carbs_g,
        total_fat_g: mealItem.fat_g,
        total_fiber_g: mealItem.fiber_g,
        source: 'manual',
      };

      const { error } = await supabase.from('meal_entries').insert([mealEntry]);

      if (error) throw error;

      const { data } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('logged_at', { ascending: false })
        .limit(10);

      setRecentMeals(data || []);
      setShowAddMeal(false);
      setSearchTerm('');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to log meal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-4 md:mb-0">
              <Utensils className="w-8 h-8 mr-3 text-teal-600" />
              Nutrition Tracker
            </h1>
            <button
              onClick={() => setShowAddMeal(!showAddMeal)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              {showAddMeal ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
              {showAddMeal ? 'Cancel' : 'Log Meal'}
            </button>
          </div>

          {showAddMeal && (
            <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-teal-50 rounded-xl border border-teal-100">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">Select from Meal Directory</h3>

              <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search meals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent md:w-48"
                >
                  <option value="all">All Phases</option>
                  <option value="clear_liquid">Clear Liquid</option>
                  <option value="full_liquid">Full Liquid</option>
                  <option value="pureed">Pureed</option>
                  <option value="soft">Soft</option>
                  <option value="regular">Regular</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredMeals.map((meal, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-teal-300 transition-all cursor-pointer"
                    onClick={() => handleLogMeal(meal)}
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">{meal.canonical_name}</h4>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{meal.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Protein:</span>
                        <span className="font-semibold text-teal-600 ml-1">
                          {meal.protein_g_per_portion}g
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Cal:</span>
                        <span className="font-semibold text-gray-900 ml-1">
                          {meal.calories_per_portion}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {meal.phase_tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded"
                        >
                          {tag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-lg">Recent Meals</h3>
            {recentMeals.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No meals logged yet. Start by adding your first meal!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Check className="w-5 h-5 text-teal-600 mr-2" />
                        <span className="font-medium text-gray-900">{meal.meal_type || 'Meal'}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {new Date(meal.logged_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        Protein: {meal.total_protein_g?.toFixed(1) || 0}g • Calories: {meal.total_calories || 0}
                      </div>
                    </div>
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
