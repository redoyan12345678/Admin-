import React, { useState, useEffect } from 'react';
import { User, Transaction } from '../types';
import { db } from '../firebase';
import { ref, push, set, update, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { ArrowUpRight, Clock, CheckCircle2, XCircle, History } from 'lucide-react';

interface WalletViewProps {
  user: User;
}

export const WalletView: React.FC<WalletViewProps> = ({ user }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bkash'|'nagad'>('bkash');
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Transaction[]>([]);

  useEffect(() => {
    const withdrawalRef = query(ref(db, 'withdrawals'), orderByChild('userId'), equalTo(user.id));
    const unsub = onValue(withdrawalRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const list = Object.values(data) as Transaction[];
            setHistory(list.reverse());
        }
    });
    return () => unsub();
  }, [user.id]);

  const handleWithdraw = async () => {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt < 150) return alert("Minimum withdrawal is 150 Tk");
      if (amt > user.balance) return alert("Insufficient balance");
      if (!number) return alert("Enter number");

      setLoading(true);
      try {
          const newRef = push(ref(db, 'withdrawals'));
          const tx: Transaction = {
              id: newRef.key as string,
              userId: user.id,
              amount: amt,
              method,
              mobileNumber: number,
              type: 'withdrawal',
              status: 'pending',
              timestamp: Date.now()
          };
          await set(newRef, tx);
          
          await update(ref(db, `users/${user.id}`), {
              balance: user.balance - amt
          });
          
          alert("Withdrawal requested!");
          setAmount('');
      } catch (e) {
          alert("Error processing request");
      } finally {
          setLoading(false);
      }
  };

  return (
      <div className="space-y-6 pt-4 relative pb-20">
          <h1 className="text-2xl font-bold">Withdraw Funds</h1>
          
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-1">
                <p className="text-slate-400 text-sm">Available Balance</p>
              </div>
              <h2 className="text-4xl font-bold">৳{user.balance.toFixed(2)}</h2>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                  <ArrowUpRight className="text-violet-600" /> Request Withdrawal
              </h3>
              
              <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setMethod('bkash')} 
                        className={`p-3 rounded-xl font-bold border text-sm transition-all active:scale-95 ${method === 'bkash' ? 'bg-pink-50 border-pink-200 text-pink-600' : 'border-slate-100'}`}
                      >
                        bKash
                      </button>
                      <button 
                        type="button"
                        onClick={() => setMethod('nagad')} 
                        className={`p-3 rounded-xl font-bold border text-sm transition-all active:scale-95 ${method === 'nagad' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'border-slate-100'}`}
                      >
                        Nagad
                      </button>
                   </div>

                   <input 
                     type="number" 
                     placeholder="Amount (Min 150)" 
                     className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none text-base bg-slate-50/50 focus:bg-slate-100 transition-colors appearance-none"
                     value={amount}
                     onChange={e => setAmount(e.target.value)}
                   />
                   
                   <input 
                     type="tel" 
                     placeholder="Wallet Number" 
                     className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none text-base bg-slate-50/50 focus:bg-slate-100 transition-colors appearance-none"
                     value={number}
                     onChange={e => setNumber(e.target.value)}
                   />

                   <button 
                     onClick={handleWithdraw}
                     disabled={loading}
                     className="w-full bg-violet-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-violet-700 transition-all active:scale-95 touch-manipulation"
                   >
                       {loading ? 'Processing...' : 'Withdraw Now'}
                   </button>
              </div>
          </div>

          <div>
             <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700 px-2">
                  <History size={18} /> Withdrawal History
             </h3>
             <div className="space-y-3">
                {history.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No withdrawals yet.</p>}
                {history.map((tx) => (
                    <div key={tx.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {tx.status === 'approved' && <CheckCircle2 className="text-green-500" size={24} />}
                            {tx.status === 'pending' && <Clock className="text-orange-500" size={24} />}
                            {tx.status === 'rejected' && <XCircle className="text-red-500" size={24} />}
                            <div>
                                <p className="font-bold text-slate-800">৳{tx.amount}</p>
                                <p className="text-xs text-slate-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            tx.status === 'approved' ? 'bg-green-100 text-green-600' : 
                            tx.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                        }`}>
                            {tx.status}
                        </span>
                    </div>
                ))}
             </div>
          </div>
      </div>
  );
};
