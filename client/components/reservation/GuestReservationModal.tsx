"use client";

import { useState } from "react";
import { X, Smartphone, User, Phone, Ticket, AlertTriangle, Clock, Wrench } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";

type Voyage = {
  _id: string;
  destination: string;
  depart?: string;
  date: string;
  heure: string;
  prix: number;
  mat: string;
  typeBus: string;
  placesRestantes: number;
};

type GuestTicketData = {
  _id: string;
  fullName: string;
  phoneNumber: string;
  placesReservees: number;
  status: string;
  createdAt: string;
  voyage: Voyage;
};


type Props = {
  voyage: Voyage;
  onClose: () => void;
  onSuccess: (ticket: GuestTicketData) => void;
};

export default function GuestReservationModal({ voyage, onClose }: Props) {
  const { t, lang } = useLang();
  const [form, setForm] = useState({ fullName: "", phoneNumber: "", places: 1, mobileMoney: "" });
  const [error] = useState("");
  const [showComingSoon, setShowComingSoon] = useState(false);

  const total = voyage.prix * form.places;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowComingSoon(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ticket size={20} className="text-blue-400" />
            <div>
              <p className="text-white font-black text-sm uppercase">
                {voyage.depart ? `${voyage.depart} → ` : ""}{voyage.destination}
              </p>
              <p className="text-slate-400 text-xs">
                {voyage.heure} · {new Date(voyage.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {showComingSoon ? (
          /* Écran paiement en cours de développement */
          <div className="p-8 flex flex-col items-center text-center gap-4 bg-white dark:bg-slate-800">
            <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
              <Wrench size={36} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{t("guest_payment_wip_title")}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {t("guest_payment_wip_desc_prefix")}{" "}
                <span className="font-black text-blue-600">Payunit</span>{t("guest_payment_wip_desc_suffix")}
              </p>
            </div>
            <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left">
              <p className="text-xs font-black text-blue-700 uppercase mb-2 flex items-center gap-1">
                <Clock size={12} /> {t("guest_meanwhile_label")}
              </p>
              <p className="text-xs text-blue-600 leading-relaxed">
                {t("guest_meanwhile_desc")}
              </p>
              <div className="flex gap-2 mt-3">
                <Link
                  href="/auth/login"
                  onClick={onClose}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-black text-xs text-center hover:bg-blue-700 transition"
                >
                  {t("create_account_btn")}
                </Link>
                <Link
                  href="/auth/login"
                  onClick={onClose}
                  className="flex-1 bg-white border border-blue-300 text-blue-600 py-2 rounded-xl font-black text-xs text-center hover:bg-blue-50 transition"
                >
                  {t("login_btn")}
                </Link>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl font-black text-sm transition"
            >
              {t("close_btn")}
            </button>
          </div>
        ) : (
          <>
            {/* Alerte compte */}
            <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-700">{t("guest_reduced_fees_title")}</p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  {t("guest_reduced_fees_desc")}
                </p>
                <div className="flex gap-2 mt-2">
                  <Link href="/auth/login" className="text-[11px] font-black text-amber-700 underline">{t("create_account_btn")}</Link>
                  <span className="text-amber-400">·</span>
                  <Link href="/auth/login" className="text-[11px] font-black text-amber-700 underline">{t("login_btn")}</Link>
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                  <User size={10} /> {t("full_name_label")}
                </label>
                <input
                  type="text"
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400 border border-slate-100 dark:border-slate-600"
                  placeholder={t("full_name_placeholder_example")}
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Phone size={10} /> {t("phone_label")}
                </label>
                <input
                  type="tel"
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400 border border-slate-100 dark:border-slate-600"
                  placeholder={t("profile_phone_placeholder")}
                  value={form.phoneNumber}
                  onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-600">
                <span className="text-xs font-bold text-slate-500">{t("seats_count_label")}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, places: Math.max(1, f.places - 1) }))}
                    className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 font-black text-slate-700 flex items-center justify-center transition"
                  >
                    −
                  </button>
                  <span className="font-black text-blue-600 w-4 text-center">{form.places}</span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, places: Math.min(voyage.placesRestantes, f.places + 1) }))}
                    className="w-7 h-7 rounded-lg bg-blue-100 hover:bg-blue-200 font-black text-blue-600 flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Smartphone size={10} /> {t("mobile_money_number_label")}
                </label>
                <input
                  type="tel"
                  className="w-full p-3.5 bg-blue-50 rounded-xl font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400 border border-blue-200"
                  placeholder="6XX XXX XXX"
                  value={form.mobileMoney}
                  onChange={e => setForm(f => ({ ...f, mobileMoney: e.target.value }))}
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">{t("mobile_money_withdraw_note")}</p>
              </div>

              {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl">{error}</p>}

              {/* Total + Bouton */}
              <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase">{t("total_to_pay_label")}</p>
                  <p className="text-2xl font-black text-white italic">
                    {total.toLocaleString()} <span className="text-xs opacity-40">FCFA</span>
                  </p>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition flex items-center gap-2"
                >
                  <Ticket size={14} />
                  {t("confirm")}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
