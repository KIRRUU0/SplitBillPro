import { useState, useEffect } from 'react';
import { 
  Plus, 
  Save, 
  Trash2, 
  Info, 
  Sparkles, 
  FolderOpen, 
  AlertTriangle,
  CheckCircle,
  FileText,
  CalendarDays,
  RefreshCcw,
  Wallet,
  Heart
} from 'lucide-react';
import type { Member, BillItem, Bill } from './types';
import { MemberManager } from './components/MemberManager';
import { ItemManager } from './components/ItemManager';
import { ReceiptScanner } from './components/ReceiptScanner';
import PaymentSummary from './components/PaymentSummary';
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
  // States Utama Tagihan Aktif
  const [billId, setBillId] = useState<string>('');
  const [billTitle, setBillTitle] = useState<string>('Tagihan Baru');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [taxInputType, setTaxInputType] = useState<'nominal' | 'percentage'>('nominal');
  const [taxInputValue, setTaxInputValue] = useState<number>(0);
  const [totalTax, setTotalTax] = useState<number>(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<BillItem[]>([]);
  // Payment routing state
  const [payerId, setPayerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  // States Management Data & UI
  const [savedBills, setSavedBills] = useState<Bill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);

  const LOCAL_STORAGE_BILLS_KEY = 'splitbill_pro_bills';
  const LOCAL_STORAGE_DETAILS_PREFIX = 'splitbill_pro_details_';

  const tutorialSteps = [
    {
      title: 'Tambah Anggota',
      description: 'Masukkan semua orang yang akan ikut membayar. Ini adalah dasar pembagian biaya.',
      tip: 'Gunakan panel Anggota di kiri untuk menambahkan nama teman Anda.'
    },
    {
      title: 'Tambah Item',
      description: 'Masukkan barang atau makanan yang dibeli. Untuk item yang dibagi, pilih lebih dari satu anggota.',
      tip: 'Setiap item bisa dibuat shared dengan memilih beberapa anggota di daftar item.'
    },
    {
      title: 'Atur Pajak / Service Charge',
      description: 'Masukkan nilai pajak atau service charge, lalu pajak akan dibagi rata ke anggota.',
      tip: 'Pilih mode Nominal atau Persentase sesuai jenis biaya tambahan yang Anda miliki.'
    },
    {
      title: 'Simpan & Review',
      description: 'Simpan tagihan di browser ini dan lihat ringkasan per-orang sebelum mencetak.',
      tip: 'Gunakan tombol Simpan lalu cek ringkasan untuk memastikan semua sudah benar.'
    }
  ];

  useEffect(() => {
    // Inisialisasi tagihan baru saat start
    initNewBill();
    
    // Load daftar tagihan tersimpan dari localStorage
    loadSavedBills();
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

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    setTutorialStep(0);
  };

  const handleOpenTutorial = () => {
    setShowTutorial(true);
    setTutorialStep(0);
  };

  const handleNextTutorialStep = () => {
    setTutorialStep((prev) => Math.min(prev + 1, tutorialSteps.length - 1));
  };

  const handlePreviousTutorialStep = () => {
    setTutorialStep((prev) => Math.max(prev - 1, 0));
  };

  const handleResetAllData = () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus semua data lokal? Tindakan ini tidak dapat dibatalkan.')) return;
    const billsToRemove = savedBills.map((bill) => `${LOCAL_STORAGE_DETAILS_PREFIX}${bill.id}`);
    billsToRemove.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(LOCAL_STORAGE_BILLS_KEY);
    setSavedBills([]);
    initNewBill();
    showToast('Semua data lokal berhasil direset.', 'success');
  };

  // Inisialisasi State Tagihan Baru
  const initNewBill = () => {
    const newId = generateUUID();
    setBillId(newId);
    setBillTitle('Tagihan Baru');
    setBillDate(new Date().toISOString().split('T')[0]);
    setTaxInputValue(0);
    setTotalTax(0);
    setMembers([]);
    setItems([]);
    setSelectedBillId('');
  };

  // Load Daftar Tagihan
  const loadSavedBills = () => {
    setIsLoading(true);
    loadBillsFromLocalStorage();
    setIsLoading(false);
  };

  // Fallback Local Storage
  const loadBillsFromLocalStorage = () => {
    const local = localStorage.getItem(LOCAL_STORAGE_BILLS_KEY);
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

    // Load dari LocalStorage detail
    const detailsLocal = localStorage.getItem(`${LOCAL_STORAGE_DETAILS_PREFIX}${id}`);
    if (detailsLocal) {
      try {
        const details = JSON.parse(detailsLocal);
        const normalizedItems: BillItem[] = Array.isArray(details.items)
          ? details.items.map((item: any) => ({
              ...item,
              assigned_to_member_ids: Array.isArray(item.assigned_to_member_ids)
                ? item.assigned_to_member_ids
                : item.assigned_to_member_id
                ? [item.assigned_to_member_id]
                : []
            }))
          : [];

        setBillId(id);
        setBillTitle(billMeta.title);
        setBillDate(billMeta.bill_date || new Date().toISOString().split('T')[0]);
        setTaxInputType('nominal');
        setTaxInputValue(billMeta.total_tax);
        setTotalTax(billMeta.total_tax);
        setMembers(details.members || []);
        setItems(normalizedItems);
        setPayerId(details.payerId || billMeta.payer_id || '');
        setPaymentMethod(details.paymentMethod || billMeta.payment_method || '');
        setSelectedBillId(id);
        showToast(`Tagihan "${billMeta.title}" dimuat dari penyimpanan lokal.`, 'success');
      } catch (e) {
        console.error(e);
        showToast('Gagal mengurai detail tagihan lokal.', 'error');
      }
    } else {
      showToast('Detail tagihan lokal tidak ditemukan.', 'error');
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

    // Simpan di LocalStorage
    const newBillMeta: Bill = {
      id: billId,
      title: billTitle,
      total_amount: grandTotal,
      total_tax: totalTax,
      bill_date: billDate,
      created_at: new Date().toISOString(),
      payer_id: payerId || undefined,
      payment_method: paymentMethod || undefined
    };

    const updatedBills = [...savedBills.filter(b => b.id !== billId), newBillMeta];
localStorage.setItem(LOCAL_STORAGE_BILLS_KEY, JSON.stringify(updatedBills));
      localStorage.setItem(
        `${LOCAL_STORAGE_DETAILS_PREFIX}${billId}`,
        JSON.stringify({ members, items, payerId, paymentMethod })
      );

    setSavedBills(updatedBills);
    setSelectedBillId(billId);
    showToast('Tagihan disimpan secara lokal di browser ini.', 'success');
    setIsSaving(false);
  };

  // Cetak & Simpan Otomatis lalu Buka Tagihan Baru
  const handlePrintBill = async () => {
    if (members.length > 0 && !payerId) {
      const confirmPrint = window.confirm('Peringatan: Anda belum memilih pembayar ("Bayar ke siapa"). Apakah Anda ingin tetap melanjutkan cetak tagihan?');
      if (!confirmPrint) return;
    }

    const hasUnallocatedItems = items.length > 0 && items.some(item => !item.assigned_to_member_ids || item.assigned_to_member_ids.length === 0);
    if (hasUnallocatedItems) {
      const confirmPrint = window.confirm('Peringatan: Ada item belanjaan yang belum dialokasikan ke anggota. Apakah Anda ingin tetap melanjutkan cetak tagihan?');
      if (!confirmPrint) return;
    }

    await handleSaveBill();
    setTimeout(() => {
      window.print();
      initNewBill();
    }, 250);
  };

  // Hapus Tagihan
  const handleDeleteBill = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Mencegah load bill detail saat klik hapus
    
    if (!window.confirm('Apakah Anda yakin ingin menghapus tagihan ini?')) return;

    setIsLoading(true);
    // Hapus dari local storage
    const updated = savedBills.filter(b => b.id !== id);
    localStorage.setItem(LOCAL_STORAGE_BILLS_KEY, JSON.stringify(updated));
    localStorage.removeItem(`${LOCAL_STORAGE_DETAILS_PREFIX}${id}`);
    setSavedBills(updated);
    showToast('Tagihan lokal berhasil dihapus.', 'success');
    if (billId === id) initNewBill();
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
    if (payerId === id) {
      setPayerId('');
    }
    // Reset alokasi item jika member ini dihapus
    setItems(prev => prev.map(item => ({
      ...item,
      assigned_to_member_ids: item.assigned_to_member_ids.filter((memberId) => memberId !== id)
    })));
  };

  // State Mutators: Items
  const handleAddItem = (name: string, price: number) => {
    const newItem: BillItem = {
      id: generateUUID(),
      bill_id: billId,
      item_name: name,
      price,
      assigned_to_member_ids: []
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAssignItem = (itemId: string, memberIds: string[]) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, assigned_to_member_ids: memberIds } 
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
      assigned_to_member_ids: []
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
      <div className="app-ui no-print">
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
      <header className="no-print sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 py-4 px-6 flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
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
        <div className="flex items-center flex-wrap gap-2 md:gap-3 justify-center md:justify-end">
        

          <a 
            href="https://saweria.co/kirru"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/25 flex items-center gap-1.5 active:scale-[0.98]"
            title="Dukung Developer via Saweria"
          >
            <Heart size={13} className="fill-white text-white animate-pulse" />
            <span>Dukung Saya</span>
          </a>

          <button 
            onClick={handleOpenTutorial}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
            title="Tunjukkan Tutorial"
          >
            Tutorial
          </button>

          <button 
            onClick={initNewBill}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all"
            title="Buat Tagihan Baru"
          >
            <Plus size={16} />
          </button>
        </div>
      </header>

      {/* Quick Start Guide */}
      <section className="max-w-7xl w-full mx-auto px-4 md:px-6 mt-8 pb-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold">Panduan Interaktif</p>
              <h2 className="mt-2 text-lg sm:text-xl font-bold text-slate-100">Cara menggunakan SplitBill Pro</h2>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="rounded-2xl bg-slate-950/40 border border-slate-800 px-4 py-3 text-xs text-slate-400">
                Ikuti tutorial agar setiap langkah lebih mudah.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5 text-sm">
            <div className="rounded-2xl border border-slate-800 p-4 bg-slate-950/70">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">1. Tambah Anggota</p>
              <p className="mt-2 text-slate-300 text-sm">Masukkan nama semua orang yang ikut membayar.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 p-4 bg-slate-950/70">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">2. Tambah Item</p>
              <p className="mt-2 text-slate-300 text-sm">Isi barang belanja dan pilih siapa yang membayar setiap item.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 p-4 bg-slate-950/70">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">3. Atur Pajak</p>
              <p className="mt-2 text-slate-300 text-sm">Masukkan pajak/service charge, langsung dibagi rata ke anggota.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 p-4 bg-slate-950/70">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">4. Simpan & Review</p>
              <p className="mt-2 text-slate-300 text-sm">Simpan tagihan, kemudian lihat ringkasan dan cetak jika perlu.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Layout Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Panel Kiri: Saved Bills List (1/4 Width) */}
        <section className="no-print lg:col-span-1 bg-slate-900/40 rounded-2xl p-5 border border-slate-800/80 self-start">
          <div className="flex flex-col gap-3 mb-4 pb-2 border-b border-slate-800/60">
            <div className="flex items-center space-x-2.5">
              <FolderOpen className="text-indigo-400" size={18} />
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Tagihan Tersimpan ({savedBills.length})</h2>
            </div>
            <p className="text-[11px] text-slate-500">Pilih tagihan untuk melihat detail. Klik ikon sampah untuk menghapus.</p>
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
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-slate-500">
                        {formatRupiah(b.total_amount)}
                      </p>
                      {b.bill_date && (
                        <span className="text-[9px] text-slate-600">• {new Date(b.bill_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>
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
          <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400/90 rounded-xl flex items-start gap-2.5 text-[10px] leading-relaxed">
            <AlertTriangle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Penyimpanan Lokal Aktif</strong>
              Data tagihan disimpan di browser ini dan hanya tersedia di perangkat yang sama.
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <button
              onClick={handleResetAllData}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-red-300 bg-slate-900 border border-red-500/20 rounded-2xl hover:bg-red-500/10 transition-all"
              type="button"
            >
              <RefreshCcw size={14} /> Reset Semua Data Lokal
            </button>
          </div>
        </section>

        {/* Panel Kanan: Bill Form & Calculators (3/4 Width) */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Header Konfigurasi Bill Aktif */}
          <div className="no-print bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Judul & Tanggal Tagihan */}
              <div className="flex-grow space-y-2">
                <input 
                  type="text" 
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder="Masukkan Judul Tagihan (cth: Makan Malam Ultah)"
                  className="bg-transparent border-b border-transparent hover:border-slate-800 focus:border-indigo-500 text-lg md:text-xl font-bold text-slate-100 placeholder-slate-600 focus:outline-none py-1 w-full transition-all"
                />
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-slate-500" />
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-slate-800 focus:border-indigo-500 text-xs text-slate-400 focus:text-slate-200 focus:outline-none py-0.5 transition-all cursor-pointer [color-scheme:light]"
                  />
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 w-full md:w-auto">
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
            </div>
          </div>

          {/* Grid Interaksi (Kiri: Members + Payment info + OCR, Kanan: Items + Tax config + Ringkasan) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: Anggota, Info Pembayaran, OCR */}
            <div className="no-print space-y-6">
              <MemberManager 
                members={members} 
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
              />

              {/* Card Langkah 2: Informasi Pembayaran */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/60 shadow-xl space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-100">Informasi Pembayaran</h3>
                    <p className="text-xs text-slate-400">Tentukan siapa yang membayar tagihan & metode transfernya.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bayar ke siapa</label>
                    <select
                      value={payerId}
                      onChange={(e) => setPayerId(e.target.value)}
                      disabled={members.length === 0}
                      className="w-full mt-1.5 bg-slate-900/60 border border-slate-700 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none transition-colors"
                    >
                      {members.length === 0 ? (
                        <option value="">Tambahkan anggota terlebih dahulu...</option>
                      ) : (
                        <>
                          <option value="">Pilih nama pembayar</option>
                          {members.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metode Pembayaran</label>
                    <input
                      type="text"
                      placeholder="Contoh: Tunai / Transfer BCA"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full mt-1.5 bg-slate-900/60 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <ReceiptScanner 
                onItemsScanned={handleItemsScanned}
              />
            </div>

            {/* Column 2: Items, Pajak, Summary */}
            <div className="space-y-6">
              <ItemManager 
                items={items}
                members={members}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
                onAssignItem={handleAssignItem}
              />

              {/* Card Langkah 5: Pajak & Biaya Tambahan */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/60 shadow-xl space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-100">Pajak & Biaya Tambahan</h3>
                    <p className="text-xs text-slate-400">Masukkan nilai pajak atau service charge tambahan jika ada.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Mode Perhitungan
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTaxInputType('nominal');
                          setTaxInputValue(0);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          taxInputType === 'nominal'
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : 'bg-slate-900/60 border-slate-700 text-slate-400'
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
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          taxInputType === 'percentage'
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : 'bg-slate-900/60 border-slate-700 text-slate-400'
                        }`}
                      >
                        Persentase (%)
                      </button>
                    </div>
                  </div>

                  <div className="relative flex items-end">
                    {taxInputType === 'nominal' ? (
                      <>
                        <span className="absolute left-3.5 bottom-3.5 text-slate-400 text-sm font-semibold">Rp</span>
                        <input 
                          type="text" 
                          value={taxInputValue ? formatInputRupiah(taxInputValue) : ''}
                          onChange={(e) => setTaxInputValue(parseRupiahToNumber(e.target.value))}
                          placeholder="0"
                          className="w-full bg-slate-900/60 border border-slate-700 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                        />
                      </>
                    ) : (
                      <>
                        <input 
                          type="number" 
                          value={taxInputValue || ''}
                          onChange={(e) => setTaxInputValue(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full bg-slate-900/60 border border-slate-700 focus:border-indigo-500 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                        />
                        <span className="absolute right-3.5 bottom-3.5 text-slate-400 text-sm font-semibold">%</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Transparansi Pajak Share */}
                {members.length > 0 && (
                  <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-indigo-300 gap-2">
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

              <div>
                <PaymentSummary 
                  members={members}
                  items={items}
                  totalTax={totalTax}
                  billTitle={billTitle}
                  payerId={payerId}
                  paymentMethod={paymentMethod}
                  printMode={false}
                  onPrint={handlePrintBill}
                />
              </div>
            </div>
          </div>

        </section>

      </main>

      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-8 text-slate-100">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold">Tutorial SplitBill Pro</p>
                <h2 className="mt-3 text-2xl font-bold text-white">Panduan Langkah demi Langkah</h2>
                <p className="mt-1 text-xs text-slate-400">Ikuti wizard berikut untuk menggunakan SplitBill Pro secara langsung.</p>
              </div>
              <button
                onClick={handleCloseTutorial}
                className="rounded-full p-2 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all"
                aria-label="Tutup tutorial"
              >
                ✕
              </button>
            </div>

            <div className="rounded-3xl bg-slate-950/80 border border-slate-800 p-6">
              <div className="mb-4 text-sm text-slate-300">
                <p className="font-semibold text-slate-100">Langkah {tutorialStep + 1} dari {tutorialSteps.length}</p>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5">
                  <h3 className="text-lg font-semibold text-white">{tutorialSteps[tutorialStep].title}</h3>
                  <p className="mt-3 text-slate-300">{tutorialSteps[tutorialStep].description}</p>
                  <p className="mt-3 text-sm text-slate-400">{tutorialSteps[tutorialStep].tip}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <button
                onClick={handlePreviousTutorialStep}
                disabled={tutorialStep === 0}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-all"
                type="button"
              >
                Sebelumnya
              </button>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  onClick={handleCloseTutorial}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
                  type="button"
                >
                  Tutup
                </button>
                <button
                  onClick={tutorialStep === tutorialSteps.length - 1 ? handleCloseTutorial : handleNextTutorialStep}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-all"
                  type="button"
                >
                  {tutorialStep === tutorialSteps.length - 1 ? 'Selesai' : 'Berikutnya'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Footer */}
      <footer className="mt-auto py-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500 space-y-2">
        <p>&copy; {new Date().getFullYear()} SplitBill Pro. Dirancang untuk pembagian finansial yang presisi.</p>
        <p>
          Dukung pengembangan aplikasi ini via{" "}
          <a 
            href="https://saweria.co/kirru" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-orange-400 hover:text-orange-300 font-semibold underline transition-colors"
          >
            Saweria
          </a>
        </p>
      </footer>
      </div>

      <div className="print-only">
        <PaymentSummary
          members={members}
          items={items}
          totalTax={totalTax}
          billTitle={billTitle}
          payerId={payerId}
          paymentMethod={paymentMethod}
          printMode={true}
          onPrint={handlePrintBill}
        />
      </div>
    </div>
  );
}

export default App;
