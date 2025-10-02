import { useState } from 'react';
import { Layout } from '../components/Layout';
import { useUserProfile } from '../hooks/useUserProfile';
import { calculateSupplementSchedule, daysSinceSurgery } from '../lib/calculators';
import { Pill, Check, Plus } from 'lucide-react';

export function SupplementsPage() {
  const { profile } = useUserProfile();
  const [takenToday, setTakenToday] = useState<string[]>([]);

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </Layout>
    );
  }

  const daysPostOp = profile.surgery_date ? daysSinceSurgery(profile.surgery_date) : 0;
  const schedule = calculateSupplementSchedule(
    (profile.surgery_type as any) || 'sleeve',
    daysPostOp
  );

  const handleToggle = (suppName: string) => {
    if (takenToday.includes(suppName)) {
      setTakenToday(takenToday.filter((n) => n !== suppName));
    } else {
      setTakenToday([...takenToday, suppName]);
    }
  };

  const complianceRate = schedule.length > 0 ? (takenToday.length / schedule.length) * 100 : 0;

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <Pill className="w-8 h-8 mr-3 text-emerald-600" />
            Supplement Tracker
          </h1>

          <div className="mb-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold text-gray-900">Today's Progress</span>
              <span className="text-2xl font-bold text-emerald-600">
                {takenToday.length} / {schedule.length}
              </span>
            </div>
            <div className="relative pt-1">
              <div className="overflow-hidden h-6 text-xs flex rounded-full bg-white">
                <div
                  style={{ width: complianceRate + '%' }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-emerald-600 to-green-500 transition-all duration-500"
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{complianceRate.toFixed(0)}% compliance</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">Today's Supplements</h3>
            {schedule.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Pill className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No supplements scheduled for your current phase</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedule.map((supp, index) => {
                  const isTaken = takenToday.includes(supp.name);
                  return (
                    <div
                      key={index}
                      onClick={() => handleToggle(supp.name)}
                      className={"p-4 rounded-xl border-2 transition-all cursor-pointer " + (isTaken ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-emerald-200')}
                    >
                      <div className="flex items-start">
                        <div className={"w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 mt-0.5 transition-all " + (isTaken ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300')}>
                          {isTaken && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{supp.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Dose:</strong> {supp.dose}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Timing:</strong> {supp.timing.join(', ')}
                          </p>
                          <p className="text-sm text-gray-600 mt-2 italic">{supp.notes}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-sm text-emerald-800">
              <strong>Important:</strong> These are general guidelines. Always follow your surgeon's and dietitian's specific supplement recommendations. Take supplements at the recommended times and never skip doses.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
