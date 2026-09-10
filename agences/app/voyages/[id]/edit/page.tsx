//voyages/[id]/edit/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, MapPin, Calendar, Clock, CreditCard, Bus, Upload, X, Hash, Users, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";

const VILLES = ["Douala","Yaoundé","Bafoussam","Bamenda","Garoua","Ngaoundéré","Bertoua","Kribi","Limbé","Maroua","Ebolowa","Buéa"];

export default function EditVoyagePage() {
  const { t } = useLang();
  const router = useRouter();
  const params = useParams(); // Pour récupérer l'ID dans l'URL
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [departLocked, setDepartLocked] = useState(false);

  const [formData, setFormData] = useState({
    depart: "",
    destination: "",
    date: "",
    heure: "",
    placesTotal: "",
    mat: "",
    prix: "",
  });

  // 1. Charger les données actuelles du voyage
  useEffect(() => {
    const fetchVoyage = async () => {
      try {
        const response = await api.get(`/voyages/${params.id}`);
        const data = response.data;

        // Formater la date pour l'input type="date" (YYYY-MM-DD)
        const formattedDate = data.date ? new Date(data.date).toISOString().split('T')[0] : "";

        setFormData({
          depart: data.depart || "",
          destination: data.destination,
          date: formattedDate,
          heure: data.heure,
          placesTotal: data.placesTotal.toString(),
          mat: data.mat,
          prix: data.prix.toString(),
        });

        if (data.imageBus) {
          setImagePreview(data.imageBus.startsWith("data:") ? data.imageBus : `${process.env.NEXT_PUBLIC_API_URL}/uploads/${data.imageBus.split(/[\\/]/).pop()}`);
        }
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
        alert(t("load_error"));
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchVoyage();
  }, [params.id]);

  // Verrouille la ville de départ sur la ville enregistrée de l'agence (comme à la création)
  useEffect(() => {
    const raw = localStorage.getItem("agence");
    if (!raw) return;
    try {
      const agence = JSON.parse(raw);
      if (agence?.ville) setDepartLocked(true);
    } catch {
      // localStorage corrompu : on retombe sur la sélection manuelle
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = new FormData();
      if (selectedFile) {
        data.append("imageBus", selectedFile);
      }
      data.append("depart", formData.depart);
      data.append("destination", formData.destination);
      data.append("date", formData.date);
      data.append("heure", formData.heure);
      data.append("placesTotal", formData.placesTotal);
      data.append("mat", formData.mat);
      data.append("prix", formData.prix);

      // On utilise PATCH car ton backend attend du PATCH
      await api.patch(`/voyages/${params.id}`, data);

      router.push("/voyages");
      router.refresh();
    } catch (error: any) {
      alert(error.response?.data?.error || t("update_error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-blue-600 mb-2" size={40} />
        <p className="text-gray-500">{t("loading_info")}</p>
    </div>
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-xl mx-auto">
        <Link href="/voyages" className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm flex items-center text-gray-400 mb-6 py-3 hover:text-blue-600 transition-colors font-medium min-h-11">
          <ArrowLeft size={20} className="mr-2" /> {t("edit_voy_cancel")}
        </Link>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100">
          <h1 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
            <Bus className="text-blue-600" /> {t("edit_voy_title")}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Image */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("bus_image_label")}</label>
              <div className="relative h-48 w-full rounded-3xl overflow-hidden border-2 border-blue-100 group bg-gray-100">
                {imagePreview && (
                  <img src={imagePreview} alt={t("preview_alt")} className="w-full h-full object-cover" />
                )}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                    <Upload className="text-white" size={30} />
                    <span className="text-white ml-2 font-bold text-sm">{t("change_image")}</span>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* VILLE DE DÉPART */}
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("departure_city_label")}</label>
                {departLocked ? (
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                    <div className="w-full pl-10 pr-10 border-2 rounded-2xl p-3 bg-gray-100 border-gray-100 font-bold text-gray-500 cursor-not-allowed">
                      {formData.depart}
                    </div>
                    <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  </div>
                ) : (
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                    <select
                      required
                      value={formData.depart}
                      onChange={e => setFormData({...formData, depart: e.target.value})}
                      className="w-full pl-10 border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 outline-none font-bold text-gray-700 appearance-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">{t("select_departure_city")}</option>
                      {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Destination */}
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("destination_label")}</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                  <select
                    required
                    value={formData.destination}
                    onChange={e => setFormData({...formData, destination: e.target.value})}
                    className="w-full pl-10 border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 outline-none font-bold text-gray-700 appearance-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">{t("select_destination")}</option>
                    {VILLES.filter(v => v !== formData.depart).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("date_label")}</label>
                <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 focus:border-blue-500 outline-none font-medium" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("hour_label")}</label>
                <input required type="time" value={formData.heure} onChange={e => setFormData({...formData, heure: e.target.value})} className="w-full border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 focus:border-blue-500 outline-none font-medium" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("matricule_label")}</label>
                <div className="flex items-center border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 focus-within:border-blue-500 transition-all">
                  <Hash size={20} className="text-gray-400" />
                  <input required value={formData.mat} onChange={e => setFormData({...formData, mat: e.target.value})} className="bg-transparent w-full ml-3 outline-none font-medium" placeholder="LT 001" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("seats_count_label")}</label>
                <div className="flex items-center border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 focus-within:border-blue-500 transition-all">
                  <Users size={20} className="text-gray-400" />
                  <input required type="number" min="1" value={formData.placesTotal} onChange={e => setFormData({...formData, placesTotal: e.target.value})} className="bg-transparent w-full ml-3 outline-none font-medium" placeholder="70" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("ticket_price_label")}</label>
              <div className="flex items-center border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 focus-within:border-blue-500 transition-all">
                <CreditCard size={20} className="text-gray-400" />
                <input required type="number" min="0" value={formData.prix} onChange={e => setFormData({...formData, prix: e.target.value})} className="bg-transparent w-full ml-3 outline-none font-medium" placeholder="5000" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting ? t("updating_ellipsis") : t("update_trip_btn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
