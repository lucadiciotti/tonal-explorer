import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Users, ChevronRight, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface UserStats {
  sessionCount: number;
  totalNotes: number;
  correctNotes: number;
  accuracy: number;
}

interface AdminUsersPageProps {
  onBack: () => void;
  onSelectUserStats: (userId: string, email: string) => void;
}

export function AdminUsersPage({ onBack, onSelectUserStats }: AdminUsersPageProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, UserStats>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load profiles:', error);
      setLoading(false);
      return;
    }

    setUsers((data ?? []) as UserProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (users.length === 0) return;

    async function loadStats() {
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('user_id, correct_notes, total_notes');

      if (error || !sessionData) return;

      const map: Record<string, UserStats> = {};
      for (const s of sessionData) {
        const uid = s.user_id as string;
        if (!map[uid]) {
          map[uid] = { sessionCount: 0, totalNotes: 0, correctNotes: 0, accuracy: 0 };
        }
        map[uid].sessionCount += 1;
        map[uid].totalNotes += s.total_notes ?? 0;
        map[uid].correctNotes += s.correct_notes ?? 0;
      }
      for (const uid of Object.keys(map)) {
        const s = map[uid];
        s.accuracy = s.totalNotes > 0 ? Math.round((s.correctNotes / s.totalNotes) * 100) : 0;
      }
      setStatsMap(map);
    }

    loadStats();
  }, [users]);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Users className="w-6 h-6 text-slate-700 dark:text-slate-200" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Utenti</h2>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per email..."
          className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
        />
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-slate-800 dark:border-t-slate-300 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">Nessun utente trovato.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const stats = statsMap[u.id];
            return (
              <button
                key={u.id}
                onClick={() => onSelectUserStats(u.id, u.email)}
                className="w-full flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {u.role === 'admin' && (
                    <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{u.email}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Registrato il {formatDate(u.created_at)}
                      {u.role === 'admin' && <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">Admin</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {stats && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{stats.sessionCount}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">sessioni</p>
                    </div>
                  )}
                  {stats && stats.totalNotes > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{stats.accuracy}%</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">accuratezza</p>
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
        {filtered.length} {filtered.length === 1 ? 'utente' : 'utenti'}
      </p>
    </div>
  );
}
