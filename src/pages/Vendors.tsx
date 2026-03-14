import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vendor, Outlet, Bill } from '../types';
import { Plus, Truck, Store, Tag, FileText, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Vendors() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorBills, setVendorBills] = useState<Bill[]>([]);
  const [isBillsModalOpen, setIsBillsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    outletId: ''
  });

  useEffect(() => {
    if (!profile) return;

    const isOwner = profile.role === 'owner';
    const hasOutlets = profile.outletIds && profile.outletIds.length > 0;

    if (!isOwner && !hasOutlets) {
      setVendors([]);
      setOutlets([]);
      return;
    }
    
    const vendorsQuery = isOwner 
      ? collection(db, 'vendors')
      : query(collection(db, 'vendors'), where('outletId', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const outletsQuery = isOwner
      ? collection(db, 'outlets')
      : query(collection(db, 'outlets'), where('__name__', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const unsubVendors = onSnapshot(vendorsQuery, (snap) => {
      setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
    });

    const unsubOutlets = onSnapshot(outletsQuery, (snap) => {
      setOutlets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Outlet)));
    });

    return () => {
      unsubVendors();
      unsubOutlets();
    };
  }, [profile]);

  useEffect(() => {
    if (!selectedVendor || !isBillsModalOpen) return;

    const unsubBills = onSnapshot(
      query(collection(db, 'bills'), where('vendorId', '==', selectedVendor.id)),
      (snap) => {
        setVendorBills(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill)));
      }
    );

    return () => unsubBills();
  }, [selectedVendor, isBillsModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'vendors'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      toast.success('Vendor added');
      setIsModalOpen(false);
      setFormData({ name: '', category: '', outletId: '' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleViewBills = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsBillsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Vendors</h1>
          <p className="text-stone-500">Manage suppliers and their invoices.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => {
          const outlet = outlets.find(o => o.id === vendor.outletId);
          return (
            <div key={vendor.id} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-stone-100 rounded-2xl">
                  <Truck className="w-6 h-6 text-stone-600" />
                </div>
                <button
                  onClick={() => handleViewBills(vendor)}
                  className="text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1"
                >
                  <FileText className="w-4 h-4" />
                  View Bills
                </button>
              </div>
              <h3 className="text-xl font-bold text-stone-900">{vendor.name}</h3>
              
              <div className="mt-4 space-y-2 flex-1">
                <div className="flex items-center text-sm text-stone-500">
                  <Tag className="w-4 h-4 mr-2" />
                  {vendor.category}
                </div>
                <div className="flex items-center text-sm text-stone-500">
                  <Store className="w-4 h-4 mr-2" />
                  {outlet?.name || 'Unknown Outlet'}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-stone-50">
                <button
                  onClick={() => navigate('/bills', { state: { vendorId: vendor.id, outletId: vendor.outletId } })}
                  className="w-full py-2 text-sm font-bold text-stone-600 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Upload Bill
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">Add New Vendor</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Vendor Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vegetables, Meat, Packaging"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Outlet</label>
                <select
                  required
                  value={formData.outletId}
                  onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                >
                  <option value="">Select an outlet</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
                >
                  Add Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBillsModalOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-4xl rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Bills for {selectedVendor.name}</h2>
                <p className="text-sm text-stone-500">Total {vendorBills.length} invoices found.</p>
              </div>
              <button onClick={() => setIsBillsModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-stone-50 rounded-2xl overflow-hidden border border-stone-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-200">
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {vendorBills.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-stone-400">
                        No bills found for this vendor.
                      </td>
                    </tr>
                  ) : (
                    vendorBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-white transition-colors">
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
                        <td className="px-6 py-4 text-right">
                          <a href={bill.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
