"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { PackageCheck, ScanLine, X, Loader2, Truck, PackageOpen, KeyRound } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

type ReceivedShipment = {
  _id: string;
  nomDestinataire: string;
  telephoneDestinataire: string;
  villeDestination: string;
  regionDestination: string;
  status: string;
};

type ShipmentRow = {
  _id: string;
  contenu: string;
  villeDepart: string;
  regionDepart: string;
  villeDestination: string;
  regionDestination: string;
  codeClient: string;
  expediteur?: { name: string; phone: string };
};

type Tab = "receive" | "depart" | "arrival" | "collect";

export default function ColisPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("receive");

  // ── Réception (existant) ──
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ReceivedShipment | null>(null);
  const [error, setError] = useState("");
  const scannerRef = useRef<any>(null);

  // ── Dashboard agence (départ / arrivée / retrait) ──
  const [pendingDepart, setPendingDepart] = useState<ShipmentRow[]>([]);
  const [pendingArrival, setPendingArrival] = useState<ShipmentRow[]>([]);
  const [pendingCollection, setPendingCollection] = useState<ShipmentRow[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [devCodes, setDevCodes] = useState<Record<string, string>>({});
  const [otps, setOtps] = useState<Record<string, string>>({});

  const loadDashboard = async () => {
    setDashLoading(true);
    try {
      const res = await api.get("/shipments/agence/dashboard");
      setPendingDepart(res.data.pendingDepart);
      setPendingArrival(res.data.pendingArrival);
      setPendingCollection(res.data.pendingCollection);
    } catch {} finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "receive") loadDashboard();
  }, [tab]);

  const submitCode = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/shipments/receive", { code: trimmed });
      setResult(res.data.shipment);
      setCode("");
      stopScanner();
    } catch (err: any) {
      setError(err?.response?.data?.error || t("colis_error_default"));
    } finally {
      setLoading(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;
    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;
      const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 220 }, false);
      scanner.render(
        (decodedText: string) => submitCode(decodedText),
        () => {}
      );
      scannerRef.current = scanner;
    });

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const handleDepart = async (id: string) => {
    setActioning(id);
    try {
      await api.patch(`/shipments/${id}/depart`);
      setPendingDepart(prev => prev.filter(s => s._id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.error || t("colis_depart_error"));
    } finally {
      setActioning(null);
    }
  };

  const handleArrive = async (id: string) => {
    setActioning(id);
    try {
      const res = await api.post(`/shipments/${id}/arrive`);
      setPendingArrival(prev => prev.filter(s => s._id !== id));
      if (res.data.devCode) setDevCodes(prev => ({ ...prev, [id]: res.data.devCode }));
      loadDashboard();
    } catch (err: any) {
      alert(err?.response?.data?.error || t("colis_arrival_error"));
    } finally {
      setActioning(null);
    }
  };

  const handleCollect = async (id: string) => {
    const otp = otps[id];
    if (!otp) return;
    setActioning(id);
    try {
      await api.post(`/shipments/${id}/collect`, { otp });
      setPendingCollection(prev => prev.filter(s => s._id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.error || t("colis_collect_error"));
    } finally {
      setActioning(null);
    }
  };

  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: "receive",  label: t("colis_tab_receive"),  icon: PackageCheck },
    { key: "depart",   label: t("colis_tab_depart"),   icon: Truck, count: pendingDepart.length },
    { key: "arrival",  label: t("colis_tab_arrival"),  icon: PackageOpen, count: pendingArrival.length },
    { key: "collect",  label: t("colis_tab_collect"),  icon: KeyRound, count: pendingCollection.length },
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t("colis_title")}</h1>
        <p className="text-gray-500 mt-1">{t("colis_subtitle")}</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6 max-w-2xl overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              tab === key ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            <Icon size={15} /> {label}
            {typeof count === "number" && count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === key ? "bg-white/20" : "bg-gray-100"}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Réceptionner ── */}
      {tab === "receive" && (
        <div className="max-w-lg bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={t("colis_code_placeholder")}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-center text-xl font-black tracking-widest focus:border-blue-500 outline-none"
            />
            <button
              onClick={() => submitCode(code)}
              disabled={loading || code.length !== 6}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : t("colis_validate_btn")}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400">{t("colis_or")}</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          {!scanning ? (
            <button
              onClick={() => setScanning(true)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
            >
              <ScanLine size={18} /> {t("colis_scan_btn")}
            </button>
          ) : (
            <div className="space-y-2">
              <div id="qr-reader" className="rounded-xl overflow-hidden" />
              <button
                onClick={stopScanner}
                className="w-full flex items-center justify-center gap-2 px-5 py-2 text-gray-500 hover:text-gray-700 font-bold text-sm"
              >
                <X size={14} /> {t("colis_stop_scan")}
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl">
              {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-green-700 font-black">
                <PackageCheck size={18} /> {t("colis_received_title")}
              </div>
              <p className="text-sm text-gray-700">{t("colis_recipient_label")} : <strong>{result.nomDestinataire}</strong> ({result.telephoneDestinataire})</p>
              <p className="text-sm text-gray-700">{t("colis_destination_label")} : {result.villeDestination || result.regionDestination}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Faire partir / Colis arrivants / Retrait (dashboard) ── */}
      {tab !== "receive" && (
        <div className="max-w-2xl">
          {dashLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
          ) : (
            <div className="space-y-3">
              {tab === "depart" && (
                pendingDepart.length === 0 ? (
                  <EmptyState text={t("colis_depart_empty")} />
                ) : pendingDepart.map(s => (
                  <ShipmentActionRow key={s._id} shipment={s} t={t}
                    actionLabel={t("colis_depart_btn")}
                    loading={actioning === s._id}
                    onAction={() => handleDepart(s._id)}
                  />
                ))
              )}

              {tab === "arrival" && (
                pendingArrival.length === 0 ? (
                  <EmptyState text={t("colis_arrival_empty")} />
                ) : pendingArrival.map(s => (
                  <div key={s._id} className="space-y-1.5">
                    <ShipmentActionRow shipment={s} t={t}
                      actionLabel={t("colis_arrival_btn")}
                      loading={actioning === s._id}
                      onAction={() => handleArrive(s._id)}
                    />
                    {devCodes[s._id] && (
                      <p className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {t("colis_arrival_dev_code")} : <span className="tracking-widest">{devCodes[s._id]}</span>
                      </p>
                    )}
                  </div>
                ))
              )}

              {tab === "collect" && (
                pendingCollection.length === 0 ? (
                  <EmptyState text={t("colis_collect_empty")} />
                ) : pendingCollection.map(s => (
                  <div key={s._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                    <ShipmentInfo shipment={s} t={t} />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder={t("colis_collect_otp_placeholder")}
                        value={otps[s._id] || ""}
                        onChange={e => setOtps(prev => ({ ...prev, [s._id]: e.target.value.replace(/\D/g, "") }))}
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-center font-black tracking-widest focus:border-blue-500 outline-none"
                      />
                      <button
                        onClick={() => handleCollect(s._id)}
                        disabled={actioning === s._id || !otps[s._id]}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                      >
                        {actioning === s._id ? <Loader2 size={16} className="animate-spin" /> : t("colis_collect_btn")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShipmentInfo({ shipment, t }: { shipment: ShipmentRow; t: (k: any) => string }) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-gray-900 truncate">{shipment.contenu}</p>
      <p className="text-xs text-gray-400 mt-0.5 truncate">
        {t("colis_from_label")} {shipment.villeDepart || shipment.regionDepart} → {t("colis_to_label")} {shipment.villeDestination || shipment.regionDestination}
      </p>
      {shipment.expediteur && (
        <p className="text-xs text-gray-400 truncate">{t("colis_sender_label")} : {shipment.expediteur.name} ({shipment.expediteur.phone})</p>
      )}
      <p className="text-[10px] text-gray-300 font-bold tracking-widest mt-1">{shipment.codeClient}</p>
    </div>
  );
}

function ShipmentActionRow({ shipment, actionLabel, loading, onAction, t }: {
  shipment: ShipmentRow; actionLabel: string; loading: boolean; onAction: () => void; t: (k: any) => string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-3">
      <ShipmentInfo shipment={shipment} t={t} />
      <button
        onClick={onAction}
        disabled={loading}
        className="flex-shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : actionLabel}
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 font-medium">
      {text}
    </div>
  );
}
