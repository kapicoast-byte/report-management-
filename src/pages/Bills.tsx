import React, { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, query, where, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Bill, Vendor, Outlet, BillItem } from '../types';
import { useAuth } from '../lib/AuthContext';
import { useDropzone } from 'react-dropzone';
import { extractBillData } from '../lib/gemini';
import { useLocation } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  Upload, 
  Loader2, 
  Check, 
  X, 
  Eye, 
  CreditCard,
  Filter,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Bills() {
  const { profile } = useAuth();
  const location = useLocation();
  const state = location.state as { vendorId?: string; outletId?: string } | null;
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Bill>>({
    vendorId: '',
    outletId: '',
    invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    taxAmount: 0,
    currency: 'USD',
    items: [],
    status: 'pending'
  });

  useEffect(() => {
    if (state?.vendorId && state?.outletId) {
      setFormData(prev => ({ ...prev, vendorId: state.vendorId, outletId: state.outletId }));
      setIsModalOpen(true);
    }
  }, [state]);

  useEffect(() => {
    if (!profile) return;
    
    const isOwner = profile.role === 'owner';
    const hasOutlets = profile.outletIds && profile.outletIds.length > 0;

    let billsQuery;
    if (profile.role === 'vendor') {
      if (!profile.vendorId) {
        setBills([]);
        return;
      }
      billsQuery = query(collection(db, 'bills'), where('vendorId', '==', profile.vendorId));
    } else if (isOwner) {
      billsQuery = collection(db, 'bills');
    } else {
      if (!hasOutlets) {
        setBills([]);
        setVendors([]);
        setOutlets([]);
        return;
      }
      billsQuery = query(collection(db, 'bills'), where('outletId', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));
    }

    const unsubBills = onSnapshot(billsQuery, (snap) => {
      setBills(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill)));
    });

    let unsubVendors = () => {};
    let unsubOutlets = () => {};

    if (profile.role !== 'vendor') {
      const vendorsQuery = isOwner 
        ? collection(db, 'vendors')
        : query(collection(db, 'vendors'), where('outletId', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

      const outletsQuery = isOwner
        ? collection(db, 'outlets')
        : query(collection(db, 'outlets'), where('__name__', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

      unsubVendors = onSnapshot(vendorsQuery, (snap) => {
        setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
      });

      unsubOutlets = onSnapshot(outletsQuery, (snap) => {
        setOutlets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Outlet)));
      });
    } else if (profile.vendorId) {
      const unsubVendorInfo = onSnapshot(doc(db, 'vendors', profile.vendorId), (snap) => {
        if (snap.exists()) {
          const vData = { id: snap.id, ...snap.data() } as Vendor;
          setVendors([vData]);
          setFormData(prev => ({ ...prev, vendorId: profile.vendorId, outletId: vData.outletId }));
          
          // Also fetch the outlet for this vendor
          getDoc(doc(db, 'outlets', vData.outletId)).then(oSnap => {
            if (oSnap.exists()) {
              setOutlets([{ id: oSnap.id, ...oSnap.data() } as Outlet]);
            }
          });
        }
      });
      unsubVendors = unsubVendorInfo;
    }

    return () => {
      unsubBills();
      unsubVendors();
      unsubOutlets();
    };
  }, [profile]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setIsExtracting(true);
    
    try {
      // 1. Upload to Storage
      const storageRef = ref(storage, `bills/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      // 2. Convert to Base64 for Gemini
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const extracted = await extractBillData(base64);
          
          // Try to match vendor
          const matchedVendor = vendors.find(v => 
            v.name.toLowerCase().includes(extracted.vendorName?.toLowerCase() || '')
          );

          setFormData(prev => ({
            ...prev,
            vendorName: extracted.vendorName,
            vendorId: matchedVendor?.id || '',
            invoiceDate: extracted.invoiceDate || prev.invoiceDate,
            amount: extracted.totalAmount || extracted.subtotal || 0,
            taxAmount: extracted.taxAmount || 0,
            currency: extracted.currency || 'USD',
            items: extracted.items || [],
            imageUrl: url
          }));
          toast.success('Data extracted successfully. Please review.');
        } catch (err) {
          console.error(err);
          toast.error('Failed to extract data, but image uploaded.');
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
  }, [vendors]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] },
    multiple: false 
  } as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) return toast.error('Please upload a bill image');
    if (!formData.vendorId) return toast.error('Please select a vendor');
    if (!formData.outletId) return toast.error('Please select an outlet');

    try {
      const vendor = vendors.find(v => v.id === formData.vendorId);
      const outlet = outlets.find(o => o.id === formData.outletId);

      await addDoc(collection(db, 'bills'), {
        ...formData,
        vendorName: vendor?.name,
        outletName: outlet?.name,
        uploadedBy: profile?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success('Bill uploaded');
      setIsModalOpen(false);
      setFormData({
        vendorId: '',
        outletId: '',
        invoiceDate: format(new Date(), 'yyyy-MM-dd'),
        amount: 0,
        taxAmount: 0,
        currency: 'USD',
        items: [],
        status: 'pending'
      });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleStatusChange = async (billId: string, newStatus: Bill['status']) => {
    try {
      const updates: any = { status: newStatus, updatedAt: serverTimestamp() };
      if (newStatus === 'approved') updates.approvedBy = profile?.uid;
      if (newStatus === 'paid') updates.paidBy = profile?.uid;
      
      await updateDoc(doc(db, 'bills', billId), updates);
      toast.success(`Bill ${newStatus}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Bills</h1>
          <p className="text-stone-500">Digitize and manage your invoices.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload Bill
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex gap-4 overflow-x-auto no-scrollbar">
          <button className="whitespace-nowrap px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-xl">All Bills</button>
          <button className="whitespace-nowrap px-4 py-2 bg-stone-100 text-stone-600 text-sm font-medium rounded-xl hover:bg-stone-200">Pending</button>
          <button className="whitespace-nowrap px-4 py-2 bg-stone-100 text-stone-600 text-sm font-medium rounded-xl hover:bg-stone-200">Approved</button>
          <button className="whitespace-nowrap px-4 py-2 bg-stone-100 text-stone-600 text-sm font-medium rounded-xl hover:bg-stone-200">Paid</button>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-stone-900">{bill.vendorName}</p>
                    <p className="text-xs text-stone-500">{bill.outletName}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-600">{bill.invoiceDate}</td>
                  <td className="px-6 py-4 font-bold text-stone-900">${bill.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      bill.status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                      bill.status === 'approved' ? "bg-blue-100 text-blue-700" :
                      "bg-orange-100 text-orange-700"
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <a href={bill.imageUrl} target="_blank" rel="noreferrer" className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </a>
                      {bill.status === 'pending' && profile?.permissions?.approve_bills && (
                        <button onClick={() => handleStatusChange(bill.id, 'approved')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {bill.status === 'approved' && (
                        <button onClick={() => handleStatusChange(bill.id, 'paid')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-stone-100">
          {bills.map((bill) => (
            <div key={bill.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-stone-900">{bill.vendorName}</p>
                  <p className="text-xs text-stone-500">{bill.outletName}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  bill.status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                  bill.status === 'approved' ? "bg-blue-100 text-blue-700" :
                  "bg-orange-100 text-orange-700"
                }`}>
                  {bill.status}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm text-stone-600">{bill.invoiceDate}</p>
                <p className="font-bold text-stone-900">${bill.amount.toLocaleString()}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <a href={bill.imageUrl} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2 bg-stone-50 text-stone-600 text-xs font-bold rounded-lg">
                  <Eye className="w-4 h-4" />
                  View
                </a>
                {bill.status === 'pending' && profile?.permissions?.approve_bills && (
                  <button onClick={() => handleStatusChange(bill.id, 'approved')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                )}
                {bill.status === 'approved' && (
                  <button onClick={() => handleStatusChange(bill.id, 'paid')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">
                    <CreditCard className="w-4 h-4" />
                    Pay
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl p-4 md:p-8 shadow-2xl my-4 md:my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-stone-900">Upload New Bill</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Upload Section */}
              <div className="space-y-6">
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center transition-all cursor-pointer ${
                    isDragActive ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-stone-400 animate-spin mb-4" />
                      <p className="text-stone-600 font-medium text-sm md:text-base">Uploading image...</p>
                    </div>
                  ) : isExtracting ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-stone-400 animate-spin mb-4" />
                      <p className="text-stone-600 font-medium text-sm md:text-base">Gemini is extracting data...</p>
                    </div>
                  ) : formData.imageUrl ? (
                    <div className="relative group">
                      <img src={formData.imageUrl} alt="Bill" className="max-h-48 md:max-h-64 mx-auto rounded-xl shadow-md" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                        <p className="text-white font-bold text-sm">Replace Image</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-10 h-10 md:w-12 md:h-12 text-stone-300 mb-4" />
                      <p className="text-stone-600 font-medium text-sm md:text-base">Drag & drop bill photo, or click to select</p>
                      <p className="text-stone-400 text-xs mt-1">Supports JPG, PNG</p>
                    </div>
                  )}
                </div>

                {formData.items && formData.items.length > 0 && (
                  <div className="bg-stone-50 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-stone-900 mb-3 uppercase tracking-wider">Extracted Items</h3>
                    <div className="space-y-2">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-stone-600">{item.qty}x {item.description}</span>
                          <span className="font-medium text-stone-900">${item.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Section */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">Outlet</label>
                    <select
                      required
                      value={formData.outletId}
                      onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none text-sm"
                    >
                      <option value="">Select Outlet</option>
                      {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">Vendor</label>
                    <select
                      required
                      value={formData.vendorId}
                      onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none text-sm"
                    >
                      <option value="">Select Vendor</option>
                      {vendors.filter(v => v.outletId === formData.outletId).map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">Invoice Date</label>
                    <input
                      type="date"
                      required
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">Currency</label>
                    <input
                      type="text"
                      required
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Tax Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxAmount}
                      onChange={(e) => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Total Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none font-bold text-lg"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isUploading || isExtracting}
                    className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-colors disabled:opacity-50"
                  >
                    Confirm & Save Bill
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
