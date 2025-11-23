
import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { ref, onValue, update, get, increment, push, set } from 'firebase/database';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { ShieldCheck, Users, Wallet, Activity, CheckCircle, Settings, LogOut, Loader2, PlusCircle, Copy, Smartphone, KeyRound } from 'lucide-react';
import { REFERRAL_STRUCTURE, LEVEL_STEP, LEVEL_BONUS, BASE_COMMISSION } from './constants';

// Add type declaration for window object
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

// --- Types ---
interface Transaction {
  id: string;
  userId: string;
  type: 'activation' | 'withdrawal';
  amount: number;
  method: 'bkash' | 'nagad';
  mobileNumber: string;
  trxId?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
}

interface User {
  id: string;
  name: string;
  balance: number;
  isActive: boolean;
  referrerId?: string;
  referralCode: string;
}

// --- Main Admin Component ---
export default function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Auth State
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Data State
  const [activations, setActivations] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalHoldings: 0 });
  
  // Actions State
  const [processing, setProcessing] = useState<string | null>(null);
  const [paymentNumber, setPaymentNumber] = useState('');
  const [newNumber, setNewNumber] = useState('');
  
  // Manual Add
  const [targetUid, setTargetUid] = useState('');
  const [addAmount, setAddAmount] = useState('');

  // --- AUTH LOGIC (OTP) ---
  
  useEffect(() => {
    // Initialize Recaptcha invisible widget
    if (!window.recaptchaVerifier && !isAuthenticated) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved
        }
      });
    }
  }, [isAuthenticated]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    // 1. Validate Specific Admin Number
    // Allowing both formats: 01816395401 or +8801816395401
    const allowedNumber = "01816395401";
    const cleanInput = phoneNumber.replace('+88', '').trim();

    if (cleanInput !== allowedNumber) {
      alert("Access Denied: This number is not authorized for Admin access.");
      setAuthLoading(false);
      return;
    }

    // 2. Format for Firebase (+880...)
    const formattedNumber = `+88${cleanInput}`;

    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep('OTP');
      alert("OTP sent to " + formattedNumber);
    } catch (error: any) {
      console.error(error);
      alert("Error sending OTP: " + error.message);
      // Reset recaptcha on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setAuthLoading(true);

    try {
      await confirmationResult.confirm(otp);
      setIsAuthenticated(true); // Login Success
    } catch (error: any) {
      alert("Invalid OTP. Please try again.");
      console.error(error);
    } finally {
      setAuthLoading(false);
    }
  };

  // --- Realtime Data Fetching ---
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Pending Activations
    onValue(ref(db, 'activations'), (snap) => {
      const data = snap.val();
      const list: Transaction[] = [];
      if (data) Object.entries(data).forEach(([k, v]: [string, any]) => {
        if (v.status === 'pending') list.push({ ...v, id: k });
      });
      setActivations(list.reverse());
    });

    // 2. Pending Withdrawals
    onValue(ref(db, 'withdrawals'), (snap) => {
      const data = snap.val();
      const list: Transaction[] = [];
      if (data) Object.entries(data).forEach(([k, v]: [string, any]) => {
        if (v.status === 'pending') list.push({ ...v, id: k });
      });
      setWithdrawals(list.reverse());
    });

    // 3. Users & Stats
    onValue(ref(db, 'users'), (snap) => {
      const data = snap.val();
      if (data) {
        const uList = Object.values(data) as User[];
        setUsers(uList);
        const holdings = uList.reduce((sum, u) => sum + (u.balance || 0), 0);
        setStats({ totalUsers: uList.length, totalHoldings: holdings });
      }
    });

    // 4. Settings
    onValue(ref(db, 'admin/settings/activePaymentNumber'), (snap) => {
      if(snap.exists()) setPaymentNumber(snap.val());
    });

  }, [isAuthenticated]);

  // --- Actions ---

  const handleUpdateNumber = async () => {
    if (!newNumber) return;
    await update(ref(db, 'admin/settings'), { activePaymentNumber: newNumber });
    alert("Payment Number Updated!");
    setNewNumber('');
  };

  const handleManualAdd = async () => {
    if (!targetUid || !addAmount) return;
    if (!confirm(`Add ${addAmount} Tk to ${targetUid}?`)) return;

    const uid = targetUid.trim();
    const amount = parseFloat(addAmount);
    
    // Verify user exists first
    const user = users.find(u => u.id === uid);
    if (!user) return alert("User ID not found!");

    await update(ref(db, `users/${uid}`), { balance: increment(amount) });
    alert("Balance Added Successfully!");
    setTargetUid('');
    setAddAmount('');
  };

  const approveWithdrawal = async (tx: Transaction) => {
    if (!confirm("Mark withdrawal as PAID?")) return;
    setProcessing(tx.id);
    try {
      await update(ref(db, `withdrawals/${tx.id}`), { status: 'approved' });
    } catch(e) { alert("Error"); }
    setProcessing(null);
  };

  const approveActivation = async (tx: Transaction) => {
    if (!confirm("Activate this user?")) return;
    setProcessing(tx.id);

    try {
      const updates: any = {};
      
      // 1. Activate the User
      updates[`activations/${tx.id}/status`] = 'approved';
      updates[`users/${tx.userId}/isActive`] = true;

      // 2. Distribute Commissions
      const user = users.find(u => u.id === tx.userId);
      
      if (user && user.referrerId) {
        let currentReferrerCode = user.referrerId.toUpperCase();
        const codeMap: Record<string, User> = {};
        users.forEach(u => codeMap[u.referralCode.toUpperCase()] = u);

        for (let i = 0; i < REFERRAL_STRUCTURE.length; i++) {
          if (!currentReferrerCode || currentReferrerCode === 'ADMIN') break;
          
          const upline = codeMap[currentReferrerCode];
          if (!upline) break;

          let amount = 0;
          
          if (i === 0) { // Generation 1
             const uplineDirects = users.filter(u => u.referrerId === upline.referralCode).length;
             const uplineLevel = Math.floor(uplineDirects / LEVEL_STEP) + 1;
             const bonus = (uplineLevel - 1) * LEVEL_BONUS;
             amount = BASE_COMMISSION + bonus; 
          } else {
             // Updated logic based on request
             if (i === 1) amount = 35; // Level 2
             else if (i === 2) amount = 25; // Level 3
             else if (i === 3) amount = 15; // Level 4
             else if (i === 4) amount = 10; // Level 5
             else if (i >= 5 && i < 15) amount = 3; // 6-15
             else if (i >= 15 && i < 35) amount = 2; // 16-35
          }

          if (amount > 0) {
            updates[`users/${upline.id}/balance`] = increment(amount);
          }
          currentReferrerCode = upline.referrerId ? upline.referrerId.toUpperCase() : '';
        }
      }

      await update(ref(db), updates);

    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setProcessing(null);
  };

  // --- RENDER ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Admin Panel</h2>
          <p className="text-center text-slate-500 text-xs mb-6">Secure Access Verification</p>
          
          {/* Invisible Recaptcha Container */}
          <div id="recaptcha-container"></div>

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="tel" 
                  placeholder="Admin Mobile Number" 
                  className="w-full pl-10 p-4 bg-slate-100 rounded-xl border border-slate-200 outline-none focus:border-black transition-colors text-lg font-mono"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                />
              </div>
              <p className="text-xs text-center text-red-500">Only 01816395401 is authorized</p>
              <button 
                disabled={authLoading}
                className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {authLoading ? 'Sending...' : 'Send OTP Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="number" 
                  placeholder="Enter 6-digit OTP" 
                  className="w-full pl-10 p-4 bg-slate-100 rounded-xl border border-slate-200 outline-none focus:border-black transition-colors text-lg font-mono text-center tracking-[0.5em]"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                />
              </div>
              <button 
                disabled={authLoading}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {authLoading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button 
                type="button"
                onClick={() => setStep('PHONE')}
                className="w-full text-slate-500 text-sm hover:underline"
              >
                Back to Number
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-slate-900 text-white p-6 shadow-lg sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" /> Max Power Admin
            </h1>
            <p className="text-slate-400 text-xs mt-1">Secure Session Active</p>
          </div>
          <button onClick={() => { setIsAuthenticated(false); setStep('PHONE'); }} className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-2"><Users size={14}/> Total Users</div>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-2"><Wallet size={14}/> System Holdings</div>
            <div className="text-2xl font-bold text-emerald-600">৳{stats.totalHoldings.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-2"><Activity size={14}/> Activations</div>
            <div className="text-2xl font-bold text-violet-600">{activations.length} Pending</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
             <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-2"><CheckCircle size={14}/> Withdrawals</div>
            <div className="text-2xl font-bold text-orange-600">{withdrawals.length} Pending</div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="grid md:grid-cols-2 gap-6">
           {/* Update Payment Number */}
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Settings size={18} /> App Settings</h3>
              <p className="text-xs text-slate-500 mb-2">Current Payment Number: <span className="font-mono font-bold text-slate-800">{paymentNumber}</span></p>
              <div className="flex gap-2">
                 <input 
                   placeholder="New Bkash/Nagad Number" 
                   value={newNumber}
                   onChange={e => setNewNumber(e.target.value)}
                   className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                 />
                 <button onClick={handleUpdateNumber} className="bg-slate-900 text-white px-6 rounded-xl font-bold text-sm">Update</button>
              </div>
           </div>

           {/* Manual Add Fund */}
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-bold mb-4 flex items-center gap-2"><PlusCircle size={18} /> Add User Funds</h3>
              <div className="space-y-3">
                 <input 
                   placeholder="User ID (e.g. MP83921)" 
                   value={targetUid}
                   onChange={e => setTargetUid(e.target.value)}
                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                 />
                 <div className="flex gap-2">
                    <input 
                      placeholder="Amount" 
                      type="number"
                      value={addAmount}
                      onChange={e => setAddAmount(e.target.value)}
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                    <button onClick={handleManualAdd} className="bg-emerald-600 text-white px-6 rounded-xl font-bold text-sm">Add</button>
                 </div>
              </div>
           </div>
        </div>

        {/* Pending Activations List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-violet-50">
              <h3 className="font-bold text-violet-800">Pending Activations</h3>
              <span className="bg-white text-violet-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{activations.length}</span>
           </div>
           <div className="divide-y divide-slate-100">
              {activations.length === 0 && <p className="p-8 text-center text-slate-400">No requests pending</p>}
              {activations.map(tx => (
                <div key={tx.id} className="p-4 md:flex justify-between items-center hover:bg-slate-50">
                   <div className="mb-3 md:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-lg font-bold text-slate-800">৳{tx.amount}</span>
                         <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${tx.method==='bkash' ? 'bg-pink-100 text-pink-700' : 'bg-orange-100 text-orange-700'}`}>{tx.method}</span>
                      </div>
                      <p className="text-sm font-mono text-slate-600">Sender: {tx.mobileNumber}</p>
                      <p className="text-xs text-slate-400">TrxID: {tx.trxId}</p>
                      <p className="text-xs font-bold text-violet-600 mt-1">User: {tx.userId}</p>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => approveActivation(tx)}
                        disabled={processing === tx.id}
                        className="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md shadow-violet-200 active:scale-95 transition-all"
                      >
                         {processing === tx.id ? <Loader2 className="animate-spin" /> : 'Approve'}
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Pending Withdrawals List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50">
              <h3 className="font-bold text-orange-800">Pending Withdrawals</h3>
              <span className="bg-white text-orange-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{withdrawals.length}</span>
           </div>
           <div className="divide-y divide-slate-100">
              {withdrawals.length === 0 && <p className="p-8 text-center text-slate-400">No requests pending</p>}
              {withdrawals.map(tx => (
                <div key={tx.id} className="p-4 md:flex justify-between items-center hover:bg-slate-50">
                   <div className="mb-3 md:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-lg font-bold text-slate-800">৳{tx.amount}</span>
                         <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase">{tx.method}</span>
                      </div>
                      <p className="text-sm font-mono text-slate-600">Pay to: {tx.mobileNumber}</p>
                      <p className="text-xs text-slate-400">User: {tx.userId}</p>
                   </div>
                   <button 
                     onClick={() => approveWithdrawal(tx)}
                     disabled={processing === tx.id}
                     className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md shadow-emerald-200 active:scale-95 transition-all"
                   >
                     {processing === tx.id ? <Loader2 className="animate-spin" /> : 'Mark Paid'}
                   </button>
                </div>
              ))}
           </div>
        </div>

      </main>
    </div>
  );
}
