import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, doc, getDoc, collection, query, where, getDocs, orderBy, auth, serverTimestamp, setDoc } from '../firebase';
import { Club, ClubEvent, Membership } from '../types';
import { Calendar, MapPin, Users, Instagram, Linkedin, Globe, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';

export default function ClubDetails() {
  const { id } = useParams<{ id: string }>();
  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        // Fetch Club
        const clubDoc = await getDoc(doc(db, 'clubs', id));
        if (clubDoc.exists()) {
          setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
        }

        // Fetch Events
        const eventsQuery = query(
          collection(db, 'events'), 
          where('clubId', '==', id),
          orderBy('date', 'asc')
        );
        const eventsSnap = await getDocs(eventsQuery);
        setEvents(eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubEvent)));

        // Fetch Membership if logged in
        if (auth.currentUser) {
          const membershipQuery = query(
            collection(db, 'memberships'),
            where('clubId', '==', id),
            where('userId', '==', auth.currentUser.uid)
          );
          const membershipSnap = await getDocs(membershipQuery);
          if (!membershipSnap.empty) {
            setMembership({ id: membershipSnap.docs[0].id, ...membershipSnap.docs[0].data() } as Membership);
          }
        }
      } catch (error) {
        console.error('Error fetching club details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleJoin = async () => {
    if (!auth.currentUser || !id || !club) return;
    setJoining(true);
    try {
      const membershipId = `${auth.currentUser.uid}_${id}`;
      const newMembership: Membership = {
        id: membershipId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Student',
        userEmail: auth.currentUser.email || '',
        clubId: id,
        clubName: club.name,
        status: 'pending',
        role: 'member',
        joinedAt: serverTimestamp() as any,
      };
      await setDoc(doc(db, 'memberships', membershipId), newMembership);
      setMembership(newMembership);
    } catch (error) {
      console.error('Error joining club:', error);
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-geu-blue border-t-transparent rounded-full animate-spin"></div></div>;
  if (!club) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-2xl font-bold text-slate-400">Club not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Cover Image */}
      <div className="h-[40vh] relative overflow-hidden">
        <img 
          src={club.coverImage || `https://picsum.photos/seed/${club.name}/1920/600`} 
          alt={club.name} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-8 left-0 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center space-x-6">
              <img 
                src={club.logo || `https://picsum.photos/seed/${club.id}/200/200`} 
                alt="" 
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-xl bg-white" 
              />
              <div className="space-y-2 text-white">
                <div className="inline-block px-3 py-1 bg-geu-gold text-geu-blue text-xs font-bold rounded-full mb-2">
                  {club.category}
                </div>
                <h1 className="text-3xl md:text-5xl font-display font-bold">{club.name}</h1>
                <div className="flex items-center space-x-4 text-slate-200 text-sm">
                  <div className="flex items-center space-x-1">
                    <Users size={16} />
                    <span>Active Community</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar size={16} />
                    <span>Est. {format(club.createdAt.toDate(), 'yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {membership ? (
                <div className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold ${
                  membership.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-geu-gold text-geu-blue'
                }`}>
                  {membership.status === 'active' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  <span>{membership.status === 'active' ? 'Member' : 'Request Pending'}</span>
                </div>
              ) : (
                <button 
                  onClick={handleJoin}
                  disabled={joining || !auth.currentUser}
                  className="bg-geu-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-900 transition-all shadow-lg disabled:opacity-50"
                >
                  {joining ? 'Joining...' : auth.currentUser ? 'Join Club' : 'Login to Join'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Info */}
        <div className="lg:col-span-2 space-y-12">
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-display font-bold text-geu-blue mb-6">About the Club</h2>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-lg">
              {club.description}
            </p>
          </section>

          <section className="space-y-8">
            <h2 className="text-2xl font-display font-bold text-geu-blue">Upcoming Events</h2>
            {events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map(event => (
                  <div key={event.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 card-hover">
                    <div className="h-40 relative">
                      <img 
                        src={event.image || `https://picsum.photos/seed/${event.id}/800/400`} 
                        alt={event.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-center">
                        <div className="text-xs font-bold text-geu-blue uppercase">{format(event.date.toDate(), 'MMM')}</div>
                        <div className="text-xl font-bold text-geu-blue leading-none">{format(event.date.toDate(), 'dd')}</div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <h3 className="text-xl font-bold text-slate-800">{event.title}</h3>
                      <div className="space-y-2 text-sm text-slate-500">
                        <div className="flex items-center space-x-2">
                          <Clock size={16} />
                          <span>{format(event.date.toDate(), 'hh:mm a')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin size={16} />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-100 rounded-2xl p-12 text-center text-slate-400">
                <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                <p>No upcoming events scheduled yet.</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-8">
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-xl font-display font-bold text-geu-blue">Connect</h3>
            <div className="space-y-4">
              {club.socialLinks?.instagram && (
                <a href={club.socialLinks.instagram} target="_blank" rel="noreferrer" className="flex items-center space-x-3 text-slate-600 hover:text-geu-blue transition-colors">
                  <Instagram size={20} />
                  <span>Instagram</span>
                </a>
              )}
              {club.socialLinks?.linkedin && (
                <a href={club.socialLinks.linkedin} target="_blank" rel="noreferrer" className="flex items-center space-x-3 text-slate-600 hover:text-geu-blue transition-colors">
                  <Linkedin size={20} />
                  <span>LinkedIn</span>
                </a>
              )}
              {club.socialLinks?.website && (
                <a href={club.socialLinks.website} target="_blank" rel="noreferrer" className="flex items-center space-x-3 text-slate-600 hover:text-geu-blue transition-colors">
                  <Globe size={20} />
                  <span>Official Website</span>
                </a>
              )}
            </div>
          </section>

          <section className="bg-geu-blue text-white p-8 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <h3 className="text-xl font-display font-bold relative z-10">Club Admin</h3>
            <div className="flex items-center space-x-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-blue-200">Managed by</p>
                <p className="font-bold">Club Core Team</p>
              </div>
            </div>
            <p className="text-sm text-blue-100 leading-relaxed relative z-10">
              Have questions about the club? Reach out to the core team or visit our office in the Student Activity Center.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
