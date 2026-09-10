"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import api from "@/lib/api";
import {
  Users, Phone, Mail, Ticket, Calendar,
  Clock, Bus, UserCircle, Wifi, WifiOff, ChevronDown, ChevronUp,
  Navigation, CheckCircle2, CalendarClock, Send, X, Loader2, AlertCircle,
} from "lucide-react";
import { useLang } from "@/context/LanguageContext";

type Passager = {
  _id: string;
  fullName: string;
  phoneNumber: string;
  placesReservees: number;
  status: string;
  isGuest: boolean;
  guestMobileMoney?: string;
  createdAt: string;
  codeBillet?: string;
  codeUsed?: boolean;
  client?: {
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  } | null;
};

type VoyageInfo = {
  _id: string;
  destination: string;
  depart?: string;
  date: string;
  heure: string;
  prix: number;
  mat: string;
  typeBus: string;
  placesTotal: number;
  placesRestantes: number;
  status?: string;
};

type VoyageGroup = {
  voyage: VoyageInfo;
  passagers: Passager[];
  totalPlaces: number;
  totalRevenus: number;
};

type NotifyResult = { notifiedCount: number };

const PRESETS = [
  { key: "delay",     subjectKey: "pass_notify_template_delay_subject",     messageKey: "pass_notify_template_delay_message" },
  { key: "platform",  subjectKey: "pass_notify_template_platform_subject",  messageKey: "pass_notify_template_platform_message" },
  { key: "schedule",  subjectKey: "pass_notify_template_schedule_subject",  messageKey: "pass_notify_template_schedule_message" },
] as const;

export default function PassagersPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400 font-bold animate-pulse">…</div>}>
      <PassagersPageInner />
    </Suspense>
  );
}

