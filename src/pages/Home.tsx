import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Calendar, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db, collection, query, limit, getDocs, orderBy } from '../firebase';
import { Club } from '../types';

export default function Home() {
  const [featuredClubs, setFeaturedClubs] = useState<Club[]>([]);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const q = query(collection(db, 'clubs'), limit(3));
        const querySnapshot = await getDocs(q);
        const clubsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setFeaturedClubs(clubsData);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      }
    };
    fetchClubs();
  }, []);

  return (
    <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1523050335102-c6744729ea2a?auto=format&fit=crop&q=80&w=1920" 
            alt="University Campus" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl space-y-8"
          >
            <div className="inline-flex items-center space-x-2 bg-geu-gold/20 border border-geu-gold/30 rounded-full px-4 py-1.5 text-geu-gold text-sm font-bold">
              <Sparkles size={16} />
              <span>New Platform for GEU Students</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white leading-tight">
              One Platform. <br />
              <span className="text-geu-gold">All Clubs.</span>
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              Discover, join, and manage all university clubs in one centralized hub. Never miss an event or opportunity at Graphic Era University again.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
              <Link to="/clubs" className="bg-geu-blue text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20">
                <span>Explore Clubs</span>
                <ArrowRight size={20} />
              </Link>
              <Link to="/events" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center hover:bg-white/20 transition-all">
                Upcoming Events
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-geu-blue">Why GEUClubs?</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">We've simplified campus engagement so you can focus on what matters: your growth and passions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: <Users className="text-blue-600" size={32} />, 
              title: "Centralized Directory", 
              desc: "No more hunting for WhatsApp links. Find every active club in one organized directory." 
            },
            { 
              icon: <Calendar className="text-red-600" size={32} />, 
              title: "Unified Events", 
              desc: "A single calendar for all workshops, fests, and competitions across the university." 
            },
            { 
              icon: <ShieldCheck className="text-emerald-600" size={32} />, 
              title: "Verified Memberships", 
              desc: "Official membership tracking and event participation records for your portfolio." 
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 card-hover"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Clubs */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-geu-blue">Featured Clubs</h2>
              <p className="text-slate-500">Some of the most active communities at GEU right now.</p>
            </div>
            <Link to="/clubs" className="text-geu-blue font-bold flex items-center space-x-1 hover:underline">
              <span>View all clubs</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredClubs.length > 0 ? (
              featuredClubs.map((club, i) => (
                <motion.div 
                  key={club.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 card-hover"
                >
                  <div className="h-48 relative overflow-hidden">
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
                  <div className="p-6 space-y-4">
                    <div className="flex items-center space-x-3">
                      <img src={club.logo || `https://picsum.photos/seed/${club.id}/100/100`} alt="" className="w-12 h-12 rounded-lg border border-slate-100" />
                      <h3 className="text-xl font-bold">{club.name}</h3>
                    </div>
                    <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">
                      {club.description}
                    </p>
                    <Link to={`/clubs/${club.id}`} className="block w-full text-center py-3 rounded-xl border border-geu-blue text-geu-blue font-bold hover:bg-geu-blue hover:text-white transition-all">
                      View Club
                    </Link>
                  </div>
                </motion.div>
              ))
            ) : (
              // Placeholder if no clubs in DB yet
              [1, 2, 3].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
                  <div className="h-48 bg-slate-200"></div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                      <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-full"></div>
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    </div>
                    <div className="h-10 bg-slate-200 rounded-xl"></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-geu-blue rounded-3xl p-12 md:p-24 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3"></div>
          
          <h2 className="text-4xl md:text-6xl font-display font-bold text-white relative z-10">
            Ready to lead or join?
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto relative z-10">
            Whether you're a first-year student looking to explore or a senior wanting to manage your club, GEUClubs has everything you need.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6 relative z-10">
            <Link to="/clubs" className="bg-geu-gold text-geu-blue px-10 py-4 rounded-xl font-bold text-lg hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-400/20">
              Join a Club
            </Link>
            <Link to="/dashboard" className="bg-white text-geu-blue px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all">
              Manage My Club
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
