# SplitBill Pro - Pembagian Tagihan Cerdas & Presisi

SplitBill Pro adalah aplikasi web modern berbasis React dan TypeScript yang dirancang untuk membantu Anda membagi tagihan restoran atau belanjaan secara cerdas, cepat, dan presisi. Dilengkapi dengan teknologi OCR (Optical Character Recognition) untuk memindai struk fisik, serta sistem pembagian biaya tambahan (pajak/layanan) yang adil.

## 🚀 Fitur Utama

1. **Smart OCR Receipt Scanner (Tesseract.js)**
   * Pindai struk makan/belanja menggunakan kamera handphone atau unggah foto struk.
   * Ekstraksi nama item dan harga secara otomatis langsung dari gambar.
   * Deteksi cerdas untuk mengabaikan pajak/PB1/service charge dari daftar item agar tidak terjadi double-counting.

2. **Auto-Splitting Multi-Quantity**
   * Jika struk memiliki item dengan jumlah banyak (contoh: `2x Nasi Goreng` atau `3 Lemon Tea`), aplikasi secara otomatis memecah item tersebut menjadi satuan terpisah.
   * Memungkinkan pembagian porsi secara fleksibel (misalnya: 1 Nasi Goreng dibayar oleh Budi, dan 1 Nasi Goreng lainnya dibayar oleh Ani).

3. **Pajak & Service Charge Proporsional / Bagi Rata**
   * Masukkan nilai pajak (PB1) atau service charge dalam bentuk nominal Rupiah atau persentase.
   * Pajak dan biaya layanan akan dibagi secara merata (tax share) ke setiap anggota yang terlibat.

4. **Penyimpanan Lokal Terisolasi (LocalStorage - Tanpa Login)**
   * Semua riwayat tagihan disimpan langsung di dalam memori browser masing-masing perangkat (`LocalStorage`).
   * **Privasi Terjamin & Tanpa Login:** Data yang disimpan di HP A tidak akan pernah bisa dilihat oleh HP B. Setiap perangkat memiliki database lokal tersendiri tanpa perlu registrasi akun.

5. **Premium Receipt Layout & Print-Ready**
   * Antarmuka mewah bertema *Charcoal-Mauve-Cream* dengan efek glassmorphism modern.
   * Ringkasan pembayaran yang jelas: "Bayar ke siapa?", metode pembayaran, dan detail breakdown per-orang.
   * Optimasi cetak (Print mode) yang rapi, menyembunyikan navigasi web, dan menyesuaikan warna agar ramah saat dicetak ke kertas thermal/PDF.

---

## 🛠️ Tech Stack

* **Frontend Framework:** React 19, TypeScript, Vite
* **Styling:** Tailwind CSS (dengan tema warna kustom kuro-mauve)
* **OCR Library:** Tesseract.js (berjalan offline/sisi klien browser)
* **Icons:** Lucide React
* **Database & Backing (Opsional):** Supabase (PostgreSQL)

---

## 💻 Cara Menjalankan Project Secara Lokal

### Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) di komputer Anda.

### Langkah-langkah
1. **Clone Repository**
   ```bash
   git clone https://github.com/KIRRUU0/SplitBillPro.git
   cd SplitBillPro
   ```

2. **Instal Dependensi**
   ```bash
   npm install
   ```

3. **Jalankan Development Server**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`. Buka link tersebut di browser Anda atau scan QR code yang muncul menggunakan handphone dalam jaringan Wi-Fi yang sama.

4. **Build untuk Produksi**
   ```bash
   npm run build
   ```
   Hasil build akan berada di folder `/dist` dan siap dideploy ke platform hosting seperti Vercel, Netlify, atau GitHub Pages.

---

## 🗄️ Konfigurasi Supabase Database (Opsional untuk Developer)

Project ini telah menyediakan konfigurasi awal untuk menghubungkan penyimpanan data ke **Supabase** secara cloud jika di masa depan ingin dikembangkan fitur sinkronisasi antar-perangkat.

### 1. File Skema Database
Skema tabel PostgreSQL tersimpan di file [`schema.sql`](file:///c:/Project/Splitbill/schema.sql) yang berisi:
* Tabel `bills` (menyimpan informasi utama tagihan)
* Tabel `members` (menyimpan daftar orang)
* Tabel `bill_items` (menyimpan item belanja beserta relasi siapa pembayarnya)

### 2. Mengaplikasikan Skema ke Supabase
Anda dapat menjalankan script otomatis berikut untuk mengunggah skema ke database Supabase Anda:
```bash
node apply_schema.js
```

### 3. Variabel Lingkungan (.env)
Buat file `.env.local` di root folder dengan variabel berikut untuk menghubungkan ke instance Supabase Anda:
```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```
