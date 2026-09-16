import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { isElectron } from "@/lib/electron-helper";

interface LicenseContextType {
  isLicensed: boolean;
  licenseKey: string | null;
  deviceId: string | null;
  clientInfo: any | null;
  subscriptionStatus: 'active' | 'trial' | 'expired' | null;
  expiryDate: string | null;
  trialDaysLeft: number | null;
  features: string[];
  hasFeature: (featureName: string) => boolean;
  verifyLicense: (key: string) => Promise<boolean>;
  isLoading: boolean;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

import { API_URL as CENTRAL_API_URL } from "@/lib/config";

// Ensure your Django backend URL is set here
const API_BASE_URL = CENTRAL_API_URL;

import { useERPStore } from "@/lib/store-data";

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLicensed, setIsLicensed] = useState<boolean>(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<any | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'trial' | 'expired' | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeLicense = async () => {
      setIsLoading(true);
      try {
        const token = useERPStore.getState().accessToken;
        if (token && token !== 'mock-local-token' && token !== 'bypass-token-offline') {
          const res = await fetch(`${CENTRAL_API_URL}/erp-credentials/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            setSubscriptionStatus(data.subscription_status);
            setExpiryDate(data.expiry_date || null);
            setTrialDaysLeft(data.trial_days !== undefined ? data.trial_days : null);
            setClientInfo({ name: data.company_name, id: data.id });
          } else {
            // Default to trial if request fails but we have a token
            setSubscriptionStatus('trial');
          }
        } else {
          setSubscriptionStatus(null);
        }
      } catch (err) {
        console.error("Failed to fetch erp-credentials in LicenseContext", err);
      }
      
      // We auto-activate the client features by default for the ERP.
      setIsLicensed(true);
      setLicenseKey("SAAS-ACTIVE");
      setFeatures([
        'Inventory Analytics',
        'Advanced Reports',
        'AI Analyst',
        'Inventory Forecast',
        'Reorder Optimization',
        'Smart Categorization',
        'Business Analyst Chat',
        'Invoice OCR',
        'HR Module',
        'Ecommerce Sync'
      ]);
      setIsLoading(false);
    };

    initializeLicense();
  }, []);

  const checkLicenseWithServer = async (key: string, devId: string) => {
    // Fail-safe: Always return true in SaaS mode
    return true;
  };

  const fetchEnabledFeatures = async (clientId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/license/features/?client_id=${clientId}`);
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        setFeatures(data.features || []);
      }
    } catch (error) {
      console.error("Failed to fetch features:", error);
    }
  };

  const verifyLicense = async (key: string) => {
    setIsLoading(true);
    // @ts-ignore
    const currentDeviceId = await window.electronAPI.getDeviceId();
    const success = await checkLicenseWithServer(key, currentDeviceId);
    
    if (success) {
      // @ts-ignore
      await window.electronAPI.saveLicenseKey(key);
      setLicenseKey(key);
    }
    
    setIsLoading(false);
    return success;
  };

  const hasFeature = (featureName: string) => {
    return features.includes(featureName);
  };

  return (
    <LicenseContext.Provider
      value={{
        isLicensed,
        licenseKey,
        deviceId,
        clientInfo,
        subscriptionStatus,
        expiryDate,
        trialDaysLeft,
        features,
        hasFeature,
        verifyLicense,
        isLoading,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error("useLicense must be used within a LicenseProvider");
  }
  return context;
};
