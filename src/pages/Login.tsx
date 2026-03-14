import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  db, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, User as UserIcon, LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleAuthSuccess = async (user: any, displayName?: string) => {
    // Check if profile exists, if not bootstrap for the owner email
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      const isOwner = user.email === 'kapicoast@gmail.com';
      
      await setDoc(profileRef, {
        uid: user.uid,
        name: displayName || user.displayName || (isOwner ? 'Kapi Coast' : 'User'),
        email: user.email,
        role: isOwner ? 'owner' : 'staff',
        outletIds: [],
        permissions: isOwner ? {
          upload_bills: true,
          approve_bills: true,
          view_reports: true,
          manage_vendors: true,
          view_settlements: true,
        } : {
          upload_bills: true,
          approve_bills: false,
          view_reports: false,
          manage_vendors: false,
          view_settlements: true,
        },
        createdAt: serverTimestamp()
      });
      toast.success(isOwner ? 'Owner profile bootstrapped!' : 'Profile created.');
    }

    toast.success('Logged in successfully');
    navigate('/');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(result.user, name);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(result.user);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleAuthSuccess(result.user);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 md:p-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight">Kapi Coast</h1>
          <p className="text-stone-500 mt-2">Internal Business Management</p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-8">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white py-4 rounded-xl font-semibold hover:bg-stone-800 transition-all disabled:opacity-50"
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                {isRegistering ? 'Create Account' : 'Sign In'}
              </>
            )}
          </button>
        </form>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-stone-500">Or continue with</span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 text-stone-900 py-4 rounded-xl font-semibold hover:bg-stone-50 transition-all disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-6 h-6 grayscale" alt="" />
            Google Account
          </button>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full text-sm text-stone-600 hover:text-stone-900 font-medium transition-colors"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>

        <div className="mt-10 text-center text-xs text-stone-400">
          <p>Authorized personnel only.</p>
        </div>
      </div>
    </div>
  );
}
