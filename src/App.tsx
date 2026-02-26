import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { TabNavigation } from './components/layout/TabNavigation';
import { PageContainer } from './components/layout/PageContainer';
import { ServicesPage } from './components/services/ServicesPage';
import { BudgetPage } from './components/budget/BudgetPage';
import { SummaryPage } from './components/summary/SummaryPage';
import type { TabId } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('services');

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-100">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        <PageContainer>
          {activeTab === 'services' && <ServicesPage />}
          {activeTab === 'budget' && <BudgetPage />}
          {activeTab === 'summary' && <SummaryPage />}
        </PageContainer>
      </div>
    </AppProvider>
  );
}

export default App;
