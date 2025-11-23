
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { User } from '../types';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // We do nothing else here. 
        // The App component's listener will detect the login and switch the view automatically.
      } else {
        // Signup Logic
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        const newUser: User = {
          id: userCredential.user.uid,
          name,
          email,
          phone,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
          balance: 0,
          isActive: false,
          referralCode: generateReferralCode(),
          referrerId: referralCode || 'admin', 
          role: 'user',
          joinedAt: Date.now()
        };

        await set(ref(db, 'users/' + userCredential.user.uid), newUser);
        // Same here, App listener handles the rest
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setLoading(false); // Stop loading if error
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          {isLogin ? 'Login to access your wallet' : 'Join the network to start earning'}
        </p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs mb-4">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <input 
                type="text" placeholder="Full Name" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-violet-500"
                value={name} onChange={(e) => setName(e.target.value)} required
              />
              <input 
                type="tel" placeholder="Phone Number" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-violet-500"
                value={phone} onChange={(e) => setPhone(e.target.value)} required
              />
            </>
          )}
          
          <input 
            type="email" placeholder="Email Address" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-violet-500"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          
          <input 
            type="password" placeholder="Password" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-violet-500"
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />

          {!isLogin && (
            <input 
              type="text" placeholder="Referral Code (Optional)" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-violet-500"
              value={referralCode} onChange={(e) => setReferralCode(e.target.value)}
            />
          )}

          <button 
            disabled={loading}
            className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-sm text-violet-600 font-medium hover:underline"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};
