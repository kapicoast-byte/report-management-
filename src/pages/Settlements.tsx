import React, { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Settlement, Outlet } from '../types';
import { useAuth } from '../lib/AuthContext';
import { useDropzone } from 'react-dropzone';
import { extractSettlementData } from '../lib/gemini';
import { 
  Plus, 
  Calculator, 
  Upload, 
  Loader2, 
  Check, 
  X, 
  Eye, 
  Calendar,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Settlements() {
  const { profile } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Settlement>>({
    outletId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    totalSales: 0,
    cash: 0,
    card: 0,
    online: 0,
    status: 'pending'
  });

  useEffect(() => {
    if (!profile) return;

    const isOwner = profile.role === 'owner';
    const hasOutlets = profile.outletIds && profile.outletIds.length > 0;

    if (!isOwner && !hasOutlets) {
      setSettlements([]);
      setOutlets([]);
      return;
    }
    
    const settlementsQuery = isOwner
      ? collection(db, 'settlements')
      : query(collection(db, 'settlements'), where('outletId', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const outletsQuery = isOwner
      ? collection(db, 'outlets')
      : query(collection(db, 'outlets'), where('__name__', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const unsubSettlements = onSnapshot(settlementsQuery, (snap) => {
      setSettlements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement)));
    });

    const unsubOutlets = onSnapshot(outletsQuery, (snap) => {
      setOutlets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Outlet)));
    });

    return () => {
      unsubSettlements();
      unsubOutlets();
    };
  }, [profile]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setIsExtracting(true);
    
    try {
      const storageRef = ref(storage, `settlements/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const extracted = await extractSettlementData(base64);
          setFormData(prev => ({
            ...prev,
            date: extracted.date || prev.date,
            totalSales: extracted.totalSales || 0,
            cash: extracted.cash || 0,
            card: extracted.card || 0,
            online: extracted.online || 0,
            imageUrl: url
          }));
          toast.success('Settlement data extracted.');
        } catch (err) {
          toast.error('Extraction failed, image uploaded.');
          setFormData(prev => ({ ...prev, imageUrl: url }));
        } finally {
          setIsExtracting(false);
        }
      };
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: false } as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) return toast.error('Please upload a settlement sheet photo');
    if (!formData.outletId) return toast.error('Please select an outlet');

    try {
      await addDoc(collection(db, 'settlements'), {
        ...formData,
        uploadedBy: profile?.uid,
        createdAt: serverTimestamp()
      });
      toast.success('Settlement submitted');
      setIsModalOpen(false);
      setFormData({
        outletId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        totalSales: 0,
        cash: 0,
        card: 0,
        online: 0,
        status: 'pending'
      });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReview = async (id: string, status: 'approved' | 'rejected', comments?: string) => {
    try {
      await updateDoc(doc(db, 'settlements', id), {
        status,
        reviewedBy: profile?.uid,
        comments: comments || '',
        updatedAt: serverTimestamp()
      });
      toast.success(`Settlement ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Daily Settlements</h1>
          <p className="text-stone-500">Track daily sales and payment breakdowns.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Settlement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {settlements.map((s) => (
          <div key={s.id} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-stone-100 rounded-2xl">
                <Calculator className="w-8 h-8 text-stone-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900">{format(new Date(s.date), 'MMMM d, yyyy')}</h3>
                <p className="text-sm text-stone-500">Outlet: {outlets.find(o => o.id === s.outletId)?.name || s.outletId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 max-w-2xl">
              <div className="p-3 bg-stone-50 rounded-xl">
                <p className="text-[10px] uppercase text-stone-400 font-bold">Total Sales</p>
                <p className="font-bold text-stone-900">${s.totalSales.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl">
                <p className="text-[10px] uppercase text-stone-400 font-bold">Cash</p>
                <p className="font-bold text-emerald-600">${s.cash.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl">
                <p className="text-[10px] uppercase text-stone-400 font-bold">Card</p>
                <p className="font-bold text-blue-600">${s.card.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl">
                <p className="text-[10px] uppercase text-stone-400 font-bold">Online</p>
                <p className="font-bold text-purple-600">${s.online.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                s.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                s.status === 'rejected' ? "bg-red-100 text-red-700" :
                "bg-stone-100 text-stone-600"
              }`}>
                {s.status}
              </span>
              <a href={s.imageUrl} target="_blank" rel="noreferrer" className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg">
                <Eye className="w-5 h-5" />
              </a>
              {s.status === 'pending' && (profile?.role === 'owner' || profile?.role === 'manager') && (
                <div className="flex gap-2">
                  <button onClick={() => handleReview(s.id, 'approved')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleReview(s.id, 'rejected')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-stone-900">New Daily Settlement</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${
                  isDragActive ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-400"
                }`}
              >
                <input {...getInputProps()} />
                {isUploading || isExtracting ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-stone-400 animate-spin mb-4" />
                    <p className="text-stone-600 font-medium">Processing settlement sheet...</p>
                  </div>
                ) : formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Settlement" className="max-h-48 mx-auto rounded-xl shadow-md" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-stone-300 mb-4" />
                    <p className="text-stone-600 font-medium">Upload Settlement Sheet Photo</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Outlet</label>
                  <select
                    required
                    value={formData.outletId}
                    onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  >
                    <option value="">Select Outlet</option>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Total Sales</label>
                  <input
                    type="number"
                    required
                    value={formData.totalSales}
                    onChange={(e) => setFormData({ ...formData, totalSales: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Cash</label>
                  <input
                    type="number"
                    value={formData.cash}
                    onChange={(e) => setFormData({ ...formData, cash: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Card</label>
                  <input
                    type="number"
                    value={formData.card}
                    onChange={(e) => setFormData({ ...formData, card: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Online</label>
                  <input
                    type="number"
                    value={formData.online}
                    onChange={(e) => setFormData({ ...formData, online: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading || isExtracting}
                className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                Submit Settlement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
