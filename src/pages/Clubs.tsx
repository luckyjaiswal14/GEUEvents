import { useState, useEffect } from 'react';
import { db, collection, getDocs, query, orderBy } from '../firebase';
import { Club } from '../types';
import { Search, Filter, ArrowRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = ['All', 'Technical', 'Cultural', 'Sports', 'Academic', 'Social Service', 'Innovation'];

export default function Clubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const q = query(collection(db, 'clubs'), orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);
        const clubsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();
  }, []);

  const filteredClubs = clubs.filter(club => {
    const matchesSearch = club.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          club.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || club.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-geu-blue py-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl space-y-6"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold">Discover Your Community</h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Explore {clubs.length} active clubs at Graphic Era University. From coding to dance, there's a place for everyone.
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
              placeholder="Search clubs by name or keywords..." 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-geu-blue text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <Filter size={20} className="text-slate-400 shrink-0" />
            <div className="flex space-x-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat 
                      ? 'bg-geu-blue text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clubs Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-96 animate-pulse"></div>
            ))}
          </div>
        ) : filteredClubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredClubs.map((club, i) => (
                <motion.div 
                  layout
                  key={club.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 card-hover flex flex-col"
                >
                  <div className="h-40 relative overflow-hidden">
                    <img 
                      src={club.coverImage || `https://picsum.photos/seed/${club.name}/800/400`} 
                      alt={club.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-geu-blue">
                      {club.category}
                    </div>
                  </div>
                  <div className="p-6 space-y-4 flex-grow flex flex-col">
                    <div className="flex items-center space-x-3">
                      <img src={club.logo || `https://picsum.photos/seed/${club.id}/100/100`} alt="" className="w-12 h-12 rounded-lg border border-slate-100" />
                      <h3 className="text-xl font-bold">{club.name}</h3>
                    </div>
                    <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed flex-grow">
                      {club.description}
                    </p>
                    <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                      <div className="flex items-center space-x-1 text-slate-400 text-xs">
                        <Users size={14} />
                        <span>Active Community</span>
                      </div>
                      <Link to={`/clubs/${club.id}`} className="text-geu-blue font-bold text-sm flex items-center space-x-1 hover:underline">
                        <span>View Details</span>
                        <ArrowRight size={14} />
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
              <Search size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-800">No clubs found</h3>
              <p className="text-slate-500">Try adjusting your search or category filter.</p>
            </div>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
              className="text-geu-blue font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
