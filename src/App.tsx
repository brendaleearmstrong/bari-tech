import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { DashboardPage } from './pages/DashboardPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { NutritionPage } from './pages/NutritionPage';
import { WaterPage } from './pages/WaterPage';
import { WeightPage } from './pages/WeightPage';
import { SupplementsPage} from './pages/SupplementsPage';
import { AssistantPage } from './pages/AssistantPage';
import { ExercisePage } from './pages/ExercisePage';
import { TimersPage } from './pages/TimersPage';
import { SetupPage } from './pages/SetupPage';
import { useUserProfile } from './hooks/useUserProfile';
import { supabase } from './lib/supabase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/signup" element={!user ? <SignUpPage /> : <Navigate to="/" replace />} />
      <Route
        path="/onboarding"
        element={user ? <OnboardingPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nutrition"
        element={
          <ProtectedRoute>
            <NutritionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/water"
        element={
          <ProtectedRoute>
            <WaterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/weight"
        element={
          <ProtectedRoute>
            <WeightPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supplements"
        element={
          <ProtectedRoute>
            <SupplementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exercise"
        element={
          <ProtectedRoute>
            <ExercisePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timers"
        element={
          <ProtectedRoute>
            <TimersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <AssistantPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  const [dbReady, setDbReady] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkDatabase() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const { error } = await supabase.from('users').select('id').limit(1);
        clearTimeout(timeoutId);

        if (error) {
          if (error.code === '42P01') {
            setDbReady(false);
          } else {
            console.warn('Database error:', error.message);
            setDbReady(false);
          }
        } else {
          setDbReady(true);
        }
      } catch (err: any) {
        console.error('Database check error:', err);
        if (err.name === 'AbortError' || err.message?.includes('fetch')) {
          console.error('Cannot connect to Supabase. Please check your database configuration.');
          setDbReady(false);
        } else {
          setDbReady(false);
        }
      }
    }
    checkDatabase();
  }, []);

  if (dbReady === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (dbReady === false) {
    return <SetupPage />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
