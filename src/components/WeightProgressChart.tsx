import { TrendingDown, Target, Trophy } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 rounded-3xl shadow-sm border border-teal-100 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingDown className="w-7 h-7 text-teal-600" />
                Progress Journey
              </h3>
              <p className="text-sm text-gray-600 mt-1">Your weight transformation over time</p>
            </div>
          </div>

          <div className="relative bg-white rounded-3xl p-6 shadow-inner" style={{ height: '400px' }}>
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>

                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05" />
                </linearGradient>

                <filter id="glow">
                  <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <rect x="0" y="0" width="100" height="100" fill="url(#gridPattern)" opacity="0.03"/>

              {goalWeight && (
                <g>
                  <line
                    x1="0"
                    y1={getY(goalWeight)}
                    x2="100"
                    y2={getY(goalWeight)}
                    stroke="#8b5cf6"
                    strokeWidth="0.3"
                    strokeDasharray="2,2"
                    opacity="0.6"
                  />
                  <rect
                    x="1"
                    y={getY(goalWeight) - 2}
                    width="16"
                    height="4"
                    rx="1"
                    fill="#8b5cf6"
                    opacity="0.9"
                  />
                  <text
                    x="9"
                    y={getY(goalWeight) + 0.6}
                    fontSize="2"
                    fill="white"
                    textAnchor="middle"
                    className="font-semibold"
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
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                  />
                </>
              )}

              {points.map((point, index) => {
                const isLast = index === points.length - 1;
                const isFirst = index === 0;

                return (
                  <g key={index}>
                    {point.isStart ? (
                      <>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="1.5"
                          fill="#ef4444"
                          stroke="white"
                          strokeWidth="0.4"
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="2.5"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="0.3"
                          opacity="0.4"
                        >
                          <animate
                            attributeName="r"
                            values="2.5;3.5;2.5"
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
                    ) : point.isEntry ? (
                      <>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={isLast ? "2" : "1.2"}
                          fill={isLast ? "#14b8a6" : "white"}
                          stroke={isLast ? "white" : "#14b8a6"}
                          strokeWidth="0.5"
                        />
                        {isLast && (
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="3"
                            fill="none"
                            stroke="#14b8a6"
                            strokeWidth="0.3"
                            opacity="0.5"
                          >
                            <animate
                              attributeName="r"
                              values="3;4;3"
                              dur="1.5s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.5;0.1;0.5"
                              dur="1.5s"
                              repeatCount="indefinite"
                            />
                          </circle>
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
                      r="2"
                      fill="#fbbf24"
                      stroke="white"
                      strokeWidth="0.4"
                    />
                    <circle
                      cx={milestoneX}
                      cy={milestoneY}
                      r="3"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="0.3"
                      opacity="0.4"
                    />
                  </g>
                );
              })}
            </svg>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-gray-500">
              <span>{allPoints[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>{allPoints[allPoints.length - 1]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
              <span className="text-gray-600 font-medium">Starting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-500 shadow-sm"></div>
              <span className="text-gray-600 font-medium">Current</span>
            </div>
            {goalWeight && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-violet-500" />
                <span className="text-gray-600 font-medium">Goal Line</span>
              </div>
            )}
            {validMilestones.length > 0 && (
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-gray-600 font-medium">Milestones</span>
              </div>
            )}
          </div>
        </div>
      </div>

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
