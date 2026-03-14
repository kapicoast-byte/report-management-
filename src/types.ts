export type UserRole = 'owner' | 'manager' | 'staff' | 'vendor';

export interface UserPermissions {
  upload_bills?: boolean;
  approve_bills?: boolean;
  view_reports?: boolean;
  manage_vendors?: boolean;
  view_settlements?: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  outletIds: string[];
  vendorId?: string; // Linked vendor ID for vendor role
  permissions: UserPermissions;
  createdAt: any;
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
  country: string;
  currency: string;
  createdAt: any;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  outletId: string;
  createdAt: any;
}

export interface BillItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Bill {
  id: string;
  vendorId: string;
  vendorName: string;
  outletId: string;
  outletName: string;
  invoiceDate: string;
  amount: number;
  taxAmount: number;
  currency: string;
  items: BillItem[];
  imageUrl: string;
  paymentProofUrl?: string;
  status: 'pending' | 'approved' | 'paid';
  uploadedBy: string;
  approvedBy?: string;
  paidBy?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Settlement {
  id: string;
  outletId: string;
  date: string;
  imageUrl: string;
  totalSales: number;
  cash: number;
  card: number;
  online: number;
  status: 'pending' | 'approved' | 'rejected';
  uploadedBy: string;
  reviewedBy?: string;
  comments?: string;
  createdAt: any;
}
