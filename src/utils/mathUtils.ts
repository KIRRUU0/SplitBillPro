/**
 * Membulatkan angka ke 2 angka desimal secara presisi
 * Menghindari kesalahan floating-point (misal: 0.1 + 0.2)
 */
export const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Menghitung porsi pajak per orang (Bagi Rata)
 * Nilai Pajak Per Orang = Total Pajak / Jumlah Orang
 */
export const calculateTaxShare = (totalTax: number, memberCount: number): number => {
  if (memberCount === 0) return 0;
  return roundToTwo(totalTax / memberCount);
};

/**
 * Menghitung total akhir per orang
 * Total Akhir = (Total Harga Item yang dibeli) + (Pajak Share)
 */
export const calculateMemberTotal = (itemTotal: number, taxShare: number): number => {
  return roundToTwo(itemTotal + taxShare);
};

/**
 * Memformat angka menjadi format mata uang Rupiah (IDR)
 */
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Memformat angka/string menjadi format ribuan Rupiah saat diinput (tanpa Rp)
 * Contoh: "25000" -> "25.000"
 */
export const formatInputRupiah = (value: string | number): string => {
  const cleanValue = String(value).replace(/[^0-9]/g, '');
  if (!cleanValue) return '';
  const number = parseInt(cleanValue, 10);
  return new Intl.NumberFormat('id-ID').format(number);
};

/**
 * Mengubah string Rupiah terformat kembali ke angka
 * Contoh: "25.000" -> 25000
 */
export const parseRupiahToNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const cleanValue = value.replace(/[^0-9]/g, '');
  return cleanValue ? parseInt(cleanValue, 10) : 0;
};
