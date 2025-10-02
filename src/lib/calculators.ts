export interface BMIResult {
  bmi: number;
  category: string;
  healthRisk: string;
}

export interface IBWResult {
  ibwKg: number;
  formula: string;
  adjustedBodyWeightKg?: number;
}

export interface BMRResult {
  bmr: number;
  formula: string;
}

export interface TDEEResult {
  tdee: number;
  activityLevel: string;
  activityFactor: number;
}

export interface ProteinTarget {
  dailyGrams: number;
  perMealGrams: number;
  method: string;
  rationale: string;
}

export interface FluidTarget {
  dailyMl: number;
  perHourMl: number;
  method: string;
  restrictions: string[];
}

export interface PortionGuideline {
  maxVolumeMl: number;
  recommendedProteinG: number;
  eatingDuration: string;
  biteSize: string;
  chewCount: number;
}

export interface SupplementScheduleItem {
  name: string;
  dose: string;
  frequency: string;
  timing: string[];
  startDay: number;
  notes: string;
}

export function calculateBMI(weightKg: number, heightCm: number): BMIResult {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  let category: string;
  let healthRisk: string;

  if (bmi < 18.5) {
    category = 'Underweight';
    healthRisk = 'Malnutrition risk';
  } else if (bmi < 25) {
    category = 'Normal weight';
    healthRisk = 'Low';
  } else if (bmi < 30) {
    category = 'Overweight';
    healthRisk = 'Moderate';
  } else if (bmi < 35) {
    category = 'Obesity Class I';
    healthRisk = 'Moderate to High';
  } else if (bmi < 40) {
    category = 'Obesity Class II';
    healthRisk = 'High';
  } else {
    category = 'Obesity Class III';
    healthRisk = 'Very High';
  }

  return {
    bmi: Math.round(bmi * 10) / 10,
    category,
    healthRisk,
  };
}

export function calculateIdealBodyWeight(
  heightCm: number,
  gender: 'male' | 'female',
  currentWeightKg?: number
): IBWResult {
  const heightInches = heightCm / 2.54;
  const inchesOver5Ft = heightInches - 60;

  let ibwKg: number;
  if (gender === 'male') {
    ibwKg = 50.0 + 2.3 * inchesOver5Ft;
  } else {
    ibwKg = 45.5 + 2.3 * inchesOver5Ft;
  }

  const result: IBWResult = {
    ibwKg: Math.round(ibwKg * 10) / 10,
    formula: 'Devine',
  };

  if (currentWeightKg && currentWeightKg > ibwKg * 1.25) {
    const adjustedBW = ibwKg + 0.4 * (currentWeightKg - ibwKg);
    result.adjustedBodyWeightKg = Math.round(adjustedBW * 10) / 10;
  }

  return result;
}

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female'
): BMRResult {
  let bmr: number;

  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  return {
    bmr: Math.round(bmr),
    formula: 'Mifflin-St Jeor',
  };
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): TDEEResult {
  const activityFactors: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const factor = activityFactors[activityLevel];
  const tdee = bmr * factor;

  return {
    tdee: Math.round(tdee),
    activityLevel,
    activityFactor: factor,
  };
}

export function calculateProteinTarget(
  currentWeightKg: number,
  idealBodyWeightKg: number,
  phase: string,
  mealsPerDay: number = 5
): ProteinTarget {
  let dailyGrams: number;
  let method: string;
  let rationale: string;

  switch (phase.toLowerCase()) {
    case 'pre_op':
      dailyGrams = Math.max(60, idealBodyWeightKg * 1.0);
      method = '1.0 g/kg IBW';
      rationale = 'Support healing, prepare for surgery';
      break;

    case 'clear_liquid':
    case 'full_liquid':
      dailyGrams = 60;
      method = 'Fixed minimum';
      rationale = 'Maintain muscle mass during restriction';
      break;

    case 'pureed':
    case 'soft':
      dailyGrams = Math.max(60, idealBodyWeightKg * 1.2);
      method = '1.2 g/kg IBW';
      rationale = 'Support healing, prevent malnutrition';
      break;

    case 'regular':
    case 'maintenance':
      const referenceWeight =
        currentWeightKg < idealBodyWeightKg * 1.3 ? currentWeightKg : idealBodyWeightKg;
      dailyGrams = referenceWeight * 1.5;
      method = '1.5 g/kg body weight';
      rationale = 'Optimize body composition, maintain muscle';
      break;

    default:
      dailyGrams = 80;
      method = 'Default safe minimum';
      rationale = 'Conservative estimate';
  }

  dailyGrams = Math.max(60, dailyGrams);

  return {
    dailyGrams: Math.round(dailyGrams),
    perMealGrams: Math.round(dailyGrams / mealsPerDay),
    method,
    rationale,
  };
}

