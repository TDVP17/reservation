"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Building2, CheckCircle2, Clock, FileCheck, Loader2, Ban, ShieldCheck, KeyRound, Bell, Send, Search } from "lucide-react";
import BanModal from "@/components/BanModal";
import PinModal from "@/components/PinModal";
import NotifyModal from "@/components/NotifyModal";
import { useLang } from "@/context/LanguageContext";

const PAGE_LIMIT = 25;

function openBase64Doc(dataUrl: string) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/pdf';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  window.open(URL.createObjectURL(blob), '_blank');
}

type BanMode = "ban" | "deactivate";

export default function AllAgencesPage() {
  const { t } = useLang();
  const [agences, setAgences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [banTarget, setBanTarget] = useState<{ agence: any; mode: BanMode } | null>(null);
  const [pinTarget, setPinTarget] = useState<any>(null);
  const [notifyTarget, setNotifyTarget] = useState<any>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const fetchAgences = (searchTerm: string, pageNum: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    api.get("/admin/agences", { params: { search: searchTerm || undefined, page: pageNum, limit: PAGE_LIMIT } })
      .then(res => {
        setAgences(prev => append ? [...prev, ...res.data] : res.data);
        setHasMore(res.data.length === PAGE_LIMIT);
      })
      .catch(console.error)
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      fetchAgences(search, 1, false);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAgences(search, nextPage, true);
  };

  const handleBan = async (reason: string) => {
    const id = banTarget!.agence._id;
    try {
      await api.patch(`/admin/agences/${id}/ban`, { reason });
      setAgences(prev => prev.map(a => a._id === id ? { ...a, isBanned: true, banReason: reason } : a));
    } catch (err) {
      console.error("Erreur bannissement agence:", err);
      alert(t("ban_agency_error"));
    } finally {
      setBanTarget(null);
    }
  };

  const handleUnban = async (id: string) => {
    try {
      await api.patch(`/admin/agences/${id}/unban`);
      setAgences(prev => prev.map(a => a._id === id ? { ...a, isBanned: false, banReason: null } : a));
    } catch (err) {
      console.error("Erreur réactivation agence:", err);
      alert(t("unban_agency_error"));
    }
  };

  const handleSetPin = async (pin: string) => {
    const id = pinTarget._id;
    await api.patch(`/admin/agences/${id}/pin`, { pin });
    setAgences(prev => prev.map(a => a._id === id ? { ...a, pinResetRequested: false, hasFinancialPin: true } : a));
    setPinTarget(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen md:ml-45">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-8 bg-[#F4F7FE] min-h-screen md:ml-45">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-black text-gray-900">{t("all_agencies_title")}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("search_placeholder_generic")}
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          <button
            onClick={() => setBroadcastOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gray-900 hover:bg-blue-600 text-white font-bold text-sm rounded-2xl transition-colors"
          >
            <Send size={16} /> {t("notif_notify_all_btn")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_agency")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_email")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_city")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_status")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_document")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase"></th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_pin")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_moderation")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {agences.map((agence: any) => (
              <tr key={agence._id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                      <Building2 size={20} />
                    </div>
                    <span className="font-bold text-gray-900">{agence.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-gray-500 font-medium">{agence.email}</td>
                <td className="px-8 py-5 text-gray-500 font-medium">{agence.ville || "—"}</td>
                <td className="px-8 py-5">
                  <div className="flex flex-col gap-1.5">
                    {agence.status === "Validé" ? (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit">
                        <CheckCircle2 size={12} /> {t("status_verified")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit">
                        <Clock size={12} /> {t("status_pending")}
                      </span>
                    )}
                    {agence.isBanned && (
                      <span className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit" title={agence.banReason || ""}>
                        <Ban size={12} /> {t("suspended_badge")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5">
                  {agence.documentProuveAgence ? (
                    <button
                      onClick={() => openBase64Doc(agence.documentProuveAgence)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1"
                    >
                      <FileCheck size={14} /> {t("view_doc_short")}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs italic">{t("none_label")}</span>
                  )}
                </td>
                <td className="px-8 py-5">
                  <button
                    onClick={() => setNotifyTarget(agence)}
                    className="text-gray-500 hover:text-gray-700 font-bold text-xs flex items-center gap-1 w-fit"
                  >
                    <Bell size={13} /> {t("notif_notify_agency_btn")}
                  </button>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setPinTarget(agence)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1 w-fit"
                    >
                      <KeyRound size={13} /> {agence.hasFinancialPin ? t("pin_reset_btn") : t("pin_set_btn")}
                    </button>
                    {agence.pinResetRequested && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold w-fit">{t("pin_reset_requested_badge")}</span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5">
                  {agence.isBanned ? (
                    <button
                      onClick={() => handleUnban(agence._id)}
                      className="text-emerald-600 hover:text-emerald-800 font-bold text-xs flex items-center gap-1"
                    >
                      <ShieldCheck size={13} /> {t("reactivate_btn")}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => setBanTarget({ agence, mode: "ban" })}
                        className="text-red-600 hover:text-red-800 font-bold text-xs flex items-center gap-1"
                      >
                        <Ban size={13} /> {t("ban_suspend_btn")}
                      </button>
                      <button
                        onClick={() => setBanTarget({ agence, mode: "deactivate" })}
                        className="text-gray-500 hover:text-gray-700 font-bold text-xs"
                      >
                        {t("deactivate_btn")}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {agences.length === 0 && !loading && (
          <p className="text-center py-16 text-gray-400 text-sm">{t("no_agences_match_search")}</p>
        )}
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
          title={
            banTarget.mode === "ban"
              ? `${t("ban_modal_title_ban_prefix")} ${banTarget.agence.name || t("this_agency_default")}`
              : `${t("ban_modal_title_deactivate_prefix")} ${banTarget.agence.name || t("this_agency_default")}`
          }
          confirmLabel={banTarget.mode === "ban" ? t("ban_modal_confirm_ban") : t("ban_modal_confirm_deactivate")}
          defaultReason={banTarget.mode === "ban" ? t("ban_default_reason_illegal") : t("ban_default_reason_deactivate")}
          onConfirm={handleBan}
          onClose={() => setBanTarget(null)}
        />
      )}

      {pinTarget && (
        <PinModal
          title={`${t("pin_modal_title")} — ${pinTarget.name}`}
          onConfirm={handleSetPin}
          onClose={() => setPinTarget(null)}
        />
      )}

      {notifyTarget && (
        <NotifyModal
          title={`${t("notif_send_title_agency")} — ${notifyTarget.name}`}
          endpoint={`/admin/notifications/agence/${notifyTarget._id}`}
          onClose={() => setNotifyTarget(null)}
        />
      )}

      {broadcastOpen && (
        <NotifyModal
          title={t("notif_send_title_broadcast")}
          endpoint="/admin/notifications/broadcast"
          onClose={() => setBroadcastOpen(false)}
        />
      )}
    </div>
  );
}