function PassagersPageInner() {
  const { t, lang } = useLang();
  const searchParams = useSearchParams();
  const focusVoyageId = searchParams.get("voyage");
  const VOYAGE_STATUS: Record<string, { label: string; color: string; icon: any }> = {
    scheduled: { label: t("status_scheduled"),  color: "bg-slate-100 text-slate-600",  icon: CalendarClock },
    en_route:  { label: t("status_en_route"),   color: "bg-green-100 text-green-700",  icon: Navigation },
    arrived:   { label: t("status_arrived"),     color: "bg-blue-100 text-blue-700",    icon: CheckCircle2 },
  };
  const { data = [], isLoading: loading, mutate } = useSWR<VoyageGroup[]>("/reservations/ma-liste-passagers");
  const [open, setOpen]       = useState<Record<string, boolean>>({});
  const [notifyVoyage, setNotifyVoyage] = useState<VoyageInfo | null>(null);
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const didInitOpenRef = useRef(false);

  useEffect(() => {
    if (didInitOpenRef.current || data.length === 0) return;
    didInitOpenRef.current = true;
    // Arrivée depuis une notification "voyage complet" : on ouvre ce voyage
    // précis plutôt que le premier de la liste, et on y défile.
    if (focusVoyageId && data.some(g => g.voyage._id === focusVoyageId)) {
      setOpen({ [focusVoyageId]: true });
    } else {
      setOpen({ [data[0].voyage._id]: true });
    }
  }, [data, focusVoyageId]);

  useEffect(() => {
    if (!focusVoyageId || loading) return;
    const el = groupRefs.current.get(focusVoyageId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusVoyageId, loading, data]);

  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }));

  if (loading) return (
    <div className="p-10 text-center text-gray-400 font-bold animate-pulse">
      {t("pass_loading")}
    </div>
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">{t("pass_title")}</h1>
            <p className="text-gray-500 text-sm">
              {data.length === 0
                ? t("pass_no_voyage")
                : `${data.length} ${t("nav_voyages")} · ${data.reduce((a, g) => a + g.passagers.length, 0)} ${t("pass_passengers_label").toLowerCase()}`}
            </p>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-200 p-16 text-center">
            <Ticket size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="font-black text-gray-400 text-lg">{t("pass_no_reservation")}</p>
            <p className="text-gray-400 text-sm mt-2">{t("pass_no_reservation_sub")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map(group => {
              const v = group.voyage;
              const isOpen = !!open[v._id];
              const st = VOYAGE_STATUS[v.status ?? "scheduled"] ?? VOYAGE_STATUS.scheduled;
              const StatusIcon = st.icon;
              const fillPct = v.placesTotal > 0
                ? Math.round((group.totalPlaces / v.placesTotal) * 100)
                : 0;

              return (
                <div
                  key={v._id}
                  ref={el => { if (el) groupRefs.current.set(v._id, el); }}
                  className={`bg-white rounded-[2rem] shadow-sm border overflow-hidden ${v._id === focusVoyageId ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-100"}`}
                >

                  {/* EN-TÊTE VOYAGE (cliquable) */}
                  <div
                    onClick={() => toggle(v._id)}
                    className="w-full text-left cursor-pointer"
                  >
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex flex-wrap items-center gap-4">
                      {/* Infos trajet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${st.color}`}>
                            <StatusIcon size={10} /> {st.label}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{v.typeBus}</span>
                        </div>
                        <h2 className="text-xl font-black tracking-tight">
                          {v.depart ? <span className="text-slate-400">{v.depart} → </span> : null}
                          {v.destination}
                        </h2>
                        <div className="flex items-center gap-4 mt-1 text-slate-400 text-xs">
                          <span className="flex items-center gap-1"><Calendar size={11} />{new Date(v.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long" })}</span>
                          <span className="flex items-center gap-1"><Clock size={11} />{v.heure}</span>
                          <span className="flex items-center gap-1"><Bus size={11} />{v.mat}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{t("pass_passengers_label")}</p>
                          <p className="text-2xl font-black text-white">{group.passagers.length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{t("pass_seats_label")}</p>
                          <p className="text-2xl font-black text-blue-400">{group.totalPlaces}/{v.placesTotal}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{t("pass_revenue_label")}</p>
                          <p className="text-lg font-black text-emerald-400">{group.totalRevenus.toLocaleString()} F</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setNotifyVoyage(v); }}
                          title={t("pass_notify_btn")}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black transition"
                        >
                          <Send size={13} /> {t("pass_notify_btn")}
                        </button>
                        <div className="text-slate-400">
                          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* Barre de remplissage */}
                    <div className="h-1.5 bg-slate-700">
                      <div
                        className={`h-full transition-all ${fillPct >= 80 ? "bg-emerald-400" : "bg-blue-500"}`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>

                  {/* LISTE DES PASSAGERS */}
                  {isOpen && (
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.passagers.map((p, i) => (
                          <PassagerCard key={p._id} passager={p} index={i + 1} onValidated={() => mutate()} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {notifyVoyage && (
        <NotifyModal voyage={notifyVoyage} onClose={() => setNotifyVoyage(null)} />
      )}
    </div>
  );
}

function PassagerCard({ passager: p, index, onValidated }: { passager: Passager; index: number; onValidated: () => void }) {
  const { t, lang } = useLang();
  const [validating, setValidating] = useState(false);
  const initiale = p.fullName?.charAt(0)?.toUpperCase() ?? "?";

  const handleValidateCode = async () => {
    if (!confirm(t("pass_validate_code_confirm"))) return;
    setValidating(true);
    try {
      await api.patch(`/reservations/${p._id}/valider-code`);
      onValidated();
    } catch {
      alert(t("pass_validate_code_error"));
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">

      {/* Avatar / Numéro */}
      <div className="relative flex-shrink-0">
        {p.client?.avatar ? (
          <img src={p.client.avatar} alt={p.fullName} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow" />
        ) : (
          <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center font-black text-lg text-blue-600 shadow group-hover:bg-blue-600 group-hover:text-white transition-colors">
            {initiale}
          </div>
        )}
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 text-white text-[9px] font-black rounded-full flex items-center justify-center">
          {index}
        </span>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-black text-gray-900 text-sm truncate">{p.fullName}</p>
          {p.isGuest ? (
            <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">
              <WifiOff size={8} /> {t("pass_guest_label")}
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">
              <Wifi size={8} /> {t("pass_account_label")}
            </span>
          )}
        </div>

        <div className="space-y-1">
          {p.codeBillet && (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-blue-600 font-mono font-bold flex items-center gap-1.5">
                <Ticket size={11} className="text-blue-400" />
                {p.codeBillet}
              </p>
              {p.codeUsed ? (
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 size={9} /> {t("pass_code_used_badge")}
                </span>
              ) : p.status === "Confirmé" ? (
                <button
                  onClick={handleValidateCode}
                  disabled={validating}
                  className="flex items-center gap-1 bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-[9px] font-black px-2 py-1 rounded-full transition-colors disabled:opacity-50"
                >
                  {validating ? <Loader2 size={9} className="animate-spin" /> : <CheckCircle2 size={9} />}
                  {t("pass_validate_code_btn")}
                </button>
              ) : null}
            </div>
          )}

          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Phone size={11} className="text-gray-400" />
            {p.phoneNumber}
          </p>

          {p.client?.email && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <Mail size={11} className="text-gray-400" />
              {p.client.email}
            </p>
          )}

          {p.isGuest && p.guestMobileMoney && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5 font-bold">
              <span className="text-[9px] bg-amber-100 px-1.5 py-0.5 rounded-full font-black">{t("pass_mobile_money_label")}</span>
              {p.guestMobileMoney}
            </p>
          )}

          {p.client?.phone && !p.isGuest && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <UserCircle size={11} />
              {p.client.phone}
            </p>
          )}
        </div>
      </div>

      {/* Places */}
      <div className="flex-shrink-0 text-right">
        <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-center">
          <p className="text-[9px] font-black uppercase">{t("pass_seats_label")}</p>
          <p className="text-xl font-black leading-none">{p.placesReservees}</p>
        </div>
        <p className="text-[9px] text-gray-400 mt-1 text-center">
          {new Date(p.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}
        </p>
      </div>
    </div>
  );
}

function NotifyModal({ voyage, onClose }: { voyage: VoyageInfo; onClose: () => void }) {
  const { t } = useLang();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<NotifyResult | null>(null);
  const [error, setError]     = useState("");

  const applyPreset = (subjectKey: string, messageKey: string) => {
    setSubject(t(subjectKey as any));
    setMessage(t(messageKey as any));
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post(`/agences/notifications/voyage/${voyage._id}`, { title: subject, body: message });
      setResult({ notifiedCount: res.data.notifiedCount ?? 0 });
    } catch (err: any) {
      setError(err?.response?.data?.error || t("pass_notify_error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 min-w-11 min-h-11 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
          <X size={18} className="text-gray-400" />
        </button>

        <h2 className="text-xl font-black text-gray-900 mb-1">{t("pass_notify_title")}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {voyage.depart ? `${voyage.depart} → ` : ""}{voyage.destination} · {voyage.heure}
        </p>

        <div className="flex flex-wrap gap-2 mb-5">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.subjectKey, p.messageKey)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-bold transition"
            >
              {t(`pass_notify_template_${p.key}` as any)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t("pass_notify_subject_label")}</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent rounded-xl p-3 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t("pass_notify_message_label")}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full bg-gray-50 border-2 border-transparent rounded-xl p-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 font-bold flex items-center gap-1 mt-3"><AlertCircle size={12} /> {error}</p>
        )}

        {result && (
          <p className="text-xs text-emerald-600 font-bold mt-3">
            {t("pass_notify_result").replace("{count}", String(result.notifiedCount))}
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !message.trim()}
          className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {sending ? t("pass_notify_sending") : t("pass_notify_send_btn")}
        </button>
      </div>
    </div>
  );
}
