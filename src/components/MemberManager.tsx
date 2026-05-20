import React, { useState } from 'react';
import { Users, UserPlus, Trash2, User } from 'lucide-react';
import type { Member } from '../types';

interface MemberManagerProps {
  members: Member[];
  onAddMember: (name: string) => void;
  onRemoveMember: (id: string) => void;
}

export const MemberManager: React.FC<MemberManagerProps> = ({ 
  members, 
  onAddMember, 
  onRemoveMember 
}) => {
  const [nameInput, setNameInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    
    if (!trimmedName) {
      setError('Nama anggota tidak boleh kosong.');
      return;
    }

    if (members.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Nama anggota ini sudah ada di daftar.');
      return;
    }

    onAddMember(trimmedName);
    setNameInput('');
    setError(null);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/60 shadow-xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
          <Users size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-slate-100">Anggota Grup ({members.length})</h3>
          <p className="text-xs text-slate-400">Tambahkan orang yang akan masuk dalam pembagian tagihan</p>
        </div>
      </div>

      {/* Form Input Anggota */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Contoh: Andi, Budi, Cici"
              className="w-full bg-slate-900/60 border border-slate-700 hover:border-slate-600 focus:border-violet-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>
          <button 
            type="submit"
            className="px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/10 flex items-center gap-1.5 active:scale-[0.98]"
          >
            <UserPlus size={16} /> Tambah
          </button>
        </div>
        
        {error && (
          <p className="text-xs text-red-400 mt-1.5 font-medium">{error}</p>
        )}
      </form>

      {/* Daftar Anggota */}
      <div className="space-y-2 pr-1">
        {members.length === 0 ? (
          <div className="h-32 border border-dashed border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-slate-500">
            <Users size={24} className="mb-1 opacity-40" />
            <span className="text-xs">Belum ada anggota. Tambahkan di atas!</span>
          </div>
        ) : (
          members.map((member) => (
            <div 
              key={member.id} 
              className="flex justify-between items-center bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-slate-700/50 rounded-xl p-3 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                  {member.name.substring(0, 2)}
                </div>
                <span className="text-sm font-medium text-slate-200">{member.name}</span>
              </div>
              
              <button
                onClick={() => onRemoveMember(member.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title={`Hapus ${member.name}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
