import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, onValue, update, get, increment, push, set } from 'firebase/database';
import { Transaction, User } from '../types';
import { CheckCircle, Settings, DollarSign, Users, Wallet, LogOut, Loader2, PlusCircle, Copy } from 'lucide-react';
import { REFERRAL_STRUCTURE } from '../constants';

interface AdminPanelProps {
  onExit: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [activations, setActivations] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
  const [paymentNumber, setPaymentNumber] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [stats, setStats] = useState({ totalUsers: 0, totalBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Manual Balance Add State
  const [targetUserId, setTargetUserId] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addingFund, setAddingFund] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    // 1. Listen for pending activations
    const activationsRef = ref(db, 'activations');
    const unsubActivations = onValue(activationsRef, (snapshot) => {
      const data = snapshot.val();
      const list: Transaction[] = [];
      if (data) {
        Object.entries(data).forEach(([key, val]: [string, any]) => {
          if (val.status === 'pending') list.push({ ...val, id: key });
        });
      }
      setActivations(list.reverse()); 
    });

    // 2. Listen for pending withdrawals
    const withdrawalsRef = ref(db, 'withdrawals');
    const unsubWithdrawals = onValue(withdrawalsRef, (snapshot) => {
      const data = snapshot.val();
      const list: Transaction[] = [];
      if (data) {
        Object.entries(data).forEach(([key, val]: [string, any]) => {
          if (val.status === 'pending') list.push({ ...val, id: key });
        });
      }
      setWithdrawals(list.reverse());
    });

    // 3. Settings & Stats
    const settingsRef = ref(db, 'admin/settings');
    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.activePaymentNumber) setPaymentNumber(data.activePaymentNumber);
    });

    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        let userCount = 0;
        let balanceSum = 0;
        if (data) {
            const usersArray = Object.values(data) as User[];
            userCount = usersArray.length;
            usersArray.forEach(u => {
              if (u.balance && !isNaN(u.balance)) balanceSum += u.balance;
            });
        }
        setStats({ totalUsers: userCount, totalBalance: balanceSum });
        setLoading(false);
    });

    return () => {
      unsubActivations();
      unsubWithdrawals();
      unsubUsers();
    };

  }, []);

  const updatePaymentNumber = async () => {
    if (!newNumber) return;
    await update(ref(db, 'admin/settings'), { activePaymentNumber: newNumber });
    alert('Number updated successfully');
    setNewNumber('');
  };

  const handleAddFunds = async () => {
      if (!targetUserId || !addAmount) return alert("Fill all fields");
      setAddingFund(true);
      try {
          const uid = targetUserId.trim();
          const userRef = ref(db, 'users/' + uid);
          const snap = await get(userRef);
          if (!snap.exists()) {
              alert(`User ID '${uid}' not found! Check the ID again (e.g. MPxxxxx).`);
              setAddingFund(false);
              return;
          }

          const amount = parseFloat(addAmount);
          await update(userRef, { balance: increment(amount) });
          
          // Log transaction
          const txRef = push(ref(db, 'transactions'));
          await set(txRef, {
              userId: uid,
              amount: amount,
              type: 'admin_add',
              status: 'approved',
              timestamp: Date.now()
          });

          alert(`Successfully added ${amount} Tk to ${uid}`);
          setTargetUserId('');
          setAddAmount('');
      } catch (e: any) {
          alert("Error: " + e.message);
      } finally {
          setAddingFund(false);
      }
  };

  const approveActivation = async (trx: Transaction) => {
    if (!confirm("Account active করবেন?")) return;
    setProcessingId(trx.id);

    const updates: any = {};
    
    // --- 1. PRIORITY: Force Activation ---
    // We prepare the activation updates FIRST to ensure the user gets active
    updates[`activations/${trx.id}/status`] = 'approved';
    updates[`users/${trx.userId}/isActive`] = true;

    // --- 2. SECONDARY: Commission Distribution ---
    // We calculate commission in a try-catch block so it doesn't stop activation if it fails
    try {
        const userSnapshot = await get(ref(db, `users/${trx.userId}`));
        const allUsersSnap = await get(ref(db, 'users'));
        
        if (userSnapshot.exists() && allUsersSnap.exists()) {
            const user = userSnapshot.val() as User;
            const allUsers = allUsersSnap.val();
            
            // Map Referral Code -> User Object
            const codeToUser: Record<string, User> = {};
            Object.values(allUsers).forEach((u: any) => {
                if (u.referralCode) codeToUser[u.referralCode.toUpperCase()] = u;
            });

            let currentReferrerCode = user.referrerId ? user.referrerId.toUpperCase() : null;

            // Loop through commission tiers
            for (const tier of REFERRAL_STRUCTURE) {
                if (!currentReferrerCode || currentReferrerCode === 'ADMIN') break;

                const uplineUser = codeToUser[currentReferrerCode];
                if (uplineUser) {
                    // Add money to this upline directly via update path
                    // Note: We use 'increment' which is safe for concurrent updates
                    updates[`users/${uplineUser.id}/balance`] = increment(tier.amount);
                    
                    // Move up the chain
                    currentReferrerCode = uplineUser.referrerId ? uplineUser.referrerId.toUpperCase() : null;
                } else {
                    break; // Broken chain
                }
            }
        }
    } catch (err) {
        console.error("Commission calculation failed, but proceeding with activation", err);
    }

    // --- 3. COMMIT ALL UPDATES ---
    try {
        await update(ref(db), updates);
        alert("সফলভাবে অ্যাপ্রুভ হয়েছে!");
    } catch (error: any) {
        alert("Error: " + error.message);
    } finally {
        setProcessingId(null);
    }
  };

  const approveWithdrawal = async (trx: Transaction) => {
     if(!confirm("পেমেন্ট কনফার্ম করছেন?")) return;
     setProcessingId(trx.id);
     
     try {
        const updates: any = {};
        updates[`withdrawals/${trx.id}/status`] = 'approved';
        await update(ref(db), updates);
        alert("সফলভাবে পেমেন্ট অ্যাপ্রুভ হয়েছে!");
     } catch (error: any) {
        alert("Error: " + error.message);
     } finally {
        setProcessingId(null);
     }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-20">
      <div className="flex justify-between items-center bg-white p-4 sticky top-0 z-20 border-b border-slate-100 shadow-sm">
        <h1 className="text-lg font-bold text-slate-800">Admin Panel</h1>
        <button 
          onClick={onExit}
          className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs font-bold transition-colors active:bg-red-100"
        >
          <LogOut size={16} />
          Exit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 px-4">
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
             <div className="flex items-center gap-2 mb-2 text-blue-600">
                 <Users size={18} />
                 <span className="text-[10px] font-bold uppercase tracking-wider">Users</span>
             </div>
             <p className="text-2xl font-bold text-slate-800">
               {loading ? '...' : stats.totalUsers}
             </p>
         </div>
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
             <div className="flex items-center gap-2 mb-2 text-emerald-600">
                 <Wallet size={18} />
                 <span className="text-[10px] font-bold uppercase tracking-wider">Holdings</span>
             </div>
             <p className="text-2xl font-bold text-slate-800">
                ৳{loading ? '...' : stats.totalBalance.toFixed(0)}
             </p>
         </div>
      </div>

       {/* Manual Fund Add */}
       <div className="bg-white p-4 mx-4 rounded-2xl shadow-sm border border-slate-200">
         <div className="flex items-center gap-2 mb-3 text-indigo-600">
            <PlusCircle size={18} />
            <h2 className="font-bold text-sm">Add Balance to User</h2>
         </div>
         <div className="space-y-3">
            <input 
              value={targetUserId} 
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="User ID (e.g. MP92834)"
              className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:border-violet-500 text-sm font-mono"
            />
            <div className="flex gap-2">
                <input 
                value={addAmount} 
                type="number"
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="Amount (Tk)"
                className="flex-1 border border-slate-200 p-3 rounded-xl outline-none focus:border-violet-500 text-sm"
                />
                <button 
                    onClick={handleAddFunds} 
                    disabled={addingFund}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
                >
                    {addingFund ? '...' : 'Add'}
                </button>
            </div>
         </div>
      </div>

      {/* Payment Number Settings */}
      <div className="bg-white p-4 mx-4 rounded-2xl shadow-sm border border-slate-200">
         <div className="flex items-center gap-2 mb-3 text-slate-800">
            <Settings size={18} />
            <h2 className="font-bold text-sm">Payment Settings</h2>
         </div>
         <div className="flex gap-2">
            <input 
              value={newNumber} 
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder={paymentNumber || "Set Active Number"}
              className="flex-1 border border-slate-200 p-3 rounded-xl outline-none focus:border-violet-500 text-sm"
            />
            <button onClick={updatePaymentNumber} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform">
                Save
            </button>
         </div>
      </div>

      {/* Activations */}
      <div className="px-4">
         <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <CheckCircle className="text-violet-600" size={18} /> 
                Activations
            </h2>
            <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded text-[10px] font-bold">{activations.length} Pending</span>
         </div>
         
         <div className="space-y-3">
            {activations.length === 0 && (
                <div className="text-center py-6 bg-white rounded-xl border border-slate-100 border-dashed">
                    <p className="text-slate-400 text-xs">No pending activations</p>
                </div>
            )}
            {activations.map(trx => (
               <div key={trx.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${trx.method === 'bkash' ? 'bg-pink-100 text-pink-700' : 'bg-orange-100 text-orange-700'}`}>
                            {trx.method}
                        </span>
                        <span className="font-bold text-slate-800 text-sm">৳{trx.amount}</span>
                     </div>
                     <p className="text-xs text-slate-500 font-mono">{trx.mobileNumber}</p>
                     <p className="text-[10px] text-slate-900 font-bold mt-1">Trx: {trx.trxId}</p>
                     <div className="flex items-center gap-1 mt-1">
                        <p className="text-[10px] text-slate-400 font-mono">{trx.userId}</p>
                        <button onClick={() => navigator.clipboard.writeText(trx.userId)} className="text-slate-400"><Copy size={10}/></button>
                     </div>
                  </div>
                  <button 
                    onClick={() => approveActivation(trx)}
                    disabled={processingId === trx.id}
                    className="bg-violet-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-violet-200 transition-all active:scale-95 disabled:opacity-70"
                  >
                     {processingId === trx.id ? <Loader2 className="animate-spin" size={14} /> : 'Approve'}
                  </button>
               </div>
            ))}
         </div>
      </div>

      {/* Withdrawals */}
      <div className="px-4 pb-10">
         <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <DollarSign className="text-emerald-600" size={18} /> 
                Withdrawals
            </h2>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold">{withdrawals.length} Pending</span>
         </div>

         <div className="space-y-3">
            {withdrawals.length === 0 && (
                <div className="text-center py-6 bg-white rounded-xl border border-slate-100 border-dashed">
                    <p className="text-slate-400 text-xs">No pending withdrawals</p>
                </div>
            )}
            {withdrawals.map(trx => (
               <div key={trx.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                  <div>
                     <p className="font-bold text-slate-800 mb-1">৳{trx.amount}</p>
                     <p className="text-xs text-slate-500">{trx.mobileNumber}</p>
                     <span className="text-[10px] text-slate-400 uppercase">{trx.method}</span>
                  </div>
                  <button 
                    onClick={() => approveWithdrawal(trx)}
                    disabled={processingId === trx.id}
                    className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-70"
                >
                    {processingId === trx.id ? <Loader2 className="animate-spin" size={14} /> : 'Pay'}
                </button>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};
