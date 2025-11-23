import React from 'react';
import { Home, Wallet, Users, Layers } from 'lucide-react';
import { ViewState } from '../types';

interface BottomNavProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChangeView }) => {
  const navItems = [
    { view: ViewState.HOME, icon: Home, label: 'Home' },
    { view: ViewState.WALLET, icon: Wallet, label: 'Wallet' },
    { view: ViewState.REFERRALS, icon: Users, label: 'Team' },
    { view: ViewState.STRUCTURE, icon: Layers, label: 'Plan' },
  ];

  return (
    <div className="bg-white border-t border-slate-100 pb-safe pt-2 px-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-50 w-full flex-shrink-0">
      <div className="flex justify-between items-center h-16">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => onChangeView(item.view)}
              className={`flex flex-col items-center justify-center w-16 transition-all duration-300 active:scale-90 touch-manipulation ${
                isActive ? 'text-violet-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-violet-50' : 'bg-transparent'}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium mt-1 ${isActive ? 'opacity-100 font-bold' : 'opacity-0 h-0'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
