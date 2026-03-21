import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Download,
  ShieldCheck,
  Star
} from 'lucide-react';
import { 
  db, 
  auth, 
  collection, 
  query, 
  where, 
  onSnapshot,
  onAuthStateChanged
} from '../firebase';
import { PerformanceMetric, Certification, Membership } from '../types';

export default function Performance() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const membershipsQuery = query(collection(db, 'memberships'), where('userId', '==', user.uid));
      const unsubscribeMemberships = onSnapshot(membershipsQuery, (snapshot) => {
        const membershipsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Membership));
        setMemberships(membershipsData);
      }, (error) => {
        console.error('Error in memberships snapshot:', error);
      });

      const metricsQuery = query(collection(db, 'performance'), where('userId', '==', user.uid));
      const unsubscribeMetrics = onSnapshot(metricsQuery, (snapshot) => {
        const metricsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PerformanceMetric));
        setMetrics(metricsData);
      }, (error) => {
        console.error('Error in metrics snapshot:', error);
      });

      const certsQuery = query(collection(db, 'certifications'), where('userId', '==', user.uid));
      const unsubscribeCerts = onSnapshot(certsQuery, (snapshot) => {
        const certsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certification));
        setCertifications(certsData);
        setLoading(false);
      }, (error) => {
        console.error('Error in certs snapshot:', error);
        setLoading(false);
      });

      return () => {
        unsubscribeMemberships();
        unsubscribeMetrics();
        unsubscribeCerts();
      };
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900">My Performance</h1>
          <p className="text-slate-500 mt-2 text-lg">Track your growth, participation, and earn certificates</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        {/* Overall Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <SummaryCard 
            icon={<Star className="w-8 h-8 text-amber-500" />}
            label="Total Score"
            value={metrics.reduce((acc, m) => acc + m.score, 0).toString()}
            description="Across all clubs"
          />
          <SummaryCard 
            icon={<Calendar className="w-8 h-8 text-blue-500" />}
            label="Events Attended"
            value={metrics.reduce((acc, m) => acc + m.eventsParticipated, 0).toString()}
            description="Total participation"
          />
          <SummaryCard 
            icon={<Clock className="w-8 h-8 text-emerald-500" />}
            label="Volunteer Hours"
            value={metrics.reduce((acc, m) => acc + m.volunteerHours, 0).toString()}
            description="Community contribution"
          />
        </div>

        {/* Club Performance Breakdown */}
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Club Breakdown</h2>
        <div className="grid grid-cols-1 gap-6 mb-12">
          {memberships.map((membership) => {
            const metric = metrics.find(m => m.clubId === membership.clubId);
            const cert = certifications.find(c => c.clubId === membership.clubId);
            
            return (
              <motion.div 
                key={membership.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col md:flex-row items-center gap-8"
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900">{membership.clubName}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span className="bg-slate-100 px-2 py-1 rounded uppercase font-medium">{membership.role}</span>
                    <span>Joined {membership.joinedAt?.toDate().toLocaleDateString()}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                    <MetricItem label="Attendance" value={`${metric?.attendanceRate || 0}%`} />
                    <MetricItem label="Participation" value={metric?.eventsParticipated || 0} />
                    <MetricItem label="Volunteering" value={`${metric?.volunteerHours || 0}h`} />
                    <MetricItem label="Club Score" value={metric?.score || 0} />
                  </div>
                </div>

                <div className="w-full md:w-auto flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={`p-4 rounded-full ${cert?.eligible ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                    <Award className="w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-slate-900">
                      {cert?.eligible ? 'Eligible for Certificate' : 'In Progress'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {cert?.eligible ? 'Criteria met successfully' : 'Keep participating to earn'}
                    </div>
                  </div>
                  {cert?.eligible && (
                    <button 
                      onClick={() => alert(`Downloading certificate for ${membership.clubName}... (Mock)`)}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium w-full justify-center"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Certification Criteria */}
        <div className="bg-slate-900 text-white rounded-3xl p-12 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">How to earn certificates?</h2>
            <p className="text-slate-400 mb-8 text-lg">
              Certificates are awarded to students who show exceptional commitment and contribution to their clubs.
            </p>
            <div className="space-y-4">
              <CriteriaItem icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} text="Maintain at least 75% attendance in club events" />
              <CriteriaItem icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} text="Participate in at least 3 major events per semester" />
              <CriteriaItem icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} text="Contribute 10+ hours of volunteer work" />
              <CriteriaItem icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} text="Positive feedback from the Club Head" />
            </div>
          </div>
          <ShieldCheck className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 rotate-12" />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, description }: { icon: React.ReactNode, label: string, value: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
      <div className="mb-4">{icon}</div>
      <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">{label}</div>
      <div className="text-4xl font-bold text-slate-900 mt-2">{value}</div>
      <div className="text-sm text-slate-400 mt-1">{description}</div>
    </div>
  );
}

function MetricItem({ label, value }: { label: string, value: string | number }) {
  return (
    <div>
      <div className="text-xs text-slate-400 uppercase font-bold tracking-tight">{label}</div>
      <div className="text-xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function CriteriaItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-slate-200">{text}</span>
    </div>
  );
}
