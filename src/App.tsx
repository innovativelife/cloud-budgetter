import { useState } from 'react';
import { AppProvider, useAppState } from './context/AppContext';
import { TabNavigation } from './components/layout/TabNavigation';
import { PageContainer } from './components/layout/PageContainer';
import { ServicesPage } from './components/services/ServicesPage';
import { BudgetPage } from './components/budget/BudgetPage';
import { SummaryPage } from './components/summary/SummaryPage';
import { WelcomeModal } from './components/shared/WelcomeModal';
import type { TabId } from './types';

function AppContent() {
  const { state, dispatch } = useAppState();
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [dismissed, setDismissed] = useState(false);

  const isFirstTime =
    !dismissed &&
    state.models.length === 1 &&
    state.models[0].data.services.length === 0 &&
    state.models[0].versions.length === 0;

  function handleWelcomeComplete(budgetName: string) {
    dispatch({
      type: 'RENAME_MODEL',
      payload: { modelId: state.models[0].id, name: budgetName },
    });
    setDismissed(true);
    setActiveTab('services');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <PageContainer>
        {activeTab === 'services' && <ServicesPage />}
        {activeTab === 'budget' && <BudgetPage />}
        {activeTab === 'summary' && <SummaryPage />}
      </PageContainer>
      {isFirstTime && <WelcomeModal onComplete={handleWelcomeComplete} />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
