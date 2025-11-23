import React, { useState } from 'react';
import { db } from '../firebase';
import { ref, get, set } from 'firebase/database';
import { User } from '../types';
import { ShieldCheck, Copy, CheckCircle, ArrowRight, Import, Plus } from 'lucide-react';

interface SimpleAuthProps {
  onLogin: (uid: string) => void;
}

// 50 common words for mnemonic generation
const WORD_LIST = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet",
  "kilo", "lima", "mike", "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango",
  "uniform", "victor", "whiskey", "xray", "yankee", "zulu", "orbit", "galaxy", "rocket", "moon",
  "solar", "planet", "comet", "star", "nebula", "astro", "space", "laser", "robot", "cyber",
  "matrix", "vector", "pixel", "data", "code", "java", "script", "node", "react", "cloud"
];

export const SimpleAuth: React.FC<SimpleAuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'landing' | 'create' | 'import'>('landing');
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [importInput, setImportInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateMnemonic = () => {
    const words = [];
    for (let i = 0; i < 12; i++) {
      words.push(WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]);
    }
    setMnemonic(words);
    setMode('create');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mnemonic.join(" "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      const phrase = mnemonic.join(" ");
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const newUid = `MP${randomNum}`;
      const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const newUser: User = {
        id: newUid,
        password: phrase, // Storing mnemonic as password
        name: `Member ${randomNum}`,
        email: '',
        phone: '',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUid}`,
        balance: 0,
        isActive: false,
        referralCode: refCode,
        referrerId: '', // Orphan until activation
        role: 'user',
        joinedAt: Date.now()
      };

      await set(ref(db, 'users/' + newUid), newUser);
      onLogin(newUid);
    } catch (e: any) {
      alert("Error creating wallet: " + e.message);
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importInput.trim()) return;
    setLoading(true);
    const phrase = importInput.trim();

    try {
      const snapshot = await get(ref(db, 'users'));
      if (snapshot.exists()) {
        const users = snapshot.val();
        let foundId = null;
        
        Object.values(users).forEach((u: any) => {
          // Check Mnemonic/Password OR Legacy ID
          if (u.password === phrase || u.id === phrase) {
            foundId = u.id;
          }
        });

        if (foundId) {
          onLogin(foundId);
        } else {
          alert("Wallet not found! Please check your phrase or create a new wallet.");
          setLoading(false);
        }
      } else {
        alert("No users found.");
        setLoading(false);
      }
    } catch (e: any) {
      alert("Connection error.");
      setLoading(false);
    }
  };

  if (mode === 'landing') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
         <div className="w-20 h-20 bg-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
            <ShieldCheck size={40} />
         </div>
         <h1 className="text-3xl font-bold mb-2">Max Power</h1>
         <p className="text-slate-400 text-center mb-10 max-w-xs">Secure Crypto-Style Wallet & MLM Platform</p>

         <div className="w-full max-w-sm space-y-4">
            <button 
              onClick={generateMnemonic}
              className="w-full bg-violet-600 hover:bg-violet-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Plus size={20} /> Create New Wallet
            </button>
            <button 
              onClick={() => setMode('import')}
              className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Import size={20} /> I already have a wallet
            </button>
         </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col">
        <h2 className="text-2xl font-bold mb-2">Back up your wallet</h2>
        <p className="text-slate-400 text-sm mb-6">
          In the next step you will see 12 words that allows you to recover a wallet.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
           {mnemonic.map((word, idx) => (
             <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-center">
                <span className="text-[10px] text-slate-500 block mb-1">{idx+1}</span>
                <span className="font-mono text-sm font-bold text-violet-300">{word}</span>
             </div>
           ))}
        </div>

        <div className="flex-1"></div>

        <button 
          onClick={copyToClipboard}
          className="w-full bg-slate-800 text-violet-400 py-3 rounded-xl font-bold mb-3 flex items-center justify-center gap-2 active:bg-slate-700"
        >
          {copied ? <CheckCircle size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy Secret Phrase'}
        </button>

        <button 
          onClick={handleCreateAccount}
          disabled={loading}
          className="w-full bg-violet-600 py-4 rounded-xl font-bold shadow-lg shadow-violet-900/50 flex items-center justify-center"
        >
          {loading ? 'Creating Wallet...' : 'Continue'}
        </button>
      </div>
    );
  }

  return ( // Import Mode
    <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col justify-center">
       <button onClick={() => setMode('landing')} className="absolute top-6 left-6 text-slate-400">Back</button>
       
       <h2 className="text-2xl font-bold mb-2">Import Wallet</h2>
       <p className="text-slate-400 text-sm mb-6">
          Paste your 12-word Secret Phrase or legacy password to access your wallet.
       </p>

       <textarea 
         value={importInput}
         onChange={(e) => setImportInput(e.target.value)}
         placeholder="alpha bravo charlie..."
         className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white font-mono focus:border-violet-500 outline-none mb-6"
       />

       <button 
          onClick={handleImport}
          disabled={loading}
          className="w-full bg-violet-600 py-4 rounded-xl font-bold shadow-lg shadow-violet-900/50 flex items-center justify-center gap-2"
        >
          {loading ? 'Accessing...' : (
            <>
              Access Wallet <ArrowRight size={20} />
            </>
          )}
        </button>
    </div>
  );
};
