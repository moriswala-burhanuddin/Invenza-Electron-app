import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StoreConfigState {
    // 1. Company Information
    companyLogo: string | null;
    companyName: string;
    taxId: string;
    websiteUrl: string;
    companyEmail: string;
    etimsApiUrl: string;
    aiHostUrl: string;
    aiSearchUsername: string;
    aiSearchPassword: string;
    aiSearchClientId: string;

    // 2. Tax Management
    taxJarApiKey: string;
    locationBasedTax: boolean;
    useTaxValuesAcrossLocations: boolean;
    flatDiscountAlsoDiscountsTax: boolean;
    pricesIncludeTax: boolean;
    chargeTaxOnReceivings: boolean;
    defaultTaxGroup: string;
    taxRates: { id: string; name: string; percentage: number }[];
    cumulativeTax: boolean;

    // 3. Currency Management
    currencySymbol: string;
    currencyCode: string;
    currencySymbolPosition: 'before' | 'after';
    numberOfDecimals: number;
    thousandsSeparator: string;
    decimalPoint: string;
    baseCurrency: string;
    exchangeRates: { id: string; currency: string; rate: number }[];
    paymentCurrencyMapping: Record<string, string>;
    denominations: string[];

    // 4. Payment Types Configuration
    paymentMethods: {
        cash: boolean;
        check: boolean;
        giftCard: boolean;
        debitCard: boolean;
        creditCard: boolean;
        airtelMoney: boolean;
        storeAccount: boolean;
        pointsSystem: boolean;
    };
    paymentAdjustments: {
        cash: number;
        check: number;
        giftCard: number;
        debitCard: number;
        creditCard: number;
        storeAccount: number;
        pointsSystem: number;
        airtelMoney: number;
    };
    defaultPaymentType: string;
    defaultPaymentTypeReceivings: string;
    showSellingPriceOnReceivingReceipt: boolean;
    enableEBT: boolean;
    enableWIC: boolean;
    promptCCV: boolean;

    // 5. Orders & Delivery
    doNotTaxServiceDeliveries: boolean;
    deliveryColorByStatus: boolean;
    shippingProviders: { id: string; name: string; fee: number; timeDays: number; isDefault?: boolean }[];
    shippingZones: { id: string; name: string; zipRegex?: string; fee: number; taxGroupId?: string }[];
    defaultDeliveryAssignment: string;
    defaultEmployeeDeliveries: string;

    // 6. Returns
    returnReasons: string[];
    requireCustomerForReturn: boolean;
    requireReceiptForReturn: boolean;
    promptForSaleIdOnReturn: boolean;

    // 7. Sales Configuration
    saleIdPrefix: string;
    itemIdDisplay: 'UPC' | 'EAN' | 'ISBN';
    validateCustomerLocation: boolean;
    requireSupplierForReceiving: boolean;
    requireCustomerForSale: boolean;
    disableLineDiscounts: boolean;
    disableFixedDiscounts: boolean;
    disablePercentageDiscounts: boolean;
    disableEntireSaleDiscount: boolean;
    disableSaleCloning: boolean;
    disableReceivingCloning: boolean;
    confirmBeforeCompletingSale: boolean;
    confirmBeforeCompletingReceiving: boolean;
    allowReorderOnSales: boolean;
    allowReorderOnReceiving: boolean;
    chooseQuantityAfterAddingSale: boolean;
    chooseQuantityAfterAddingReceiving: boolean;
    updateBaseCostFromVariations: boolean;
    updateBaseSellingFromUnit: boolean;
    trackCashInRegister: boolean;
    trackChecksInRegister: boolean;
    trackDebitCards: boolean;
    trackCreditCards: boolean;
    trackAirtelMoney: boolean;
    alertWhenCashAboveLimit: number;
    alertWhenCashBelowLimit: number;
    setMinimumCashInDrawer: number;
    alwaysShowItemGrid: boolean;
    hideImagesInGrid: boolean;
    hideOutOfStock: boolean;
    enableQuickSelect: boolean;
    defaultViewForGrid: 'Categories' | 'All';
    hideCategories: boolean;
    hideTags: boolean;
    hideSuppliers: boolean;
    hideFavorites: boolean;
    doNotAllowSaleBelowCost: boolean;
    doNotAllowOutOfStockSales: boolean;
    doNotAllowDuplicateItemGrid: boolean;
    doNotAllowVariationWithoutSelection: boolean;
    disableSupplierSelectionOnSales: boolean;

    // 8. Suspended Sales
    suspendedSaleTypes: string[];
    ecommerceSuspendedType: string;
    removeQuantityWhenSuspending: boolean;
    requireCustomerSuspendedSale: boolean;
    lockSuspendedSale: boolean;
    doNotRecalculateCostOnUnsuspend: boolean;
    changeDateWhenSuspending: boolean;
    changeDateWhenCompletingSuspended: boolean;
    showReceiptAfterSuspending: boolean;
    overrideLayawayName: string;
    overrideEstimateName: string;
    layawayStatementMessage: string;

    // 9. Email & System Integrations
    emailSettingsHtml: string;
    ssoInfo: string;
    quickbooksIntegration: string;
    ecommerceIntegration: string;
    ecommerceEnabled: boolean;
    ecommerceApiUrl: string;
    ecommerceAuthToken: string;
    apiSettings: string;
    webhooks: string;
    lookupApi: string;

    // 10. Advanced Modules
    disabledModules: string[];
    employeeManagementSettings: string;
    storeAccountConfiguration: string;
    idNumberConfiguration: string;
    customerLoyaltyConfig: string;
    priceTierConfig: string;
    customFieldsConfig: string;
    itemKitBundlesConfig: string;
    purchaseOrdersConfig: string;
    expenseCategoriesConfig: string;
    salesCommissionsConfig: string;
    analyticsConfig: string;
    securityAuditConfig: string;

    // Actions
    updateConfig: (updates: Partial<StoreConfigState>) => void;
    updatePaymentMethod: (method: keyof StoreConfigState['paymentMethods'], value: boolean) => void;
    updatePaymentAdjustment: (method: keyof StoreConfigState['paymentAdjustments'], value: number) => void;
    addTaxRate: (rate: { id: string; name: string; percentage: number }) => void;
    removeTaxRate: (id: string) => void;
    addDenomination: (denomination: string) => void;
    removeDenomination: (denomination: string) => void;
    addShippingProvider: (provider: { id: string; name: string; fee: number; timeDays: number; isDefault?: boolean }) => void;
    removeShippingProvider: (id: string) => void;
    addShippingZone: (zone: { id: string; name: string; zipRegex?: string; fee: number; taxGroupId?: string }) => void;
    removeShippingZone: (id: string) => void;
}

