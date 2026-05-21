import React, { useState } from 'react';
import { Wallet, Info, ChevronDown, ChevronUp, Printer, AlertTriangle } from 'lucide-react';
import type { Member, BillItem } from '../types';
import { formatRupiah, calculateTaxShare, calculateMemberTotal } from '../utils/mathUtils';

interface PaymentSummaryProps {
  members: Member[];
  items: BillItem[];
  totalTax: number;
  billTitle: string;
  payerId?: string;
  paymentMethod?: string;
  printMode?: boolean; // when true show compact print output with breakdown
  onPrint?: () => Promise<void> | void;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  members,
  items,
  totalTax,
  billTitle,
  payerId,
  paymentMethod,
  printMode = false,
  onPrint
}) => {
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedMembers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const taxShare = calculateTaxShare(totalTax, members.length);

  const getMemberItems = (memberId: string) => {
    return items.filter(item => item.assigned_to_member_ids?.includes(memberId));
  };

  const getMemberItemsTotal = (memberId: string) => {
    const memberItems = getMemberItems(memberId);
    return memberItems.reduce((acc, curr) => {
      const shareCount = curr.assigned_to_member_ids?.length || 1;
      return acc + curr.price / shareCount;
    }, 0);
  };

  const totalItemsPrice = items.reduce((acc, curr) => acc + curr.price, 0);
  const grandTotalBill = totalItemsPrice + totalTax;
  const payer = members.find(m => m.id === payerId);

  if (printMode) {
    return (
      <div className="bg-white text-black p-6 rounded-none w-full" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="text-center mb-5 pb-4" style={{ borderBottom: '2px solid #000' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>SPLITBILL PRO</h2>
          <p style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px' }}>{billTitle || 'Rincian Tagihan'}</p>
          <p style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
          <span style={{ color: '#555' }}>Total Tagihan</span>
          <strong>{formatRupiah(grandTotalBill)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
          <span style={{ color: '#555' }}>Pajak / Service (Bagi Rata)</span>
          <span>{formatRupiah(totalTax)} ({members.length > 0 ? formatRupiah(taxShare) + ' / orang' : '-'})</span>
        </div>
        {payer && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ color: '#555' }}>Bayar ke siapa?</span>
            <span>{payer.name}</span>
          </div>
        )}
        {paymentMethod && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ color: '#555' }}>Metode</span>
            <span>{paymentMethod}</span>
          </div>
        )}

        {/* Rincian Pembagian per Anggota untuk Cetak */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #ccc', paddingBottom: '6px' }}>Rincian Pembagian Per Anggota</h3>
          
          {members.map((member, index) => {
            const memberItems = getMemberItems(member.id);
            const itemsTotal = getMemberItemsTotal(member.id);
            const memberGrandTotal = calculateMemberTotal(itemsTotal, taxShare);

            return (
              <div 
                key={member.id} 
                style={{ 
                  border: '1.5px solid #333', 
                  borderRadius: '8px', 
                  padding: '12px 14px', 
                  marginBottom: '10px',
                  background: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                  pageBreakInside: 'avoid'
                }}
              >
                {/* Header Nama Anggota */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '24px', height: '24px', borderRadius: '50%', 
                      background: '#333', color: '#fff', fontSize: '10px', fontWeight: 800 
                    }}>{index + 1}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>{member.name}</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 800 }}>{formatRupiah(memberGrandTotal)}</span>
                </div>

                {memberItems.length === 0 ? (
                  <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#888' }}>Tidak ada item dialokasikan</div>
                ) : (
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <tbody>
                      {memberItems.map(item => {
                        const shareCount = item.assigned_to_member_ids?.length || 1;
                        const itemShare = item.price / shareCount;
                        return (
                          <tr key={item.id}>
                            <td style={{ padding: '3px 0', width: '70%' }}>
                              {item.item_name}{shareCount > 1 ? ` (dibagi ${shareCount})` : ''}
                            </td>
                            <td style={{ padding: '3px 0', textAlign: 'right' }}>{formatRupiah(itemShare)}</td>
                          </tr>
                        );
                      })}

                      {/* Garis pemisah tebal sebelum subtotal */}
                      <tr><td colSpan={2} style={{ borderTop: '1.5px solid #555', paddingTop: '4px' }}></td></tr>
                      
                      {/* Subtotal Item */}
                      <tr style={{ fontWeight: 600 }}>
                        <td style={{ padding: '2px 0' }}>Subtotal Item</td>
                        <td style={{ padding: '2px 0', textAlign: 'right' }}>{formatRupiah(itemsTotal)}</td>
                      </tr>
                      
                      {/* Pajak Share - sebelum total akhir */}
                      <tr>
                        <td style={{ padding: '2px 0', color: '#555' }}>Pajak Share ({formatRupiah(totalTax)} / {members.length})</td>
                        <td style={{ padding: '2px 0', textAlign: 'right' }}>{formatRupiah(taxShare)}</td>
                      </tr>

                      {/* Total Akhir dengan garis tebal */}
                      <tr style={{ fontWeight: 800 }}>
                        <td style={{ padding: '4px 0', borderTop: '2px solid #000' }}>TOTAL</td>
                        <td style={{ padding: '4px 0', borderTop: '2px solid #000', textAlign: 'right' }}>{formatRupiah(memberGrandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#999', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
          — Akhir rincian cetak • SplitBill Pro —
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/60 shadow-xl space-y-6">
      {/* Title only for print */}
      <div className="hidden print:block text-center border-b border-slate-300 pb-4 mb-6">
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">SPLITBILL PRO</h2>
        <p className="text-md font-bold text-slate-600 mt-1">{billTitle || 'Rincian Tagihan Belanja'}</p>
        <p className="text-[10px] text-slate-400 mt-1">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
      </div>

      {/* Header Ringkasan */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <Wallet size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-100">Ringkasan Pembayaran</h3>
            <p className="text-xs text-slate-400">Rincian biaya per orang yang harus dibayarkan</p>
          </div>
        </div>

        <button
          onClick={async () => {
            if (onPrint) {
              await onPrint();
            }
          }}
          disabled={members.length === 0}
          className="no-print flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
        >
          <Printer size={14} /> Cetak & Bagikan
        </button>
      </div>

      {/* Grid Informasi Keuangan Global */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Subtotal */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/60 transition-colors flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Subtotal Belanja</span>
          <p className="text-lg font-bold text-slate-200 mt-2">{formatRupiah(totalItemsPrice)}</p>
        </div>

        {/* Card 2: Pajak */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/60 transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pajak / Service</span>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-semibold px-2 py-0.5 rounded border border-indigo-900/30">Bagi Rata</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold text-indigo-450 text-indigo-400">{formatRupiah(totalTax)}</p>
            {members.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">({formatRupiah(taxShare)} / orang)</p>
            )}
          </div>
        </div>

        {/* Card 3: Grand Total */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4 rounded-xl border border-emerald-500/20 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
            <Wallet size={80} />
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Total Pembayaran</span>
          <p className="text-xl font-extrabold text-emerald-450 text-emerald-400 mt-2">{formatRupiah(grandTotalBill)}</p>
        </div>
      </div>

      {/* Alert Warning Validasi */}
      <div className="space-y-2">
        {!payerId && members.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Pembayar Belum Ditentukan!</span>
              Silakan pilih pembayar di <strong>Informasi Pembayaran</strong> agar info penagihan dicetak lengkap.
            </div>
          </div>
        )}

        {items.length > 0 && items.some(item => !item.assigned_to_member_ids || item.assigned_to_member_ids.length === 0) && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Ada Item Belum Dialokasikan!</span>
              Beberapa barang belanja belum didelegasikan kepada anggota di <strong>Daftar & Alokasi Item</strong>.
            </div>
          </div>
        )}
      </div>

      {/* Breakdown per Orang */}
      <div className="space-y-4">
        <h4 className="font-semibold text-xs text-slate-450 uppercase tracking-wider">Rincian Per Anggota</h4>

        {members.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-xs">Tidak ada anggota untuk ditampilkan. Tambahkan anggota di panel sebelah kiri.</div>
        ) : (
          <div className="space-y-3">
            {members.map(member => {
              const memberItems = getMemberItems(member.id);
              const itemsTotal = getMemberItemsTotal(member.id);
              const memberGrandTotal = calculateMemberTotal(itemsTotal, taxShare);
              const isExpanded = !!expandedMembers[member.id];

              return (
                <div key={member.id} className={`border rounded-xl transition-all duration-200 overflow-hidden ${isExpanded ? 'border-indigo-500/30 bg-slate-900/30 shadow-md shadow-indigo-950/20' : 'border-slate-800/80 bg-slate-900/10 hover:bg-slate-900/25 hover:border-slate-700/50'}`}>
                  <div onClick={() => toggleExpand(member.id)} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-extrabold uppercase shadow-md">{member.name.substring(0, 2)}</div>
                      <div>
                        <h5 className="font-bold text-sm text-slate-200">{member.name}</h5>
                        <p className="text-[10px] text-slate-450 mt-0.5 text-slate-400">{memberItems.length} barang belanjaan</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5">
                      <div className="text-right space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 border border-slate-900 font-medium">Item: {formatRupiah(itemsTotal)}</span>
                          <span className="text-[9px] text-slate-500 font-bold">+</span>
                          <span className="text-[9px] bg-indigo-950/50 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-900/40 font-medium">Pajak: {formatRupiah(taxShare)}</span>
                        </div>
                        <p className="text-sm font-extrabold text-slate-100">{formatRupiah(memberGrandTotal)}</p>
                      </div>
                      <div className="text-slate-500 p-1 hover:text-slate-350 rounded-lg hover:bg-slate-800/40">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                    </div>
                  </div>

                  <div className={`border-t border-slate-800/60 bg-slate-950/30 p-4 space-y-4 ${isExpanded ? 'block' : 'hidden print:block'}`}>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Daftar Item Belanja</span>
                      {memberItems.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-1">Belum ada item belanjaan yang dialokasikan.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {memberItems.map(item => {
                            const shareCount = item.assigned_to_member_ids?.length || 1;
                            const itemShare = item.price / shareCount;
                            return (
                              <div key={item.id} className="flex justify-between items-center text-xs text-slate-300 py-0.5">
                                <div className="space-y-0.5">
                                  <span className="text-slate-400 font-medium">{item.item_name}</span>
                                  {shareCount > 1 && (<span className="text-[10px] text-slate-500">Dibagi {shareCount} orang • {formatRupiah(itemShare)} per orang</span>)}
                                </div>
                                <div className="text-right"><span className="font-semibold text-slate-200">{formatRupiah(itemShare)}</span></div>
                              </div>
                            );
                          })}
                          <div className="flex justify-between items-center text-xs font-bold text-slate-200 border-t border-slate-800/50 pt-2.5 mt-2">
                            <span>Subtotal Item</span>
                            <span>{formatRupiah(itemsTotal)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3.5 border-t border-slate-800/40 space-y-3">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Kalkulasi Pembagian Pajak</span>
                      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60 space-y-2">
                        <div className="flex justify-between text-xs text-slate-400"><span>Subtotal Belanja</span><span className="text-slate-200 font-medium">{formatRupiah(itemsTotal)}</span></div>
                        <div className="flex justify-between text-xs text-indigo-400"><span className="flex items-center gap-1.5">Pajak Share <span title={`Total Pajak (${formatRupiah(totalTax)}) / ${members.length} Anggota`}><Info size={12} className="hover:text-indigo-300 cursor-help" /></span></span><span className="font-semibold">{formatRupiah(taxShare)}</span></div>
                        <div className="h-[1px] bg-slate-800/80 my-1" />
                        <div className="flex justify-between text-xs font-bold text-emerald-400"><span>Total Pembayaran</span><span>{formatRupiah(memberGrandTotal)}</span></div>
                      </div>

                      <div className="text-[10px] font-mono bg-slate-950/80 text-slate-400 py-2.5 px-3.5 rounded-xl border border-slate-900/80 text-center flex flex-wrap items-center justify-center gap-1.5 leading-none">
                        <span className="text-slate-350">{formatRupiah(itemsTotal)}</span>
                        <span className="text-slate-650 text-slate-600">+</span>
                        <span className="text-indigo-400">({formatRupiah(totalTax)} / {members.length})</span>
                        <span className="text-slate-650 text-slate-600">=</span>
                        <span className="text-emerald-400 font-bold">{formatRupiah(memberGrandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSummary;
