import React, { useState, useEffect } from 'react';
import { WalletCard } from './WalletCard';
import { User, Transaction, ViewState } from '../types';
import { Share2, Trophy, TrendingUp, Copy, Check, LogOut, Crown, User as UserIcon, Zap, Search, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { ref, push, set, onValue, get, update } from 'firebase/database';
import { ACTIVATION_FEE, SALARY_TARGET, SALARY_AMOUNT, LEVEL_STEP, BASE_COMMISSION, LEVEL_BONUS } from '../constants';

interface HomeViewProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: ViewState) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ user, onLogout, onNavigate }) => {
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [paymentNumber, setPaymentNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [uplineName, setUplineName] = useState<string | null>(null);
  const [checkingRef, setCheckingRef] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    const settingsRef = ref(db, 'admin/settings/activePaymentNumber');
    onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) setPaymentNumber(snapshot.val());
    });

    const usersRef = ref(db, 'users');
    get(usersRef).then(snapshot => {
        if (snapshot.exists()) {
            const users = Object.values(snapshot.val()) as User[];
            const myRefs = users.filter(u => 
                u.referrerId && 
                u.referrerId.toUpperCase() === user.referralCode.toUpperCase()
            ).length;
            setReferralCount(myRefs);
        }
    });
  }, [user.referralCode]);

  const handleCopyReferral = () => {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const checkReferralCode = async (code: string) => {
      setReferralInput(code);
      setUplineName(null);
      if (code.length < 3) return;
      
      setCheckingRef(true);
      const snapshot = await get(ref(db, 'users'));
      if (snapshot.exists()) {
          const users = Object.values(snapshot.val()) as User[];
          const upline = users.find(u => u.referralCode.toUpperCase() === code.toUpperCase());
          if (upline) {
              setUplineName(`Upline: ${upline.id}`);
          } else {
              setUplineName("Invalid Referral Code");
          }
      }
      setCheckingRef(false);
  };

  const submitActivation = async () => {
      if (!senderNumber || !trxId) return alert("Please fill payment details");
      if (!referralInput || uplineName === "Invalid Referral Code") return alert("Valid Referral Code is required");
      
      setSubmitting(true);
      try {
          // Update User with the Referrer ID immediately so they are bound
          await update(ref(db, `users/${user.id}`), {
              referrerId: referralInput.toUpperCase()
          });

          const newTxRef = push(ref(db, 'activations'));
          const transaction: Transaction = {
              id: newTxRef.key as string,
              userId: user.id,
              type: 'activation',
              amount: ACTIVATION_FEE,
              method: paymentMethod,
              mobileNumber: senderNumber,
              trxId: trxId,
              status: 'pending',
              timestamp: Date.now(),
              referralCodeUsed: referralInput.toUpperCase()
          };
          await set(newTxRef, transaction);
          setShowActivateModal(false);
          alert("Activation request submitted! Admin will approve shortly.");
      } catch (e) {
          alert("Error submitting request");
      } finally {
          setSubmitting(false);
      }
  };

  // Level Logic
  const currentLevel = Math.floor(referralCount / LEVEL_STEP) + 1;
  const nextLevelTarget = currentLevel * LEVEL_STEP;
  const progressInLevel = referralCount % LEVEL_STEP;
  const levelProgressPercent = (progressInLevel / LEVEL_STEP) * 100;
  const currentPerRef = BASE_COMMISSION + ((currentLevel - 1) * LEVEL_BONUS);

  // Salary Logic
  const MARKETING_TARGET = 2000; 
  const salaryProgress = Math.min((referralCount / SALARY_TARGET) * 100, 100);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center py-2">
        <div onClick={() => onNavigate(ViewState.PROFILE)} className="cursor-pointer">
          <h1 className="text-2xl font-bold text-slate-800">Max Power</h1>
          <p className="text-slate-500 text-xs font-mono">ID: {user.id}</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={onLogout}
                className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors active:scale-95 touch-manipulation"
            >
                <LogOut size={20} />
            </button>
            <button 
                onClick={() => onNavigate(ViewState.PROFILE)}
                className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm"
            >
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            </button>
        </div>
      </header>

      <WalletCard 
        balance={user.balance} 
        isActive={user.isActive} 
        onActivate={() => setShowActivateModal(true)} 
      />

      {/* Level Progress Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
         <div className="flex justify-between items-center mb-3">
             <div>
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <Zap className="text-yellow-500" fill="currentColor" size={18}/>
                     Level {currentLevel}
                 </h3>
                 <p className="text-xs text-slate-400">Earning ৳{currentPerRef} per referral</p>
             </div>
             <div className="text-right">
                 <p className="text-2xl font-bold text-indigo-600">{referralCount}</p>
                 <p className="text-[10px] text-slate-400 uppercase font-bold">Total Refs</p>
             </div>
         </div>
         <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
             <div 
                className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-1000"
                style={{ width: `${levelProgressPercent}%` }}
             ></div>
         </div>
         <p className="text-xs text-center mt-2 text-slate-500">
             {LEVEL_STEP - progressInLevel} more referrals to reach Level {currentLevel + 1} (+৳{LEVEL_BONUS} Bonus)
         </p>
      </div>

      {/* Salary Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 p-6 opacity-10">
              <Crown size={100} />
          </div>
          <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                      <Crown size={20} className="text-yellow-300" />
                  </div>
                  <h3 className="font-bold">Monthly Salary</h3>
              </div>
              <div className="flex justify-between items-end mb-2">
                  <div>
                      <p className="text-3xl font-bold">৳{SALARY_AMOUNT.toLocaleString()}</p>
                      <p className="text-emerald-100 text-xs">Target: {MARKETING_TARGET} Referrals</p>
                  </div>
                  <div className="text-right">
                      <p className="text-xl font-bold">{referralCount}</p>
                      <p className="text-emerald-100 text-xs">Completed</p>
                  </div>
              </div>
              <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 transition-all duration-1000" style={{ width: `${salaryProgress}%` }}></div>
              </div>
          </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden transform transition-all">
         <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500 rounded-full filter blur-3xl opacity-20 translate-x-10 -translate-y-10"></div>
         
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
               <div>
                   <h2 className="text-xl font-bold mb-1">Your Refer Code</h2>
                   <p className="text-slate-400 text-sm">Share to earn money</p>
               </div>
               <button 
                 onClick={handleCopyReferral}
                 className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors active:scale-90"
                >
                   {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
               </button>
            </div>
            
            <div className="bg-slate-800/50 p-3 rounded-xl text-center font-mono text-lg tracking-wider border border-slate-700 select-all">
                {user.referralCode}
            </div>
            
            <button 
               onClick={() => {
                   if (navigator.share) {
                       navigator.share({title: 'Join Max Power', text: `Use my code ${user.referralCode} to join Max Power!`})
                   } else {
                       handleCopyReferral();
                       alert("Referral Code Copied!");
                   }
               }}
               className="w-full mt-4 bg-violet-500 hover:bg-violet-400 text-white py-3 rounded-xl font-semibold shadow-lg shadow-violet-900/50 flex items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation"
            >
               <Share2 size={18} /> Share Link
            </button>
         </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-3 text-green-600">
               <Trophy size={20} />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-1">Total Income</p>
            <p className="text-lg font-bold text-slate-800">৳{user.balance.toFixed(2)}</p>
         </div>
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3 text-blue-600">
               <TrendingUp size={20} />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-1">Status</p>
            <p className="text-lg font-bold text-slate-800">{user.isActive ? 'Active' : 'Inactive'}</p>
         </div>
      </div>

      {/* Activation Modal */}
      {showActivateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-in fade-in zoom-in-95 duration-200 shadow-2xl overflow-y-auto max-h-[90vh]">
                  <h2 className="text-xl font-bold mb-4">Activate Account</h2>
                  <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 text-xs text-yellow-800 mb-4">
                      Send ৳{ACTIVATION_FEE} to the number below using Send Money.
                  </div>
                  
                  <div className="text-center mb-6">
                      <p className="text-xs text-slate-500 mb-1">Admin Number (Personal)</p>
                      <p className="text-2xl font-bold text-slate-800 tracking-wider select-all">{paymentNumber || "Loading..."}</p>
                  </div>

                  <div className="space-y-3">
                      {/* Payment Method */}
                      <div className="grid grid-cols-2 gap-2">
                          <button 
                            type="button"
                            onClick={() => setPaymentMethod('bkash')}
                            className={`p-3 rounded-xl border text-center font-bold text-sm transition-all ${paymentMethod === 'bkash' ? 'bg-pink-600 text-white border-pink-600 scale-[1.02]' : 'border-slate-200'}`}
                          >
                              bKash
                          </button>
                          <button 
                            type="button"
                            onClick={() => setPaymentMethod('nagad')}
                            className={`p-3 rounded-xl border text-center font-bold text-sm transition-all ${paymentMethod === 'nagad' ? 'bg-orange-600 text-white border-orange-600 scale-[1.02]' : 'border-slate-200'}`}
                          >
                              Nagad
                          </button>
                      </div>

                      {/* Payment Inputs */}
                      <input 
                          type="number"
                          placeholder="Sender Number"
                          value={senderNumber}
                          onChange={e => setSenderNumber(e.target.value)}
                          className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-base appearance-none focus:border-violet-500 outline-none"
                      />
                      <input 
                          type="text"
                          placeholder="Transaction ID (TrxID)"
                          value={trxId}
                          onChange={e => setTrxId(e.target.value)}
                          className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-base appearance-none focus:border-violet-500 outline-none"
                      />

                      {/* Referral Code Check (Mandatory) */}
                      <div className="relative">
                          <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Upline Referral Code *</label>
                          <input 
                              type="text"
                              placeholder="Enter Referral Code"
                              value={referralInput}
                              onChange={e => checkReferralCode(e.target.value)}
                              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-base appearance-none focus:border-violet-500 outline-none uppercase"
                          />
                          {checkingRef && <span className="absolute right-3 top-9 text-xs text-slate-400">Checking...</span>}
                          {uplineName && (
                              <p className={`text-xs mt-1 font-bold ${uplineName === 'Invalid Referral Code' ? 'text-red-500' : 'text-green-600'}`}>
                                  {uplineName}
                              </p>
                          )}
                      </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                      <button type="button" onClick={() => setShowActivateModal(false)} className="flex-1 py-3 font-bold text-slate-500 active:scale-95 transition-transform">Cancel</button>
                      <button 
                          type="button"
                          onClick={submitActivation}
                          disabled={submitting || uplineName === 'Invalid Referral Code' || !uplineName}
                          className="flex-1 bg-violet-600 text-white rounded-xl font-bold py-3 shadow-lg touch-manipulation active:scale-95 transition-transform disabled:bg-slate-300"
                        >
                          {submitting ? '...' : 'Submit'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
