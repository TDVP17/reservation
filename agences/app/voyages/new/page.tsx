"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, MapPin, Calendar, Clock, CreditCard, Bus, Upload, X, Hash, Users, Star, Lock } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";

export default function NewVoyagePage() {
  const { t } = useLang();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [departLocked, setDepartLocked] = useState(false);

  const VILLES = ["Douala","Yaoundé","Bafoussam","Bamenda","Garoua","Ngaoundéré","Bertoua","Kribi","Limbé","Maroua","Ebolowa","Buéa"];

  const [formData, setFormData] = useState({
    depart: "",
    destination: "",
    date: "",
    heure: "",
    placesTotal: "",
    mat: "",
    prix: "",
    typeBus: "Classique",
  });

  // Verrouille la ville de départ sur la ville enregistrée de l'agence
  useEffect(() => {
    const raw = localStorage.getItem("agence");
    if (!raw) return;
    try {
      const agence = JSON.parse(raw);
      if (agence?.ville) {
        setFormData(f => ({ ...f, depart: agence.ville }));
        setDepartLocked(true);
      }
    } catch {
      // localStorage corrompu : on retombe sur la sélection manuelle
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_W = 600;
        const MAX_H = 400;
        const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.65);
        setImagePreview(compressed);
        setCompressedImage(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append("depart", formData.depart);
      data.append("destination", formData.destination);
      data.append("date", formData.date);
      data.append("heure", formData.heure);
      data.append("placesTotal", String(formData.placesTotal));
      data.append("placesRestantes", String(formData.placesTotal));
      data.append("mat", formData.mat);
      data.append("prix", String(formData.prix));
      data.append("typeBus", formData.typeBus);
      if (compressedImage) data.append("imageBus", compressedImage);

      const response = await api.post("/voyages", data);
      if (response.status === 201) {
        router.push("/voyages");
      }
    } catch (error: any) {
      console.error("Erreur détaillée:", error.response?.data);
      alert(error.response?.data?.error || t("creation_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-xl mx-auto">
        <Link href="/voyages" className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm flex items-center text-gray-400 mb-6 py-3 hover:text-blue-600 transition-colors font-medium min-h-11">
          <ArrowLeft size={20} className="mr-2" /> {t("new_voy_back")}
        </Link>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100">
          <h1 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
            <Bus className="text-blue-600" /> {t("new_voy_title")}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Upload image */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("bus_image_label")}</label>
              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                >
                  <Upload size={32} className="text-gray-300 mb-2" />
                  <span className="text-sm text-gray-400 font-medium">{t("click_upload_photo")}</span>
                </div>
              ) : (
                <div className="relative h-48 w-full rounded-3xl overflow-hidden border-2 border-blue-100">
                  <img src={imagePreview} alt={t("preview_alt")} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setCompressedImage(null); }}
                    className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full shadow-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* VILLE DE DÉPART */}
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("departure_city_label")}</label>
                {departLocked ? (
                  <>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                      <div className="w-full pl-10 pr-10 border-2 rounded-2xl p-3 bg-gray-100 border-gray-100 font-bold text-gray-500 cursor-not-allowed">
                        {formData.depart}
                      </div>
                      <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 ml-1">{t("departure_city_locked_hint")}</p>
                  </>
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

              {/* DESTINATION */}
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

              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("bus_category_label")}</label>
                <div className="relative mt-1">
                  <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    value={formData.typeBus}
                    onChange={e => setFormData({...formData, typeBus: e.target.value})}
                    className="w-full pl-10 border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 outline-none font-bold text-blue-600 appearance-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Classique">{t("bus_classique_opt")}</option>
                    <option value="VIP">{t("bus_vip_opt")}</option>
                    <option value="Super VIP">{t("bus_super_vip_opt")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("date_label")}</label>
                <div className="flex items-center border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 focus-within:border-blue-500 transition-all">
                  <Calendar size={20} className="text-gray-400" />
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-transparent w-full ml-3 outline-none font-medium text-xs" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("departure_time_label")}</label>
                <div className="flex items-center border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 focus-within:border-blue-500 transition-all">
                  <Clock size={20} className="text-gray-400" />
                  <input required type="time" value={formData.heure} onChange={e => setFormData({...formData, heure: e.target.value})} className="bg-transparent w-full ml-3 outline-none font-medium" />
                </div>
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
                  <input required type="number" value={formData.placesTotal} onChange={e => setFormData({...formData, placesTotal: e.target.value})} className="bg-transparent w-full ml-3 outline-none font-medium" placeholder="70" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t("ticket_price_label")}</label>
              <div className="flex items-center border-2 rounded-2xl p-3 bg-gray-50 border-gray-50 focus-within:border-blue-500 transition-all">
                <CreditCard size={20} className="text-gray-400" />
                <input required type="number" value={formData.prix} onChange={e => setFormData({...formData, prix: e.target.value})} className="bg-transparent w-full ml-3 outline-none font-medium" placeholder="5000" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? t("creating_ellipsis") : t("save_trip_btn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
