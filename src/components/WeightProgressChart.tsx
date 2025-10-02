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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Progress Chart</h3>
              <p className="text-sm text-gray-500 mt-1">Your weight loss journey visualized</p>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-100" style={{ height: '420px' }}>
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
                </linearGradient>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.1"/>
                </filter>
              </defs>

              {goalWeight && (
                <g opacity="0.6">
                  <line
                    x1="0"
                    y1={getY(goalWeight)}
                    x2="100"
                    y2={getY(goalWeight)}
                    stroke="#6366f1"
                    strokeWidth="0.4"
                    strokeDasharray="3,3"
                  />
                  <text
                    x="2"
                    y={getY(goalWeight) - 1.5}
                    fontSize="2.5"
                    fill="#6366f1"
                    className="font-medium"
                  >
                    Goal: {goalWeight}kg
                  </text>
                </g>
              )}

              {points.length > 1 && (
                <>
                  <path
                    d={`${pathData} L ${points[points.length - 1].x} 100 L 0 100 Z`}
                    fill="url(#chartGradient)"
                  />
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="0.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#shadow)"
                  />
                </>
              )}

              {points.map((point, index) => (
                <g key={index}>
                  {point.isStart ? (
                    <>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="2"
                        fill="#ef4444"
                        filter="url(#shadow)"
                        className="cursor-pointer"
                      >
                        <title>Starting Weight: {point.weight.toFixed(1)} kg on {point.date}</title>
                      </circle>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="2.5"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="0.3"
                        opacity="0.3"
                      />
                    </>
                  ) : point.isEntry ? (
                    <>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="1.2"
                        fill="#ffffff"
                        stroke="#14b8a6"
                        strokeWidth="0.5"
                        filter="url(#shadow)"
                        className="cursor-pointer"
                      >
                        <title>{point.date}: {point.weight.toFixed(1)} kg</title>
                      </circle>
                    </>
                  ) : null}
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
                      r="2"
                      fill="#fbbf24"
                      filter="url(#shadow)"
                      className="cursor-pointer"
                    >
                      <title>{milestone.title}</title>
                    </circle>
                    <circle
                      cx={milestoneX}
                      cy={milestoneY}
                      r="2.8"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="0.3"
                      opacity="0.4"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200"></div>
              <span className="text-gray-600">Starting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white ring-2 ring-teal-500"></div>
              <span className="text-gray-600">Progress</span>
            </div>
            {goalWeight && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-indigo-500 rounded-full opacity-60"></div>
                <span className="text-gray-600">Goal</span>
              </div>
            )}
            {milestones.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-200"></div>
                <span className="text-gray-600">Milestone</span>
              </div>
            )}
          </div>
        </div>

        {(baselineWeight || goalWeight || weightLost > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 border-t border-gray-100">
            {baselineWeight && (
              <div className="bg-white px-6 py-5">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Starting</div>
                <div className="text-2xl font-semibold text-gray-900">{baselineWeight.toFixed(1)} kg</div>
              </div>
            )}
            {sortedEntries.length > 0 && (
              <div className="bg-white px-6 py-5">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Current</div>
                <div className="text-2xl font-semibold text-gray-900">{sortedEntries[sortedEntries.length - 1].weight_kg.toFixed(1)} kg</div>
              </div>
            )}
            {weightLost > 0 && (
              <div className="bg-white px-6 py-5">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Lost</div>
                <div className="text-2xl font-semibold text-teal-600">-{weightLost.toFixed(1)} kg</div>
              </div>
            )}
            {goalWeight && (
              <div className="bg-white px-6 py-5">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Goal</div>
                <div className="text-2xl font-semibold text-indigo-600">{goalWeight.toFixed(1)} kg</div>
              </div>
            )}
          </div>
        )}
      </div>

      {milestones.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border border-amber-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">
              🏆
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Milestones Achieved</h3>
              <p className="text-sm text-gray-600">Celebrating your success</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 text-lg">
                    ⭐
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 mb-1">{milestone.title}</h4>
                    <p className="text-sm text-gray-600">
                      {milestone.weight_kg.toFixed(1)} kg • {new Date(milestone.achieved_at).toLocaleDateString()}
                    </p>
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
