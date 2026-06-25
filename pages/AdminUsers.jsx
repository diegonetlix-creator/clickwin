import { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Search, Users, Shield, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auditLog, ACTION } from "@/utils";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select(`
          *,
          wallet:wallets(balance)
        `)
        .order("created_at", { ascending: false });
      
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = async (user, newBalance) => {
    try {
      setProcessing(user.id);
      const balanceNum = parseFloat(newBalance);
      if (isNaN(balanceNum)) return;

      const { error } = await supabase
        .from("wallets")
        .update({ balance: balanceNum })
        .eq("user_id", user.id);

      if (error) throw error;
      
      auditLog(ACTION.UPDATE_WALLET, "wallets", user.id, {
        old_balance: user.wallet?.balance || 0,
        new_balance: balanceNum,
        user_email: user.email
      });

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, wallet: { balance: balanceNum } } : u));
    } catch (err) {
      console.error("Error updating balance:", err);
      toast.error("Error: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const toggleSuspend = async (user) => {
    try {
      setProcessing(user.id);
      const newStatus = user.status === "suspended" ? "active" : "suspended";
      
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);

      if (error) throw error;
      
      auditLog(newStatus === "suspended" ? ACTION.BAN_USER : ACTION.ACTIVATE_USER, "profiles", user.id, {
        user_email: user.email
      });

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (err) {
      console.error("Error suspending user:", err);
      toast.error("Error: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const changeRole = (user, newRole) => {
    setConfirmDialog({
      message: `¿Cambiar el rol de ${user.email} a "${newRole}"?`,
      onConfirm: () => doChangeRole(user, newRole),
    });
  };

  const doChangeRole = async (user, newRole) => {
    try {
      setProcessing(user.id);
      
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", user.id);

      if (error) throw error;
      
      auditLog(ACTION.UPDATE_USER_ROLE, "profiles", user.id, {
        old_role: user.role,
        new_role: newRole,
        user_email: user.email
      });

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error updating role:", err);
      toast.error("Error: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const filteredUsers = users.filter(w =>
    !search || 
    w.nickname?.toLowerCase().includes(search.toLowerCase()) || 
    w.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Shield className="w-7 h-7 text-blue-400" /> Control de Usuarios
        </h1>
        <p className="text-gray-400 text-sm mt-1">{users.length} perfiles totales registrados en la DB</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por email o nombre..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800 text-xs text-gray-500 font-semibold uppercase tracking-wider">
              <div className="col-span-3">Usuario / Email</div>
              <div className="col-span-2 text-center">Registro</div>
              <div className="col-span-2 text-center">Rol</div>
              <div className="col-span-2 text-center">Balance pts</div>
              <div className="col-span-1 text-center">Estado</div>
              <div className="col-span-2 text-center">Acciones</div>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No hay usuarios que coincidan con la búsqueda</div>
            ) : filteredUsers.map((u) => {
              return (
                <div key={u.id} className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800 last:border-0 items-center ${u.status === 'suspended' ? "bg-red-400/5" : "hover:bg-gray-800/50"} transition-colors`}>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${u.status === 'suspended' ? "bg-red-400/20 text-red-400" : "bg-blue-400/20 text-blue-400"}`}>
                      {u.nickname?.charAt(0) || u.email?.substring(0,2) || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{u.nickname || "—"}</div>
                      <div className="text-xs text-gray-500 truncate">{u.email}</div>
                    </div>
                  </div>
                  
                  <div className="col-span-2 text-center">
                    <div className="text-sm text-gray-300">{new Date(u.created_at).toLocaleDateString()}</div>
                  </div>
                  
                  <div className="col-span-2 text-center">
                    <select 
                      disabled={processing === u.id}
                      className="bg-gray-800 border border-gray-700 text-xs text-white rounded-lg px-2 py-1 outline-none"
                      value={u.role || "worker"}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      <option value="worker">Worker</option>
                      <option value="promoter">Promoter</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="col-span-2 text-center">
                     <div className="flex items-center gap-1 justify-center">
                        <input 
                          type="number" 
                          defaultValue={u.wallet?.balance || 0}
                          onBlur={(e) => updateBalance(u, e.target.value)}
                          className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-center text-yellow-400 font-bold focus:border-yellow-400 outline-none"
                        />
                     </div>
                  </div>
                  
                  <div className="col-span-1 text-center">
                    {u.status === "suspended" ? (
                      <span className="text-[10px] bg-red-400/10 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Susp.</span>
                    ) : (
                      <span className="text-[10px] bg-green-400/10 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Act.</span>
                    )}
                  </div>
                  
                  <div className="col-span-2 flex justify-center items-center gap-2">
                    <button onClick={() => toggleSuspend(u)} disabled={processing === u.id}
                      className={`p-1.5 rounded-lg transition-colors ${u.status === "suspended" ? "bg-green-400/10 text-green-400 hover:bg-green-400/20" : "bg-red-400/10 text-red-400 hover:bg-red-400/20"}`}>
                      {processing === u.id ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : u.status === "suspended" ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          confirmLabel="Confirmar"
          danger
        />
      )}
    </>
  );
}



