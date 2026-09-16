import React from 'react';
import { useLicense } from '@/contexts/LicenseContext';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { subscriptionStatus, expiryDate, trialDaysLeft, isLoading } = useLicense();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-semibold uppercase tracking-wide text-[10px] animate-pulse">Verifying License...</p>
        </div>
      </div>
    );
  }

  const isExpired = subscriptionStatus === 'expired';
  let daysLeft = null;

  if (subscriptionStatus === 'trial' && trialDaysLeft !== null) {
    daysLeft = trialDaysLeft;
  } else if (expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Blocker for Expired Subscription
  if (isExpired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-red-100">
          <div className="bg-red-600 p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-white mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Subscription Expired</h1>
          </div>
          <div className="p-8 text-center">
            <p className="text-slate-600 mb-8 leading-relaxed">
              Your Invenza ERP subscription has expired. Access to cloud sync and desktop features is currently paused. Please renew your subscription to restore full access to your business data.
            </p>
            <Button 
              onClick={() => window.open('https://invenza-erp.cloud/portal/pricing', '_blank')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-6 rounded-xl text-lg flex items-center justify-center group"
            >
              Renew Subscription
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Warning Banner for Expiring Soon (< 7 days)
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;

  return (
    <div className="flex flex-col min-h-screen w-full relative">
      {isExpiringSoon && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center justify-between text-yellow-800 text-sm font-medium sticky top-0 z-[100] shadow-sm">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-yellow-600" />
            Your {subscriptionStatus === 'trial' ? 'trial' : 'subscription'} will expire in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}. To avoid interruption, please {subscriptionStatus === 'trial' ? 'upgrade' : 'renew'} soon.
          </div>
          <button 
            onClick={() => window.open('https://invenza-erp.cloud/portal/pricing', '_blank')}
            className="text-yellow-900 hover:text-black underline underline-offset-2 transition-colors ml-4 whitespace-nowrap"
          >
            {subscriptionStatus === 'trial' ? 'Upgrade Now' : 'Renew Now'}
          </button>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 w-full relative">
        {children}
      </div>
    </div>
  );
};
