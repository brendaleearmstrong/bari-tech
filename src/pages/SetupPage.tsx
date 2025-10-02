import { CheckCircle, ArrowRight } from 'lucide-react';

export function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">Database Ready!</h1>

          <p className="text-lg text-gray-600 mb-8">
            Your BariTech database has been successfully configured with all necessary tables and security policies.
          </p>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-teal-900 mb-2">Ready to Get Started</h2>
            <p className="text-sm text-teal-800">
              Create your account to begin tracking your bariatric journey.
            </p>
          </div>

          <a
            href="/signup"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Create Account
            <ArrowRight className="w-5 h-5" />
          </a>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <a href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
