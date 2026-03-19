import { Link } from 'react-router-dom';
import { Github, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-geu-blue rounded-lg flex items-center justify-center text-white font-bold text-xl">G</div>
              <span className="text-2xl font-display font-bold text-white">GEUClubs</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              The official digital hub for all clubs and activities at Graphic Era University. Empowering students to explore, engage, and excel.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="hover:text-geu-gold transition-colors"><Github size={20} /></a>
              <a href="#" className="hover:text-geu-gold transition-colors"><Twitter size={20} /></a>
              <a href="#" className="hover:text-geu-gold transition-colors"><Instagram size={20} /></a>
              <a href="#" className="hover:text-geu-gold transition-colors"><Linkedin size={20} /></a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-display font-bold mb-6">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/clubs" className="hover:text-geu-gold transition-colors">Browse Clubs</Link></li>
              <li><Link to="/events" className="hover:text-geu-gold transition-colors">Upcoming Events</Link></li>
              <li><Link to="/dashboard" className="hover:text-geu-gold transition-colors">Student Dashboard</Link></li>
              <li><Link to="/about" className="hover:text-geu-gold transition-colors">About GEUClubs</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-display font-bold mb-6">Contact Us</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="text-geu-gold shrink-0" />
                <span>Graphic Era University, Clement Town, Dehradun, Uttarakhand 248002</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={18} className="text-geu-gold shrink-0" />
                <span>+91 135 2643421</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={18} className="text-geu-gold shrink-0" />
                <span>support@geuclubs.com</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-display font-bold mb-6">Newsletter</h3>
            <p className="text-sm text-slate-400 mb-4">Stay updated with the latest club events and university news.</p>
            <form className="flex space-x-2">
              <input 
                type="email" 
                placeholder="Your email" 
                className="bg-slate-800 border-none rounded-lg px-4 py-2 text-sm w-full focus:ring-2 focus:ring-geu-gold"
              />
              <button className="bg-geu-blue text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors text-sm font-bold">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} GEUClubs. All rights reserved. Designed for Graphic Era University.</p>
        </div>
      </div>
    </footer>
  );
}
