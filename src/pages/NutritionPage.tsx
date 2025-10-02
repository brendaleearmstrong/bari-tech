import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../hooks/useUserProfile';
import { mealDirectory } from '../data/meal-directory';
import { Plus, Search, Utensils, X, Check, Star, CreditCard as Edit2, Trash2 } from 'lucide-react';

export function NutritionPage() {
  const { profile } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  const [customFoods, setCustomFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'directory' | 'custom'>('directory');

  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [mealType, setMealType] = useState('breakfast');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logTime, setLogTime] = useState(new Date().toTimeString().slice(0, 5));

  const [customFood, setCustomFood] = useState({
    food_name: '',
    description: '',
    serving_size: '1 serving',
    protein_g: '',
    calories: '',
    carbs_g: '',
    fat_g: '',
    fiber_g: '',
  });

  useEffect(() => {
    if (!profile) return;
    fetchRecentMeals();
    fetchCustomFoods();
  }, [profile]);

  const fetchRecentMeals = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('meal_entries')
      .select('*')
      .eq('user_id', profile.id)
      .order('logged_at', { ascending: false })
      .limit(10);
    setRecentMeals(data || []);
  };

  const fetchCustomFoods = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('custom_foods')
      .select('*')
      .eq('user_id', profile.id)
      .order('food_name', { ascending: true });
    setCustomFoods(data || []);
  };

  const filteredMeals = mealDirectory.filter((meal) => {
    const matchesSearch = meal.canonical_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhase = selectedPhase === 'all' || meal.phase_tags.includes(selectedPhase);
    return matchesSearch && matchesPhase;
  });

  const filteredCustomFoods = customFoods.filter((food) =>
    food.food_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectMeal = (meal: any, isCustom = false) => {
    setSelectedMeal({ ...meal, isCustom });
    setPortionMultiplier(1);
  };

  const handleLogSelectedMeal = async () => {
    if (!profile || !selectedMeal) return;
    setLoading(true);

    try {
      const loggedAt = `${logDate}T${logTime}:00`;
      const multiplier = portionMultiplier;

      const mealEntry: any = {
        user_id: profile.id,
        logged_at: loggedAt,
        meal_type: mealType,
        food_name: selectedMeal.isCustom ? selectedMeal.food_name : selectedMeal.canonical_name,
        portion_size: selectedMeal.isCustom
          ? `${multiplier} × ${selectedMeal.serving_size}`
          : `${multiplier} portion`,
        total_protein_g: selectedMeal.isCustom
          ? parseFloat(selectedMeal.protein_g) * multiplier
          : selectedMeal.protein_g_per_portion * multiplier,
        total_calories: selectedMeal.isCustom
          ? parseFloat(selectedMeal.calories) * multiplier
          : selectedMeal.calories_per_portion * multiplier,
        total_carbs_g: selectedMeal.isCustom
          ? parseFloat(selectedMeal.carbs_g || 0) * multiplier
          : (selectedMeal.carbs_g || 0) * multiplier,
        total_fat_g: selectedMeal.isCustom
          ? parseFloat(selectedMeal.fat_g || 0) * multiplier
          : (selectedMeal.fat_g || 0) * multiplier,
        total_fiber_g: selectedMeal.isCustom
          ? parseFloat(selectedMeal.fiber_g || 0) * multiplier
          : (selectedMeal.fiber_g || 0) * multiplier,
        source: 'manual',
      };

      if (selectedMeal.isCustom) {
        mealEntry.custom_food_id = selectedMeal.id;
      }

      const { error } = await supabase.from('meal_entries').insert([mealEntry]);

      if (error) throw error;

      await fetchRecentMeals();
      setShowAddMeal(false);
      setSelectedMeal(null);
      setPortionMultiplier(1);
      setSearchTerm('');
      setLogDate(new Date().toISOString().split('T')[0]);
      setLogTime(new Date().toTimeString().slice(0, 5));
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to log meal');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomFood = async () => {
    if (!profile || !customFood.food_name) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('custom_foods').insert([{
        user_id: profile.id,
        food_name: customFood.food_name,
        description: customFood.description,
        serving_size: customFood.serving_size,
        protein_g: parseFloat(customFood.protein_g) || 0,
        calories: parseFloat(customFood.calories) || 0,
        carbs_g: parseFloat(customFood.carbs_g) || 0,
        fat_g: parseFloat(customFood.fat_g) || 0,
        fiber_g: parseFloat(customFood.fiber_g) || 0,
      }]);

      if (error) throw error;

      await fetchCustomFoods();
      setShowAddCustom(false);
      setCustomFood({
        food_name: '',
        description: '',
        serving_size: '1 serving',
        protein_g: '',
        calories: '',
        carbs_g: '',
        fat_g: '',
        fiber_g: '',
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create custom food');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomFood = async (foodId: string) => {
    if (!confirm('Delete this custom food?')) return;

    const { error } = await supabase.from('custom_foods').delete().eq('id', foodId);
    if (!error) {
      await fetchCustomFoods();
    }
  };

  const handleToggleFavorite = async (food: any) => {
    const { error } = await supabase
      .from('custom_foods')
      .update({ is_favorite: !food.is_favorite })
      .eq('id', food.id);

    if (!error) {
      await fetchCustomFoods();
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
              {!selectedMeal ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg">Add Food</h3>
                    <button
                      onClick={() => setShowAddCustom(!showAddCustom)}
                      className="text-sm bg-white hover:bg-gray-50 text-teal-600 font-semibold py-2 px-4 rounded-lg border border-teal-200 transition-colors"
                    >
                      {showAddCustom ? 'Cancel' : '+ Create Custom Food'}
                    </button>
                  </div>

                  {showAddCustom && (
                    <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-4">Create Custom Food</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Food Name *</label>
                          <input
                            type="text"
                            value={customFood.food_name}
                            onChange={(e) => setCustomFood({ ...customFood, food_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="e.g., Grilled Chicken Breast"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Serving Size</label>
                          <input
                            type="text"
                            value={customFood.serving_size}
                            onChange={(e) => setCustomFood({ ...customFood, serving_size: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="e.g., 100g, 1 cup"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Protein (g) *</label>
                          <input
                            type="number"
                            step="0.1"
                            value={customFood.protein_g}
                            onChange={(e) => setCustomFood({ ...customFood, protein_g: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Calories *</label>
                          <input
                            type="number"
                            step="1"
                            value={customFood.calories}
                            onChange={(e) => setCustomFood({ ...customFood, calories: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={customFood.carbs_g}
                            onChange={(e) => setCustomFood({ ...customFood, carbs_g: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fat (g)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={customFood.fat_g}
                            onChange={(e) => setCustomFood({ ...customFood, fat_g: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={customFood.description}
                            onChange={(e) => setCustomFood({ ...customFood, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            rows={2}
                            placeholder="Optional notes about this food"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleCreateCustomFood}
                        disabled={!customFood.food_name || !customFood.protein_g || !customFood.calories || loading}
                        className="mt-4 w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        {loading ? 'Creating...' : 'Create Custom Food'}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setActiveTab('directory')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        activeTab === 'directory'
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Meal Directory
                    </button>
                    <button
                      onClick={() => setActiveTab('custom')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        activeTab === 'custom'
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      My Custom Foods ({customFoods.length})
                    </button>
                  </div>

                  <div className="mb-4 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search foods..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    {activeTab === 'directory' && (
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
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {activeTab === 'directory' ? (
                      filteredMeals.map((meal, index) => (
                        <div
                          key={index}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-teal-300 transition-all cursor-pointer"
                          onClick={() => handleSelectMeal(meal, false)}
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
                      ))
                    ) : (
                      filteredCustomFoods.map((food) => (
                        <div
                          key={food.id}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-teal-300 transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 flex-1">{food.food_name}</h4>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(food);
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Star
                                  className={`w-4 h-4 ${food.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                                />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomFood(food.id);
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                          {food.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{food.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mb-2">Serving: {food.serving_size}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <span className="text-gray-600">Protein:</span>
                              <span className="font-semibold text-teal-600 ml-1">{food.protein_g}g</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Cal:</span>
                              <span className="font-semibold text-gray-900 ml-1">{food.calories}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSelectMeal(food, true)}
                            className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium py-2 rounded-lg transition-colors text-sm"
                          >
                            Select
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg">Adjust Portion</h3>
                    <button
                      onClick={() => setSelectedMeal(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="bg-teal-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {selectedMeal.isCustom ? selectedMeal.food_name : selectedMeal.canonical_name}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Protein:</span>
                        <span className="font-semibold text-teal-600 ml-1">
                          {selectedMeal.isCustom
                            ? (parseFloat(selectedMeal.protein_g) * portionMultiplier).toFixed(1)
                            : (selectedMeal.protein_g_per_portion * portionMultiplier).toFixed(1)}g
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Calories:</span>
                        <span className="font-semibold text-gray-900 ml-1">
                          {selectedMeal.isCustom
                            ? Math.round(parseFloat(selectedMeal.calories) * portionMultiplier)
                            : Math.round(selectedMeal.calories_per_portion * portionMultiplier)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Carbs:</span>
                        <span className="font-semibold text-gray-900 ml-1">
                          {selectedMeal.isCustom
                            ? (parseFloat(selectedMeal.carbs_g || 0) * portionMultiplier).toFixed(1)
                            : ((selectedMeal.carbs_g || 0) * portionMultiplier).toFixed(1)}g
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fat:</span>
                        <span className="font-semibold text-gray-900 ml-1">
                          {selectedMeal.isCustom
                            ? (parseFloat(selectedMeal.fat_g || 0) * portionMultiplier).toFixed(1)
                            : ((selectedMeal.fat_g || 0) * portionMultiplier).toFixed(1)}g
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Portion Size: {portionMultiplier}x
                      </label>
                      <input
                        type="range"
                        min="0.25"
                        max="3"
                        step="0.25"
                        value={portionMultiplier}
                        onChange={(e) => setPortionMultiplier(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.25x</span>
                        <span>1x</span>
                        <span>2x</span>
                        <span>3x</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
                      <select
                        value={mealType}
                        onChange={(e) => setMealType(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snack">Snack</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input
                          type="date"
                          value={logDate}
                          onChange={(e) => setLogDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                        <input
                          type="time"
                          value={logTime}
                          onChange={(e) => setLogTime(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleLogSelectedMeal}
                      disabled={loading}
                      className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      {loading ? 'Logging...' : 'Log This Meal'}
                    </button>
                  </div>
                </div>
              )}
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
                        <span className="font-medium text-gray-900 capitalize">
                          {meal.meal_type || 'Meal'}
                        </span>
                        {meal.food_name && (
                          <span className="text-sm text-gray-600 ml-2">- {meal.food_name}</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {meal.portion_size && <span>{meal.portion_size} • </span>}
                        Protein: {meal.total_protein_g?.toFixed(1) || 0}g • Calories: {meal.total_calories || 0}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(meal.logged_at).toLocaleString()}
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
