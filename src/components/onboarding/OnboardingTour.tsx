import { useEffect, useState } from 'react';
import { Joyride, STATUS, Step } from 'react-joyride';
import { useERPStore } from '@/lib/store-data';

export const OnboardingTour = () => {
  const { hasCompletedTour, completeTour } = useERPStore();
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Only run the tour if it hasn't been completed yet
    if (!hasCompletedTour) {
      // Small delay to ensure the DOM elements (sidebar) have rendered
      const timer = setTimeout(() => {
        setRun(true);
        completeTour(); // Mark permanently done immediately to prevent re-shows on logout/refresh
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, completeTour]);

  const steps: Step[] = [
    {
      target: '#nav-store-config',
      content: 'First, configure your store settings here. You can set your business name, currency, and tax details.',
      placement: 'right',
    },
    {
      target: '#nav-accounts',
      content: 'Next, set up your financial accounts to track your balances and transactions.',
      placement: 'right',
    },
    {
      target: '#nav-customers',
      content: 'Manage your customers and CRM. Keep track of customer history and loyalty points.',
      placement: 'right',
    },
    {
      target: '#nav-products',
      content: 'Finally, add your products to the inventory to start selling!',
      placement: 'right',
    },
  ];

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
    }
  };

  const JoyrideComponent: any = Joyride;

  return (
    <JoyrideComponent
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#0071E3', // Match Invenza brand blue
          textColor: '#334155',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        },
        buttonNext: {
          backgroundColor: '#0071E3',
          borderRadius: '8px',
          fontWeight: 600,
        },
        buttonBack: {
          marginRight: '10px',
          color: '#64748b',
        },
        buttonSkip: {
          color: '#94a3b8',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        },
        tooltipContent: {
          padding: '20px 10px',
          fontSize: '15px',
          lineHeight: '1.5',
        },
      } as any}
    />
  );
};
