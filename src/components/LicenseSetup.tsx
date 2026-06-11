import React, { useState } from "react";
import { useLicense } from "../contexts/LicenseContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { KeyRound, ShieldCheck, Loader2, Building, MonitorSmartphone } from "lucide-react";
import logo from "../assets/invenza-bg.png";

const LicenseSetup = () => {
  const [keyInput, setKeyInput] = useState("");
  const { verifyLicense, isLoading, deviceId } = useLicense();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    await verifyLicense(keyInput.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />
      
      <div className="relative z-10 max-w-md w-full">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-500 to-emerald-500 p-[1px] rounded-[2rem] shadow-2xl flex items-center justify-center mb-6 transition-transform hover:scale-105 duration-500">
            <div className="w-full h-full bg-[#0A0A0B] rounded-[1.9rem] flex items-center justify-center overflow-hidden">
               <img src={logo} alt="Invenza Logo" className="w-[70%] h-[70%] object-contain" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Invenza<span className="text-indigo-500">.</span></h1>
          <p className="text-slate-400 font-medium tracking-wide">Enterprise Resource Planning System</p>
        </div>

        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl shadow-blue-900/20 animate-fade-in-up [animation-delay:100ms] rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-8 px-8">
            <CardTitle className="text-xl text-white flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <KeyRound className="w-5 h-5 text-blue-500" />
              </div>
              Activate License
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm mt-2">
              Please enter your organization's license key to activate this device.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleVerify}>
            <CardContent className="space-y-6 px-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">License Key</label>
                <Input 
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="bg-slate-950 border-slate-700 text-white font-mono placeholder:text-slate-600 focus-visible:ring-indigo-500 h-14 rounded-2xl px-5 transition-all focus:border-indigo-500/50"
                  autoFocus
                />
              </div>

              <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50 space-y-4">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <MonitorSmartphone className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium">Device ID: <span className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded ml-1">{deviceId?.substring(0, 12)}...</span></span>
                </div>
                <div className="flex text-xs text-slate-400">
                  <Building className="w-4 h-4 text-emerald-500 mr-3 mt-0.5" />
                  <p className="leading-relaxed">This device will be registered to your organization's secure license node upon activation.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pb-8 px-8">
              <Button 
                type="submit" 
                className="w-full h-14 bg-white text-foreground hover:bg-slate-200 font-bold uppercase tracking-widest transition-all shadow-xl shadow-white/5 rounded-2xl active:scale-95 disabled:bg-slate-800 disabled:text-slate-500"
                disabled={!keyInput.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying Node...
                  </>
                ) : (
                  "Activate Device"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em] mt-10 animate-fade-in-up [animation-delay:200ms]">
          Protected by Invenza Security • System Version 3.0
        </p>
      </div>
    </div>
  );
};

export default LicenseSetup;
