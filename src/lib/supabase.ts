import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables:', {
    url: supabaseUrl,
    key: supabaseAnonKey ? 'present' : 'missing',
    allEnv: import.meta.env
  });
  throw new Error('Missing Supabase environment variables. Check console for details.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          name: string | null;
          dob: string | null;
          gender: string | null;
          height_cm: number | null;
          baseline_weight_kg: number | null;
          current_weight_kg: number | null;
          surgery_date: string | null;
          surgery_type: string | null;
          timezone: string;
          locale: string;
          consent_image_training: boolean;
          consent_clinic_sharing: boolean;
          consent_conversation_logging: boolean;
          consent_anonymized_research: boolean;
          clinic_id: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      phases: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phase_type: 'pre_op' | 'clear_liquid' | 'full_liquid' | 'pureed' | 'soft' | 'regular' | 'maintenance';
          start_date: string;
          end_date: string | null;
          day_offset_start: number | null;
          day_offset_end: number | null;
          rules: {
            allowed_tags: string[];
            forbidden_tags: string[];
            max_portion_ml?: number;
          };
          protein_target_g: number;
          fluid_target_ml: number;
          calories_target: number | null;
          clinician_override: boolean;
          created_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      meal_directory: {
        Row: {
          id: string;
          canonical_name: string;
          description: string | null;
          phase_tags: string[];
          ingredients: Array<{ name: string; quantity: string; unit: string }>;
          default_portion_size: number;
          portion_unit: string;
          protein_g_per_portion: number;
          calories_per_portion: number;
          fat_g: number;
          carbs_g: number;
          fiber_g: number;
          allergens: string[];
          tags: string[];
          prep_instructions: string | null;
          prep_time_minutes: number | null;
          image_urls: string[];
          clinician_approved: boolean;
          source: string;
          locale: string;
          created_at: string;
          updated_at: string;
        };
      };
      meal_entries: {
        Row: {
          id: string;
          user_id: string;
          logged_at: string;
          phase_id: string | null;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
          total_protein_g: number;
          total_calories: number;
          total_carbs_g: number;
          total_fat_g: number;
          total_fiber_g: number;
          source: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      meal_items: {
        Row: {
          id: string;
          meal_entry_id: string;
          meal_directory_id: string | null;
          custom_name: string | null;
          quantity: number;
          unit: string;
          protein_g: number;
          calories: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          created_at: string;
        };
      };
      weight_entries: {
        Row: {
          id: string;
          user_id: string;
          weight_kg: number;
          measured_at: string;
          source: string;
          bmi: number | null;
          notes: string | null;
          created_at: string;
        };
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          amount_ml: number;
          logged_at: string;
          source: string;
          created_at: string;
        };
      };
      supplements: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          dose: string | null;
          schedule_type: string;
          schedule_times: string[];
          start_date: string;
          end_date: string | null;
          reminder_enabled: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      supplement_logs: {
        Row: {
          id: string;
          supplement_id: string;
          scheduled_time: string;
          taken_at: string | null;
          status: 'pending' | 'taken' | 'missed' | 'snoozed';
          created_at: string;
        };
      };
      daily_summaries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          protein_consumed_g: number;
          protein_target_g: number;
          calories_consumed: number;
          water_consumed_ml: number;
          water_target_ml: number;
          meals_logged: number;
          steps: number;
          supplements_taken: number;
          supplements_scheduled: number;
          supplements_compliance: number;
          phase_compliance: number;
          calculated_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
