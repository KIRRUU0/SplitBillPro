import { useState, useEffect } from 'react';
import { 
  Plus, 
  Save, 
  Database, 
  Trash2, 
  Info, 
  Sparkles, 
  FolderOpen, 
  AlertTriangle,
  CheckCircle,
  FileText
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Member, BillItem, Bill } from './types';
import { MemberManager } from './components/MemberManager';
import { ItemManager } from './components/ItemManager';
import { ReceiptScanner } from './components/ReceiptScanner';
import { PaymentSummary } from './components/PaymentSummary';
import { formatRupiah, calculateTaxShare, formatInputRupiah, parseRupiahToNumber } from './utils/mathUtils';

// Helper UUID Generator aman
const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function App() {
  // Database Configuration Status
  const [dbConnected, setDbConnected] = useState<boolean>(false);

  // States Utama Tagihan Aktif
  const [billId, setBillId] = useState<string>('');
  const [billTitle, setBillTitle] = useState<string>('Tagihan Baru');
  const [taxInputType, setTaxInputType] = useState<'nominal' | 'percentage'>('nominal');
  const [taxInputValue, setTaxInputValue] = useState<number>(0);
  const [totalTax, setTotalTax] = useState<number>(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<BillItem[]>([]);

  // States Management Data & UI
  const [savedBills, setSavedBills] = useState<Bill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Cek koneksi Supabase saat inisialisasi
  useEffect(() => {
    const configured = isSupabaseConfigured();
    setDbConnected(configured);
    
    // Inisialisasi tagihan baru saat start
    initNewBill();
    
    // Load daftar tagihan tersimpan
    loadSavedBills(configured);
  }, []);

  // Update totalTax jika taxInputValue atau item price berubah
  useEffect(() => {
    const subtotal = items.reduce((acc, curr) => acc + curr.price, 0);
    if (taxInputType === 'percentage') {
      const calculatedTax = (taxInputValue * subtotal) / 100;
      setTotalTax(Math.round(calculatedTax * 100) / 100);
    } else {
      setTotalTax(taxInputValue);
    }
  }, [taxInputType, taxInputValue, items]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
  };

  // Inisialisasi State Tagihan Baru
  const initNewBill = () => {
    const newId = generateUUID();
    setBillId(newId);
    setBillTitle('Tagihan Baru');
    setTaxInputValue(0);
    setTotalTax(0);
    setMembers([]);
    setItems([]);
    setSelectedBillId('');
  };

  // Load Daftar Tagihan
  const loadSavedBills = async (supabaseActive: boolean = dbConnected) => {
    setIsLoading(true);
    if (supabaseActive) {
      try {
        const { data, error } = await supabase
          .from('bills')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSavedBills(data || []);
      } catch (err) {
        console.error('Error fetching bills from Supabase:', err);
        showToast('Gagal memuat tagihan dari database. Menggunakan data lokal.', 'warning');
        loadBillsFromLocalStorage();
      }
    } else {
      loadBillsFromLocalStorage();
    }
    setIsLoading(false);
  };

  // Fallback Local Storage
  const loadBillsFromLocalStorage = () => {
    const local = localStorage.getItem('splitbill_pro_bills');
    if (local) {
      try {
        setSavedBills(JSON.parse(local));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Load Detail Tagihan Terpilih
  const handleLoadBillDetails = async (id: string) => {
    if (!id) return;
    setIsLoading(true);
    
    // Cari metadata tagihan
    const billMeta = savedBills.find(b => b.id === id);
    if (!billMeta) {
      showToast('Data tagihan tidak ditemukan.', 'error');
      setIsLoading(false);
      return;
    }

    if (dbConnected) {
      try {
        // Fetch members
        const { data: membersData, error: memError } = await supabase
          .from('members')
          .select('*')
          .eq('bill_id', id);

        if (memError) throw memError;

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from('bill_items')
          .select('*')
          .eq('bill_id', id);

        if (itemsError) throw itemsError;

        // Set States
        setBillId(id);
        setBillTitle(billMeta.title);
        setTaxInputType('nominal');
        setTaxInputValue(Number(billMeta.total_tax));
        setTotalTax(Number(billMeta.total_tax));
        setMembers(membersData || []);
        setItems(itemsData || []);
        setSelectedBillId(id);
        showToast(`Tagihan "${billMeta.title}" berhasil dimuat.`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Gagal memuat detail tagihan dari Supabase.', 'error');
      }
    } else {
      // Load dari LocalStorage detail
      const detailsLocal = localStorage.getItem(`splitbill_pro_details_${id}`);
      if (detailsLocal) {
        try {
          const details = JSON.parse(detailsLocal);
          setBillId(id);
          setBillTitle(billMeta.title);
          setTaxInputType('nominal');
          setTaxInputValue(billMeta.total_tax);
          setTotalTax(billMeta.total_tax);
          setMembers(details.members || []);
          setItems(details.items || []);
          setSelectedBillId(id);
          showToast(`Tagihan "${billMeta.title}" dimuat dari penyimpanan lokal.`, 'success');
        } catch (e) {
          console.error(e);
          showToast('Gagal mengurai detail tagihan lokal.', 'error');
        }
      } else {
        showToast('Detail tagihan lokal tidak ditemukan.', 'error');
      }
    }
    setIsLoading(false);
  };

  // Simpan / Sinkronisasi Tagihan
  const handleSaveBill = async () => {
    if (!billTitle.trim()) {
      showToast('Judul tagihan tidak boleh kosong.', 'error');
      return;
    }

    const subtotal = items.reduce((acc, curr) => acc + curr.price, 0);
    const grandTotal = subtotal + totalTax;

    setIsSaving(true);

    if (dbConnected) {
      try {
        // 1. Simpan/Upsert Bill Utama
        const { error: billError } = await supabase
          .from('bills')
          .upsert({
            id: billId,
            title: billTitle,
            total_amount: grandTotal,
            total_tax: totalTax
          });

        if (billError) throw billError;

        // 2. Untuk mempermudah, hapus item & member lama pada tagihan ini
        // (Cascading delete akan otomatis menghapus ketergantungan jika diatur di DB)
        // Hapus manual untuk memastikan integritas
        await supabase.from('bill_items').delete().eq('bill_id', billId);
        await supabase.from('members').delete().eq('bill_id', billId);

        // 3. Masukkan Members baru
        const taxShare = calculateTaxShare(totalTax, members.length);
        if (members.length > 0) {
          const membersToInsert = members.map(m => ({
            id: m.id,
            bill_id: billId,
            name: m.name,
            tax_share: taxShare
          }));
          const { error: memError } = await supabase.from('members').insert(membersToInsert);
          if (memError) throw memError;
        }

        // 4. Masukkan Items baru
        if (items.length > 0) {
          const itemsToInsert = items.map(item => ({
            id: item.id,
            bill_id: billId,
            item_name: item.item_name,
            price: item.price,
            assigned_to_member_id: item.assigned_to_member_id
          }));
          const { error: itemError } = await supabase.from('bill_items').insert(itemsToInsert);
          if (itemError) throw itemError;
        }

        showToast('Tagihan berhasil disimpan ke Supabase Database!', 'success');
        setSelectedBillId(billId);
        loadSavedBills(true);
      } catch (err: any) {
        console.error('Error saving to Supabase:', err);
        showToast(`Gagal menyimpan ke database: ${err.message || err}`, 'error');
      } finally {
        setIsSaving(false);
      }
    } else {
      // Simpan di LocalStorage
      const newBillMeta: Bill = {
        id: billId,
        title: billTitle,
        total_amount: grandTotal,
        total_tax: totalTax,
        created_at: new Date().toISOString()
      };

      const updatedBills = [...savedBills.filter(b => b.id !== billId), newBillMeta];
      localStorage.setItem('splitbill_pro_bills', JSON.stringify(updatedBills));
      localStorage.setItem(
        `splitbill_pro_details_${billId}`, 
        JSON.stringify({ members, items })
      );

      setSavedBills(updatedBills);
      setSelectedBillId(billId);
      showToast('Tagihan disimpan secara lokal di browser ini.', 'success');
      setIsSaving(false);
    }
  };

  // Hapus Tagihan
  const handleDeleteBill = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Mencegah load bill detail saat klik hapus
    
    if (!window.confirm('Apakah Anda yakin ingin menghapus tagihan ini?')) return;

    setIsLoading(true);
    if (dbConnected) {
      try {
        const { error } = await supabase
          .from('bills')
          .delete()
          .eq('id', id);

        if (error) throw error;
        showToast('Tagihan berhasil dihapus dari database.', 'success');
        if (billId === id) initNewBill();
        loadSavedBills(true);
      } catch (err) {
        console.error(err);
        showToast('Gagal menghapus tagihan dari database.', 'error');
      }
    } else {
      // Hapus dari local storage
      const updated = savedBills.filter(b => b.id !== id);
      localStorage.setItem('splitbill_pro_bills', JSON.stringify(updated));
      localStorage.removeItem(`splitbill_pro_details_${id}`);
      setSavedBills(updated);
      showToast('Tagihan lokal berhasil dihapus.', 'success');
      if (billId === id) initNewBill();
    }
    setIsLoading(false);
  };

  // State Mutators: Members
  const handleAddMember = (name: string) => {
    const newMember: Member = {
      id: generateUUID(),
      bill_id: billId,
      name,
      tax_share: 0
    };
    setMembers(prev => [...prev, newMember]);
  };

  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    // Reset alokasi item jika member ini dihapus
    setItems(prev => prev.map(item => 
      item.assigned_to_member_id === id 
        ? { ...item, assigned_to_member_id: null } 
        : item
    ));
  };

  // State Mutators: Items
  const handleAddItem = (name: string, price: number) => {
    const newItem: BillItem = {
      id: generateUUID(),
      bill_id: billId,
      item_name: name,
      price,
      assigned_to_member_id: null
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAssignItem = (itemId: string, memberId: string | null) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, assigned_to_member_id: memberId } 
        : item
    ));
  };

  // Menerima item hasil pemindaian OCR
  const handleItemsScanned = (scannedItems: { item_name: string; price: number }[], detectedTax?: number) => {
    const newItems: BillItem[] = scannedItems.map(item => ({
      id: generateUUID(),
      bill_id: billId,
      item_name: item.item_name,
      price: item.price,
      assigned_to_member_id: null
    }));
    setItems(prev => [...prev, ...newItems]);
    
    if (detectedTax && detectedTax > 0) {
      setTaxInputValue(detectedTax);
      setTaxInputType('nominal');
      showToast(`Berhasil menambahkan ${scannedItems.length} item dan mendeteksi Pajak/PB1 senilai Rp ${detectedTax.toLocaleString('id-ID')}.`, 'success');
    } else {
      showToast(`Berhasil menambahkan ${scannedItems.length} item dari struk.`, 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce max-w-sm">
          <div className={`p-4 rounded-xl shadow-2xl flex items-start gap-3 border backdrop-blur-md ${
            toast.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300' 
              : toast.type === 'error'
              ? 'bg-red-950/80 border-red-500/30 text-red-300'
              : 'bg-amber-950/80 border-amber-500/30 text-amber-300'
          }`}>
            <Info size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Main Header / Glassmorphism Navbar */}
      <header className="no-print sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 py-4 px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400 m-0 leading-none">
              SplitBill Pro
            </h1>
            <p className="text-[10px] text-slate-400 mt-1">Pembagian Tagihan Cerdas & Presisi Dengan OCR</p>
          </div>
        </div>

        {/* Database Status Indicator */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
            dbConnected 
              ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400' 
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            <Database size={13} />
            <span>{dbConnected ? 'Database Supabase Terhubung' : 'Penyimpanan Lokal Aktif'}</span>
          </div>

          <button 
            onClick={initNewBill}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all"
            title="Buat Tagihan Baru"
          >
            <Plus size={16} />
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Panel Kiri: Saved Bills List (1/4 Width) */}
        <section className="no-print lg:col-span-1 bg-slate-900/40 rounded-2xl p-5 border border-slate-800/80 self-start">
          <div className="flex items-center space-x-2.5 mb-4 pb-2 border-b border-slate-800/60">
            <FolderOpen className="text-indigo-400" size={18} />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Tagihan Tersimpan ({savedBills.length})</h2>
          </div>

          {/* List Saved Bills */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-400" />
                <span className="text-xs">Memuat data...</span>
              </div>
            ) : savedBills.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-center border border-dashed border-slate-800 rounded-xl p-4">
                <FileText size={20} className="mb-1.5 opacity-30" />
                <span className="text-[11px]">Belum ada tagihan disimpan. Mulai buat tagihan baru!</span>
              </div>
            ) : (
              savedBills.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleLoadBillDetails(b.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedBillId === b.id 
                      ? 'bg-indigo-950/40 border-indigo-500/40 text-slate-200' 
                      : 'bg-slate-950/30 border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-grow pr-2">
                    <h3 className="font-semibold text-xs truncate">{b.title}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {formatRupiah(b.total_amount)}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => handleDeleteBill(b.id, e)}
                    className="p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Mode Warning Alert */}
          {!dbConnected && (
            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 text-amber-400/90 rounded-xl flex items-start gap-2.5 text-[10px] leading-relaxed">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Mode Sandbox Lokal</strong>
                Data disimpan di browser Anda. Hubungkan Supabase di file `.env.local` untuk menyimpan online.
              </div>
            </div>
          )}
        </section>

        {/* Panel Kanan: Bill Form & Calculators (3/4 Width) */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Header Konfigurasi Bill Aktif */}
          <div className="no-print bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Judul Tagihan */}
              <div className="flex-grow">
                <input 
                  type="text" 
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder="Masukkan Judul Tagihan (cth: Makan Malam Ultah)"
                  className="bg-transparent border-b border-transparent hover:border-slate-800 focus:border-indigo-500 text-lg md:text-xl font-bold text-slate-100 placeholder-slate-600 focus:outline-none py-1 w-full transition-all"
                />
              </div>

              {/* Tombol Simpan */}
              <button 
                onClick={handleSaveBill}
                disabled={isSaving}
                className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isSaving ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save size={16} />
                )}
                <span>Simpan Tagihan</span>
              </button>
            </div>

            {/* Input Pajak / Service Charge */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/50">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pajak / Service Charge (Bagi Rata)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTaxInputType('nominal');
                      setTaxInputValue(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      taxInputType === 'nominal'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    Nominal (Rp)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTaxInputType('percentage');
                      setTaxInputValue(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      taxInputType === 'percentage'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    Persentase (%)
                  </button>
                </div>
              </div>

              <div className="relative flex items-end">
                {taxInputType === 'nominal' ? (
                  <>
                    <span className="absolute left-3.5 bottom-3 text-slate-400 text-sm font-semibold">Rp</span>
                    <input 
                      type="text" 
                      value={taxInputValue ? formatInputRupiah(taxInputValue) : ''}
                      onChange={(e) => setTaxInputValue(parseRupiahToNumber(e.target.value))}
                      placeholder="0"
                      className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none transition-colors"
                    />
                  </>
                ) : (
                  <>
                    <input 
                      type="number" 
                      value={taxInputValue || ''}
                      onChange={(e) => setTaxInputValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none transition-colors"
                    />
                    <span className="absolute right-3.5 bottom-3 text-slate-400 text-sm font-semibold">%</span>
                  </>
                )}
              </div>
            </div>

            {/* Transparansi Pajak Share */}
            {members.length > 0 && (
              <div className="bg-indigo-950/10 border border-indigo-950/40 rounded-xl p-3 flex items-center justify-between text-xs text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-indigo-400" />
                  Pajak Terbagi Rata:
                </span>
                <span>
                  <strong>{formatRupiah(totalTax)}</strong> / {members.length} orang = <strong>{formatRupiah(calculateTaxShare(totalTax, members.length))} per orang</strong>
                </span>
              </div>
            )}
          </div>

          {/* Grid Interaksi (Kiri: Members + OCR, Kanan: Items + Ringkasan) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: Anggota & OCR */}
            <div className="no-print space-y-6">
              <MemberManager 
                members={members} 
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
              />

              <ReceiptScanner 
                onItemsScanned={handleItemsScanned}
              />
            </div>

            {/* Column 2: Items & Summary */}
            <div className="space-y-6">
              <ItemManager 
                items={items}
                members={members}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
                onAssignItem={handleAssignItem}
              />

              <PaymentSummary 
                members={members}
                items={items}
                totalTax={totalTax}
                billTitle={billTitle}
              />
            </div>

          </div>

        </section>

      </main>

      {/* Modern Footer */}
      <footer className="mt-auto py-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} SplitBill Pro. Dirancang untuk pembagian finansial yang presisi.</p>
      </footer>
    </div>
  );
}

export default App;
