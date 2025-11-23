import React from 'react';
import { CreditCard, Wallet, Sparkles } from 'lucide-react';
import { ACTIVATION_FEE } from '../constants';

interface WalletCardProps {
  balance: number;
  onActivate: () => void;
  isActive: boolean;
}

export const WalletCard: React.FC<WalletCardProps> = ({ balance, onActivate, isActive }) => {
  return (
    <div className="relative w-full h-56 rounded-3xl overflow-hidden shadow-xl transform transition-all hover:scale-[1.02] duration-300">
      {/* Background Gradient & Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600"></div>
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      {/* Content */}
      <div className="relative h-full p-6 flex flex-col justify-between text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-purple-200 tracking-wider uppercase">Current Balance</p>
            <h2 className="text-4xl font-bold mt-1">৳{balance.toFixed(2)}</h2>
          </div>
          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'bg-red-400'}`}></span>
               <span className="text-xs font-medium text-purple-100">
                 {isActive ? 'Active Member' : 'Inactive'}
               </span>
            </div>
            <p className="text-xs text-purple-200 opacity-80">**** **** 8204</p>
          </div>
          
          {!isActive && (
            <button 
              onClick={onActivate}
              className="bg-white text-purple-700 px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              <Sparkles size={16} />
              Activate (৳{ACTIVATION_FEE})
            </button>
          )}
          
          {isActive && (
             <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                <span className="text-xs font-semibold">V.I.P</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
