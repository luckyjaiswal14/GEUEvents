import { useState, useEffect } from 'react';
import { auth, db, collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, Timestamp, updateDoc, deleteDoc } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { UserProfile, Club, Membership, ClubEvent } from '../types';
import { LayoutDashboard, Users, Calendar, Settings, Plus, Trash2, Edit, CheckCircle2, Clock, LogIn, Award } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [myMemberships, setMyMemberships] = useState<(Membership & { clubName: string })[]>([]);
  const [managedClub, setManagedClub] = useState<Club | null>(null);
  const [clubEvents, setClubEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'my-clubs' | 'manage-club' | 'admin-panel'>('overview');
  
  // Form States
  const [showEventModal, setShowEventModal] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '', image: '' });
  const [newClub, setNewClub] = useState({ name: '', description: '', category: '', adminEmail: '' });
  const [allClubs, setAllClubs] = useState<Club[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Fetch Profile
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;
            setProfile(profileData);

            // Fetch Memberships
            const membershipQuery = query(collection(db, 'memberships'), where('userId', '==', firebaseUser.uid));
            const membershipSnap = await getDocs(membershipQuery);
            const memberships = membershipSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Membership));
            
            // Fetch Club Names for memberships
            const membershipsWithNames = await Promise.all(memberships.map(async (m) => {
              const clubDoc = await getDoc(doc(db, 'clubs', m.clubId));
              return { ...m, clubName: clubDoc.exists() ? (clubDoc.data() as Club).name : 'Unknown Club' };
            }));
            setMyMemberships(membershipsWithNames);

            // If admin, fetch all clubs
            if (profileData.role === 'admin') {
              const clubsSnap = await getDocs(collection(db, 'clubs'));
              setAllClubs(clubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
            }

            // If club_admin, fetch managed club
            if (profileData.role === 'club_admin' || profileData.role === 'admin') {
              const managedQuery = query(collection(db, 'clubs'), where('adminUid', '==', firebaseUser.uid));
              const managedSnap = await getDocs(managedQuery);
              if (!managedSnap.empty) {
                const clubData = { id: managedSnap.docs[0].id, ...managedSnap.docs[0].data() } as Club;
                setManagedClub(clubData);

                // Fetch club events
                const eventsQuery = query(collection(db, 'events'), where('clubId', '==', clubData.id));
                const eventsSnap = await getDocs(eventsQuery);
                setClubEvents(eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubEvent)));
              }
            }
          }
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedClub || !user) return;

    try {
      const eventData = {
        clubId: managedClub.id,
        clubName: managedClub.name,
        title: newEvent.title,
        description: newEvent.description,
        date: Timestamp.fromDate(new Date(newEvent.date)),
        location: newEvent.location,
        image: newEvent.image || `https://picsum.photos/seed/${newEvent.title}/800/400`,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'events'), eventData);
      setClubEvents([...clubEvents, { id: docRef.id, ...eventData } as any]);
      setShowEventModal(false);
      setNewEvent({ title: '', description: '', date: '', location: '', image: '' });
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setClubEvents(clubEvents.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    if (!window.confirm('Are you sure you want to delete this club? All associated data will be lost.')) return;
    try {
      await deleteDoc(doc(db, 'clubs', clubId));
      // Also delete memberships
      const membershipsQuery = query(collection(db, 'memberships'), where('clubId', '==', clubId));
      const membershipsSnap = await getDocs(membershipsQuery);
      const deleteMemberships = membershipsSnap.docs.map(d => deleteDoc(d.ref));
      
      // Also delete events
      const eventsQuery = query(collection(db, 'events'), where('clubId', '==', clubId));
      const eventsSnap = await getDocs(eventsQuery);
      const deleteEvents = eventsSnap.docs.map(d => deleteDoc(d.ref));

      await Promise.all([...deleteMemberships, ...deleteEvents]);
      alert('Club deleted successfully.');
    } catch (error) {
      console.error('Error deleting club:', error);
      alert('Failed to delete club.');
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role !== 'admin' || !user) return;

    try {
      // 1. Create the club document
      const clubData = {
        name: newClub.name,
        description: 'New campus club',
        category: newClub.category,
        adminEmail: newClub.adminEmail,
        adminUid: '', // Will be updated when the admin logs in, or we can look it up if they already exist
        image: `https://picsum.photos/seed/${newClub.name}/800/400`,
        membersCount: 0,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'clubs'), clubData);
      
      // 2. Update local state
      setAllClubs([...allClubs, { id: docRef.id, ...clubData } as any]);
      setShowClubModal(false);
      setNewClub({ name: '', description: '', category: '', adminEmail: '' });
      
      alert('Club registered successfully! The assigned admin will gain access upon their next login.');
    } catch (error) {
      console.error('Error creating club:', error);
      alert('Failed to create club. Check console for details.');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-geu-blue border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md space-y-8">
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <LogIn size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-geu-blue">Authentication Required</h1>
            <p className="text-slate-500">Please login with your university Google account to access your dashboard.</p>
          </div>
          <button 
            onClick={() => auth.currentUser ? navigate('/dashboard') : navigate('/')}
            className="w-full bg-geu-blue text-white py-4 rounded-xl font-bold hover:bg-blue-900 transition-all shadow-lg"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-100 p-6 space-y-8">
        <div className="flex items-center space-x-4 px-2">
          <img src={user.photoURL || ''} alt="" className="w-12 h-12 rounded-xl border border-slate-100" />
          <div className="overflow-hidden">
            <p className="font-bold truncate">{user.displayName}</p>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{profile?.role}</p>
          </div>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'overview' ? 'bg-geu-blue text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab('my-clubs')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'my-clubs' ? 'bg-geu-blue text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Users size={20} />
            <span>My Memberships</span>
          </button>
          {(profile?.role === 'club_admin' || profile?.role === 'admin') && managedClub && (
            <Link 
              to={`/manage/${managedClub.id}`}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'manage-club' ? 'bg-geu-blue text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Settings size={20} />
              <span>Manage Club</span>
            </Link>
          )}
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin-panel')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'admin-panel' ? 'bg-geu-blue text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Award size={20} />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-6 md:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold text-geu-blue">Welcome back, {user.displayName?.split(' ')[0]}!</h1>
                <p className="text-slate-500">Here's what's happening in your campus community.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold">{myMemberships.length}</p>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Clubs Joined</p>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold">{clubEvents.length}</p>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Upcoming Events</p>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold">{myMemberships.filter(m => m.status === 'active').length}</p>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Verified Badges</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                  <h2 className="text-xl font-display font-bold text-geu-blue">Recent Activity</h2>
                  <div className="space-y-6">
                    {myMemberships.length > 0 ? (
                      myMemberships.slice(0, 4).map(m => (
                        <div key={m.id} className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-geu-gold/10 text-geu-gold'}`}>
                            {m.status === 'active' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">Joined {m.clubName}</p>
                            <p className="text-xs text-slate-400">{m.status === 'active' ? 'Membership verified' : 'Waiting for approval'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-sm">No recent activity to show.</p>
                    )}
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                  <h2 className="text-xl font-display font-bold text-geu-blue">Quick Actions</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Link to="/performance" className="p-4 rounded-xl bg-slate-50 hover:bg-geu-blue hover:text-white transition-all text-center space-y-2 group">
                      <Award size={24} className="mx-auto text-geu-blue group-hover:text-white" />
                      <p className="text-sm font-bold">My Performance</p>
                    </Link>
                    <Link to="/clubs" className="p-4 rounded-xl bg-slate-50 hover:bg-geu-blue hover:text-white transition-all text-center space-y-2 group">
                      <Users size={24} className="mx-auto text-geu-blue group-hover:text-white" />
                      <p className="text-sm font-bold">Find Clubs</p>
                    </Link>
                    <Link to="/events" className="p-4 rounded-xl bg-slate-50 hover:bg-geu-blue hover:text-white transition-all text-center space-y-2 group">
                      <Calendar size={24} className="mx-auto text-geu-blue group-hover:text-white" />
                      <p className="text-sm font-bold">View Events</p>
                    </Link>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'my-clubs' && (
            <motion.div 
              key="my-clubs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <h1 className="text-3xl font-display font-bold text-geu-blue">My Memberships</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myMemberships.length > 0 ? (
                  myMemberships.map(m => (
                    <div key={m.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-geu-blue font-bold">
                          {m.clubName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold">{m.clubName}</h3>
                          <div className="flex items-center space-x-1 text-xs">
                            {m.status === 'active' ? (
                              <span className="text-emerald-600 flex items-center space-x-1 font-bold">
                                <CheckCircle2 size={12} />
                                <span>Active Member</span>
                              </span>
                            ) : (
                              <span className="text-geu-gold flex items-center space-x-1 font-bold">
                                <Clock size={12} />
                                <span>Pending Approval</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link to={`/clubs/${m.clubId}`} className="text-geu-blue hover:underline text-sm font-bold">View Club</Link>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-24 text-center space-y-4">
                    <Users size={48} className="mx-auto text-slate-200" />
                    <p className="text-slate-500">You haven't joined any clubs yet.</p>
                    <Link to="/clubs" className="inline-block bg-geu-blue text-white px-6 py-2 rounded-lg font-bold">Explore Clubs</Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'manage-club' && managedClub && (
            <motion.div 
              key="manage-club"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <h1 className="text-3xl font-display font-bold text-geu-blue">Manage {managedClub.name}</h1>
                  <p className="text-slate-500">Update club info and manage upcoming events.</p>
                </div>
                <button 
                  onClick={() => setShowEventModal(true)}
                  className="bg-geu-blue text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-blue-900 transition-all shadow-lg"
                >
                  <Plus size={20} />
                  <span>Add Event</span>
                </button>
              </div>

              <section className="space-y-6">
                <h2 className="text-xl font-display font-bold text-geu-blue">Club Events</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clubEvents.map(event => (
                    <div key={event.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                      <div className="h-32 relative">
                        <img src={event.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="absolute top-2 right-2 p-2 bg-white/90 text-geu-red rounded-lg hover:bg-geu-red hover:text-white transition-all shadow-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="p-4 space-y-2">
                        <h4 className="font-bold truncate">{event.title}</h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                          <Calendar size={12} />
                          <span>{format(event.date.toDate(), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Event Modal */}
              <AnimatePresence>
                {showEventModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowEventModal(false)}
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    ></motion.div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-8"
                    >
                      <h2 className="text-2xl font-display font-bold text-geu-blue">Create New Event</h2>
                      <form onSubmit={handleAddEvent} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-600">Event Title</label>
                          <input 
                            required
                            type="text" 
                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-geu-blue"
                            value={newEvent.title}
                            onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-600">Description</label>
                          <textarea 
                            required
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-geu-blue"
                            value={newEvent.description}
                            onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600">Date & Time</label>
                            <input 
                              required
                              type="datetime-local" 
                              className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-geu-blue"
                              value={newEvent.date}
                              onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600">Location</label>
                            <input 
                              required
                              type="text" 
                              className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-geu-blue"
                              value={newEvent.location}
                              onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex space-x-4 pt-4">
                          <button 
                            type="button"
                            onClick={() => setShowEventModal(false)}
                            className="flex-grow py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="flex-grow bg-geu-blue text-white py-4 rounded-xl font-bold hover:bg-blue-900 transition-all shadow-lg"
                          >
                            Create Event
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          {activeTab === 'admin-panel' && profile?.role === 'admin' && (
            <motion.div 
              key="admin-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <h1 className="text-3xl font-display font-bold text-geu-blue">System Administration</h1>
                  <p className="text-slate-500">Global control over all campus clubs and users.</p>
                </div>
                <button 
                  onClick={() => setShowClubModal(true)}
                  className="bg-geu-blue text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-blue-900 transition-all shadow-lg"
                >
                  <Plus size={20} />
                  <span>Create New Club</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Clubs List */}
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-geu-blue">All Registered Clubs</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {allClubs.map(club => (
                      <div key={club.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-geu-blue font-bold">
                            {club.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold">{club.name}</h4>
                            <p className="text-xs text-slate-400">{club.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Link to={`/manage/${club.id}`} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all">
                            Manage
                          </Link>
                          <button 
                            onClick={() => handleDeleteClub(club.id)}
                            className="p-2 text-slate-300 hover:text-geu-red transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deployment & Infrastructure Status */}
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <h3 className="font-bold text-geu-blue">Deployment & Infrastructure</h3>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Active</span>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-geu-blue shrink-0">
                          <Clock size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">Simultaneous Deployments</h4>
                          <p className="text-xs text-slate-500">Enabled: Never wait for a queued build. Multiple deployments running.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
                          <LayoutDashboard size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">Build Optimization</h4>
                          <p className="text-xs text-slate-500">Active: Builds are 40% faster using optimized machine configurations.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 shrink-0">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">Skew Protection</h4>
                          <p className="text-xs text-slate-500">Active: Automatically syncing client and server versions to avoid conflicts.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600 shrink-0">
                          <Settings size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">Custom Domain</h4>
                          <p className="text-xs text-slate-500">Connected: geuevents.vercel.app (At-cost & private).</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-geu-blue rounded-2xl p-6 text-white space-y-4 shadow-lg">
                    <h4 className="font-bold">Infrastructure Health</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span>Server Load</span>
                        <span>12%</span>
                      </div>
                      <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-white h-full w-[12%] transition-all duration-500"></div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Database Latency</span>
                        <span>24ms</span>
                      </div>
                      <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-white h-full w-[8%] transition-all duration-500"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Club Creation Modal */}
              <AnimatePresence>
                {showClubModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setShowClubModal(false)}
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-8"
                    >
                      <h2 className="text-2xl font-display font-bold text-geu-blue">Register New Club</h2>
                      <form onSubmit={handleCreateClub} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-600">Club Name</label>
                          <input type="text" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-geu-blue"
                            value={newClub.name} onChange={(e) => setNewClub({...newClub, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-600">Admin Email (Initial Head)</label>
                          <input type="email" placeholder="student@geu.ac.in" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-geu-blue"
                            value={newClub.adminEmail} onChange={(e) => setNewClub({...newClub, adminEmail: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600">Category</label>
                            <select className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-geu-blue"
                              value={newClub.category} onChange={(e) => setNewClub({...newClub, category: e.target.value})}>
                              <option value="">Select...</option>
                              <option value="Technical">Technical</option>
                              <option value="Cultural">Cultural</option>
                              <option value="Sports">Sports</option>
                              <option value="Social">Social</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex space-x-4 pt-4">
                          <button onClick={() => setShowClubModal(false)} className="flex-grow py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                          <button type="submit" className="flex-grow bg-geu-blue text-white py-4 rounded-xl font-bold hover:bg-blue-900 transition-all shadow-lg">Create Club</button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