export function calculateFluidTarget(
  currentWeightKg: number,
  phase: string,
  daysSinceSurgery?: number
): FluidTarget {
  let dailyMl: number;
  let restrictions: string[] = [];

  const baseTarget = currentWeightKg * 30;

  switch (phase.toLowerCase()) {
    case 'clear_liquid':
      if (daysSinceSurgery && daysSinceSurgery < 3) {
        dailyMl = 1000;
        restrictions = ['Sip only 30-60ml per 15 minutes', 'No straws', 'Avoid carbonation'];
      } else {
        dailyMl = Math.min(1500, baseTarget);
        restrictions = ['No straws', 'Small sips'];
      }
      break;

    case 'full_liquid':
    case 'pureed':
      dailyMl = Math.min(1800, baseTarget);
      restrictions = ['Separate fluids from meals (30 min rule)', 'No carbonation'];
      break;

    case 'soft':
    case 'regular':
    case 'maintenance':
      dailyMl = Math.min(2000, Math.max(1500, baseTarget));
      restrictions = [
        'Stop drinking 30 min before meals',
        'Resume 30 min after meals',
        'Limit caffeine',
      ];
      break;

    default:
      dailyMl = 1800;
      restrictions = ['Follow phase guidelines'];
  }

  return {
    dailyMl: Math.round(dailyMl),
    perHourMl: Math.round(dailyMl / 16),
    method: '30 ml/kg with phase adjustments',
    restrictions,
  };
}

export function calculatePortionGuideline(phase: string, daysSinceSurgery: number): PortionGuideline {
  switch (phase.toLowerCase()) {
    case 'clear_liquid':
      return {
        maxVolumeMl: 60,
        recommendedProteinG: 10,
        eatingDuration: '15-20 minutes',
        biteSize: 'Small sips',
        chewCount: 0,
      };

    case 'full_liquid':
      return {
        maxVolumeMl: 120,
        recommendedProteinG: 15,
        eatingDuration: '20-30 minutes',
        biteSize: 'Small sips',
        chewCount: 0,
      };

    case 'pureed':
      return {
        maxVolumeMl: 180,
        recommendedProteinG: 20,
        eatingDuration: '30 minutes',
        biteSize: 'Teaspoon size',
        chewCount: 20,
      };

    case 'soft':
      return {
        maxVolumeMl: 250,
        recommendedProteinG: 25,
        eatingDuration: '30-45 minutes',
        biteSize: 'Dime size',
        chewCount: 25,
      };

    case 'regular':
    case 'maintenance':
      return {
        maxVolumeMl: 350,
        recommendedProteinG: 30,
        eatingDuration: '30-45 minutes',
        biteSize: 'Small, mindful bites',
        chewCount: 30,
      };

    default:
      return {
        maxVolumeMl: 200,
        recommendedProteinG: 20,
        eatingDuration: '30 minutes',
        biteSize: 'Small',
        chewCount: 25,
      };
  }
}

export function calculateSupplementSchedule(
  surgeryType: 'sleeve' | 'bypass' | 'band',
  daysSinceSurgery: number
): SupplementScheduleItem[] {
  const schedule: SupplementScheduleItem[] = [];

  schedule.push({
    name: 'Bariatric Multivitamin',
    dose: '2 chewable tablets',
    frequency: 'Daily',
    timing: ['08:00', '20:00'],
    startDay: 1,
    notes: 'Take with food when tolerated',
  });

  schedule.push({
    name: 'Calcium Citrate',
    dose: '500-600mg',
    frequency: '2-3 times daily',
    timing: ['09:00', '15:00', '21:00'],
    startDay: 14,
    notes: 'Take separate from multivitamin (2+ hours apart)',
  });

  if (surgeryType === 'bypass') {
    schedule.push({
      name: 'Vitamin B12',
      dose: '500-1000 mcg sublingual',
      frequency: 'Daily',
      timing: ['08:00'],
      startDay: 7,
      notes: 'May switch to monthly injection per provider',
    });
  }

  schedule.push({
    name: 'Iron (Ferrous Sulfate or Citrate)',
    dose: '45-60mg elemental iron',
    frequency: 'Daily',
    timing: ['08:00'],
    startDay: 30,
    notes: 'Take with Vitamin C, separate from calcium by 2+ hours',
  });

  schedule.push({
    name: 'Vitamin D3',
    dose: '3000 IU',
    frequency: 'Daily',
    timing: ['08:00'],
    startDay: 1,
    notes: 'Take with calcium for absorption',
  });

  return schedule.filter((s) => daysSinceSurgery >= s.startDay);
}

export function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getFullYear())) {
    age--;
  }

  return age;
}

export function daysSinceSurgery(surgeryDate: string): number {
  const surgery = new Date(surgeryDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - surgery.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
