import React from 'react';
import { REFERRAL_STRUCTURE, ACTIVATION_FEE } from '../constants';
import { Users, ArrowDown, Share2, Info } from 'lucide-react';

export const ReferralStructure: React.FC = () => {
  return (
    <div className="space-y-6 pb-24">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Income Logic</h3>
            <p className="text-xs text-slate-500">Activation Fee Distribution</p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
           <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600 font-medium">Activation Cost</span>
              <span className="text-lg font-bold text-slate-900">৳{ACTIVATION_FEE}</span>
           </div>
           <p className="text-xs text-slate-500 leading-relaxed">
             Commission starts at ৳75 per direct referral. Earn +৳5 bonus for every level upgrade (every 30 referrals)!
           </p>
        </div>

        <div className="relative">
           <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-indigo-100"></div>

           <div className="space-y-4">
              {REFERRAL_STRUCTURE.map((tier) => (
                <div key={tier.level} className="relative flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow z-10">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      tier.level === 1 ? 'bg-green-100 text-green-600 ring-4 ring-green-50' :
                      tier.level <= 4 ? 'bg-indigo-100 text-indigo-600' :
                      'bg-slate-100 text-slate-600'
                   }`}>
                      {tier.level}
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {tier.description}
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                         {tier.level === 1 ? 'Starts at ৳75 (+৳5/Level)' : `Receives ৳${tier.amount}`}
                      </p>
                   </div>
                   {tier.level === 1 && (
                     <div className="bg-green-50 px-2 py-1 rounded text-[10px] font-bold text-green-600 border border-green-100">
                        YOU
                     </div>
                   )}
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
