import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  Award, 
  TrendingUp, 
  Plus, 
  CheckCircle, 
  Clock,
  ChevronRight,
  UserPlus,
  X,
  Trash2,
  Edit2,
  UserCheck,
  UserMinus
} from 'lucide-react';
import { 
  db, 
  auth, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
  setDoc,
  onAuthStateChanged
} from '../firebase';
import { Club, Membership, ClubEvent, PerformanceMetric, Attendance, MembershipRole, Volunteering } from '../types';
import { format } from 'date-fns';

export default function ClubManagement() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'events' | 'performance' | 'volunteering'>('members');

  // Modal States
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState<ClubEvent | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<Membership | null>(null);
  
  // Form States
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '', image: '' });
  const [attendanceList, setAttendanceList] = useState<Record<string, 'present' | 'absent'>>({});

  const [volunteeringList, setVolunteeringList] = useState<Volunteering[]>([]);
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [newVolunteer, setNewVolunteer] = useState({ userId: '', eventId: '', role: '', hours: 0, description: '' });
  const [isRunningEngine, setIsRunningEngine] = useState(false);

  useEffect(() => {
    if (!clubId) return;

    const fetchClub = async () => {
      try {
        const clubDoc = await getDoc(doc(db, 'clubs', clubId));
        if (clubDoc.exists()) {
          setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
        }
      } catch (error) {
        console.error('Error fetching club:', error);
      }
    };

    fetchClub();

    // Only attach listeners if user is authenticated
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const membersQuery = query(collection(db, 'memberships'), where('clubId', '==', clubId));
      const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
        const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Membership));
        setMembers(membersData);
      }, (error) => {
        console.error('Error in members snapshot:', error);
      });

      const eventsQuery = query(collection(db, 'events'), where('clubId', '==', clubId));
      const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubEvent));
        setEvents(eventsData.sort((a, b) => b.date.toMillis() - a.date.toMillis()));
        setLoading(false);
      }, (error) => {
        console.error('Error in events snapshot:', error);
        setLoading(false);
      });

      const volunteeringQuery = query(collection(db, 'volunteering'), where('clubId', '==', clubId));
      const unsubscribeVolunteering = onSnapshot(volunteeringQuery, (snapshot) => {
        const volunteeringData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Volunteering));
        setVolunteeringList(volunteeringData);
      }, (error) => {
        console.error('Error in volunteering snapshot:', error);
      });

      return () => {
        unsubscribeMembers();
        unsubscribeEvents();
        unsubscribeVolunteering();
      };
    });

    return () => unsubscribe();
  }, [clubId]);

  const runScoringEngine = async () => {
    if (!clubId || isRunningEngine) return;
    setIsRunningEngine(true);
    try {
      const activeMembers = members.filter(m => m.status === 'active');
      const pastEvents = events.filter(e => e.date.toDate() < new Date());
      const totalPastEvents = pastEvents.length;

      const batch = activeMembers.map(async (member) => {
        // 1. Calculate Attendance Rate
        const attendanceQuery = query(
          collection(db, 'attendance'), 
          where('userId', '==', member.userId),
          where('clubId', '==', clubId),
          where('status', '==', 'present')
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        const attendedCount = attendanceSnap.size;
        const attendanceRate = totalPastEvents > 0 ? Math.round((attendedCount / totalPastEvents) * 100) : 0;

        // 2. Calculate Volunteer Hours
        const memberVolunteering = volunteeringList.filter(v => v.userId === member.userId);
        const totalHours = memberVolunteering.reduce((acc, v) => acc + v.hours, 0);

        // 3. Calculate Score (Simple formula: AttendanceRate * 0.6 + ParticipationCount * 10 + VolunteerHours * 5)
        const score = Math.round((attendanceRate * 0.6) + (attendedCount * 10) + (totalHours * 5));

        // 4. Update Performance
        const performanceId = `${member.userId}_${clubId}`;
        await setDoc(doc(db, 'performance', performanceId), {
          id: performanceId,
          userId: member.userId,
          clubId,
          score,
          attendanceRate,
          eventsParticipated: attendedCount,
          volunteerHours: totalHours,
          updatedAt: serverTimestamp()
        });

        // 5. Check Certification Eligibility
        const certId = `${member.userId}_${clubId}`;
        const criteriaMet = {
          attendance: attendanceRate >= 75,
          participation: attendedCount >= 3,
          volunteering: totalHours >= 10
        };
        const eligible = criteriaMet.attendance && criteriaMet.participation;

        await setDoc(doc(db, 'certifications', certId), {
          id: certId,
          userId: member.userId,
          clubId,
          eligible,
          criteriaMet,
          issuedAt: eligible ? serverTimestamp() : null
        });
      });

      await Promise.all(batch);
      alert('Scoring engine completed successfully! All performance metrics and certifications have been updated.');
    } catch (error) {
      console.error('Error running scoring engine:', error);
      alert('Failed to run scoring engine. Check console for details.');
    } finally {
      setIsRunningEngine(false);
    }
  };

  const handleAddVolunteering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;
    try {
      await addDoc(collection(db, 'volunteering'), {
        ...newVolunteer,
        clubId,
        createdAt: serverTimestamp()
      });
      setShowVolunteerModal(false);
      setNewVolunteer({ userId: '', eventId: '', role: '', hours: 0, description: '' });
      alert('Volunteering hours recorded!');
    } catch (error) {
      console.error('Error adding volunteering:', error);
    }
  };

  // Update club members count when members list changes
  useEffect(() => {
    if (!clubId || members.length === 0) return;
    const activeCount = members.filter(m => m.status === 'active').length;
    updateDoc(doc(db, 'clubs', clubId), { membersCount: activeCount });
  }, [members, clubId]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club || !clubId) return;

    try {
      const eventData = {
        clubId,
        clubName: club.name,
        title: newEvent.title,
        description: newEvent.description,
        date: Timestamp.fromDate(new Date(newEvent.date)),
        location: newEvent.location,
        image: newEvent.image || `https://picsum.photos/seed/${newEvent.title}/800/400`,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'events'), eventData);
      setShowEventModal(false);
      setNewEvent({ title: '', description: '', date: '', location: '', image: '' });
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleUpdateRole = async (membershipId: string, newRole: MembershipRole) => {
    try {
      await updateDoc(doc(db, 'memberships', membershipId), { role: newRole });
      setShowRoleModal(null);
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleApproveMember = async (membershipId: string) => {
    try {
      await updateDoc(doc(db, 'memberships', membershipId), { status: 'active' });
    } catch (error) {
      console.error('Error approving member:', error);
    }
  };

  const handleRejectMember = async (membershipId: string) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    try {
      await deleteDoc(doc(db, 'memberships', membershipId));
    } catch (error) {
      console.error('Error rejecting member:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      // Also delete associated attendance
      const attendanceQuery = query(collection(db, 'attendance'), where('eventId', '==', eventId));
      const attendanceSnap = await getDocs(attendanceQuery);
      const deleteAttendance = attendanceSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deleteAttendance);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleDeleteMember = async (membershipId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await deleteDoc(doc(db, 'memberships', membershipId));
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const exportCSV = () => {
    const activeMembers = members.filter(m => m.status === 'active');
    const headers = ['Name', 'Email', 'Role', 'Joined At'];
    const rows = activeMembers.map(m => [
      m.userName,
      m.userEmail,
      m.role,
      format(m.joinedAt.toDate(), 'yyyy-MM-dd')
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${club?.name}_members.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMarkAttendance = async (eventId: string) => {
    try {
      const batch = Object.entries(attendanceList).map(([userId, status]) => {
        const attendanceId = `${userId}_${eventId}`;
        return setDoc(doc(db, 'attendance', attendanceId), {
          id: attendanceId,
          userId,
          eventId,
          clubId: clubId!,
          status,
          markedAt: serverTimestamp()
        });
      });
      await Promise.all(batch);
      setShowAttendanceModal(null);
      setAttendanceList({});
      alert('Attendance marked successfully!');
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>;
  
  if (!club) return <div className="p-8 text-center text-slate-500 font-bold text-2xl">Club not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{club.name} Management</h1>
            <p className="text-slate-500 mt-1">Manage members, events, and track performance</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate(`/clubs/${clubId}`)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium border border-slate-200"
            >
              View Public Page
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard 
            icon={<Users className="w-6 h-6 text-blue-600" />}
            label="Total Members"
            value={members.filter(m => m.status === 'active').length.toString()}
            color="bg-blue-50"
          />
          <StatCard 
            icon={<Calendar className="w-6 h-6 text-emerald-600" />}
            label="Events Hosted"
            value={events.length.toString()}
            color="bg-emerald-50"
          />
          <StatCard 
            icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
            label="Pending Requests"
            value={members.filter(m => m.status === 'pending').length.toString()}
            color="bg-purple-50"
          />
          <StatCard 
            icon={<Award className="w-6 h-6 text-amber-600" />}
            label="Certifications"
            value="12"
            color="bg-amber-50"
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-8 overflow-x-auto">
          <TabButton 
            active={activeTab === 'members'} 
            onClick={() => setActiveTab('members')}
            label="Members"
            icon={<Users className="w-4 h-4" />}
          />
          <TabButton 
            active={activeTab === 'events'} 
            onClick={() => setActiveTab('events')}
            label="Events & Attendance"
            icon={<Calendar className="w-4 h-4" />}
          />
          <TabButton 
            active={activeTab === 'volunteering'} 
            onClick={() => setActiveTab('volunteering')}
            label="Volunteering"
            icon={<Award className="w-4 h-4" />}
          />
          <TabButton 
            active={activeTab === 'performance'} 
            onClick={() => setActiveTab('performance')}
            label="Performance"
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {/* Pending Requests */}
              {members.filter(m => m.status === 'pending').length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                  <div className="p-4 bg-amber-100 border-b border-amber-200 flex items-center justify-between">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Pending Join Requests
                    </h3>
                  </div>
                  <div className="divide-y divide-amber-200">
                    {members.filter(m => m.status === 'pending').map(request => (
                      <div key={request.id} className="p-4 flex items-center justify-between bg-white/50">
                        <div>
                          <p className="font-bold text-slate-900">{request.userName}</p>
                          <p className="text-sm text-slate-500">{request.userEmail}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleApproveMember(request.id)}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-bold flex items-center gap-2"
                          >
                            <UserCheck className="w-4 h-4" />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRejectMember(request.id)}
                            className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Members */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-900">Active Members</h2>
                  <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm">
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-bold">Member</th>
                        <th className="px-6 py-4 font-bold">Role</th>
                        <th className="px-6 py-4 font-bold">Joined</th>
                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {members.filter(m => m.status === 'active').map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{member.userName}</div>
                            <div className="text-xs text-slate-500">{member.userEmail}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                              member.role === 'head' ? 'bg-amber-100 text-amber-700' :
                              member.role === 'core' ? 'bg-purple-100 text-purple-700' :
                              member.role === 'volunteer' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {member.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {member.joinedAt?.toDate().toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-3">
                            <button 
                              onClick={() => setShowRoleModal(member)}
                              className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              Manage
                            </button>
                            <button 
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 gap-6"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex justify-between items-center shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Club Events</h2>
                  <p className="text-slate-500 text-sm">Create events and mark attendance</p>
                </div>
                <button 
                  onClick={() => setShowEventModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Event
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((event) => (
                  <div key={event.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    <div className="h-32 relative">
                      <img src={event.image} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20"></div>
                      <div className="absolute bottom-3 left-4 text-white">
                        <span className="text-[10px] font-bold bg-blue-600 px-2 py-0.5 rounded uppercase tracking-wider">
                          {event.date.toDate() > new Date() ? 'Upcoming' : 'Past'}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 flex-grow">
                      <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
                      <div className="flex items-center gap-4 text-slate-500 text-xs mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(event.date.toDate(), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(event.date.toDate(), 'hh:mm a')}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                      <button 
                        onClick={() => setShowAttendanceModal(event)}
                        className="flex-1 bg-white text-slate-700 border border-slate-200 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-bold flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-3 h-3" />
                        Attendance
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'volunteering' && (
            <motion.div
              key="volunteering"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex justify-between items-center shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Volunteer Records</h2>
                  <p className="text-slate-500 text-sm">Track community service hours for members</p>
                </div>
                <button 
                  onClick={() => setShowVolunteerModal(true)}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Record Hours
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Hours</th>
                        <th className="px-6 py-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {volunteeringList.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900 text-sm">
                              {members.find(m => m.userId === v.userId)?.userName || 'Unknown'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{v.role}</td>
                          <td className="px-6 py-4">
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">
                              {v.hours} Hours
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {format(v.createdAt.toDate(), 'MMM dd, yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm"
            >
              <TrendingUp className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900">Performance Engine</h2>
              <p className="text-slate-500 mt-2 max-w-md mx-auto text-lg">
                Calculate student scores based on attendance rates and event participation.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={runScoringEngine}
                  disabled={isRunningEngine}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isRunningEngine ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <TrendingUp className="w-4 h-4" />}
                  {isRunningEngine ? 'Calculating...' : 'Run Scoring Engine'}
                </button>
                <button 
                  onClick={exportCSV}
                  className="bg-white text-slate-700 border border-slate-200 px-8 py-3 rounded-xl hover:bg-slate-50 transition-colors font-bold"
                >
                  Export CSV Report
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Volunteer Modal */}
        {showVolunteerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowVolunteerModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Record Volunteering</h2>
                <button onClick={() => setShowVolunteerModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddVolunteering} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student</label>
                  <select required className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-600"
                    value={newVolunteer.userId} onChange={(e) => setNewVolunteer({...newVolunteer, userId: e.target.value})}>
                    <option value="">Select Student...</option>
                    {members.filter(m => m.status === 'active').map(m => (
                      <option key={m.userId} value={m.userId}>{m.userName}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                    <input required type="text" placeholder="e.g. Coordinator" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-600"
                      value={newVolunteer.role} onChange={(e) => setNewVolunteer({...newVolunteer, role: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hours</label>
                    <input required type="number" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-600"
                      value={newVolunteer.hours} onChange={(e) => setNewVolunteer({...newVolunteer, hours: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <textarea required rows={3} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-600"
                    value={newVolunteer.description} onChange={(e) => setNewVolunteer({...newVolunteer, description: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg mt-4">
                  Save Record
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {/* Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowEventModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Create New Event</h2>
                <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</label>
                  <input required type="text" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                    value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <textarea required rows={3} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                    value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</label>
                    <input required type="datetime-local" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                      value={newEvent.date} onChange={(e) => setNewEvent({...newEvent, date: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                    <input required type="text" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                      value={newEvent.location} onChange={(e) => setNewEvent({...newEvent, location: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-4">
                  Publish Event
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Attendance Modal */}
        {showAttendanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAttendanceModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Mark Attendance</h2>
                  <p className="text-sm text-slate-500">{showAttendanceModal.title}</p>
                </div>
                <button onClick={() => setShowAttendanceModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-6">
                <div className="space-y-2">
                  {members.filter(m => m.status === 'active').map(member => (
                    <div key={member.userId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="font-bold text-slate-700">{member.userName}</div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setAttendanceList(prev => ({...prev, [member.userId]: 'present'}))}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            attendanceList[member.userId] === 'present' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'
                          }`}
                        >
                          Present
                        </button>
                        <button 
                          onClick={() => setAttendanceList(prev => ({...prev, [member.userId]: 'absent'}))}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            attendanceList[member.userId] === 'absent' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => handleMarkAttendance(showAttendanceModal.id)}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
                >
                  Save Attendance Records
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Role Management Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRoleModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Manage Role</h2>
              <p className="text-slate-500 text-sm mt-1">Assign a new role to <strong>{showRoleModal.userName}</strong></p>
              
              <div className="grid grid-cols-1 gap-2 mt-8">
                {(['member', 'volunteer', 'core', 'head'] as MembershipRole[]).map(role => (
                  <button
                    key={role}
                    onClick={() => handleUpdateRole(showRoleModal.id, role)}
                    className={`py-3 rounded-xl font-bold text-sm transition-all ${
                      showRoleModal.role === role ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {role.toUpperCase()}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setShowRoleModal(null)}
                className="mt-6 text-slate-400 font-bold text-sm hover:text-slate-600"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
        active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
        />
      )}
    </button>
  );
}
