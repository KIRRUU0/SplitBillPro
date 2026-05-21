import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { 
  UploadCloud, 
  Loader2, 
  Trash2, 
  Check, 
  Plus, 
  X, 
  FileText, 
  AlertCircle 
} from 'lucide-react';
import { formatRupiah, formatInputRupiah, parseRupiahToNumber } from '../utils/mathUtils';

interface ParsedItem {
  id: string;
  item_name: string;
  price: number;
}

interface ReceiptScannerProps {
  onItemsScanned: (items: { item_name: string; price: number }[], detectedTax?: number) => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onItemsScanned }) => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [detectedTax, setDetectedTax] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload / drop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setParsedItems([]);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
        setParsedItems([]);
        setError(null);
      } else {
        setError('Harap unggah file gambar (.jpg, .png, .jpeg)');
      }
    }
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    setParsedItems([]);
    setDetectedTax(0);
    setProgress(0);
    setStatusText('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Parse Text from OCR into Items & Prices
  const parseReceiptText = (text: string) => {
    const lines = text.split('\n');
    const items: ParsedItem[] = [];
    let extractedTax = 0;

    // Regular Expression untuk mendeteksi pola harga di Indonesia
    // Contoh: "Nasi Goreng 25.000", "Ayam Bakar Rp 30.000", "Es Teh 5,000", "Total 120000"
    // Mencari baris yang mengandung karakter huruf diikuti angka/harga di ujung
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const lowerLine = trimmedLine.toLowerCase();
      
      // Deteksi baris pajak / PB1 / SC / PPN
      const isTaxLine = 
        lowerLine.includes('pb1') || 
        lowerLine.includes('tax') || 
        lowerLine.includes('pajak') || 
        lowerLine.includes('ppn') || 
        lowerLine.includes('service charge') || 
        lowerLine.includes('sc'); // sc = service charge

      // Skip baris yang jelas merupakan metadata atau subtotal/total
      const isTotalLine = 
        lowerLine.includes('total') || 
        lowerLine.includes('subtotal') || 
        lowerLine.includes('tunai') || 
        lowerLine.includes('kembalian') ||
        lowerLine.includes('cash') ||
        lowerLine.includes('change');

      // Regex untuk mendeteksi: [Nama Item] [Spasi/Simbol/Rp] [Angka Harga]
      // Pola: mencocokkan teks nama barang, diikuti spasi atau simbol, dan diakhiri angka harga (contoh: 25.000 atau 25000)
      const match = trimmedLine.match(/^(.+?)\s+(?:rp\.?\s*)?(\d{1,3}(?:[\.,]\d{3})*|\d+)(?:\s*[a-zA-Z]*)?$/i);

      if (match) {
        const name = match[1].replace(/[:;\-\.\+\*]/g, '').trim();
        let priceStr = match[2];

        // Normalisasi format ribuan Indonesia (contoh: 25.000 -> 25000)
        // Jika ada titik/koma sebagai ribuan, hilangkan
        if (priceStr.includes('.') || priceStr.includes(',')) {
          // Cek jika pemisah desimal atau ribuan. 
          // Di Indonesia, biasanya titik digunakan untuk ribuan (cth: 25.000).
          // Jika panjang setelah titik/koma adalah 3 digit, hilangkan titik/koma tersebut.
          const parts = priceStr.split(/[\.,]/);
          if (parts[parts.length - 1].length === 3) {
            priceStr = priceStr.replace(/[\.,]/g, '');
          } else {
            // Asumsikan desimal, hilangkan titik ribuan dan ubah koma desimal menjadi titik
            priceStr = priceStr.replace(/\./g, '').replace(',', '.');
          }
        }

        const price = parseFloat(priceStr);

        // Validasi agar harga masuk akal (> 100 rupiah)
        if (!isNaN(price) && price > 100) {
          if (isTaxLine && !isTotalLine) {
            // Ini baris Pajak/PB1/PPN, simpan sebagai pajak dan jangan dimasukkan ke daftar belanja
            extractedTax = price;
          } else if (!isTotalLine) {
            let cleanName = name;
            let qty = 1;

            // Coba deteksi pola kuantitas di awal (contoh: "2x Mie Gacoan" atau "2 x Mie Gacoan")
            const startQtyMatch = name.match(/^(\d+)\s*x\s+(.+)$/i);
            // Coba deteksi pola kuantitas di akhir (contoh: "Mie Gacoan 2x" atau "Mie Gacoan 2 x")
            const endQtyMatch = name.match(/^(.+?)\s+(\d+)\s*x$/i);
            // Coba deteksi kuantitas tanpa 'x' di awal (contoh: "2 Mie Gacoan")
            const startNoXQtyMatch = name.match(/^(\d{1,2})\s+(.+)$/);

            if (startQtyMatch) {
              qty = parseInt(startQtyMatch[1], 10);
              cleanName = startQtyMatch[2].trim();
            } else if (endQtyMatch) {
              qty = parseInt(endQtyMatch[2], 10);
              cleanName = endQtyMatch[1].trim();
            } else if (startNoXQtyMatch) {
              qty = parseInt(startNoXQtyMatch[1], 10);
              cleanName = startNoXQtyMatch[2].trim();
            }

            if (qty > 1) {
              const unitPrice = Math.round(price / qty);
              for (let i = 1; i <= qty; i++) {
                items.push({
                  id: Math.random().toString(36).substr(2, 9),
                  item_name: `${cleanName} (${i}/${qty})`,
                  price: unitPrice
                });
              }
            } else {
              if (cleanName.length > 2) {
                items.push({
                  id: Math.random().toString(36).substr(2, 9),
                  item_name: cleanName,
                  price: price
                });
              }
            }
          }
        }
      }
    });

    return { items, extractedTax };
  };

  // Run OCR with Tesseract
  const processImage = async () => {
    if (!image) return;

    setIsLoading(true);
    setProgress(0);
    setStatusText('Memulai OCR...');
    setError(null);

    try {
      const result = await Tesseract.recognize(
        image,
        'ind', // Bahasa Indonesia sesuai instruksi
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(m.progress);
              setStatusText(`Membaca struk: ${Math.round(m.progress * 100)}%`);
            } else if (m.status === 'loading tesseract ocr api') {
              setStatusText('Menyiapkan Tesseract OCR...');
            } else if (m.status === 'loading language traineddata') {
              setStatusText('Memuat file bahasa Indonesia...');
            }
          }
        }
      );

      const text = result.data.text;
      const { items, extractedTax } = parseReceiptText(text);

      if (items && items.length > 0) {
        setParsedItems(items);
        setDetectedTax(extractedTax);
        if (extractedTax > 0) {
          setStatusText(`Pemindaian selesai! Pajak/PB1 terdeteksi: ${formatRupiah(extractedTax)}.`);
        } else {
          setStatusText('Pemindaian selesai!');
        }
      } else {
        setError('Gagal mendeteksi barang belanjaan secara otomatis. Coba foto yang lebih jelas atau tambahkan item secara manual.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat memproses gambar. Pastikan koneksi internet aktif untuk mendownload modul OCR bahasa Indonesia.');
    } finally {
      setIsLoading(false);
    }
  };

  // Edit / Update item di tabel hasil scan
  const handleUpdateItem = (id: string, field: 'item_name' | 'price', value: string | number) => {
    setParsedItems(prev => prev.map(item => {
      if (item.id === id) {
        if (field === 'price') {
          const val = typeof value === 'string' ? parseFloat(value) || 0 : Number(value);
          return { ...item, price: val };
        }
        if (field === 'item_name') {
          return { ...item, item_name: String(value) };
        }
      }
      return item;
    }));
  };

  // Delete item dari tabel hasil scan
  const handleDeleteItem = (id: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== id));
  };

  // Add new row ke tabel hasil scan
  const handleAddRow = () => {
    const newItem: ParsedItem = {
      id: Math.random().toString(36).substr(2, 9),
      item_name: '',
      price: 0
    };
    setParsedItems(prev => [...prev, newItem]);
  };

  // Confirm hasil scan dan kirim ke state aplikasi utama
  const handleConfirmItems = () => {
    // Validasi item kosong
    const validItems = parsedItems.filter(item => item.item_name.trim() !== '' && item.price > 0);
    if (validItems.length === 0) {
      setError('Tidak ada item valid untuk ditambahkan.');
      return;
    }
    onItemsScanned(validItems.map(i => ({ item_name: i.item_name, price: i.price })), detectedTax);
    clearImage();
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/60 shadow-xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
          <FileText size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-slate-100">Scan Struk Belanja (OCR)</h3>
          <p className="text-xs text-slate-400">Gunakan foto struk untuk mendeteksi item otomatis. Edit hasilnya sebelum konfirmasi.</p>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      {!imagePreview ? (
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-600/70 hover:border-indigo-500 hover:bg-slate-700/20 transition-all rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer group"
        >
          <UploadCloud size={48} className="text-slate-400 group-hover:text-indigo-400 transition-colors mb-3" />
          <p className="font-medium text-sm text-slate-200">
            Tarik & taruh foto struk di sini, atau <span className="text-indigo-400 font-semibold">Cari file</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">PNG, JPG, atau JPEG (maks. 5MB)</p>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden" 
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50 max-h-64 flex justify-center items-center">
            <img 
              src={imagePreview} 
              alt="Preview Struk" 
              className="max-h-64 object-contain"
            />
            <button 
              onClick={clearImage}
              className="absolute top-3 right-3 p-2 bg-slate-950/80 hover:bg-red-500 text-slate-200 hover:text-white rounded-full transition-colors backdrop-blur-sm"
              title="Hapus Gambar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Progress / Status Bar */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  {statusText}
                </span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {!isLoading && parsedItems.length === 0 && (
            <button
              onClick={processImage}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
            >
              Mulai Pindai Struk (OCR)
            </button>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Editor Hasil OCR */}
      {parsedItems.length > 0 && !isLoading && (
        <div className="mt-6 space-y-4">
          <div className="border-t border-slate-700/50 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-sm text-slate-200">Hasil Pemindaian OCR (Silakan Edit Jika Ada Salah Baca)</h4>
              <button 
                onClick={handleAddRow}
                className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <Plus size={14} /> Tambah Baris
              </button>
            </div>

            <div className="rounded-lg border border-slate-700/50 bg-slate-900/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 uppercase font-semibold border-b border-slate-700/50">
                    <th className="py-2.5 px-3">Nama Barang</th>
                    <th className="py-2.5 px-3 w-1/3">Harga (Rp)</th>
                    <th className="py-2.5 px-3 w-10 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {parsedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="p-2">
                        <input 
                          type="text" 
                          value={item.item_name}
                          onChange={(e) => handleUpdateItem(item.id, 'item_name', e.target.value)}
                          placeholder="Contoh: Nasi Goreng"
                          className="w-full bg-slate-800 border border-slate-700/50 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          value={item.price ? formatInputRupiah(item.price) : ''}
                          onChange={(e) => handleUpdateItem(item.id, 'price', parseRupiahToNumber(e.target.value))}
                          placeholder="0"
                          className="w-full bg-slate-800 border border-slate-700/50 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center text-xs text-slate-400 mt-2.5">
              <span>Total Terdeteksi: <strong className="text-emerald-400">{formatRupiah(parsedItems.reduce((acc, curr) => acc + curr.price, 0))}</strong></span>
              <span>Jumlah Item: <strong>{parsedItems.length}</strong></span>
            </div>
            {detectedTax > 0 && (
              <div className="bg-indigo-550/10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-300 flex justify-between items-center mt-3">
                <span>Pajak / PB1 Terdeteksi: <strong>{formatRupiah(detectedTax)}</strong></span>
                <span className="text-[10px] text-slate-400 italic">Otomatis dialihkan ke Pajak Global</span>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={clearImage}
              className="flex-1 py-2.5 border border-slate-600 hover:border-slate-500 hover:bg-slate-700/20 text-slate-300 font-medium rounded-xl transition-all text-xs"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmItems}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 text-xs"
            >
              <Check size={14} /> Konfirmasi & Tambahkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
