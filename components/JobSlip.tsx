
import React from 'react';
import { Job } from '../types';
import { useLanguage } from './LanguageContext';
import { MapPin } from 'lucide-react';

interface JobSlipProps {
  job: Job;
}

export const JobSlip: React.FC<JobSlipProps> = ({ job }) => {
  const { t } = useLanguage();

  return (
    <div id="print-section" className="p-10 border-4 border-slate-300 rounded shadow-sm max-w-2xl mx-auto bg-white">
      <div className="text-center mb-8 border-b-2 pb-6">
        <h1 className="text-3xl font-black uppercase tracking-widest text-slate-800">LogiTrack Transport Slip</h1>
        <p className="text-slate-500 font-bold uppercase tracking-tight text-xs mt-1">Official Job Assignment Document</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t('purpose')}</p>
          <p className="font-black text-xl text-slate-900 leading-tight">{job.purpose}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Job ID</p>
          <p className="font-mono font-bold text-lg text-slate-800">#{job.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 mb-8">
         <div className="flex items-center gap-4 mb-4">
            <MapPin className="text-indigo-600" size={24} />
            <div className="flex-1 grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('from')}</p>
                  <p className="font-black text-slate-900">{job.fromLocation}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('to')}</p>
                  <p className="font-black text-slate-900">{job.toLocation}</p>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-2 gap-y-6 gap-x-12 py-6 border-y-2 border-slate-100 mb-8">
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t('date')}</p>
          <p className="font-black text-slate-900">{job.date}</p>
        </div>
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t('timeSlot')}</p>
          <p className="font-black text-slate-900">{job.slot}</p>
        </div>
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t('drivers')}</p>
          <p className="font-black text-slate-900">{job.driverName || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t('vehicles')}</p>
          <p className="font-black text-slate-900">{job.vehicleName || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t('supervisors')}</p>
          <p className="font-black text-slate-900">{job.supervisorName}</p>
        </div>
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t('priority')}</p>
          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
            job.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
            job.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {t(job.priority.toLowerCase() as any)}
          </span>
        </div>
      </div>

      {job.remark && (
        <div className="mb-10 bg-slate-50 p-4 rounded-xl border-l-4 border-slate-300">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('remarks')}</p>
          <p className="italic font-bold text-slate-700 leading-relaxed">"{job.remark}"</p>
        </div>
      )}

      <div className="flex justify-between items-end mt-12 pt-10 border-t-2 border-slate-100">
        <div className="text-center w-48">
          <div className="h-10 border-b-2 border-slate-300 mb-3"></div>
          <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Authorized Signature</p>
        </div>
        <div className="text-center w-48">
          <div className="h-10 border-b-2 border-slate-300 mb-3"></div>
          <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Driver Signature</p>
        </div>
      </div>

      <div className="mt-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        This is an official system document. Generated on {new Date().toLocaleString()}
      </div>
    </div>
  );
};
