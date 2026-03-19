import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, LayoutDashboard, Search, Calendar, Users, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout, db, doc, getDoc, setDoc, serverTimestamp } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Create profile if it doesn't exist
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Student',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            role: 'student',
            createdAt: serverTimestamp() as any,
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-geu-blue rounded-lg flex items-center justify-center text-white font-bold text-xl">G</div>
              <span className="text-2xl font-display font-bold text-geu-blue hidden sm:block">GEUClubs</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/clubs" className="flex items-center space-x-1 text-slate-600 hover:text-geu-blue transition-colors">
              <Users size={18} />
              <span>Clubs</span>
            </Link>
            <Link to="/events" className="flex items-center space-x-1 text-slate-600 hover:text-geu-blue transition-colors">
              <Calendar size={18} />
              <span>Events</span>
            </Link>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/dashboard" className="flex items-center space-x-1 text-slate-600 hover:text-geu-blue transition-colors">
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
                  <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
                  <button onClick={handleLogout} className="text-slate-600 hover:text-geu-red transition-colors">
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center space-x-2 bg-geu-blue text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors shadow-md"
              >
                <LogIn size={18} />
                <span>Login</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-600">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              <Link to="/clubs" onClick={() => setIsMenuOpen(false)} className="block py-2 text-slate-600">Clubs</Link>
              <Link to="/events" onClick={() => setIsMenuOpen(false)} className="block py-2 text-slate-600">Events</Link>
              {user && <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block py-2 text-slate-600">Dashboard</Link>}
              {user ? (
                <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-slate-100 text-slate-600 py-3 rounded-lg">
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              ) : (
                <button onClick={handleLogin} className="w-full flex items-center justify-center space-x-2 bg-geu-blue text-white py-3 rounded-lg">
                  <LogIn size={18} />
                  <span>Login with Google</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
