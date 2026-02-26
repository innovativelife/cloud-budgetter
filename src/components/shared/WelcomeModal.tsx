import { useState } from 'react';
import { Logo } from './Logo';

interface WelcomeModalProps {
  onComplete: (budgetName: string) => void;
}

export function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [budgetName, setBudgetName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = budgetName.trim() || 'My Budget';
    onComplete(name);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-gray-200">

        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="flex justify-center mb-4">
            <Logo className="w-20 h-20" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Cloud Budgetter</h1>
          <p className="text-sm text-gray-500 mt-2">
            Plan and forecast your cloud spending in three simple steps.
          </p>
        </div>

        {/* Workflow diagram */}
        <div className="px-8 py-6">
          <div className="flex items-start gap-3">

            {/* Step 1 */}
            <div className="flex-1 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-gray-900 mb-1">1. Add Services</div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Define your cloud services with unit costs, efficiency, and overhead.
              </p>
            </div>

            {/* Arrow */}
            <div className="pt-5 text-gray-300 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Step 2 */}
            <div className="flex-1 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-gray-900 mb-1">2. Enter Data</div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Fill in monthly consumption for each service across 12 months.
              </p>
            </div>

            {/* Arrow */}
            <div className="pt-5 text-gray-300 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Step 3 */}
            <div className="flex-1 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-gray-900 mb-1">3. View Summary</div>
              <p className="text-xs text-gray-500 leading-relaxed">
                See charts, totals, and breakdowns. Compare versions and share with your team.
              </p>
            </div>
          </div>
        </div>

        {/* Extra info row */}
        <div className="mx-8 px-4 py-3 bg-gray-50 rounded-lg flex gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Save versions as you work
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Export &amp; share with colleagues
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Compare any two versions
          </div>
        </div>

        {/* Name input + CTA */}
        <form onSubmit={handleSubmit} className="px-8 pt-6 pb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name your first budget
          </label>
          <div className="flex gap-3">
            <input
              autoFocus
              value={budgetName}
              onChange={(e) => setBudgetName(e.target.value)}
              placeholder="e.g. Q3 Cloud Budget, 2026 Forecast..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
            >
              Get Started
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
