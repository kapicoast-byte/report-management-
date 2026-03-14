import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Bill, Settlement, Vendor, Outlet } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { Download, Filter } from 'lucide-react';

export default function Reports() {
  const { profile } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (!profile) return;

    const isOwner = profile.role === 'owner';
    const hasOutlets = profile.outletIds && profile.outletIds.length > 0;

    if (!isOwner && !hasOutlets) {
      setBills([]);
      setSettlements([]);
      setVendors([]);
      setOutlets([]);
      return;
    }

    const billsQuery = isOwner
      ? collection(db, 'bills')
      : query(collection(db, 'bills'), where('outletId', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const settlementsQuery = isOwner
      ? collection(db, 'settlements')
      : query(collection(db, 'settlements'), where('outletId', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const vendorsQuery = isOwner
      ? collection(db, 'vendors')
      : query(collection(db, 'vendors'), where('outletId', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const outletsQuery = isOwner
      ? collection(db, 'outlets')
      : query(collection(db, 'outlets'), where('__name__', 'in', profile.outletIds && profile.outletIds.length > 0 ? profile.outletIds : ['_']));

    const unsubBills = onSnapshot(billsQuery, (snap) => setBills(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill))));
    const unsubSettlements = onSnapshot(settlementsQuery, (snap) => setSettlements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement))));
    const unsubVendors = onSnapshot(vendorsQuery, (snap) => setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor))));
    const unsubOutlets = onSnapshot(outletsQuery, (snap) => setOutlets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Outlet))));

    return () => {
      unsubBills();
      unsubSettlements();
      unsubVendors();
      unsubOutlets();
    };
  }, [profile]);

  // Filtered data based on date range
  const filteredBills = bills.filter(b => 
    b.invoiceDate >= dateRange.start && b.invoiceDate <= dateRange.end
  );

  const filteredSettlements = settlements.filter(s => 
    s.date >= dateRange.start && s.date <= dateRange.end
  );

  // Spend per Vendor
  const spendByVendor = vendors.map(v => ({
    name: v.name,
    amount: filteredBills
      .filter(b => b.vendorId === v.id)
      .reduce((acc, b) => acc + b.amount, 0)
  })).filter(v => v.amount > 0).sort((a, b) => b.amount - a.amount);

  // Sales vs Expenses
  const totalSales = filteredSettlements.reduce((acc, s) => acc + s.totalSales, 0);
  const totalExpenses = filteredBills.reduce((acc, b) => acc + b.amount, 0);

  const salesVsExpenses = [
    { name: 'Sales', value: totalSales },
    { name: 'Expenses', value: totalExpenses }
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm md:text-base text-stone-500">Insights into your business performance.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white p-3 md:p-2 rounded-2xl shadow-sm border border-stone-100">
          <div className="flex items-center px-3 py-1 text-xs md:text-sm text-stone-600 font-bold uppercase tracking-wider">
            <Filter className="w-4 h-4 mr-2" />
            Range:
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="flex-1 sm:flex-none text-sm font-medium text-stone-900 outline-none bg-stone-50 px-2 py-1 rounded-lg"
            />
            <span className="text-stone-300">to</span>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="flex-1 sm:flex-none text-sm font-medium text-stone-900 outline-none bg-stone-50 px-2 py-1 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-stone-100">
          <p className="text-xs md:text-sm text-stone-500 font-bold uppercase tracking-wider">Total Sales</p>
          <h3 className="text-xl md:text-2xl font-bold text-stone-900 mt-1">${totalSales.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-stone-100">
          <p className="text-xs md:text-sm text-stone-500 font-bold uppercase tracking-wider">Total Expenses</p>
          <h3 className="text-xl md:text-2xl font-bold text-stone-900 mt-1">${totalExpenses.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-stone-100">
          <p className="text-xs md:text-sm text-stone-500 font-bold uppercase tracking-wider">Net Profit</p>
          <h3 className={`text-xl md:text-2xl font-bold mt-1 ${totalSales - totalExpenses >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ${(totalSales - totalExpenses).toLocaleString()}
          </h3>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-stone-100">
          <p className="text-xs md:text-sm text-stone-500 font-bold uppercase tracking-wider">Unpaid Bills</p>
          <h3 className="text-xl md:text-2xl font-bold text-orange-600 mt-1">
            ${filteredBills.filter(b => b.status !== 'paid').reduce((acc, b) => acc + b.amount, 0).toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Spend by Vendor Chart */}
        <section className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-stone-100">
          <h2 className="text-lg md:text-xl font-bold text-stone-900 mb-6 md:mb-8">Spend by Vendor</h2>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendByVendor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip 
                  cursor={{ fill: '#f5f5f4' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#1c1917" radius={[0, 8, 8, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Sales vs Expenses Pie */}
        <section className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-stone-100">
          <h2 className="text-lg md:text-xl font-bold text-stone-900 mb-6 md:mb-8">Sales vs Expenses</h2>
          <div className="h-64 md:h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesVsExpenses}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {salesVsExpenses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 md:gap-8 mt-4">
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2" />
              <span className="text-xs md:text-sm text-stone-600 font-medium">Sales</span>
            </div>
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2" />
              <span className="text-xs md:text-sm text-stone-600 font-medium">Expenses</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
