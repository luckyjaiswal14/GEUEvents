import { useState, useEffect } from 'react';
import { db, collection, getDocs, query, orderBy, where, Timestamp } from '../firebase';
import { ClubEvent } from '../types';
import { Calendar, MapPin, Clock, Search, Filter, ArrowRight } from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Events() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, 'events'), orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);
        const eventsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubEvent));
        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const now = startOfDay(new Date());
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          event.clubName.toLowerCase().includes(searchTerm.toLowerCase());
    const isUpcoming = isAfter(event.date.toDate(), now);
    const matchesFilter = filter === 'upcoming' ? isUpcoming : !isUpcoming;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-geu-red py-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl space-y-6"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold">University Events</h1>
            <p className="text-xl text-red-100 leading-relaxed">
              Stay updated with workshops, fests, and competitions across all Graphic Era University clubs.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search events by title or club name..." 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-geu-red text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setFilter('upcoming')}
              className={`flex-grow md:flex-none px-8 py-3 rounded-lg font-bold transition-all ${
                filter === 'upcoming' ? 'bg-white text-geu-red shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Upcoming
            </button>
            <button 
              onClick={() => setFilter('past')}
              className={`flex-grow md:flex-none px-8 py-3 rounded-lg font-bold transition-all ${
                filter === 'past' ? 'bg-white text-geu-red shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Past
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-48 animate-pulse"></div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="space-y-8">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, i) => (
                <motion.div 
                  layout
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col md:flex-row card-hover"
                >
                  <div className="w-full md:w-72 h-48 md:h-auto relative overflow-hidden">
                    <img 
                      src={event.image || `https://picsum.photos/seed/${event.id}/800/600`} 
                      alt={event.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-center shadow-lg">
                      <div className="text-xs font-bold text-geu-red uppercase">{format(event.date.toDate(), 'MMM')}</div>
                      <div className="text-xl font-bold text-geu-red leading-none">{format(event.date.toDate(), 'dd')}</div>
                    </div>
                  </div>
                  <div className="p-8 flex-grow flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-geu-red font-bold text-sm uppercase tracking-wider">
                        <span>{event.clubName}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800">{event.title}</h3>
                      <p className="text-slate-500 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-6 items-center text-slate-500 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock size={18} className="text-geu-red" />
                        <span>{format(event.date.toDate(), 'hh:mm a')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin size={18} className="text-geu-red" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex-grow"></div>
                      <Link to={`/clubs/${event.clubId}`} className="flex items-center space-x-2 bg-slate-50 text-geu-red px-4 py-2 rounded-lg font-bold hover:bg-geu-red hover:text-white transition-all">
                        <span>View Club</span>
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-24 space-y-6">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Calendar size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-800">No events found</h3>
              <p className="text-slate-500">Try adjusting your search or check back later.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
