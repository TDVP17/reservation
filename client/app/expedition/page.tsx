"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { showPaymentError } from "@/lib/paymentError";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { QRCodeSVG } from "qrcode.react";
import {
  Package, MapPin, ChevronRight, ChevronLeft,
  Upload, X, Loader2, CheckCircle2, CreditCard,
  Smartphone, AlertCircle, User, Phone,
} from "lucide-react";

type Step    = 1 | 2 | 3 | 4;
type PayStep = "choose" | "mobile_input" | "card_form" | "processing";
type Agence  = { _id: string; name: string; ville: string };
type Quote   = { prixExpedition: number; fraisPlateforme: number; montantTotal: number };

function isExpiryValid(mm: string, yy: string) {
  if (!mm || !yy || mm.length !== 2 || yy.length !== 2) return false;
  const month = parseInt(mm, 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expYear = 2000 + parseInt(yy, 10);
  return expYear > now.getFullYear() || (expYear === now.getFullYear() && month >= now.getMonth() + 1);
}

function fmtCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

const REGIONS = ["Adamaoua","Centre","Est","Extrême-Nord","Littoral","Nord","Nord-Ouest","Ouest","Sud","Sud-Ouest"];

const CITIES: Record<string, string[]> = {
  "Adamaoua":     ["Ngaoundéré","Tibati","Meiganga","Banyo","Tignère","Ngaoundal"],
  "Centre":       ["Yaoundé","Mbalmayo","Bafia","Nanga-Eboko","Obala","Mfou","Essé","Monatélé"],
  "Est":          ["Bertoua","Abong-Mbang","Batouri","Yokadouma","Mbang","Doumé","Bélabo"],
  "Extrême-Nord": ["Maroua","Kousseri","Mora","Yagoua","Kaélé","Mokolo","Waza","Meri"],
  "Littoral":     ["Douala","Nkongsamba","Edéa","Loum","Mbanga","Manjo","Penja","Ndom"],
  "Nord":         ["Garoua","Guider","Poli","Figuil","Lagdo","Rey-Bouba","Tchollire"],
  "Nord-Ouest":   ["Bamenda","Kumbo","Wum","Ndop","Nkambe","Fundong","Bafut","Mbengwi"],
  "Ouest":        ["Bafoussam","Dschang","Foumban","Mbouda","Bangangté","Bafang","Baham","Foumbot"],
  "Sud":          ["Ebolowa","Kribi","Sangmélima","Ambam","Lolodorf","Djoum","Mvangué"],
  "Sud-Ouest":    ["Buea","Limbe","Kumba","Mamfe","Tiko","Mundemba","Idenau","Muyuka"],
};

export default function ExpeditionPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { t }   = useLang();

  const [step, setStep]             = useState<Step>(1);
  const [payStep, setPayStep]       = useState<PayStep>("choose");
  const [phonePayment, setPhonePayment] = useState("");
  const [card, setCard]             = useState({ nom: "", numero: "", mm: "", yy: "", cvv: "" });
  const [cardError, setCardError]   = useState("");
  const [agences, setAgences]       = useState<Agence[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote]           = useState<Quote | null>(null);
  const [shipmentCreated, setShipmentCreated] = useState<{ id: string; montantTotal: number } | null>(null);
  const [codes, setCodes]           = useState<{ codeClient: string; codeAgence: string } | null>(null);

  const [form, setForm] = useState({
    image: "" as string, imageFile: null as File | null,
    contenu: "", valeur: "",
    nomExpediteur: "", telephoneExpediteur: "",
    nomDestinataire: "", telephoneDestinataire: "", emailDestinataire: "",
    regionDepart: "", villeDepart: "",
    regionDestination: "", villeDestination: "",
    agenceId: "", agenceDestinationId: "", adresseDepart: "",
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Pré-remplir expéditeur + charger les agences validées (chargement initial de la page)
  useEffect(() => {
    Promise.allSettled([
      api.get("/clients/me").then(r => {
        setForm(f => ({
          ...f,
          nomExpediteur:       r.data.client?.name  || "",
          telephoneExpediteur: r.data.client?.phone || "",
        }));
      }),
      api.get("/agences/validated").then(r => setAgences(r.data)),
    ]).finally(() => setPageLoading(false));
  }, []);

  // Devis
  useEffect(() => {
    if (!form.regionDepart || !form.regionDestination || !form.valeur) { setQuote(null); return; }
    api.get("/shipments/quote", {
      params: { valeur: form.valeur, regionDepart: form.regionDepart, regionDestination: form.regionDestination },
    }).then(r => setQuote(r.data)).catch(() => setQuote(null));
  }, [form.regionDepart, form.regionDestination, form.valeur]);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => set("image", reader.result as string);
    setForm(f => ({ ...f, imageFile: file }));
    reader.readAsDataURL(file);
  };

  const canNext = () => {
    if (step === 1) return (
      form.contenu && form.valeur &&
      Number(form.valeur) > 0 && Number(form.valeur) <= 200000 &&
      form.nomExpediteur && form.telephoneExpediteur &&
      form.nomDestinataire && form.telephoneDestinataire
    );
    if (step === 2) return form.regionDepart && form.villeDepart && form.regionDestination && form.villeDestination
      && form.agenceId && form.agenceDestinationId && form.agenceId !== form.agenceDestinationId && form.adresseDepart;
    return true;
  };

  // ── Créer le shipment (step 3) ───────────────────────────────────────────
  const creerShipment = async () => {
    if (shipmentCreated) return shipmentCreated;
    const fd = new FormData();
    fd.append("contenu",               form.contenu);
    fd.append("valeur",                form.valeur);
    fd.append("nomExpediteur",         form.nomExpediteur);
    fd.append("telephoneExpediteur",   form.telephoneExpediteur);
    fd.append("nomDestinataire",       form.nomDestinataire);
    fd.append("telephoneDestinataire", form.telephoneDestinataire);
    fd.append("emailDestinataire",     form.emailDestinataire);
    fd.append("regionDepart",          form.regionDepart);
    fd.append("villeDepart",           form.villeDepart);
    fd.append("regionDestination",     form.regionDestination);
    fd.append("villeDestination",      form.villeDestination);
    fd.append("agenceId",              form.agenceId);
    fd.append("agenceDestinationId",   form.agenceDestinationId);
    fd.append("adresseDepart",         form.adresseDepart);
    if (form.imageFile) fd.append("image", form.imageFile);
    const res = await api.post("/shipments", fd, { headers: { "Content-Type": "multipart/form-data" } });
    const { shipment } = res.data;
    const created = { id: shipment._id, montantTotal: shipment.montantTotal };
    setShipmentCreated(created);
    setCodes({ codeClient: shipment.codeClient, codeAgence: shipment.codeAgence });
    return created;
  };

  // ── Paiement par carte (Kora) ─────────────────────────────────────────────
  const payerCarte = async () => {
    setCardError("");
    if (!card.nom.trim())                              return setCardError(t("card_name_required"));
    if (card.numero.replace(/\s/g, "").length < 16)   return setCardError(t("card_number_incomplete"));
    if (!isExpiryValid(card.mm, card.yy))             return setCardError(t("card_expiry_invalid"));
    if (card.cvv.length < 3)                          return setCardError(t("card_cvv_invalid"));
    setSubmitting(true); setPayStep("processing");
    try {
      const s = await creerShipment();
      const res = await api.post("/payments/initiate-card", { shipmentId: s.id, amount: s.montantTotal });
      window.location.href = res.data.checkoutUrl;
    } catch (err: any) {
      const wasUnavailable = showPaymentError(err, t);
      setPayStep(wasUnavailable ? "choose" : "card_form");
    } finally { setSubmitting(false); }
  };

  // ── Paiement Mobile Money (Fapshi) ───────────────────────────────────────
  const payerMobileMoney = async () => {
    if (!phonePayment.trim()) return alert(t("enter_payment_number_error"));
    setSubmitting(true);
    setPayStep("processing");
    try {
      const s = await creerShipment();
      const res = await api.post("/payments/initiate", {
        shipmentId: s.id,
        amount:     s.montantTotal,
        phone:      phonePayment,
      });
      window.location.href = res.data.paymentUrl;
    } catch (err: any) {
      const wasUnavailable = showPaymentError(err, t);
      setPayStep(wasUnavailable ? "choose" : "mobile_input");
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) return <GlobalLoader show message={t("loading_shipments")} />;

  // ═══ CONFIRMATION ════════════════════════════════════════════════════════
  if (step === 4 && codes) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-600" />
          </div>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">{t("expedition_created")}</h1>
          <p className="text-slate-500 text-sm">{t("expedition_created_sub")}</p>
        </div>
        <div className="space-y-3">
          {[
            { label: t("code_client"),       code: codes.codeClient,  bg: "bg-blue-50 dark:bg-blue-900/20",    border: "border-blue-200 dark:border-blue-700",   text: "text-blue-600 dark:text-blue-400",   desc: t("code_client_desc") },
            { label: t("code_agence"),       code: codes.codeAgence,  bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-700", text: "text-purple-600 dark:text-purple-400", desc: t("code_agence_desc") },
          ].map(({ label, code, bg, border, text, desc }) => (
            <div key={code} className={`p-4 rounded-2xl border ${bg} ${border} flex items-center gap-4`}>
              <div className="flex-1">
                <p className={`text-[10px] font-black uppercase ${text}`}>{label}</p>
                <p className="text-xl font-black tracking-widest text-slate-800 dark:text-slate-100 mt-1">{code}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              {code === codes.codeAgence && (
                <div className="bg-white p-2 rounded-xl flex-shrink-0">
                  <QRCodeSVG value={code} size={64} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push(`/expedition/${shipmentCreated?.id}`)}
            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition">
            {t("suivre_expedition")}
          </button>
          <button onClick={() => { setStep(1); setCodes(null); setShipmentCreated(null); setPayStep("choose"); }}
            className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-4 rounded-2xl font-black text-sm transition">
            {t("nouvelle_expedition")}
          </button>
        </div>
      </div>
    </div>
  );

  // ═══ LAYOUT PRINCIPAL ════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 uppercase italic flex items-center gap-3">
            <Package size={26} className="text-blue-600 flex-shrink-0" /> {t("expedition_title")}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t("expedition_sub")}</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-6">
          {[t("step_colis"),t("step_logistique"),t("step_paiement")].map((label, i) => {
            const n = i + 1; const done = step > n; const active = step === n;
            return (
              <div key={n} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                    done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                  }`}>{done ? "✓" : n}</div>
                  <span className={`text-[9px] font-bold uppercase hidden sm:block whitespace-nowrap ${active ? "text-blue-600" : "text-slate-400"}`}>{label}</span>
                </div>
                {i < 2 && <div className={`h-0.5 flex-1 mx-1 ${done ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700"}`} />}
              </div>
            );
          })}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[1.75rem] shadow-xl border border-slate-100 dark:border-slate-700">

          {/* ═══ ÉTAPE 1 : Colis + Personnes ════════════════════════════ */}
          {step === 1 && (
            <div className="p-5 sm:p-8 space-y-4">
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Package size={18} className="text-blue-600" /> {t("colis_info")}
              </h2>

              {/* Upload image */}
              <div onClick={() => fileRef.current?.click()}
                className="w-full h-28 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition overflow-hidden relative bg-slate-50 dark:bg-slate-700/50">
                {form.image ? (
                  <>
                    <img src={form.image} alt="" className="w-full h-full object-cover" />
                    <button onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, image: "", imageFile: null })); }}
                      className="absolute top-2 right-2 bg-white/90 dark:bg-slate-800/90 rounded-full p-1.5 shadow">
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={20} className="text-slate-300 mb-1" />
                    <span className="text-xs text-slate-400">{t("colis_photo")} <span className="text-slate-300">{t("colis_photo_optional")}</span></span>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("colis_description")}</label>
                <input className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-4 py-3.5 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={form.contenu} onChange={e => set("contenu", e.target.value)} placeholder={t("colis_description_ph")} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("colis_valeur")}</label>
                <input type="number" min="1" max="200000"
                  className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-4 py-3.5 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={form.valeur} onChange={e => set("valeur", e.target.value)} placeholder={t("value_placeholder_example")} />
                {Number(form.valeur) > 200000 && (
                  <p className="text-red-500 text-xs flex items-center gap-1 ml-1"><AlertCircle size={11} /> {t("colis_valeur_max_error")}</p>
                )}
              </div>

              {/* Séparateur expéditeur */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1.5 mb-3">
                  <User size={11} /> {t("expediteur_section")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("full_name_label")}</label>
                    <input className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-4 py-3.5 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={form.nomExpediteur} onChange={e => set("nomExpediteur", e.target.value)} placeholder={t("your_name_placeholder")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Phone size={9} /> {t("number_label")}</label>
                    <input type="tel" className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-4 py-3.5 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={form.telephoneExpediteur} onChange={e => set("telephoneExpediteur", e.target.value)} placeholder={t("phone_number_placeholder_short")} />
                  </div>
                </div>
              </div>

              {/* Séparateur destinataire */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-1.5 mb-3">
                  <User size={11} /> {t("destinataire_section")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("full_name_label")}</label>
                    <input className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-4 py-3.5 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={form.nomDestinataire} onChange={e => set("nomDestinataire", e.target.value)} placeholder={t("recipient_name_placeholder")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Phone size={9} /> {t("number_label")}</label>
                    <input type="tel" className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-4 py-3.5 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={form.telephoneDestinataire} onChange={e => set("telephoneDestinataire", e.target.value)} placeholder={t("phone_number_placeholder_short")} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("destinataire_email_label")}</label>
                    <input type="email" className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-4 py-3.5 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={form.emailDestinataire} onChange={e => set("emailDestinataire", e.target.value)} placeholder={t("destinataire_email_ph")} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ÉTAPE 2 : Logistique ════════════════════════════════════ */}
          {step === 2 && (
            <div className="p-5 sm:p-8 space-y-4">
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" /> {t("logistique_title")}
              </h2>

              {/* Départ */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {t("region_depart")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select className="bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-3 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={form.regionDepart} onChange={e => { set("regionDepart", e.target.value); set("villeDepart", ""); }}>
                    <option value="">{t("region_label")}</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select disabled={!form.regionDepart}
                    className="bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-3 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-40"
                    value={form.villeDepart} onChange={e => set("villeDepart", e.target.value)}>
                    <option value="">{t("ville_label")}</option>
                    {(CITIES[form.regionDepart] || []).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <select className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-4 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.agenceId} onChange={e => set("agenceId", e.target.value)}>
                  <option value="">{t("agence_depart_select")}</option>
                  {agences.map(a => <option key={a._id} value={a._id}>{a.name} — {a.ville}</option>)}
                </select>
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {t("destination")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select className="bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-3 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={form.regionDestination} onChange={e => { set("regionDestination", e.target.value); set("villeDestination", ""); }}>
                    <option value="">{t("region_label")}</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select disabled={!form.regionDestination}
                    className="bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-3 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-40"
                    value={form.villeDestination} onChange={e => set("villeDestination", e.target.value)}>
                    <option value="">{t("ville_label")}</option>
                    {(CITIES[form.regionDestination] || []).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <select className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-4 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.agenceDestinationId} onChange={e => set("agenceDestinationId", e.target.value)}>
                  <option value="">{t("agence_destination_select")}</option>
                  {agences.filter(a => a._id !== form.agenceId).map(a => <option key={a._id} value={a._id}>{a.name} — {a.ville}</option>)}
                </select>
                <p className="text-xs text-slate-400 ml-1">{t("agence_destination_hint")}</p>
              </div>

              {/* Adresse récupération */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("adresse_recuperation")}</label>
                <input className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-4 py-3.5 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={form.adresseDepart} onChange={e => set("adresseDepart", e.target.value)} placeholder={t("adresse_recuperation_ph")} />
              </div>

              {/* Estimation */}
              {quote && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 space-y-1.5">
                  <p className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase">{t("estimation_title")}</p>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>{t("transport_label")}</span><span className="font-bold">{quote.prixExpedition.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>{t("frais_label")}</span><span className="font-bold">+{quote.fraisPlateforme.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between font-black text-blue-800 dark:text-blue-200 pt-1 border-t border-blue-200 dark:border-blue-700">
                    <span>{t("total_estime")}</span><span>{quote.montantTotal.toLocaleString()} FCFA</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ÉTAPE 3 : Paiement ══════════════════════════════════════ */}
          {step === 3 && (() => {
            const total = quote ? quote.montantTotal : 0;

            return (
              <div className="p-5 sm:p-8 space-y-4">
                <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard size={18} className="text-blue-600" /> {t("step_paiement")}
                </h2>

                {/* Récap compact 2 colonnes */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                  {[
                    [t("expediteur_section"),   `${form.nomExpediteur}`],
                    [t("destinataire_section"), `${form.nomDestinataire}`],
                    [t("recap_trajet"), `${form.villeDepart} → ${form.villeDestination}`],
                    [t("colis_description"),    form.contenu],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[9px] font-black text-slate-400 uppercase">{k}</p>
                      <p className="font-black text-slate-800 dark:text-slate-100 text-xs truncate">{v}</p>
                    </div>
                  ))}
                </div>

                {quote && (
                  <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                    <span className="text-xs text-blue-600 dark:text-blue-300 font-bold">{t("total_label")} {t("fees_included_suffix")}</span>
                    <span className="font-black text-blue-800 dark:text-blue-200">{total.toLocaleString()} FCFA</span>
                  </div>
                )}

                {/* ── Choisir méthode ── */}
                {payStep === "choose" && (
                  <div className="space-y-3">
                    <button onClick={() => setPayStep("mobile_input")}
                      className="w-full flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 border border-orange-200 dark:border-orange-700 rounded-2xl transition group">
                      <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0"><Smartphone size={20} className="text-white" /></div>
                      <div className="text-left flex-1">
                        <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{t("pay_mobile")}</p>
                        <p className="text-xs text-slate-400">{t("pay_mobile_sub")}</p>
                      </div>
                      <ChevronRight size={16} className="ml-auto text-orange-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => { setCardError(""); setPayStep("card_form"); }}
                      className="w-full flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 border border-blue-200 dark:border-blue-700 rounded-2xl transition group">
                      <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0"><CreditCard size={20} className="text-white" /></div>
                      <div className="text-left flex-1">
                        <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{t("pay_card")}</p>
                        <p className="text-xs text-slate-400">{t("pay_card_sub")}</p>
                      </div>
                      <ChevronRight size={16} className="ml-auto text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}

                {/* ── Mobile Money : saisie numéro ── */}
                {payStep === "mobile_input" && (
                  <div className="space-y-3">
                    <button onClick={() => setPayStep("choose")} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">
                      <ChevronLeft size={14} /> {t("changer_methode")}
                    </button>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-700 space-y-3">
                      <p className="text-sm font-black text-orange-700 dark:text-orange-300 flex items-center gap-2">
                        <Smartphone size={16} /> {t("pay_mobile")}
                      </p>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("numero_paiement")}</label>
                        <input type="tel" autoFocus
                          className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3.5 font-bold text-sm focus:ring-2 focus:ring-orange-400/30 outline-none border border-orange-200 dark:border-orange-700"
                          value={phonePayment} onChange={e => setPhonePayment(e.target.value)} placeholder={t("payment_number_placeholder_example")} />
                        <p className="text-xs text-slate-400 ml-1">{t("numero_paiement_sub")}</p>
                      </div>
                      <button onClick={payerMobileMoney} disabled={submitting || !phonePayment.trim()}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-95">
                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <><Smartphone size={18} /> {t("payer_maintenant")}</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Carte bancaire : formulaire ── */}
                {payStep === "card_form" && (
                  <div className="space-y-3">
                    <button onClick={() => setPayStep("choose")} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">
                      <ChevronLeft size={14} /> {t("changer_methode")}
                    </button>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 space-y-3">
                      <p className="text-sm font-black text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <CreditCard size={16} /> {t("pay_card")}
                      </p>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("wallet_card_name")}</label>
                        <input className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 border border-blue-100 dark:border-blue-800"
                          value={card.nom} onChange={e => setCard(c => ({ ...c, nom: e.target.value }))} placeholder={t("card_name_placeholder_example")} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("wallet_card_number")}</label>
                        <input className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 border border-blue-100 dark:border-blue-800 tracking-widest"
                          value={card.numero} onChange={e => setCard(c => ({ ...c, numero: fmtCardNumber(e.target.value) }))}
                          placeholder={t("card_number_placeholder_example")} maxLength={19} />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "MM",  key: "mm",  ph: "MM",  max: 2 },
                          { label: t("card_yy_label"),  key: "yy",  ph: t("card_yy_label"),  max: 2 },
                          { label: "CVV", key: "cvv", ph: "•••", max: 4, type: "password" },
                        ].map(({ label, key, ph, max, type }) => (
                          <div key={key} className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>
                            <input type={type || "text"} maxLength={max}
                              className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 rounded-xl px-2 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 border border-blue-100 dark:border-blue-800 text-center"
                              value={(card as any)[key]}
                              onChange={e => setCard(c => ({ ...c, [key]: e.target.value.replace(/\D/g,"").slice(0,max) }))}
                              placeholder={ph} />
                          </div>
                        ))}
                      </div>

                      {cardError && (
                        <p className="text-red-500 text-xs font-bold flex items-center gap-1">
                          <AlertCircle size={12} /> {cardError}
                        </p>
                      )}

                      <button onClick={payerCarte} disabled={submitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-95">
                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <><CreditCard size={18} /> {t("payer_maintenant")} — {total.toLocaleString()} FCFA</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Traitement ── */}
                {payStep === "processing" && (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <Loader2 className="animate-spin text-blue-600" size={36} />
                    <p className="font-black text-slate-600 dark:text-slate-300 text-sm">{t("redirect_paiement")}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Navigation */}
          {step < 4 && (
            <div className="px-5 sm:px-8 pb-5 sm:pb-8 flex justify-between gap-3">
              <button onClick={() => { setStep(s => Math.max(1, s - 1) as Step); setPayStep("choose"); }}
                className={`flex items-center gap-1.5 px-5 py-3 rounded-xl font-black text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition active:scale-95 ${step === 1 ? "invisible" : ""}`}>
                <ChevronLeft size={15} /> {t("go_back")}
              </button>
              {step < 3 && (
                <button disabled={!canNext()} onClick={() => setStep(s => Math.min(3, s + 1) as Step)}
                  className="flex items-center gap-1.5 px-6 py-3 rounded-xl font-black text-sm bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition disabled:opacity-40">
                  {t("next_btn")} <ChevronRight size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