export const useStoreConfig = create<StoreConfigState>()(
    persist(
        (set) => ({
            // 1. Company Information
            companyLogo: null,
            companyName: 'GHIZER ENTERPRISES U LIMITED',
            taxId: '1037861252',
            websiteUrl: 'https://tmr-tools.com',
            companyEmail: 'tmr@gmail.com',
            etimsApiUrl: '',
            aiHostUrl: '',
            aiSearchUsername: '',
            aiSearchPassword: '',
            aiSearchClientId: '',

            // 2. Tax Management
            taxJarApiKey: '',
            locationBasedTax: false,
            useTaxValuesAcrossLocations: false,
            flatDiscountAlsoDiscountsTax: false,
            pricesIncludeTax: false,
            chargeTaxOnReceivings: false,
            defaultTaxGroup: '',
            taxRates: [
                { id: '1', name: 'VAT 18%', percentage: 18 }
            ],
            cumulativeTax: false,

            // 3. Currency Management
            currencySymbol: 'UGX',
            currencyCode: 'UGX',
            currencySymbolPosition: 'before',
            numberOfDecimals: 0,
            thousandsSeparator: ',',
            decimalPoint: '.',
            baseCurrency: 'UGX',
            exchangeRates: [
                { id: '1', currency: 'USD', rate: 3800 },
                { id: '2', currency: 'INR', rate: 45 },
                { id: '3', currency: 'GBP', rate: 4800 },
                { id: '4', currency: 'AED', rate: 1030 },
                { id: '5', currency: 'UGX', rate: 1 }
            ],
            paymentCurrencyMapping: {},
            denominations: ['100', '50', '20', '10', '5', '2', '1', '0.5', '0.25'],

            // 4. Payment Types Configuration
            paymentMethods: {
                cash: true,
                check: true,
                giftCard: true,
                debitCard: true,
                creditCard: true,
                airtelMoney: false,
                storeAccount: true,
                pointsSystem: true,
            },
            paymentAdjustments: {
                cash: 0,
                check: 0,
                giftCard: 0,
                debitCard: 0,
                creditCard: 0,
                storeAccount: 0,
                pointsSystem: 0,
                airtelMoney: 0,
            },
            defaultPaymentType: 'cash',
            defaultPaymentTypeReceivings: 'cash',
            showSellingPriceOnReceivingReceipt: false,
            enableEBT: false,
            enableWIC: false,
            promptCCV: false,

            // 5. Orders & Delivery
            doNotTaxServiceDeliveries: false,
            deliveryColorByStatus: true,
            shippingProviders: [],
            shippingZones: [],
            defaultDeliveryAssignment: '',
            defaultEmployeeDeliveries: '',

            // 6. Returns
            returnReasons: ['Defective', 'Wrong Item', 'Not as Expected'],
            requireCustomerForReturn: false,
            requireReceiptForReturn: false,
            promptForSaleIdOnReturn: false,

            // 7. Sales Configuration
            saleIdPrefix: 'POS',
            itemIdDisplay: 'UPC',
            validateCustomerLocation: false,
            requireSupplierForReceiving: false,
            requireCustomerForSale: false,
            disableLineDiscounts: false,
            disableFixedDiscounts: false,
            disablePercentageDiscounts: false,
            disableEntireSaleDiscount: false,
            disableSaleCloning: false,
            disableReceivingCloning: false,
            confirmBeforeCompletingSale: false,
            confirmBeforeCompletingReceiving: false,
            allowReorderOnSales: true,
            allowReorderOnReceiving: true,
            chooseQuantityAfterAddingSale: false,
            chooseQuantityAfterAddingReceiving: false,
            updateBaseCostFromVariations: false,
            updateBaseSellingFromUnit: false,
            trackCashInRegister: true,
            trackChecksInRegister: false,
            trackDebitCards: false,
            trackCreditCards: false,
            trackAirtelMoney: false,
            alertWhenCashAboveLimit: 0,
            alertWhenCashBelowLimit: 0,
            setMinimumCashInDrawer: 0,
            alwaysShowItemGrid: true,
            hideImagesInGrid: false,
            hideOutOfStock: false,
            enableQuickSelect: true,
            defaultViewForGrid: 'Categories',
            hideCategories: false,
            hideTags: false,
            hideSuppliers: false,
            hideFavorites: false,
            doNotAllowSaleBelowCost: false,
            doNotAllowOutOfStockSales: false,
            doNotAllowDuplicateItemGrid: false,
            doNotAllowVariationWithoutSelection: true,
            disableSupplierSelectionOnSales: false,

            // 8. Suspended Sales
            suspendedSaleTypes: ['Layaway', 'Estimate'],
            ecommerceSuspendedType: 'Web Order',
            removeQuantityWhenSuspending: true,
            requireCustomerSuspendedSale: false,
            lockSuspendedSale: false,
            doNotRecalculateCostOnUnsuspend: false,
            changeDateWhenSuspending: false,
            changeDateWhenCompletingSuspended: false,
            showReceiptAfterSuspending: false,
            overrideLayawayName: 'Layaway',
            overrideEstimateName: 'Estimate',
            layawayStatementMessage: '',

            // 9. Email & System Integrations
            emailSettingsHtml: '',
            ssoInfo: '',
            quickbooksIntegration: '',
            ecommerceIntegration: '',
            ecommerceEnabled: false,
            ecommerceApiUrl: '',
            ecommerceAuthToken: '',
            apiSettings: '',
            webhooks: '',
            lookupApi: '',

            // 10. Advanced Modules
            disabledModules: [],
            employeeManagementSettings: '',
            storeAccountConfiguration: '',
            idNumberConfiguration: '',
            customerLoyaltyConfig: '',
            priceTierConfig: '',
            customFieldsConfig: '',
            itemKitBundlesConfig: '',
            purchaseOrdersConfig: '',
            expenseCategoriesConfig: '',
            salesCommissionsConfig: '',
            analyticsConfig: '',
            securityAuditConfig: '',

            // Actions
            updateConfig: (updates) => set((state) => ({ ...state, ...updates })),
            updatePaymentMethod: (method, value) => set((state) => ({
                paymentMethods: { ...state.paymentMethods, [method]: value }
            })),
            updatePaymentAdjustment: (method, value) => set((state) => ({
                paymentAdjustments: { ...state.paymentAdjustments, [method]: value }
            })),
            addTaxRate: (rate) => set((state) => ({ taxRates: [...state.taxRates, rate] })),
            removeTaxRate: (id) => set((state) => ({ taxRates: state.taxRates.filter(r => r.id !== id) })),
            addDenomination: (denom) => set((state) => ({ denominations: [...state.denominations, denom] })),
            removeDenomination: (denom) => set((state) => ({ denominations: state.denominations.filter(d => d !== denom) })),
            addShippingProvider: (provider) => set((state) => ({ shippingProviders: [...state.shippingProviders, provider] })),
            removeShippingProvider: (id) => set((state) => ({ shippingProviders: state.shippingProviders.filter(p => p.id !== id) })),
            addShippingZone: (zone) => set((state) => ({ shippingZones: [...state.shippingZones, zone] })),
            removeShippingZone: (id) => set((state) => ({ shippingZones: state.shippingZones.filter(z => z.id !== id) })),
        }),
        {
            name: 'invenza-store-config', // unique name
        }
    )
);
