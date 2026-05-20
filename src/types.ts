export interface Member {
  id: string;
  bill_id?: string;
  name: string;
  tax_share: number;
}

export interface BillItem {
  id: string;
  bill_id?: string;
  item_name: string;
  price: number;
  assigned_to_member_id: string | null; // ID dari Member, null jika belum dialokasikan
}

export interface Bill {
  id: string;
  title: string;
  total_amount: number;
  total_tax: number;
  created_at?: string;
}
