import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, setDoc, doc, serverTimestamp, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Outlet, UserRole, UserPermissions, Vendor } from '../types';
import { UserPlus, Shield, Store, CheckCircle2, XCircle, Truck, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  const initialFormState = {
    name: '',
    email: '',
    role: 'staff' as UserRole,
    outletIds: [] as string[],
    vendorId: '',
    permissions: {
      upload_bills: false,
      approve_bills: false,
      view_reports: false,
      manage_vendors: false,
      view_settlements: false,
    } as UserPermissions
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });
    const unsubOutlets = onSnapshot(collection(db, 'outlets'), (snap) => {
      setOutlets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Outlet)));
    });
    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snap) => {
      setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
    });
    return () => {
      unsubUsers();
      unsubOutlets();
      unsubVendors();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const userRef = doc(db, 'users', editingUser.uid);
        await updateDoc(userRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('User profile updated.');
      } else {
        const userRef = doc(collection(db, 'users'));
        await setDoc(userRef, {
          ...formData,
          createdAt: serverTimestamp()
        });
        toast.success('User profile created.');
      }
      
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      outletIds: user.outletIds || [],
      vendorId: user.vendorId || '',
      permissions: user.permissions || initialFormState.permissions
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData(initialFormState);
  };

  const toggleOutlet = (id: string) => {
    setFormData(prev => ({
      ...prev,
      outletIds: prev.outletIds.includes(id) 
        ? prev.outletIds.filter(oid => oid !== id)
        : [...prev.outletIds, id]
    }));
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">User Management</h1>
          <p className="text-stone-500">Create and edit profiles for team members and vendors.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User Profile
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Access</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Permissions</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-stone-900">{user.name}</p>
                    <p className="text-sm text-stone-500">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800 capitalize">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.role === 'vendor' ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] rounded-md font-bold">
                          <Truck className="w-3 h-3 mr-1" />
                          {vendors.find(v => v.id === user.vendorId)?.name || 'Unknown Vendor'}
                        </span>
                      ) : (
                        user.outletIds?.map(oid => {
                          const outlet = outlets.find(o => o.id === oid);
                          return (
                            <span key={oid} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-md font-bold">
                              {outlet?.name || oid}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {Object.entries(user.permissions || {}).map(([key, val]) => (
                        val && (
                          <div key={key} className="group relative">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                              {key.replace('_', ' ')}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-stone-100">
          {users.map((user) => (
            <div key={user.uid} className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-stone-900">{user.name}</p>
                  <p className="text-sm text-stone-500">{user.email}</p>
                </div>
                <button
                  onClick={() => handleEdit(user)}
                  className="p-2 text-stone-400 hover:text-stone-900 bg-stone-50 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800 capitalize">
                  {user.role}
                </span>
                <div className="flex flex-wrap gap-1">
                  {user.role === 'vendor' ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] rounded-md font-bold">
                      <Truck className="w-3 h-3 mr-1" />
                      {vendors.find(v => v.id === user.vendorId)?.name || 'Unknown Vendor'}
                    </span>
                  ) : (
                    user.outletIds?.map(oid => {
                      const outlet = outlets.find(o => o.id === oid);
                      return (
                        <span key={oid} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-md font-bold">
                          {outlet?.name || oid}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              {user.permissions && Object.values(user.permissions).some(v => v) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(user.permissions).map(([key, val]) => (
                    val && (
                      <span key={key} className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] rounded-md font-medium capitalize">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {key.replace('_', ' ')}
                      </span>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl my-8">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">
              {editingUser ? 'Edit User Profile' : 'Add New User Profile'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none ${
                      editingUser ? 'bg-stone-50 text-stone-500 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Role</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['owner', 'manager', 'staff', 'vendor'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r as UserRole })}
                      className={`py-3 rounded-xl border-2 transition-all capitalize font-bold text-sm ${
                        formData.role === r 
                          ? "border-stone-900 bg-stone-900 text-white" 
                          : "border-stone-100 text-stone-400 hover:border-stone-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {formData.role === 'vendor' ? (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Select Vendor</label>
                  <select
                    required
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  {formData.role === 'staff' && (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-3">Permissions</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.keys(formData.permissions).map((p) => (
                          <label key={p} className="flex items-center p-3 rounded-xl border border-stone-100 hover:bg-stone-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.permissions[p as keyof UserPermissions]}
                              onChange={() => togglePermission(p as keyof UserPermissions)}
                              className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                            />
                            <span className="ml-3 text-sm text-stone-700 capitalize">{p.replace('_', ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-3">Linked Outlets</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {outlets.map((o) => (
                        <label key={o.id} className="flex items-center p-3 rounded-xl border border-stone-100 hover:bg-stone-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.outletIds.includes(o.id)}
                            onChange={() => toggleOutlet(o.id)}
                            className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                          />
                          <span className="ml-3 text-sm text-stone-700">{o.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
                >
                  {editingUser ? 'Update Profile' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
