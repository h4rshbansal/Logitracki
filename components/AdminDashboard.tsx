
import React, { useState, useEffect } from 'react';
import { 
  collection, query, getDocs, updateDoc, doc, addDoc, 
  serverTimestamp, where, setDoc, deleteDoc, onSnapshot 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useLanguage } from './LanguageContext';
import { Job, JobStatus, Priority, UserProfile, UserRole, Vehicle, VehicleStatus, DriverStatus, ActivityLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Printer, Check, X, Trash2, Plus, Users, Car, ClipboardList, Activity, Archive as ArchiveIcon, Send, MapPin } from 'lucide-react';
import { JobSlip } from './JobSlip';

export const AdminDashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'users' | 'vehicles' | 'logs' | 'archive'>('overview');
  const [printJob, setPrintJob] = useState<Job | null>(null);

  // Stats
  const stats = {
    pending: jobs.filter(j => j.status === JobStatus.PENDING).length,
    approved: jobs.filter(j => j.status === JobStatus.APPROVED || j.status === JobStatus.ACCEPTED || j.status === JobStatus.COMPLETED).length,
    drivers: users.filter(u => u.role === UserRole.DRIVER && u.status === DriverStatus.AVAILABLE).length,
    completed: jobs.filter(j => j.status === JobStatus.COMPLETED).length
  };

  useEffect(() => {
    const unsubJobs = onSnapshot(collection(db, 'jobs'), (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });
    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    });
    const unsubLogs = onSnapshot(query(collection(db, 'activityLogs')), (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)).sort((a,b) => b.timestamp?.seconds - a.timestamp?.seconds));
    });

    return () => { unsubJobs(); unsubUsers(); unsubVehicles(); unsubLogs(); };
  }, []);

  const addLog = async (en: string, hi: string) => {
    await addDoc(collection(db, 'activityLogs'), {
      textEn: en,
      textHi: hi,
      timestamp: serverTimestamp(),
      userId: user.uid,
      userName: user.name
    });
  };

  const handleApprove = async (job: Job, driverId: string, vehicleId: string, remark: string) => {
    if (!driverId || !vehicleId) {
      alert("Please assign a driver and vehicle.");
      return;
    }

    // Check conflict
    const conflict = jobs.find(j => j.vehicleId === vehicleId && j.date === job.date && j.slot === job.slot && (j.status === JobStatus.APPROVED || j.status === JobStatus.ACCEPTED || j.status === JobStatus.ON_WORK));
    if (conflict && conflict.id !== job.id) {
      alert("Vehicle already assigned for this slot!");
      return;
    }

    const d = users.find(u => u.uid === driverId);
    const v = vehicles.find(veh => veh.id === vehicleId);

    await updateDoc(doc(db, 'jobs', job.id), {
      status: JobStatus.APPROVED,
      driverId,
      driverName: d?.name,
      vehicleId,
      vehicleName: v?.name,
      remark,
      approvedAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'users', driverId), { status: DriverStatus.ASSIGNED });
    
    addLog(`Approved job ${job.id} and assigned ${d?.name}`, `कार्य ${job.id} को मंजूरी दी गई और ${d?.name} को सौंपा गया`);
  };

  const handleReject = async (job: Job, remark: string) => {
    await updateDoc(doc(db, 'jobs', job.id), {
      status: JobStatus.REJECTED,
      remark
    });
    addLog(`Rejected job ${job.id}`, `कार्य ${job.id} को अस्वीकार कर दिया गया`);
  };

  const handleDelete = async (jobId: string) => {
    await updateDoc(doc(db, 'jobs', jobId), { status: JobStatus.ARCHIVED });
    addLog(`Archived job ${jobId}`, `कार्य ${jobId} को आर्काइव किया गया`);
  };

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {[
        { label: t('pendingJobs'), val: stats.pending, color: 'text-orange-700', bg: 'bg-orange-100' },
        { label: t('approvedJobs'), val: stats.approved, color: 'text-green-700', bg: 'bg-green-100' },
        { label: t('activeDrivers'), val: stats.drivers, color: 'text-blue-700', bg: 'bg-blue-100' },
        { label: t('completedJobs'), val: stats.completed, color: 'text-slate-800', bg: 'bg-slate-200' },
      ].map((s, idx) => (
        <div key={idx} className={`${s.bg} p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-105`}>
          <p className="text-sm font-bold text-slate-700 mb-1 uppercase tracking-tight">{s.label}</p>
          <p className={`text-4xl font-black ${s.color}`}>{s.val}</p>
        </div>
      ))}
    </div>
  );

  const chartData = [
    { name: t('pending'), count: stats.pending },
    { name: t('approved'), count: stats.approved },
    { name: t('completed'), count: stats.completed },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          {[
            { id: 'overview', icon: Activity, label: t('dashboard') },
            { id: 'jobs', icon: ClipboardList, label: t('jobRequests') },
            { id: 'users', icon: Users, label: t('drivers') + '/' + t('supervisors') },
            { id: 'vehicles', icon: Car, label: t('vehicles') },
            { id: 'logs', icon: Activity, label: t('logs') },
            { id: 'archive', icon: ArchiveIcon, label: t('archive') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-indigo-700 text-white shadow-lg font-bold' : 'hover:bg-indigo-50 text-slate-700 font-medium'
              }`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-6">{t('adminDashboard')}</h2>
              {renderStats()}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-black mb-4 text-slate-800 uppercase tracking-tight">Job Distribution</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fill: '#334155', fontWeight: 'bold'}} />
                      <YAxis tick={{fill: '#334155', fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{fontWeight: 'bold', borderRadius: '8px'}} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ea580c' : index === 1 ? '#16a34a' : '#475569'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <h2 className="text-3xl font-black text-slate-900">{t('jobRequests')}</h2>
              </div>
              
              {/* Admin Create Job Section */}
              <AdminCreateJob user={user} onLog={addLog} />

              <div className="grid gap-4 mt-8">
                <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Active Requests</h3>
                {jobs.filter(j => j.status !== JobStatus.ARCHIVED).length === 0 ? (
                  <p className="text-slate-500 italic py-10 text-center bg-white rounded-xl border border-dashed">No active job requests.</p>
                ) : (
                  jobs.filter(j => j.status !== JobStatus.ARCHIVED).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds).map(job => (
                    <JobCard 
                      key={job.id} 
                      job={job} 
                      users={users} 
                      vehicles={vehicles} 
                      onApprove={handleApprove} 
                      onReject={handleReject}
                      onDelete={handleDelete}
                      onPrint={() => setPrintJob(job)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && <UserManager users={users} onLog={addLog} />}
          {activeTab === 'vehicles' && <VehicleManager vehicles={vehicles} onLog={addLog} />}
          {activeTab === 'logs' && <LogViewer logs={logs} />}
          {activeTab === 'archive' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-slate-900">{t('archive')}</h2>
              <div className="grid gap-4 opacity-80">
                {jobs.filter(j => j.status === JobStatus.ARCHIVED).map(job => (
                  <div key={job.id} className="p-4 bg-white border border-slate-200 rounded-lg flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-black text-slate-800">{job.purpose}</p>
                      <p className="text-sm text-slate-600 font-bold">{job.fromLocation} → {job.toLocation}</p>
                      <p className="text-xs text-slate-500 font-bold">{job.date} | {job.slot}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-slate-200 text-slate-700 px-3 py-1 rounded-full">Archived</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {printJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative border-4 border-slate-200">
            <button onClick={() => setPrintJob(null)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-900 transition-colors">
              <X size={28} />
            </button>
            <JobSlip job={printJob} />
            <div className="mt-8 flex justify-center gap-4">
              <button 
                onClick={() => window.print()}
                className="bg-indigo-700 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-indigo-800 shadow-xl"
              >
                <Printer size={20} /> {t('printSlip')}
              </button>
              <button onClick={() => setPrintJob(null)} className="bg-slate-200 text-slate-800 px-8 py-3 rounded-xl font-black hover:bg-slate-300">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminCreateJob: React.FC<{ user: UserProfile, onLog: any }> = ({ user, onLog }) => {
  const { t } = useLanguage();
  const [purpose, setPurpose] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose || !date || !slot || !fromLocation || !toLocation) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'jobs'), {
        supervisorId: user.uid,
        supervisorName: user.name + " (Admin)",
        purpose,
        fromLocation,
        toLocation,
        date,
        slot,
        priority,
        status: JobStatus.PENDING,
        createdAt: serverTimestamp()
      });
      setPurpose(''); setFromLocation(''); setToLocation(''); setDate(''); setSlot('');
      onLog(`Admin created a job: ${purpose} (${fromLocation} to ${toLocation})`, `एडमिन ने एक कार्य बनाया: ${purpose} (${fromLocation} से ${toLocation})`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-100 shadow-sm mb-8">
      <h3 className="text-xl font-black text-indigo-900 mb-4 flex items-center gap-2">
        <Plus size={24} /> Create Direct Job
      </h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-black text-indigo-700 uppercase mb-1">Job Purpose</label>
          <input 
            className="w-full p-3 border-2 border-indigo-200 rounded-xl bg-white text-slate-900 font-bold outline-none focus:border-indigo-500" 
            placeholder="Describe the job..." 
            value={purpose} 
            onChange={e => setPurpose(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label className="block text-xs font-black text-indigo-700 uppercase mb-1">{t('from')}</label>
          <input 
            className="w-full p-3 border-2 border-indigo-200 rounded-xl bg-white text-slate-900 font-bold outline-none focus:border-indigo-500" 
            placeholder="Pickup location" 
            value={fromLocation} 
            onChange={e => setFromLocation(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label className="block text-xs font-black text-indigo-700 uppercase mb-1">{t('to')}</label>
          <input 
            className="w-full p-3 border-2 border-indigo-200 rounded-xl bg-white text-slate-900 font-bold outline-none focus:border-indigo-500" 
            placeholder="Drop destination" 
            value={toLocation} 
            onChange={e => setToLocation(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label className="block text-xs font-black text-indigo-700 uppercase mb-1">Date</label>
          <input type="date" className="w-full p-3 border-2 border-indigo-200 rounded-xl bg-white text-slate-900 font-bold outline-none" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-black text-indigo-700 uppercase mb-1">Time Slot</label>
          <select className="w-full p-3 border-2 border-indigo-200 rounded-xl bg-white text-slate-900 font-bold outline-none" value={slot} onChange={e => setSlot(e.target.value)} required>
            <option value="">Select Slot</option>
            <option value="08:00 - 10:00">08:00 AM - 10:00 AM</option>
            <option value="10:00 - 12:00">10:00 AM - 12:00 PM</option>
            <option value="12:00 - 14:00">12:00 PM - 02:00 PM</option>
            <option value="14:00 - 16:00">02:00 PM - 04:00 PM</option>
            <option value="16:00 - 18:00">04:00 PM - 06:00 PM</option>
          </select>
        </div>
        <div className="lg:col-span-4 flex justify-between items-center mt-2">
          <div className="flex gap-2">
             {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`py-2 px-6 rounded-xl text-xs font-black uppercase transition-all border-2 ${
                  priority === p ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                {t(p.toLowerCase() as any)}
              </button>
            ))}
          </div>
          <button 
            disabled={loading}
            className="bg-indigo-700 text-white font-black px-10 py-3 rounded-xl hover:bg-indigo-800 shadow-lg flex items-center gap-2 active:scale-95 transition-all"
          >
            <Send size={18} /> {loading ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

const JobCard: React.FC<{ 
  job: Job, 
  users: UserProfile[], 
  vehicles: Vehicle[], 
  onApprove: any, 
  onReject: any,
  onDelete: any,
  onPrint: any
}> = ({ job, users, vehicles, onApprove, onReject, onDelete, onPrint }) => {
  const { t } = useLanguage();
  const [remark, setRemark] = useState(job.remark || '');
  const [driverId, setDriverId] = useState(job.driverId || '');
  const [vehicleId, setVehicleId] = useState(job.vehicleId || '');

  const availableDrivers = users.filter(u => u.role === UserRole.DRIVER && (u.status === DriverStatus.AVAILABLE || u.uid === job.driverId));
  const activeVehicles = vehicles.filter(v => v.status === VehicleStatus.ACTIVE || v.id === job.vehicleId);

  return (
    <div className={`p-6 bg-white border-2 rounded-2xl shadow-sm transition-all hover:shadow-md ${job.status === JobStatus.PENDING ? 'border-orange-300' : 'border-slate-200'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
              job.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 
              job.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {t(job.priority.toLowerCase() as any)}
            </span>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
              job.status === JobStatus.PENDING ? 'bg-orange-100 text-orange-700' :
              job.status === JobStatus.REJECTED ? 'bg-red-100 text-red-700' :
              job.status === JobStatus.COMPLETED ? 'bg-slate-200 text-slate-800' : 'bg-green-100 text-green-700'
            }`}>
              {t(job.status.toLowerCase() as any)}
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 leading-tight">{job.purpose}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-700 font-bold mt-1">
             <MapPin size={14} className="text-indigo-600" />
             <span>{job.fromLocation} → {job.toLocation}</span>
          </div>
          <p className="text-xs text-slate-500 font-bold mt-1">{job.date} • {job.slot} • Req by {job.supervisorName}</p>
        </div>
        <div className="flex gap-2">
          {job.status === JobStatus.APPROVED && (
            <button onClick={onPrint} className="p-3 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors" title={t('printSlip')}>
              <Printer size={22} />
            </button>
          )}
          <button onClick={() => onDelete(job.id)} className="p-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
            <Trash2 size={22} />
          </button>
        </div>
      </div>

      {job.status === JobStatus.PENDING && (
        <div className="mt-4 space-y-4 pt-4 border-t-2 border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1">Assign Driver</label>
              <select 
                className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none"
                value={driverId}
                onChange={e => setDriverId(e.target.value)}
              >
                <option value="">{t('assignDriver')}</option>
                {availableDrivers.map(d => <option key={d.uid} value={d.uid}>{d.name} ({d.status})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1">Assign Vehicle</label>
              <select 
                className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none"
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
              >
                <option value="">{t('assignVehicle')}</option>
                {activeVehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.status})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">Remarks</label>
            <textarea 
              placeholder={t('remarks')}
              className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none h-20"
              value={remark}
              onChange={e => setRemark(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button 
              onClick={() => onReject(job, remark)}
              className="flex items-center gap-2 px-6 py-2 border-2 border-red-200 text-red-600 rounded-xl text-sm font-black hover:bg-red-50 transition-colors"
            >
              <X size={18} /> {t('reject')}
            </button>
            <button 
              onClick={() => onApprove(job, driverId, vehicleId, remark)}
              className="flex items-center gap-2 px-8 py-2 bg-green-600 text-white rounded-xl text-sm font-black hover:bg-green-700 shadow-md transition-all active:scale-95"
            >
              <Check size={18} /> {t('approve')}
            </button>
          </div>
        </div>
      )}

      {job.status !== JobStatus.PENDING && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t-2 border-slate-100">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t('drivers')}</p>
            <p className="font-black text-slate-800">{job.driverName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t('vehicles')}</p>
            <p className="font-black text-slate-800">{job.vehicleName || 'N/A'}</p>
          </div>
          {job.remark && (
            <div className="col-span-2 md:col-span-1">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t('remarks')}</p>
              <p className="text-sm font-bold text-slate-700 italic">"{job.remark}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const UserManager: React.FC<{ users: UserProfile[], onLog: any }> = ({ users, onLog }) => {
  const { t } = useLanguage();
  const [role, setRole] = useState<UserRole>(UserRole.DRIVER);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    const uid = Math.random().toString(36).slice(2, 12); // Simulated UID
    await setDoc(doc(db, 'users', uid), {
      uid, name, email, role, 
      status: role === UserRole.DRIVER ? DriverStatus.AVAILABLE : 'ACTIVE', 
      createdAt: serverTimestamp(),
      _tempPass: password // Admins can store passwords in Firestore for simplicity in this demo environment
    });
    onLog(`Admin added user ${name} (${role}) with password`, `एडमिन ने उपयोगकर्ता ${name} (${role}) को पासवर्ड के साथ जोड़ा`);
    setName(''); setEmail(''); setPassword('');
    alert("User account metadata created. Note: Real auth accounts must be verified via Login.");
  };

  const updateStatus = async (uid: string, status: any) => {
    await updateDoc(doc(db, 'users', uid), { status });
    onLog(`Updated status of user ${uid} to ${status}`, `उपयोगकर्ता ${uid} की स्थिति को ${status} में अपडेट किया गया`);
  };

  const deleteUser = async (uid: string) => {
    if(!confirm("Are you sure you want to delete this user?")) return;
    await deleteDoc(doc(db, 'users', uid));
    onLog(`Deleted user ${uid}`, `उपयोगकर्ता ${uid} को हटा दिया गया`);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Plus size={24} className="text-indigo-700" /> {t('addDriver')} / {t('addSupervisor')}
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input className="p-3 border-2 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white outline-none" placeholder={t('name')} value={name} onChange={e => setName(e.target.value)} required />
          <input className="p-3 border-2 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white outline-none" placeholder={t('email')} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="p-3 border-2 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white outline-none" placeholder="Set Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <select className="p-3 border-2 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white outline-none" value={role} onChange={e => setRole(e.target.value as any)}>
            <option value={UserRole.DRIVER}>{t('drivers')}</option>
            <option value={UserRole.SUPERVISOR}>{t('supervisors')}</option>
            <option value={UserRole.ADMIN}>Admin</option>
          </select>
          <button className="bg-indigo-700 text-white font-black py-3 rounded-xl hover:bg-indigo-800 shadow-md active:scale-95 transition-all">Add Member</button>
        </form>
        <p className="mt-4 text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-lg border">Note: Admin manually sets the password. Users can sign up with these credentials to activate their account profile.</p>
      </div>

      <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest">{t('name')}</th>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest">{t('status')}</th>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {users.map(u => (
                <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-600 font-bold">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-black px-3 py-1 bg-slate-100 rounded-full border border-slate-200">{u.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    {u.role === UserRole.DRIVER ? (
                      <select 
                        className="text-xs border-2 border-slate-200 rounded-lg px-3 py-2 bg-white font-bold uppercase outline-none focus:border-indigo-500"
                        value={u.status}
                        onChange={e => updateStatus(u.uid, e.target.value)}
                      >
                        <option value={DriverStatus.AVAILABLE}>{t('available')}</option>
                        <option value={DriverStatus.ASSIGNED}>{t('assigned')}</option>
                        <option value={DriverStatus.ON_LEAVE}>{t('onLeave')}</option>
                      </select>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-black uppercase tracking-wider">{u.status}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => deleteUser(u.uid)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const VehicleManager: React.FC<{ vehicles: Vehicle[], onLog: any }> = ({ vehicles, onLog }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const id = Math.random().toString(36).slice(2, 12);
    await setDoc(doc(db, 'vehicles', id), {
      id, name, status: VehicleStatus.ACTIVE
    });
    onLog(`Added vehicle ${name}`, `वाहन ${name} को जोड़ा गया`);
    setName('');
  };

  const updateStatus = async (id: string, status: any) => {
    await updateDoc(doc(db, 'vehicles', id), { status });
    onLog(`Updated vehicle ${id} status to ${status}`, `वाहन ${id} की स्थिति को ${status} में अपडेट किया गया`);
  };

  const deleteVeh = async (id: string) => {
    if(!confirm("Delete this vehicle?")) return;
    await deleteDoc(doc(db, 'vehicles', id));
    onLog(`Deleted vehicle ${id}`, `वाहन ${id} को हटा दिया गया`);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Car size={24} className="text-indigo-700" /> {t('addVehicle')}
        </h3>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
          <input className="flex-1 p-3 border-2 border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white outline-none" placeholder="Vehicle Name / Registration Number" value={name} onChange={e => setName(e.target.value)} required />
          <button className="bg-indigo-700 text-white font-black px-12 py-3 rounded-xl hover:bg-indigo-800 shadow-md transition-all active:scale-95">Add Vehicle</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map(v => (
          <div key={v.id} className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:border-indigo-200">
            <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-indigo-50 rounded-xl text-indigo-700"><Car size={28} /></div>
              <button onClick={() => deleteVeh(v.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={22} /></button>
            </div>
            <h4 className="font-black text-slate-900 text-xl mb-3">{v.name}</h4>
            <select 
              className="w-full font-black border-2 border-slate-100 rounded-xl px-4 py-3 bg-slate-50 uppercase text-xs tracking-widest outline-none focus:border-indigo-500"
              value={v.status}
              onChange={e => updateStatus(v.id, e.target.value)}
            >
              <option value={VehicleStatus.ACTIVE}>{t('active')}</option>
              <option value={VehicleStatus.MAINTENANCE}>{t('maintenance')}</option>
              <option value={VehicleStatus.OUT_OF_SERVICE}>{t('outOfService')}</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

const LogViewer: React.FC<{ logs: ActivityLog[] }> = ({ logs }) => {
  const { language } = useLanguage();
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 bg-slate-50 border-b-2 border-slate-200 flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900">System Activity Logs</h3>
        <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{logs.length} entries</span>
      </div>
      <div className="divide-y-2 divide-slate-100 max-h-[600px] overflow-y-auto">
        {logs.map(log => (
          <div key={log.id} className="p-5 flex gap-5 hover:bg-slate-50 transition-colors">
            <div className="h-3 w-3 rounded-full bg-indigo-600 mt-2 flex-shrink-0 animate-pulse"></div>
            <div>
              <p className="text-slate-900 text-base font-bold leading-snug">
                {language === 'en' ? log.textEn : log.textHi}
              </p>
              <p className="text-[11px] text-slate-500 mt-2 uppercase font-black tracking-widest">
                By: {log.userName} • {log.timestamp?.toDate().toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">No activity recorded yet</div>
        )}
      </div>
    </div>
  );
};
