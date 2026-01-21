import { TrendingDown, TrendingUp, Target, Trophy, Calendar, Activity } from 'lucide-react';

interface WeightEntry {
  measured_at: string;
  weight_kg: number;
}

interface Milestone {
  weight_kg?: number;
  title: string;
  achieved_at: string;
}

interface WeightProgressChartProps {
  entries: WeightEntry[];
  baselineWeight?: number;
  goalWeight?: number;
  milestones?: Milestone[];
}

export function WeightProgressChart({ entries, baselineWeight, goalWeight, milestones = [] }: WeightProgressChartProps) {
  if (entries.length === 0 && !baselineWeight) return null;

  const sortedEntries = [...entries].sort((a, b) =>
    new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );

  const allPoints: Array<{ date: Date; weight: number; isEntry: boolean; isStart?: boolean }> = [];

  if (baselineWeight && sortedEntries.length > 0) {
    const startDate = new Date(sortedEntries[0].measured_at);
    startDate.setDate(startDate.getDate() - 1);
    allPoints.push({ date: startDate, weight: baselineWeight, isEntry: false, isStart: true });
  }

  sortedEntries.forEach(entry => {
    allPoints.push({ date: new Date(entry.measured_at), weight: entry.weight_kg, isEntry: true });
  });

  if (allPoints.length === 0) return null;

  const calculateWeeklyStats = () => {
    if (sortedEntries.length < 2) return null;

    const weeks: { [key: string]: { total: number; count: number; dates: Date[] } } = {};

    sortedEntries.forEach(entry => {
      const date = new Date(entry.measured_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = { total: 0, count: 0, dates: [] };
      }
      weeks[weekKey].total += entry.weight_kg;
      weeks[weekKey].count += 1;
      weeks[weekKey].dates.push(date);
    });

    const weeklyAverages = Object.entries(weeks).map(([key, data]) => ({
      week: new Date(key),
      average: data.total / data.count,
      count: data.count,
    })).sort((a, b) => a.week.getTime() - b.week.getTime());

    const recentWeeks = weeklyAverages.slice(-4);
    if (recentWeeks.length < 2) return null;

    const weeklyChanges = [];
    for (let i = 1; i < recentWeeks.length; i++) {
      weeklyChanges.push(recentWeeks[i - 1].average - recentWeeks[i].average);
    }

    const avgWeeklyLoss = weeklyChanges.reduce((a, b) => a + b, 0) / weeklyChanges.length;

    return {
      weeklyAverages,
      recentWeeks,
      avgWeeklyLoss,
    };
  };

  const weeklyStats = calculateWeeklyStats();

  const calculateProjection = () => {
    if (!goalWeight || !weeklyStats || weeklyStats.avgWeeklyLoss <= 0) return null;

    const currentWeight = sortedEntries[sortedEntries.length - 1].weight_kg;
    const remainingWeight = currentWeight - goalWeight;
    const weeksToGoal = remainingWeight / weeklyStats.avgWeeklyLoss;

    if (weeksToGoal <= 0) return null;

    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + (weeksToGoal * 7));

    return {
      weeksToGoal: Math.ceil(weeksToGoal),
      projectedDate,
    };
  };

  const projection = calculateProjection();

  const allWeights = allPoints.map(p => p.weight);
  if (goalWeight) allWeights.push(goalWeight);

  const minWeight = Math.min(...allWeights);
  const maxWeight = Math.max(...allWeights);
  const range = maxWeight - minWeight || 10;
  const chartMin = Math.floor(minWeight - range * 0.1);
  const chartMax = Math.ceil(maxWeight + range * 0.1);
  const chartRange = chartMax - chartMin;

  const getY = (weight: number) => {
    return ((chartMax - weight) / chartRange) * 100;
  };

  const getX = (date: Date) => {
    const firstDate = allPoints[0].date.getTime();
    const lastDate = allPoints[allPoints.length - 1].date.getTime();
    const totalRange = lastDate - firstDate || 86400000;
    return ((date.getTime() - firstDate) / totalRange) * 100;
  };

  const points = allPoints.map(point => ({
    x: getX(point.date),
    y: getY(point.weight),
    weight: point.weight,
    date: point.date,
    isEntry: point.isEntry,
    isStart: point.isStart,
  }));

  const createSmoothPath = () => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const xMid = (current.x + next.x) / 2;
      const yMid = (current.y + next.y) / 2;

      path += ` Q ${current.x} ${current.y}, ${xMid} ${yMid}`;
    }

    const last = points[points.length - 1];
    path += ` T ${last.x} ${last.y}`;

    return path;
  };

  const smoothPath = createSmoothPath();
  const validMilestones = milestones.filter(m => m.weight_kg != null);

  const yAxisLabels = [];
  const labelCount = 5;
  for (let i = 0; i <= labelCount; i++) {
    const weight = chartMin + (chartRange * i / labelCount);
    yAxisLabels.push({
      weight: weight.toFixed(0),
      y: 100 - (i * 100 / labelCount),
    });
  }

  const monthLabels = [];
  const firstDate = allPoints[0].date;
  const lastDate = allPoints[allPoints.length - 1].date;
  const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth());

  if (monthsDiff > 0) {
    for (let i = 0; i <= Math.min(monthsDiff, 6); i++) {
      const date = new Date(firstDate);
      date.setMonth(firstDate.getMonth() + i);
      if (date <= lastDate) {
        monthLabels.push({
          label: date.toLocaleDateString('en-US', { month: 'short' }),
          x: getX(date),
        });
      }
    }
  }

  const totalLoss = baselineWeight && sortedEntries.length > 0
    ? baselineWeight - sortedEntries[sortedEntries.length - 1].weight_kg
    : 0;

  const daysSinceStart = sortedEntries.length > 1
    ? Math.floor((new Date(sortedEntries[sortedEntries.length - 1].measured_at).getTime() -
        new Date(sortedEntries[0].measured_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      {weeklyStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Avg Weekly Loss</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {weeklyStats.avgWeeklyLoss.toFixed(1)} kg
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {daysSinceStart > 0 ? `${(totalLoss / (daysSinceStart / 7)).toFixed(1)} kg/week` : 'Track progress'}
            </div>
          </div>

          {projection && (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-5 border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-violet-600" />
                <span className="text-sm font-medium text-gray-600">Goal ETA</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {projection.weeksToGoal}w
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {projection.projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-600">Days Tracking</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{daysSinceStart}</div>
            <div className="text-xs text-gray-600 mt-1">
              {sortedEntries.length} entries
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              {totalLoss > 0 ? (
                <TrendingDown className="w-5 h-5 text-orange-600" />
              ) : (
                <TrendingUp className="w-5 h-5 text-orange-600" />
              )}
              <span className="text-sm font-medium text-gray-600">Total Change</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalLoss > 0 ? '-' : '+'}{Math.abs(totalLoss).toFixed(1)} kg
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {baselineWeight ? `${((Math.abs(totalLoss) / baselineWeight) * 100).toFixed(1)}%` : ''}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingDown className="w-7 h-7 text-teal-600" />
                Weight Progression
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {allPoints[0]?.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {allPoints[allPoints.length - 1]?.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-gray-50 to-white" style={{ height: '450px' }}>
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>

                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
                </linearGradient>

                <filter id="shadow">
                  <feDropShadow dx="0" dy="0.5" stdDeviation="0.3" floodOpacity="0.2"/>
                </filter>
              </defs>

              {yAxisLabels.map((label, i) => (
                <g key={i}>
                  <line
                    x1="0"
                    y1={label.y}
                    x2="100"
                    y2={label.y}
                    stroke="#e5e7eb"
                    strokeWidth="0.15"
                  />
                  <text
                    x="-2"
                    y={label.y + 0.5}
                    fontSize="2"
                    fill="#9ca3af"
                    textAnchor="end"
                  >
                    {label.weight}
                  </text>
                </g>
              ))}

              {goalWeight && (
                <g>
                  <line
                    x1="0"
                    y1={getY(goalWeight)}
                    x2="100"
                    y2={getY(goalWeight)}
                    stroke="#8b5cf6"
                    strokeWidth="0.4"
                    strokeDasharray="3,3"
                    opacity="0.7"
                  />
                  <rect
                    x="1"
                    y={getY(goalWeight) - 2.5}
                    width="18"
                    height="5"
                    rx="2"
                    fill="#8b5cf6"
                  />
                  <text
                    x="10"
                    y={getY(goalWeight) + 0.8}
                    fontSize="2.2"
                    fill="white"
                    textAnchor="middle"
                    className="font-bold"
                  >
                    Goal {goalWeight}kg
                  </text>
                </g>
              )}

              {points.length > 1 && (
                <>
                  <path
                    d={`${smoothPath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`}
                    fill="url(#areaGradient)"
                  />

                  <path
                    d={smoothPath}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="0.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#shadow)"
                  />
                </>
              )}

              {points.map((point, index) => {
                const isLast = index === points.length - 1;

                return (
                  <g key={index}>
                    {point.isStart ? (
                      <>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="1.8"
                          fill="#ef4444"
                          stroke="white"
                          strokeWidth="0.5"
                          filter="url(#shadow)"
                        />
                        <text
                          x={point.x}
                          y={point.y - 3}
                          fontSize="2"
                          fill="#ef4444"
                          textAnchor="middle"
                          className="font-semibold"
                        >
                          {point.weight.toFixed(1)}
                        </text>
                      </>
                    ) : point.isEntry ? (
                      <>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={isLast ? "2.2" : "1"}
                          fill={isLast ? "#14b8a6" : "white"}
                          stroke={isLast ? "white" : "#14b8a6"}
                          strokeWidth="0.6"
                          filter="url(#shadow)"
                        />
                        {isLast && (
                          <>
                            <text
                              x={point.x}
                              y={point.y - 4}
                              fontSize="2.5"
                              fill="#14b8a6"
                              textAnchor="middle"
                              className="font-bold"
                            >
                              {point.weight.toFixed(1)}
                            </text>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="3.5"
                              fill="none"
                              stroke="#14b8a6"
                              strokeWidth="0.4"
                              opacity="0.4"
                            >
                              <animate
                                attributeName="r"
                                values="3.5;4.5;3.5"
                                dur="2s"
                                repeatCount="indefinite"
                              />
                              <animate
                                attributeName="opacity"
                                values="0.4;0.1;0.4"
                                dur="2s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          </>
                        )}
                      </>
                    ) : null}
                  </g>
                );
              })}

              {validMilestones.map((milestone, index) => {
                const milestoneDate = new Date(milestone.achieved_at);
                if (isNaN(milestoneDate.getTime()) || !milestone.weight_kg) return null;

                const milestoneX = getX(milestoneDate);
                const milestoneY = getY(milestone.weight_kg);

                return (
                  <g key={index}>
                    <circle
                      cx={milestoneX}
                      cy={milestoneY}
                      r="2.5"
                      fill="#fbbf24"
                      stroke="white"
                      strokeWidth="0.5"
                      filter="url(#shadow)"
                    />
                  </g>
                );
              })}
            </svg>

            <div className="absolute bottom-4 left-12 right-4 flex items-center justify-between">
              {monthLabels.map((label, i) => (
                <div
                  key={i}
                  className="text-xs text-gray-500 font-medium"
                  style={{ position: 'absolute', left: `${label.x}%`, transform: 'translateX(-50%)' }}
                >
                  {label.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm"></div>
              <span className="text-gray-700 font-medium">Starting Weight</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-teal-500 shadow-sm"></div>
              <span className="text-gray-700 font-medium">Current Weight</span>
            </div>
            {goalWeight && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 rounded-full bg-violet-500"></div>
                <span className="text-gray-700 font-medium">Goal Target</span>
              </div>
            )}
            {validMilestones.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-400 shadow-sm"></div>
                <span className="text-gray-700 font-medium">Milestones</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {weeklyStats && weeklyStats.recentWeeks.length > 1 && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Weekly Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {weeklyStats.recentWeeks.map((week, index) => {
              const prevWeek = index > 0 ? weeklyStats.recentWeeks[index - 1] : null;
              const change = prevWeek ? prevWeek.average - week.average : 0;

              return (
                <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
                  <div className="text-xs text-gray-500 font-medium mb-2">
                    {week.week.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {week.average.toFixed(1)} kg
                  </div>
                  {prevWeek && (
                    <div className={`text-sm font-semibold flex items-center gap-1 ${change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {change > 0 ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                      {Math.abs(change).toFixed(1)} kg
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {validMilestones.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border border-amber-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-sm">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Milestones Achieved</h3>
              <p className="text-sm text-gray-600">Celebrating your incredible progress</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {validMilestones.map((milestone, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⭐</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 mb-1">{milestone.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="font-medium">{milestone.weight_kg?.toFixed(1)} kg</span>
                      <span>•</span>
                      <span>{new Date(milestone.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
