import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const getPageName = (pathname: string) => {
    if (pathname === '/' || pathname === '/dashboard') return 'DASHBOARD';
    if (pathname === '/products') return 'PRODUCTS';
    if (pathname === '/products/new') return 'NEW PRODUCT';
    if (pathname === '/stock-summary') return 'INVENTORY SUMMARY';
    if (pathname === '/sales') return 'SALES';
    if (pathname === '/sales/new') return 'NEW TRANSACTION';
    if (pathname === '/hr') return 'HUMAN RESOURCES';
    if (pathname === '/accounts') return 'FINANCE & ACCOUNTS';
    // Fallback
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) return segments[0].toUpperCase();
    return 'INVENZA ERP';
};

export function VideoTransition() {
    const location = useLocation();
    const [stage, setStage] = useState<'idle' | 'intro' | 'splitting' | 'done'>('idle');
    const [pageName, setPageName] = useState('');

    useEffect(() => {
        // Trigger transition on route change
        setPageName(getPageName(location.pathname));
        setStage('intro');
        
        // After 1.5 seconds, start the splitting animation
        const splitTimer = setTimeout(() => {
            setStage('splitting');
        }, 1500);

        // After the animation finishes, clear the overlay
        const doneTimer = setTimeout(() => {
            setStage('done');
        }, 2500); // 1.5s + 1s animation

        return () => {
            clearTimeout(splitTimer);
            clearTimeout(doneTimer);
        };
    }, [location.pathname]);

    if (stage === 'done' || stage === 'idle') return null;

    return (
        <div className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden flex">
            {/* Left Door */}
            <motion.div
                initial={{ x: 0 }}
                animate={{ x: stage === 'splitting' ? '-100%' : 0 }}
                transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                className="w-1/2 h-full bg-[#0071E3] relative"
            >
                {/* We render half the text anchored to the right edge of this div */}
                <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-screen text-center pointer-events-none flex items-center justify-center">
                    <motion.h1 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: stage === 'intro' ? 1 : 0, scale: stage === 'intro' ? 1 : 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="text-8xl md:text-[120px] font-black text-white uppercase tracking-tighter"
                    >
                        {pageName}
                    </motion.h1>
                </div>
            </motion.div>

            {/* Right Door */}
            <motion.div
                initial={{ x: 0 }}
                animate={{ x: stage === 'splitting' ? '100%' : 0 }}
                transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                className="w-1/2 h-full bg-[#0071E3] relative overflow-hidden"
            >
                {/* We render half the text anchored to the left edge of this div */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-screen text-center pointer-events-none flex items-center justify-center">
                    <motion.h1 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: stage === 'intro' ? 1 : 0, scale: stage === 'intro' ? 1 : 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="text-8xl md:text-[120px] font-black text-white uppercase tracking-tighter"
                    >
                        {pageName}
                    </motion.h1>
                </div>
            </motion.div>
        </div>
    );
}
