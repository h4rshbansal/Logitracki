
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useLanguage } from './LanguageContext';
import { Job, JobStatus, UserProfile, DriverStatus } from '../types';
import { MapPin, Calendar, Clock, Car, ChevronRight, History, User } from 'lucide-react';

export const DriverDashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('driverId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
    return () => unsub();
  }, [user.uid]);

  const updateProgress = async (jobId: string, status: JobStatus) => {
    await updateDoc(doc(db, 'jobs', jobId), { status });
    if (status === JobStatus.COMPLETED) {
      await updateDoc(doc(db, 'users', user.uid), { status: DriverStatus.AVAILABLE });
    }
  };

  const getNextStatus = (current: JobStatus): JobStatus | null => {
    switch (current) {
      case JobStatus.APPROVED: return JobStatus.ACCEPTED;
      case JobStatus.ACCEPTED: return JobStatus.REACHED;
      case JobStatus.REACHED: return JobStatus.ON_WORK;
      case JobStatus.ON_WORK: return JobStatus.COMPLETED;
      default: return null;
    }
  };

  const currentJobs = jobs.filter(j => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.ARCHIVED && j.status !== JobStatus.REJECTED);
  const historyJobs = jobs.filter(j => j.status === JobStatus.COMPLETED);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('current')}
            className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${activeTab === 'current' ? 'bg-indigo-700 text-white shadow-lg font-black' : 'hover:bg-indigo-50 text-slate-800 font-bold'}`}
          >
            <MapPin size={22} /> <span>Active Tasks</span>
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
          {activeTab === 'current' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-black text-slate-900">Active Tasks</h2>
              <div className="grid gap-8">
                {currentJobs.map(job => (
                  <div key={job.id} className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden transition-all hover:border-indigo-400">
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <span className="text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest bg-indigo-100 text-indigo-700 mb-3 inline-block">
                            {t(job.status.toLowerCase() as any)}
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 leading-tight">{job.purpose}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Priority</p>
                          <p className={`font-black text-lg ${job.priority === 'HIGH' ? 'text-red-600' : 'text-blue-600'}`}>{t(job.priority.toLowerCase() as any)}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 mb-8">
                         <div className="flex items-center gap-5">
                            <div className="p-4 bg-white rounded-full shadow-sm text-indigo-600"><MapPin size={32} /></div>
                            <div className="flex-1 grid grid-cols-2 gap-8">
                               <div>
                                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">{t('from')}</p>
                                  <p className="text-xl font-black text-slate-900">{job.fromLocation}</p>
                               </div>
                               <div>
                                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">{t('to')}</p>
                                  <p className="text-xl font-black text-slate-900">{job.toLocation}</p>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm"><Calendar size={24} /></div>
                          <div>
                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">{t('date')}</p>
                            <p className="text-sm font-black text-slate-900">{job.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm"><Clock size={24} /></div>
                          <div>
                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">{t('timeSlot')}</p>
                            <p className="text-sm font-black text-slate-900">{job.slot}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm"><Car size={24} /></div>
                          <div>
                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Vehicle</p>
                            <p className="text-sm font-black text-slate-900">{job.vehicleName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm"><User size={24} /></div>
                          <div>
                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Requested By</p>
                            <p className="text-sm font-black text-slate-900">{job.supervisorName}</p>
                          </div>
                        </div>
                      </div>

                      {job.remark && (
                        <div className="bg-indigo-50/50 p-6 rounded-2xl border-l-8 border-indigo-500 mb-8">
                          <p className="text-[10px] font-black text-indigo-700 uppercase mb-2 tracking-widest">Admin Remarks</p>
                          <p className="text-base font-bold text-slate-800 italic leading-relaxed">"{job.remark}"</p>
                        </div>
                      )}

                      <div className="flex justify-end pt-6 border-t-2 border-slate-100">
                        {getNextStatus(job.status) && (
                          <button 
                            onClick={() => updateProgress(job.id, getNextStatus(job.status)!)}
                            className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg flex items-center gap-3 hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-95"
                          >
                            {t('updateProgress')} <ChevronRight size={24} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {currentJobs.length === 0 && (
                  <div className="text-center py-24 bg-slate-50 rounded-3xl border-4 border-dashed border-slate-200">
                    <MapPin className="mx-auto text-slate-200 mb-6" size={80} />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-lg">No current assignments</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-black text-slate-900">Task History</h2>
              <div className="grid gap-6">
                {historyJobs.map(job => (
                  <div key={job.id} className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-indigo-200">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 mb-1">{job.purpose}</h4>
                      <p className="text-sm text-slate-700 font-bold">{job.fromLocation} → {job.toLocation}</p>
                      <p className="text-xs text-slate-500 font-bold">{job.date} | {job.slot}</p>
                    </div>
                    <span className="text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest bg-slate-200 text-slate-800">
                      Completed
                    </span>
                  </div>
                ))}
                {historyJobs.length === 0 && (
                   <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                     <History className="mx-auto text-slate-300 mb-6" size={64} />
                     <p className="text-slate-500 font-black uppercase tracking-widest">Your task history is empty</p>
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
