import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Outlet } from '../types';
import { Plus, Edit2, Trash2, MapPin, Globe, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Outlets() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    country: '',
    currency: 'USD'
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'outlets'), (snap) => {
      setOutlets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Outlet)));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOutlet) {
        await updateDoc(doc(db, 'outlets', editingOutlet.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('Outlet updated');
      } else {
        await addDoc(collection(db, 'outlets'), {
          ...formData,
          createdAt: serverTimestamp()
        });
        toast.success('Outlet created');
      }
      setIsModalOpen(false);
      setEditingOutlet(null);
      setFormData({ name: '', address: '', country: '', currency: 'USD' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this outlet?')) {
      try {
        await deleteDoc(doc(db, 'outlets', id));
        toast.success('Outlet deleted');
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Outlets</h1>
          <p className="text-stone-500">Manage your business locations.</p>
        </div>
        <button
          onClick={() => {
            setEditingOutlet(null);
            setFormData({ name: '', address: '', country: '', currency: 'USD' });
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Outlet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {outlets.map((outlet) => (
          <div key={outlet.id} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-stone-100 rounded-2xl">
                <MapPin className="w-6 h-6 text-stone-600" />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingOutlet(outlet);
                    setFormData({
                      name: outlet.name,
                      address: outlet.address,
                      country: outlet.country,
                      currency: outlet.currency
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(outlet.id)}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-xl font-bold text-stone-900">{outlet.name}</h3>
            <p className="text-stone-500 text-sm mt-1">{outlet.address}</p>
            
            <div className="mt-6 pt-6 border-t border-stone-50 flex items-center justify-between text-sm text-stone-400">
              <div className="flex items-center">
                <Globe className="w-4 h-4 mr-1" />
                {outlet.country}
              </div>
              <div className="flex items-center font-medium text-stone-900">
                <DollarSign className="w-4 h-4 mr-1" />
                {outlet.currency}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">
              {editingOutlet ? 'Edit Outlet' : 'Add New Outlet'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Outlet Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
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
                  {editingOutlet ? 'Save Changes' : 'Create Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
