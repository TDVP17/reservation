"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Users, Mail, Phone, Loader2, Ban, ShieldCheck, Search } from "lucide-react";
import BanModal from "@/components/BanModal";
import { useLang } from "@/context/LanguageContext";

const PAGE_LIMIT = 25;

export default function ClientsPage() {
  const { t } = useLang();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [banTarget, setBanTarget] = useState<any>(null);

  const fetchClients = (searchTerm: string, pageNum: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    api.get("/admin/clients", { params: { search: searchTerm || undefined, page: pageNum, limit: PAGE_LIMIT } })
      .then(res => {
        setClients(prev => append ? [...prev, ...res.data] : res.data);
        setHasMore(res.data.length === PAGE_LIMIT);
      })
      .catch(console.error)
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      fetchClients(search, 1, false);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchClients(search, nextPage, true);
  };

  const handleBan = async (reason: string) => {
    const id = banTarget._id;
    try {
      await api.patch(`/admin/clients/${id}/ban`, { reason });
      setClients(prev => prev.map(c => c._id === id ? { ...c, isBanned: true, banReason: reason } : c));
    } catch (err) {
      console.error("Erreur bannissement:", err);
      alert(t("ban_client_error"));
    } finally {
      setBanTarget(null);
    }
  };

  const handleUnban = async (id: string) => {
    try {
      await api.patch(`/admin/clients/${id}/unban`);
      setClients(prev => prev.map(c => c._id === id ? { ...c, isBanned: false, banReason: null } : c));
    } catch (err) {
      console.error("Erreur réactivation:", err);
      alert(t("unban_client_error"));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen md:ml-45">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-8 bg-[#F4F7FE] min-h-screen md:ml-45">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <Users className="text-blue-600" size={32} /> {t("clients_title")}
          </h1>
          <p className="text-gray-500 font-medium">{clients.length} {t("clients_count_label")}</p>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("search_placeholder_generic")}
            className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_name")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_email")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_phone")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_status")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-medium">
                  {t("no_clients_registered")}
                </td>
              </tr>
            ) : clients.map((client: any) => (
              <tr key={client._id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm">
                      {(client.name || client.nom || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-gray-900">{client.name || client.nom}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="flex items-center gap-2 text-gray-500 font-medium text-sm">
                    <Mail size={14} /> {client.email}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <span className="flex items-center gap-2 text-gray-500 font-medium text-sm">
                    <Phone size={14} /> {client.phone || client.telephone || "—"}
                  </span>
                </td>
                <td className="px-8 py-5">
                  {client.isBanned ? (
                    <span className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit" title={client.banReason || ""}>
                      <Ban size={12} /> {t("status_banned")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit">
                      <ShieldCheck size={12} /> {t("status_active")}
                    </span>
                  )}
                </td>
                <td className="px-8 py-5">
                  {client.isBanned ? (
                    <button
                      onClick={() => handleUnban(client._id)}
                      className="text-emerald-600 hover:text-emerald-800 font-bold text-xs"
                    >
                      {t("reactivate_btn")}
                    </button>
                  ) : (
                    <button
                      onClick={() => setBanTarget(client)}
                      className="text-red-600 hover:text-red-800 font-bold text-xs flex items-center gap-1"
                    >
                      <Ban size={13} /> {t("ban_btn")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {hasMore && (
          <div className="flex justify-center py-6 border-t border-gray-50">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs uppercase rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loadingMore && <Loader2 className="animate-spin" size={14} />}
              {t("load_more_btn")}
            </button>
          </div>
        )}
      </div>

      {banTarget && (
        <BanModal
          title={`${t("ban_modal_title_client_prefix")} ${banTarget.name || banTarget.nom || t("this_client_default")}`}
          confirmLabel={t("ban_modal_confirm_client")}
          defaultReason={t("ban_default_reason_client")}
          onConfirm={handleBan}
          onClose={() => setBanTarget(null)}
        />
      )}
    </div>
  );
}
