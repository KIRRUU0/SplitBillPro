import React, { useState } from 'react';
import { ShoppingBag, Plus, Trash2, Tag, AlertCircle } from 'lucide-react';
import type { Member, BillItem } from '../types';
import { formatRupiah, formatInputRupiah, parseRupiahToNumber } from '../utils/mathUtils';

interface ItemManagerProps {
  items: BillItem[];
  members: Member[];
  onAddItem: (name: string, price: number) => void;
  onRemoveItem: (id: string) => void;
  onAssignItem: (itemId: string, memberIds: string[]) => void;
}

export const ItemManager: React.FC<ItemManagerProps> = ({
  items,
  members,
  onAddItem,
  onRemoveItem,
  onAssignItem
}) => {
  const [itemName, setItemName] = useState<string>('');
  const [itemPrice, setItemPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = itemName.trim();
    const priceNum = parseRupiahToNumber(itemPrice);

    if (!trimmedName) {
      setError('Nama barang tidak boleh kosong.');
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Harga harus berupa angka lebih dari 0.');
      return;
    }

    onAddItem(trimmedName, priceNum);
    setItemName('');
    setItemPrice('');
    setError(null);
  };

  // Hitung total harga item saat ini
  const totalItemsPrice = items.reduce((acc, curr) => acc + curr.price, 0);
  
  // Hitung item yang belum dialokasikan
  const unassignedCount = items.filter(item => !item.assigned_to_member_ids || item.assigned_to_member_ids.length === 0).length;

  return (
    <div className="no-print bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/60 shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-100">Langkah 2: Tambah & Alokasikan Item ({items.length})</h3>
            <p className="text-xs text-slate-400">Tambahkan barang dan pilih satu atau lebih anggota untuk berbagi biaya item.</p>
          </div>
        </div>
      </div>

      {/* Form Input Item Baru secara Manual */}
      <form onSubmit={handleSubmit} className="mb-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="relative">
            <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Nama barang (cth: Nasi Goreng)"
              className="w-full bg-slate-900/60 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-grow">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp</span>
              <input 
                type="text" 
                value={itemPrice}
                onChange={(e) => {
                  setItemPrice(formatInputRupiah(e.target.value));
                  if (error) setError(null);
                }}
                placeholder="Harga (cth: 25.000)"
                className="w-full bg-slate-900/60 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
            
            <button 
              type="submit"
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-1.5 active:scale-[0.98] flex-shrink-0"
            >
              <Plus size={16} /> Tambah
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 font-medium">{error}</p>
        )}
      </form>

      {/* Status warning jika ada item belum dialokasikan */}
      {unassignedCount > 0 && members.length > 0 && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle size={15} className="text-amber-400 flex-shrink-0" />
          <span>Ada <strong>{unassignedCount} barang</strong> belum dialokasikan ke anggota.</span>
        </div>
      )}

      {/* Tabel Item Belanja */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/25">
        <table className="w-full text-left text-xs border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-700/50">
              <th className="py-3 px-4">Nama Barang</th>
              <th className="py-3 px-4 w-1/4">Harga</th>
              <th className="py-3 px-4 w-1/3">Pilih Pembayar</th>
              <th className="py-3 px-4 w-10 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500">
                  <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                  <span>Belum ada barang belanjaan. Tambah manual atau scan struk!</span>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-slate-200">{item.item_name}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-300">{formatRupiah(item.price)}</td>
                  <td className="py-2.5 px-4">
                    {(() => {
                      const assignedMemberIds = item.assigned_to_member_ids || [];
                      const availableMembers = members.filter(member => !assignedMemberIds.includes(member.id));
                      const selectedValue = selectedMemberToAdd[item.id] || '';

                      return (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {assignedMemberIds.length > 0 ? (
                              assignedMemberIds.map((memberId) => {
                                const member = members.find((m) => m.id === memberId);
                                if (!member) return null;
                                return (
                                  <span key={member.id} className="inline-flex items-center gap-2 rounded-full bg-slate-800/70 text-slate-200 px-3 py-1 text-[11px]">
                                    {member.name}
                                    <button
                                      type="button"
                                      onClick={() => onAssignItem(item.id, assignedMemberIds.filter((id) => id !== member.id))}
                                      className="rounded-full border border-slate-700 p-0.5 text-slate-400 hover:text-red-400 hover:border-red-400 transition-colors"
                                      aria-label={`Hapus ${member.name} dari item`}
                                    >
                                      ✕
                                    </button>
                                  </span>
                                );
                              })
                            ) : (
                              <p className="text-[10px] text-slate-500">Belum ada anggota terlibat pada item ini.</p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <select
                              value={selectedValue}
                              onChange={(e) => setSelectedMemberToAdd((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              disabled={members.length === 0 || availableMembers.length === 0}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">Pilih</option>
                              {availableMembers.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedValue) return;
                                onAssignItem(item.id, [...assignedMemberIds, selectedValue]);
                                setSelectedMemberToAdd((prev) => ({ ...prev, [item.id]: '' }));
                              }}
                              disabled={!selectedValue || availableMembers.length === 0}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-white px-3 py-2 text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <Plus size={14}/>
                            </button>
                          </div>

                          {availableMembers.length === 0 && members.length > 0 && (
                            <p className="text-[10px] text-slate-500">Semua anggota sudah ditambahkan pada item ini.</p>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors p-1"
                      title="Hapus barang"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mt-4 border-t border-slate-700/50 pt-3">
        <span>Subtotal Item: <strong className="text-emerald-400 text-sm">{formatRupiah(totalItemsPrice)}</strong></span>
        <span>Total Item: <strong>{items.length}</strong></span>
      </div>
    </div>
  );
};
