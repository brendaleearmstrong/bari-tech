interface WeightEntry {
  measured_at: string;
  weight_kg: number;
}

interface WeightChartProps {
  entries: WeightEntry[];
  baselineWeight?: number;
}

export function WeightChart({ entries, baselineWeight }: WeightChartProps) {
  if (entries.length === 0) return null;

  const sortedEntries = [...entries].sort((a, b) =>
    new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );

  const allWeights = baselineWeight
    ? [baselineWeight, ...sortedEntries.map(e => e.weight_kg)]
    : sortedEntries.map(e => e.weight_kg);

  const minWeight = Math.min(...allWeights);
  const maxWeight = Math.max(...allWeights);
  const range = maxWeight - minWeight || 10;
  const chartMin = Math.floor(minWeight - range * 0.1);
  const chartMax = Math.ceil(maxWeight + range * 0.1);
  const chartRange = chartMax - chartMin;

  const getY = (weight: number) => {
    return ((chartMax - weight) / chartRange) * 100;
  };

  const chartWidth = 100;
  const pointSpacing = sortedEntries.length > 1 ? chartWidth / (sortedEntries.length - 1) : 0;

  const points = sortedEntries.map((entry, index) => ({
    x: index * pointSpacing,
    y: getY(entry.weight_kg),
    weight: entry.weight_kg,
    date: new Date(entry.measured_at).toLocaleDateString(),
  }));

  const pathData = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  return (
    <div className="w-full">
      <div className="relative bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-100">
        <h3 className="font-semibold text-gray-900 mb-4">Weight Progress</h3>

        <div className="relative" style={{ height: '300px' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
              </linearGradient>
            </defs>

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
                  strokeWidth="0.5"
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
                  r="1.5"
                  fill="#0d9488"
                  className="hover:r-2 transition-all cursor-pointer"
                >
                  <title>{point.date}: {point.weight} kg</title>
                </circle>
              </g>
            ))}
          </svg>
        </div>

        <div className="mt-4 flex justify-between text-sm text-gray-600">
          <span>{sortedEntries[0]?.measured_at ? new Date(sortedEntries[0].measured_at).toLocaleDateString() : ''}</span>
          <span className="font-semibold text-teal-700">
            {sortedEntries.length > 1 && baselineWeight && (
              <>-{(baselineWeight - sortedEntries[sortedEntries.length - 1].weight_kg).toFixed(1)} kg</>
            )}
          </span>
          <span>{sortedEntries[sortedEntries.length - 1]?.measured_at ? new Date(sortedEntries[sortedEntries.length - 1].measured_at).toLocaleDateString() : ''}</span>
        </div>
      </div>
    </div>
  );
}
