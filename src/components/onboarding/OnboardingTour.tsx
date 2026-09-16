import { useEffect, useState } from 'react';
import { Joyride, STATUS, Step } from 'react-joyride';
import { useERPStore } from '@/lib/store-data';

export const OnboardingTour = () => {
  const { hasCompletedTour, completeTour, theme } = useERPStore();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // TEMPORARY: Dynamically set steps based on current page for video recording
    const hash = window.location.hash || '#/';
    
    // Stop any running tour when route changes
    setRun(false);
    setStepIndex(0);

    const timer = setTimeout(() => {
      if (hash.includes('/products/new')) {
        setSteps([
          {
            target: '#tour-new-product-details',
            content: 'Enter the basic details like name, description, and SKU here.',
            placement: 'right',
            disableBeacon: true,
          },
          {
            target: '#tour-new-product-pricing',
            content: 'Set your purchase price, selling price, and initial stock level.',
            placement: 'right',
            disableBeacon: true,
          },
          {
            target: '#tour-new-product-limits',
            content: 'Configure inventory limits to get low stock alerts automatically.',
            placement: 'right',
            disableBeacon: true,
          },
          {
            target: '#tour-new-product-save',
            content: 'Click here to save your new product to the inventory!',
            placement: 'bottom',
            disableBeacon: true,
          }
        ]);
        setRun(true);
      } else if (hash.includes('/products')) {
        setSteps([
          {
            target: '#tour-product-search',
            content: 'Search for any product instantly by name or SKU.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-product-actions',
            content: 'Easily import from Excel, transfer stock, or create new products.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-product-scanner',
            content: 'Use a barcode scanner to quickly find items or remove stock.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-product-filters',
            content: 'Filter your inventory by categories to find what you need faster.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-product-grid',
            content: 'View all your products, monitor stock levels, and update prices directly.',
            placement: 'top',
            disableBeacon: true,
          }
        ]);
        setRun(true);
      } else if (hash.includes('/stock-summary')) {
        setSteps([
          {
            target: '#tour-summary-total',
            content: 'View your total inventory value calculated directly from your buying prices.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-summary-units',
            content: 'See exactly how many unique items and SKUs you currently hold.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-summary-revenue',
            content: 'Understand your maximum revenue potential if all stock is sold at selling price.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-summary-margin',
            content: 'Track your expected profit margins instantly.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-summary-matrix',
            content: 'Search through your active inventory matrix to find specific item values.',
            placement: 'bottom-start',
            disableBeacon: true,
          }
        ]);
        setRun(true);
      } else if (hash.includes('/sales/new')) {
        setSteps([
          {
            target: '#tour-newsale-type',
            content: 'Choose whether this is a cash, credit, or retail sale.',
            placement: 'right',
            disableBeacon: true,
          },
          {
            target: '#tour-newsale-customer',
            content: 'Select an existing customer or quickly add a new one for credit sales and loyalty tracking.',
            placement: 'right',
            disableBeacon: true,
          },
          {
            target: '#tour-newsale-cart',
            content: 'Use the barcode scanner or search to instantly add items to the cart.',
            placement: 'top',
            disableBeacon: true,
          },
          {
            target: '#tour-newsale-payment',
            content: 'Process payments, apply gift cards, or split payments easily before completing the transaction.',
            placement: 'left',
            disableBeacon: true,
          }
        ]);
        setRun(true);
      } else if (hash.includes('/sales')) {
        setSteps([
          {
            target: '#tour-sales-actions',
            content: 'Quickly create a new transaction or export your sales data to CSV.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-sales-filters',
            content: 'Filter your sales history by payment type, time period, or search for specific invoices.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-sales-widgets',
            content: 'Monitor your total gross sales, net profit, and average ticket size at a glance.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-sales-list',
            content: 'View your detailed transaction history. Click any sale to see the full receipt and details.',
            placement: 'top',
            disableBeacon: true,
          }
        ]);
        setRun(true);
      } else if (hash.includes('/purchases')) {
        setSteps([
          {
            target: '#tour-purchase-stats',
            content: 'Monitor your total procurement costs, credit purchases, and average order value.',
            placement: 'bottom',
          },
          {
            target: '#tour-purchase-add',
            content: 'Record new stock purchases from your suppliers.',
            placement: 'left',
          },
          {
            target: '#tour-purchase-actions',
            content: 'Search your purchase history or apply filters to find specific orders.',
            placement: 'bottom',
          },
          {
            target: '#tour-purchase-list',
            content: 'View your detailed purchase stream. Click any invoice to see the items and payment status.',
            placement: 'top',
          }
        ]);
      } else if (hash.includes('/suppliers')) {
        setSteps([
          {
            target: '#tour-supplier-stats',
            content: 'Monitor your total suppliers, preferred vendors, and outstanding payables at a glance.',
            placement: 'bottom',
          },
          {
            target: '#tour-supplier-add',
            content: 'Easily onboard new suppliers to your ERP with their company details.',
            placement: 'left',
          },
          {
            target: '#tour-supplier-actions',
            content: 'Filter your supplier registry by status or search for specific vendors.',
            placement: 'bottom',
          },
          {
            target: '#tour-supplier-list',
            content: 'Access detailed supplier profiles, track reliability ratings, and view their contact information.',
            placement: 'top',
          }
        ]);
      } else if (hash.includes('/customers')) {
        setSteps([
          {
            target: '#tour-customer-stats',
            content: 'Get a quick overview of your total customers, high-value clients, and outstanding credit balances.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-customer-add',
            content: 'Add new customers to your database with their contact details and credit limits.',
            placement: 'left',
            disableBeacon: true,
          },
          {
            target: '#tour-customer-actions',
            content: 'Search through your customer list or perform bulk actions like deleting records.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-customer-list',
            content: 'View customer profiles, track their balances, and access their detailed purchase history.',
            placement: 'top',
            disableBeacon: true,
          }
        ]);
      } else if (hash === '#/' || hash === '' || hash.includes('/dashboard')) {
        setSteps([
          {
            target: '#tour-time-filters',
            content: 'Filter your dashboard data by time range instantly.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-stats-grid',
            content: 'Get a real-time overview of your revenue, profit, and inventory value.',
            placement: 'bottom',
            disableBeacon: true,
          },
          {
            target: '#tour-revenue-chart',
            content: 'Visualize your weekly sales and profit trends.',
            placement: 'right',
            disableBeacon: true,
          },
          {
            target: '#tour-target-summary',
            content: 'Track your monthly sales targets.',
            placement: 'left',
            disableBeacon: true,
          },
          {
            target: '#tour-action-shortcuts',
            content: 'Use quick shortcuts to navigate to key areas of the ERP.',
            placement: 'top',
            disableBeacon: true,
          }
        ]);
      } else {
        setSteps([]);
        setRun(false);
      }
    }, 1000); // Wait 1s for DOM to mount

    return () => clearTimeout(timer);
  }, [window.location.hash]);

  // Global Keyboard Listener for 'Enter'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!run && steps.length > 0) {
          // Start the tour
          setRun(true);
        } else if (run) {
          // Advance the tour
          if (stepIndex < steps.length - 1) {
            setStepIndex(prev => prev + 1);
          } else {
            // End the tour
            setRun(false);
            setStepIndex(0);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [run, stepIndex, steps.length]);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      completeTour(); // Mark as done and persist to localStorage
    }
  };

  const JoyrideComponent: any = Joyride;

  const TooltipComponent = ({ step }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] max-w-sm">
      <p className="text-slate-800 text-[15px] font-bold leading-relaxed m-0">
        {step.content}
      </p>
    </div>
  );

  return (
    <JoyrideComponent
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      hideBackButton
      run={run}
      stepIndex={stepIndex}
      disableOverlay={true}
      disableScrollParentFix={true}
      scrollToFirstStep={false}
      showProgress={false}
      showSkipButton={false}
      steps={steps}
      tooltipComponent={TooltipComponent}
      beaconComponent={() => <div className="hidden" style={{ display: 'none' }} />}
      styles={{
        options: {
          zIndex: 10000,
          arrowColor: '#ffffff',
        }
      }}
    />
  );
};
