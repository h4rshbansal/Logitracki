
import React, { useState, useEffect } from 'react';
// Import Firebase Auth functions through the module namespace to resolve named export errors
import * as firebaseAuth from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { UserRole, UserProfile } from './types';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { AdminDashboard } from './components/AdminDashboard';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { LogOut, Globe, Truck, Lock, User as UserIcon } from 'lucide-react';

const AuthScreen: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        try {
          // 1. Try standard Auth Login using namespaced method
          await firebaseAuth.signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          // 2. If Auth fails, check if an Admin "pre-set" this password in Firestore
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', email), where('_tempPass', '==', password));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            // Auto-activate the account by creating a real Auth user using namespaced method
            const cred = await firebaseAuth.createUserWithEmailAndPassword(auth, email, password);
            // Link the existing Firestore record to the new Auth UID
            await setDoc(doc(db, 'users', cred.user.uid), {
              ...userData,
              uid: cred.user.uid,
              _tempPass: null // Clear temp password after activation
            });
          } else {
            throw authErr; // Rethrow if no pre-set password matches
          }
        }
      } else {
        const cred = await firebaseAuth.createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name,
          email,
          role,
          status: 'ACTIVE',
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = "Authentication failed. Check your credentials.";
      if (err.code === 'auth/user-not-found') msg = "No user found with this email.";
      if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already registered. Try logging in.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-900/50 mb-4">
            <Truck size={40} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">LogiTrack TMS</h1>
          <p className="text-slate-300 font-bold">Secure Transport Management</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200">
          <h2 className="text-2xl font-black text-slate-800 mb-6 text-center tracking-tight">{isLogin ? t('login') : t('signup')}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-4 rounded-xl border-2 border-red-100">{error}</p>}
            
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 uppercase px-1 tracking-widest">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 font-bold outline-none focus:border-indigo-500" placeholder="e.g. Rahul Sharma" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 uppercase px-1 tracking-widest">System Role</label>
                  <select className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 font-bold outline-none focus:border-indigo-500" value={role} onChange={e => setRole(e.target.value as any)}>
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.SUPERVISOR}>Supervisor</option>
                    <option value={UserRole.DRIVER}>Driver</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600 uppercase px-1 tracking-widest">{t('email')}</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 font-bold outline-none focus:border-indigo-500" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600 uppercase px-1 tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 font-bold outline-none focus:border-indigo-500" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 mt-6 uppercase tracking-widest"
            >
              {loading ? 'Processing...' : (isLogin ? t('login') : t('signup'))}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-slate-500 font-bold text-sm hover:text-indigo-600 transition-colors">
              {isLogin ? "Don't have an account? Register Now" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
        <p className="mt-8 text-center text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">LogiTrack Transport Management System</p>
      </div>
    </div>
  );
};

const Layout: React.FC<{ user: UserProfile, children: React.ReactNode }> = ({ user, children }) => {
  const { language, setLanguage, t } = useLanguage();
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-100">
              <Truck size={24} />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight hidden md:block">LogiTrack</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm font-black text-slate-900 leading-none">{user.name}</p>
              <p className="text-[10px] uppercase font-black text-indigo-600 tracking-widest leading-none mt-1.5">{user.role}</p>
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-2"></div>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setLanguage('en')} 
                className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all ${language === 'en' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('hi')} 
                className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all ${language === 'hi' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                हिं
              </button>
            </div>

            <button 
              onClick={() => firebaseAuth.signOut(auth)}
              className="p-2.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition-all"
              title={t('logout')}
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20">
        {children}
      </main>

      <footer className="bg-white border-t py-10 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 font-bold text-sm mb-2">LogiTrack TMS &copy; {new Date().getFullYear()}</p>
          <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.3em]">Made by Harsh Bansal</p>
        </div>
      </footer>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes and fetch the user profile from Firestore
    const unsub = firebaseAuth.onAuthStateChanged(auth, async (u) => {
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return null; // Removed the stylized loading screen as requested
  }

  if (!userProfile) {
    return <AuthScreen />;
  }

  return (
    <Layout user={userProfile}>
      {userProfile.role === UserRole.ADMIN && <AdminDashboard user={userProfile} />}
      {userProfile.role === UserRole.SUPERVISOR && <SupervisorDashboard user={userProfile} />}
      {userProfile.role === UserRole.DRIVER && <DriverDashboard user={userProfile} />}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
