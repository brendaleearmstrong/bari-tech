interface WeightEntry {
  measured_at: string;
  weight_kg: number;
}

interface Milestone {
  weight_kg: number;
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

  if (baselineWeight) {
    const startDate = sortedEntries.length > 0
      ? new Date(sortedEntries[0].measured_at)
      : new Date();
    startDate.setDate(startDate.getDate() - 7);
    allPoints.push({ date: startDate, weight: baselineWeight, isEntry: false, isStart: true });
  }

  sortedEntries.forEach(entry => {
    allPoints.push({ date: new Date(entry.measured_at), weight: entry.weight_kg, isEntry: true });
  });

  if (allPoints.length === 0) return null;

  const allWeights = allPoints.map(p => p.weight);
  if (goalWeight) allWeights.push(goalWeight);

  const minWeight = Math.min(...allWeights);
  const maxWeight = Math.max(...allWeights);
  const range = maxWeight - minWeight || 10;
  const chartMin = Math.floor(minWeight - range * 0.15);
  const chartMax = Math.ceil(maxWeight + range * 0.15);
  const chartRange = chartMax - chartMin;

  const getY = (weight: number) => {
    return ((chartMax - weight) / chartRange) * 100;
  };

  const getX = (date: Date) => {
    const firstDate = allPoints[0].date.getTime();
    const lastDate = allPoints[allPoints.length - 1].date.getTime();
    const totalRange = lastDate - firstDate || 1;
    return ((date.getTime() - firstDate) / totalRange) * 100;
  };

  const points = allPoints.map(point => ({
    x: getX(point.date),
    y: getY(point.weight),
    weight: point.weight,
    date: point.date.toLocaleDateString(),
    isEntry: point.isEntry,
    isStart: point.isStart,
  }));

  const pathData = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const weightLost = baselineWeight && sortedEntries.length > 0
    ? baselineWeight - sortedEntries[sortedEntries.length - 1].weight_kg
    : 0;

  const percentLost = baselineWeight && weightLost > 0
    ? (weightLost / baselineWeight) * 100
    : 0;

  const goalRemaining = goalWeight && sortedEntries.length > 0
    ? sortedEntries[sortedEntries.length - 1].weight_kg - goalWeight
    : 0;

  const goalProgress = baselineWeight && goalWeight && sortedEntries.length > 0
    ? ((baselineWeight - sortedEntries[sortedEntries.length - 1].weight_kg) / (baselineWeight - goalWeight)) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {baselineWeight && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Starting Weight</p>
            <p className="text-2xl font-bold text-gray-900">{baselineWeight.toFixed(1)} kg</p>
          </div>
        )}

        {weightLost > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <p className="text-xs text-gray-600 mb-1">Weight Lost</p>
            <p className="text-2xl font-bold text-green-700">{weightLost.toFixed(1)} kg</p>
            <p className="text-xs text-green-600 mt-1">{percentLost.toFixed(1)}% of starting weight</p>
          </div>
        )}

        {goalWeight && (
          <>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Goal Weight</p>
              <p className="text-2xl font-bold text-blue-700">{goalWeight.toFixed(1)} kg</p>
              {goalRemaining > 0 && (
                <p className="text-xs text-blue-600 mt-1">{goalRemaining.toFixed(1)} kg to go</p>
              )}
            </div>

            {goalProgress > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <p className="text-xs text-gray-600 mb-1">Progress to Goal</p>
                <p className="text-2xl font-bold text-purple-700">{Math.min(goalProgress, 100).toFixed(0)}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(goalProgress, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Weight Loss Journey</h3>

        <div className="relative" style={{ height: '400px' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
              </linearGradient>
            </defs>

            {goalWeight && (
              <>
                <line
                  x1="0"
                  y1={getY(goalWeight)}
                  x2="100"
                  y2={getY(goalWeight)}
                  stroke="#3b82f6"
                  strokeWidth="0.3"
                  strokeDasharray="2,2"
                />
                <text
                  x="98"
                  y={getY(goalWeight) - 1}
                  fontSize="3"
                  fill="#3b82f6"
                  textAnchor="end"
                  className="font-semibold"
                >
                  Goal: {goalWeight}kg
                </text>
              </>
            )}

            {points.length > 1 && (
              <>
                <path
                  d={`${pathData} L ${points[points.length - 1].x} 100 L 0 100 Z`}
                  fill="url(#areaGradient)"
                />
                <path
                  d={pathData}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={point.isStart ? "2" : point.isEntry ? "1.8" : "1.5"}
                  fill={point.isStart ? "#ef4444" : "#0d9488"}
                  stroke="white"
                  strokeWidth="0.5"
                  className="hover:r-3 transition-all cursor-pointer"
                >
                  <title>
                    {point.isStart ? 'Starting Weight: ' : ''}{point.date}: {point.weight.toFixed(1)} kg
                  </title>
                </circle>
                {point.isStart && (
                  <text
                    x={point.x}
                    y={point.y - 3}
                    fontSize="2.5"
                    fill="#ef4444"
                    textAnchor="middle"
                    className="font-bold"
                  >
                    START
                  </text>
                )}
              </g>
            ))}

            {milestones.map((milestone, index) => {
              const milestoneDate = new Date(milestone.achieved_at);
              const milestoneX = getX(milestoneDate);
              const milestoneY = getY(milestone.weight_kg);

              return (
                <g key={index}>
                  <circle
                    cx={milestoneX}
                    cy={milestoneY}
                    r="2.5"
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth="0.5"
                  >
                    <title>{milestone.title}</title>
                  </circle>
                  <text
                    x={milestoneX}
                    y={milestoneY + 5}
                    fontSize="2"
                    fill="#f59e0b"
                    textAnchor="middle"
                    className="font-semibold"
                  >
                    ⭐
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Starting Weight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-600"></div>
            <span className="text-gray-600">Weight Entry</span>
          </div>
          {goalWeight && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500 border-dashed"></div>
              <span className="text-gray-600">Goal Weight</span>
            </div>
          )}
          {milestones.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-gray-600">Milestone</span>
            </div>
          )}
        </div>
      </div>

      {milestones.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">🏆</span>
            Your Milestones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {milestones.map((milestone, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-amber-200">
                <p className="font-semibold text-gray-900">{milestone.title}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {milestone.weight_kg.toFixed(1)} kg on {new Date(milestone.achieved_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
