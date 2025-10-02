import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../hooks/useUserProfile';
import { mealDirectory } from '../data/meal-directory';
import { Plus, X, Utensils, Search, ChevronLeft, ChevronRight, Flame, Activity } from 'lucide-react';

interface MealEntry {
  id: string;
  meal_type: string;
  food_name: string;
  portion_size: string;
  total_protein_g: number;
  total_calories: number;
  total_carbs_g?: number;
  total_fat_g?: number;
  logged_at: string;
}

export function NutritionPage() {
  const { profile } = useUserProfile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [portion, setPortion] = useState('1');

  useEffect(() => {
    if (profile) {
      fetchDayMeals();
    }
  }, [profile, selectedDate]);

  const fetchDayMeals = async () => {
    if (!profile) return;

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('meal_entries')
      .select('*')
      .eq('user_id', profile.id)
      .gte('logged_at', dayStart.toISOString())
      .lte('logged_at', dayEnd.toISOString())
      .order('logged_at', { ascending: true });

    setTodayMeals(data || []);
  };

  const handleLogMeal = async () => {
    if (!profile || !selectedFood) return;

    setLoading(true);
    try {
      const multiplier = parseFloat(portion) || 1;
      const { error } = await supabase.from('meal_entries').insert([
        {
          user_id: profile.id,
          logged_at: new Date(selectedDate).toISOString(),
          meal_type: selectedMealType,
          food_name: selectedFood.canonical_name,
          portion_size: `${multiplier} portion`,
          total_protein_g: selectedFood.protein_g_per_portion * multiplier,
          total_calories: selectedFood.calories_per_portion * multiplier,
          total_carbs_g: selectedFood.carbs_g_per_portion ? selectedFood.carbs_g_per_portion * multiplier : null,
          total_fat_g: selectedFood.fat_g_per_portion ? selectedFood.fat_g_per_portion * multiplier : null,
        },
      ]);

      if (error) throw error;

      await fetchDayMeals();
      setShowAddMeal(false);
      setSelectedFood(null);
      setPortion('1');
      setSearchTerm('');
    } catch (error) {
      alert('Failed to log meal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!confirm('Delete this meal entry?')) return;

    try {
      const { error } = await supabase.from('meal_entries').delete().eq('id', id);
      if (error) throw error;
      await fetchDayMeals();
    } catch (error) {
      alert('Failed to delete meal');
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const mealsByType = {
    breakfast: todayMeals.filter(m => m.meal_type === 'breakfast'),
    lunch: todayMeals.filter(m => m.meal_type === 'lunch'),
    dinner: todayMeals.filter(m => m.meal_type === 'dinner'),
    snack: todayMeals.filter(m => m.meal_type === 'snack'),
  };

  const totalCalories = todayMeals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0);
  const totalProtein = todayMeals.reduce((sum, meal) => sum + (meal.total_protein_g || 0), 0);
  const totalCarbs = todayMeals.reduce((sum, meal) => sum + (meal.total_carbs_g || 0), 0);
  const totalFat = todayMeals.reduce((sum, meal) => sum + (meal.total_fat_g || 0), 0);

  const filteredFoods = mealDirectory.filter(food =>
    food.canonical_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold text-gray-900">Nutrition Tracker</h1>
            <p className="text-gray-600 mt-1">Track your daily meals and macros</p>
          </div>
          <button
            onClick={() => setShowAddMeal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            Log Meal
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => changeDate(-1)}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              {isToday && <span className="text-sm text-teal-600 font-medium">Today</span>}
            </div>

            <button
              onClick={() => changeDate(1)}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-600">Calories</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalCalories.toFixed(0)}</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Protein</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalProtein.toFixed(1)}g</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600">Carbs</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalCarbs.toFixed(1)}g</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-4 border border-yellow-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600">Fat</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalFat.toFixed(1)}g</div>
            </div>
          </div>
        </div>

        {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => (
          <div key={mealType} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">{mealType}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedMealType(mealType);
                  setShowAddMeal(true);
                }}
                className="w-8 h-8 rounded-lg bg-teal-100 hover:bg-teal-200 flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4 text-teal-600" />
              </button>
            </div>

            {mealsByType[mealType as keyof typeof mealsByType].length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-2xl">
                <p className="text-gray-500 text-sm">No {mealType} logged</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mealsByType[mealType as keyof typeof mealsByType].map(meal => (
                  <div key={meal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{meal.food_name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{meal.portion_size}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        <span>{meal.total_calories?.toFixed(0)} cal</span>
                        <span>{meal.total_protein_g?.toFixed(1)}g protein</span>
                        {meal.total_carbs_g && <span>{meal.total_carbs_g.toFixed(1)}g carbs</span>}
                        {meal.total_fat_g && <span>{meal.total_fat_g.toFixed(1)}g fat</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {showAddMeal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Log Meal</h2>
                <button
                  onClick={() => {
                    setShowAddMeal(false);
                    setSelectedFood(null);
                    setSearchTerm('');
                    setPortion('1');
                  }}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Meal Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
                      <button
                        key={type}
                        onClick={() => setSelectedMealType(type)}
                        className={`px-4 py-3 rounded-xl font-medium transition-all capitalize ${
                          selectedMealType === type
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Search Food</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search for food..."
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {searchTerm && (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredFoods.slice(0, 10).map(food => (
                      <button
                        key={food.canonical_name}
                        onClick={() => setSelectedFood(food)}
                        className={`w-full text-left p-4 rounded-2xl transition-all ${
                          selectedFood?.canonical_name === food.canonical_name
                            ? 'bg-teal-50 border-2 border-teal-300'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">{food.canonical_name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {food.calories_per_portion} cal • {food.protein_g_per_portion}g protein
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedFood && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Portion Size</label>
                    <input
                      type="number"
                      value={portion}
                      onChange={e => setPortion(e.target.value)}
                      step="0.1"
                      min="0.1"
                      placeholder="1.0"
                      className="w-full px-4 py-4 text-lg border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <div className="mt-3 p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm font-medium text-gray-900 mb-2">Nutrition Summary</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>Calories: {(selectedFood.calories_per_portion * parseFloat(portion || '1')).toFixed(0)}</div>
                        <div>Protein: {(selectedFood.protein_g_per_portion * parseFloat(portion || '1')).toFixed(1)}g</div>
                        {selectedFood.carbs_g_per_portion && (
                          <div>Carbs: {(selectedFood.carbs_g_per_portion * parseFloat(portion || '1')).toFixed(1)}g</div>
                        )}
                        {selectedFood.fat_g_per_portion && (
                          <div>Fat: {(selectedFood.fat_g_per_portion * parseFloat(portion || '1')).toFixed(1)}g</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLogMeal}
                  disabled={!selectedFood || loading}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-2xl shadow-sm transition-colors"
                >
                  {loading ? 'Logging...' : 'Log Meal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
