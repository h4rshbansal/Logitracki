
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useLanguage } from './LanguageContext';
import { Job, JobStatus, Priority, UserProfile } from '../types';
import { Plus, Clock, History, AlertCircle, CheckCircle2, XCircle, Send, MapPin } from 'lucide-react';

export const SupervisorDashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [purpose, setPurpose] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('supervisorId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
    return () => unsub();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose || !date || !slot || !fromLocation || !toLocation) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'jobs'), {
        supervisorId: user.uid,
        supervisorName: user.name,
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
      alert("Job request submitted successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deletePendingJob = async (jobId: string) => {
    if(!confirm("Are you sure you want to cancel this request?")) return;
    await deleteDoc(doc(db, 'jobs', jobId));
  };

  const pendingJobs = jobs.filter(j => j.status === JobStatus.PENDING);
  const historicJobs = jobs.filter(j => j.status !== JobStatus.PENDING && j.status !== JobStatus.ARCHIVED);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('request')}
            className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${activeTab === 'request' ? 'bg-indigo-700 text-white shadow-lg font-black' : 'hover:bg-indigo-50 text-slate-800 font-bold'}`}
          >
            <Plus size={22} /> <span>{t('createJob')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${activeTab === 'history' ? 'bg-indigo-700 text-white shadow-lg font-black' : 'hover:bg-indigo-50 text-slate-800 font-bold'}`}
          >
            <History size={22} /> <span>{t('history')}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'request' && (
            <div className="space-y-10">
              <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-sm">
                <h2 className="text-3xl font-black mb-8 text-slate-900 border-b pb-4">New Transport Request</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">{t('purpose')}</label>
                    <input 
                      className="w-full p-4 border-2 border-slate-200 rounded-2xl bg-slate-50 text-slate-900 font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400" 
                      placeholder="e.g. Delivery of raw materials to Plant A" 
                      value={purpose} 
                      onChange={e => setPurpose(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">{t('from')}</label>
                    <input 
                      className="w-full p-4 border-2 border-slate-200 rounded-2xl bg-slate-50 text-slate-900 font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400" 
                      placeholder="Pickup point" 
                      value={fromLocation} 
                      onChange={e => setFromLocation(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">{t('to')}</label>
                    <input 
                      className="w-full p-4 border-2 border-slate-200 rounded-2xl bg-slate-50 text-slate-900 font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400" 
                      placeholder="Drop destination" 
                      value={toLocation} 
                      onChange={e => setToLocation(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">{t('date')}</label>
                    <input 
                      type="date" 
                      className="w-full p-4 border-2 border-slate-200 rounded-2xl bg-slate-50 text-slate-900 font-bold focus:bg-white outline-none" 
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">{t('timeSlot')}</label>
                    <select className="w-full p-4 border-2 border-slate-200 rounded-2xl bg-slate-50 text-slate-900 font-bold focus:bg-white outline-none" value={slot} onChange={e => setSlot(e.target.value)} required>
                      <option value="">Select Slot</option>
                      <option value="08:00 - 10:00">08:00 AM - 10:00 AM</option>
                      <option value="10:00 - 12:00">10:00 AM - 12:00 PM</option>
                      <option value="12:00 - 14:00">12:00 PM - 02:00 PM</option>
                      <option value="14:00 - 16:00">02:00 PM - 04:00 PM</option>
                      <option value="16:00 - 18:00">04:00 PM - 06:00 PM</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">{t('priority')}</label>
                    <div className="flex gap-4">
                      {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`flex-1 py-3 px-6 rounded-2xl text-xs font-black transition-all border-2 uppercase tracking-wider ${
                            priority === p 
                              ? 'bg-indigo-700 text-white border-indigo-700 shadow-lg' 
                              : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          {t(p.toLowerCase() as any)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end pt-6">
                    <button 
                      disabled={loading}
                      className="bg-indigo-700 text-white font-black px-12 py-4 rounded-2xl hover:bg-indigo-800 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-3"
                    >
                      <Send size={20} /> {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>

              <div>
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900">
                  <Clock size={28} className="text-orange-600" /> Pending Requests ({pendingJobs.length})
                </h3>
                <div className="grid gap-6">
                  {pendingJobs.map(job => (
                    <div key={job.id} className="bg-white p-6 rounded-2xl border-2 border-orange-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-orange-400">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                            job.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {t(job.priority.toLowerCase() as any)} Priority
                          </span>
                          <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider bg-orange-100 text-orange-700">Pending</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-1">{job.purpose}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-700 font-bold mb-1">
                           <MapPin size={14} className="text-indigo-600" />
                           <span>{job.fromLocation} → {job.toLocation}</span>
                        </div>
                        <p className="text-sm text-slate-600 font-bold">{job.date} • {job.slot}</p>
                      </div>
                      <button 
                        onClick={() => deletePendingJob(job.id)}
                        className="text-red-600 hover:bg-red-50 px-6 py-3 rounded-xl font-black text-sm transition-all border-2 border-transparent hover:border-red-200"
                      >
                        Cancel Request
                      </button>
                    </div>
                  ))}
                  {pendingJobs.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-sm">
                      No pending requests at the moment
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-black text-slate-900">Request History</h2>
              <div className="grid gap-6">
                {historicJobs.map(job => (
                  <div key={job.id} className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-indigo-200">
                    <div className="flex gap-5 items-start">
                      <div className="mt-2">
                        {job.status === JobStatus.APPROVED || job.status === JobStatus.ACCEPTED || job.status === JobStatus.COMPLETED || job.status === JobStatus.REACHED || job.status === JobStatus.ON_WORK ? (
                          <CheckCircle2 className="text-green-600" size={32} />
                        ) : (
                          <XCircle className="text-red-600" size={32} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-900 mb-1">{job.purpose}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-700 font-bold mb-1">
                           <MapPin size={14} className="text-indigo-600" />
                           <span>{job.fromLocation} → {job.toLocation}</span>
                        </div>
                        <p className="text-sm text-slate-600 font-bold">{job.date} • {job.slot}</p>
                        {job.remark && (
                          <div className="mt-4 bg-slate-50 p-3 rounded-xl border-l-4 border-indigo-400">
                             <p className="text-xs font-black text-indigo-700 uppercase mb-1 tracking-widest">Admin Remark</p>
                             <p className="text-sm font-bold text-slate-800 italic">"{job.remark}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest ${
                        job.status === JobStatus.COMPLETED ? 'bg-slate-200 text-slate-800' :
                        job.status === JobStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {t(job.status.toLowerCase() as any)}
                      </span>
                    </div>
                  </div>
                ))}
                {historicJobs.length === 0 && (
                  <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <History className="mx-auto text-slate-300 mb-6" size={64} />
                    <p className="text-slate-500 font-black uppercase tracking-widest">No past requests recorded</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
