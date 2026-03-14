import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Bill, Settlement, Outlet } from '../types';
import { FileText, Calculator, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [unpaidBills, setUnpaidBills] = useState<Bill[]>([]);
  const [pendingSettlements, setPendingSettlements] = useState<Settlement[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [todaySales, setTodaySales] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const isOwner = profile.role === 'owner';
    const hasOutlets = profile.outletIds && profile.outletIds.length > 0;

    if (!isOwner && !hasOutlets) {
      setUnpaidBills([]);
      setPendingSettlements([]);
      setOutlets([]);
      setTodaySales(0);
      return;
    }

    const billsQuery = isOwner
      ? query(collection(db, 'bills'), where('status', 'in', ['pending', 'approved']))
      : query(collection(db, 'bills'), where('status', 'in', ['pending', 'approved']), where('outletId', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const settlementsQuery = isOwner
      ? query(collection(db, 'settlements'), where('status', '==', 'pending'))
      : query(collection(db, 'settlements'), where('status', '==', 'pending'), where('outletId', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const outletsQuery = isOwner
      ? collection(db, 'outlets')
      : query(collection(db, 'outlets'), where('__name__', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const unsubBills = onSnapshot(billsQuery, (snap) => {
      setUnpaidBills(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill)));
    });

    const unsubSettlements = onSnapshot(settlementsQuery, (snap) => {
      setPendingSettlements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement)));
    });

    const unsubOutlets = onSnapshot(outletsQuery, (snap) => {
      setOutlets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Outlet)));
    });

    // Today's sales from approved settlements
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySalesQuery = isOwner
      ? query(collection(db, 'settlements'), where('date', '==', today), where('status', '==', 'approved'))
      : query(collection(db, 'settlements'), where('date', '==', today), where('status', '==', 'approved'), where('outletId', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const unsubSales = onSnapshot(todaySalesQuery, (snap) => {
      const total = snap.docs.reduce((acc, doc) => acc + (doc.data().totalSales || 0), 0);
      setTodaySales(total);
    });

    return () => {
      unsubBills();
      unsubSettlements();
      unsubOutlets();
      unsubSales();
    };
  }, [profile]);

  const stats = [
    { 
      label: 'Unpaid Bills', 
      value: unpaidBills.length, 
      amount: unpaidBills.reduce((acc, b) => acc + b.amount, 0),
      icon: FileText, 
      color: 'text-orange-600', 
      bg: 'bg-orange-100' 
    },
    { 
      label: 'Pending Settlements', 
      value: pendingSettlements.length, 
      icon: Calculator, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100' 
    },
    { 
      label: "Today's Sales", 
      value: `$${todaySales.toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-100' 
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">Welcome back, {profile?.name}</h1>
          <p className="text-sm md:text-base text-stone-500">Here's what's happening across your outlets today.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link 
            to="/bills" 
            className="flex items-center justify-center px-4 py-2.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-sm font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Bill
          </Link>
          <Link 
            to="/settlements" 
            className="flex items-center justify-center px-4 py-2.5 bg-white border border-stone-200 text-stone-900 rounded-xl hover:bg-stone-50 transition-colors text-sm font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Settlement
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 md:p-3 rounded-2xl", stat.bg)}>
                <stat.icon className={cn("w-5 h-5 md:w-6 md:h-6", stat.color)} />
              </div>
            </div>
            <p className="text-xs md:text-sm font-medium text-stone-500">{stat.label}</p>
            <h3 className="text-xl md:text-2xl font-bold text-stone-900 mt-1">{stat.value}</h3>
            {stat.amount !== undefined && (
              <p className="text-[10px] md:text-sm text-stone-400 mt-1">Total: ${stat.amount.toLocaleString()}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Unpaid Bills List */}
        <section className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="p-5 md:p-6 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-bold text-stone-900 text-sm md:text-base">Recent Unpaid Bills</h2>
            <Link to="/bills" className="text-xs md:text-sm text-stone-500 hover:text-stone-900 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-stone-100">
            {unpaidBills.length === 0 ? (
              <div className="p-10 md:p-12 text-center text-stone-400">
                <FileText className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No unpaid bills found.</p>
              </div>
            ) : (
              unpaidBills.slice(0, 5).map((bill) => (
                <div key={bill.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="font-bold text-stone-900 truncate text-sm md:text-base">{bill.vendorName}</p>
                    <p className="text-[10px] md:text-xs text-stone-500 truncate">{bill.outletName} • {bill.invoiceDate}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-stone-900 text-sm md:text-base">${bill.amount.toLocaleString()}</p>
                    <span className={cn(
                      "text-[9px] md:text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full",
                      bill.status === 'approved' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {bill.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Pending Settlements */}
        <section className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="p-5 md:p-6 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-bold text-stone-900 text-sm md:text-base">Pending Settlements</h2>
            <Link to="/settlements" className="text-xs md:text-sm text-stone-500 hover:text-stone-900 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-stone-100">
            {pendingSettlements.length === 0 ? (
              <div className="p-10 md:p-12 text-center text-stone-400">
                <Calculator className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No pending settlements.</p>
              </div>
            ) : (
              pendingSettlements.slice(0, 5).map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="font-bold text-stone-900 truncate text-sm md:text-base">{format(new Date(s.date), 'MMMM d, yyyy')}</p>
                    <p className="text-[10px] md:text-xs text-stone-500 truncate">Outlet: {outlets.find(o => o.id === s.outletId)?.name || s.outletId}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-stone-900 text-sm md:text-base">${s.totalSales.toLocaleString()}</p>
                    <span className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      Pending
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
