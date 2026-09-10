"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Truck, Plus, Trash2, Pencil, X, Check,
  Phone, MapPin, ToggleLeft, ToggleRight, Loader2, Search,
} from "lucide-react";
import { useLang } from "@/context/LanguageContext";

type Livreur = {
  _id: string;
  nom: string;
  telephone: string;
  whatsapp: string;
  ville: string;
  vehicule: string;
  disponible: boolean;
  totalCourses: number;
  note: number;
};

type FormData = {
  nom: string;
  telephone: string;
  whatsapp: string;
  ville: string;
  vehicule: string;
  password: string;
};

const VILLES = [
  "Yaoundé","Douala","Bafoussam","Bamenda","Ngaoundéré","Garoua","Maroua",
  "Bertoua","Ebolowa","Kribi","Buea","Limbe","Kumba","Dschang","Foumban",
  "Edéa","Nkongsamba","Mbalmayo","Sangmélima","Batouri","Abong-Mbang",
  "Yokadouma","Tibati","Meiganga","Banyo","Kousseri","Mora","Yagoua",
  "Guider","Garoua","Lagdo","Wum","Ndop","Kumbo","Mbouda","Bangangté",
  "Bafang","Loum","Mbanga","Manjo","Obala","Mfou","Essé",
];

const EMPTY_FORM: FormData = { nom: "", telephone: "", whatsapp: "", ville: "", vehicule: "Moto", password: "" };
const PAGE_LIMIT = 25;

export default function AdminLivreurs() {
  const { t } = useLang();
  const VEHICLE_LABEL: Record<string, string> = {
    "Moto":     t("vehicle_moto"),
    "Voiture":  t("vehicle_voiture"),
    "Tricycle": t("vehicle_tricycle"),
    "Vélo":     t("vehicle_velo"),
    "À pied":   t("vehicle_a_pied"),
  };
  const [livreurs, setLivreurs]   = useState<Livreur[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Livreur | null>(null);
  const [form, setForm]           = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const load = async (searchTerm = search, pageNum = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const res = await api.get("/admin/livreurs", { params: { search: searchTerm || undefined, page: pageNum, limit: PAGE_LIMIT } });
      setLivreurs(prev => append ? [...prev, ...res.data] : res.data);
      setHasMore(res.data.length === PAGE_LIMIT);
    } catch { } finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      load(search, 1, false);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    load(search, nextPage, true);
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setError(""); setShowModal(true); };
  const openEdit = (l: Livreur) => {
    setEditing(l);
    setForm({ nom: l.nom, telephone: l.telephone, whatsapp: l.whatsapp, ville: l.ville, vehicule: l.vehicule, password: "" });
    setError("");
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY_FORM); setError(""); };

  const handleSave = async () => {
    setError("");
    if (!form.nom || !form.telephone || !form.ville) return setError(t("error_name_phone_city_required"));
    if (!editing && !form.password) return setError(t("error_password_required_new"));
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/livreurs/${editing._id}`, form);
      } else {
        await api.post("/admin/livreurs", form);
      }
      await load(search, 1, false);
      setPage(1);
      closeModal();
    } catch (e: any) {
      setError(e.response?.data?.error || t("error_server_generic"));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (!confirm(`${t("confirm_delete_prefix")} ${nom} ?`)) return;
    try {
      await api.delete(`/admin/livreurs/${id}`);
      setLivreurs(l => l.filter(x => x._id !== id));
    } catch { alert(t("error_delete_livreur")); }
  };

  const toggleDispo = async (l: Livreur) => {
    try {
      await api.patch(`/admin/livreurs/${l._id}`, { disponible: !l.disponible });
      setLivreurs(list => list.map(x => x._id === l._id ? { ...x, disponible: !l.disponible } : x));
    } catch { }
  };

  return (
    <div className="p-6 sm:p-8 bg-[#F4F7FE] min-h-screen md:ml-45">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-3">
            <Truck size={28} className="text-blue-600" /> {t("livreurs_title")}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{livreurs.length} {t("livreurs_count_label")}</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-black text-sm transition active:scale-95">
          <Plus size={16} /> {t("add_livreur_btn")}
        </button>
      </div>

      {/* Recherche */}
      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full bg-white rounded-2xl pl-10 pr-4 py-3 text-sm font-bold outline-none shadow-sm border border-gray-100 focus:ring-2 focus:ring-blue-500/20"
          placeholder={t("search_livreur_placeholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : livreurs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Truck size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="font-bold">{search ? t("no_livreur_found") : t("no_livreur_registered")}</p>
            {!search && <p className="text-sm mt-1">{t("click_add_livreur_hint")}</p>}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="w-full text-left hidden sm:table">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[t("table_livreur"),t("table_ville"),t("table_phone_whatsapp"),t("table_vehicule"),t("table_statut"),t("table_courses"),t("table_actions")].map(h => (
                    <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {livreurs.map(l => (
                  <tr key={l._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-black flex items-center justify-center text-sm flex-shrink-0">
                          {l.nom.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900">{l.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-gray-600 font-bold">
                        <MapPin size={13} className="text-gray-400" /> {l.ville}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-800">{l.telephone}</p>
                      {l.whatsapp && l.whatsapp !== l.telephone && (
                        <p className="text-xs text-green-600 font-bold">{t("whatsapp_abbrev")}: {l.whatsapp}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{VEHICLE_LABEL[l.vehicule] || l.vehicule}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleDispo(l)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition ${
                          l.disponible ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"
                        }`}>
                        {l.disponible ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {l.disponible ? t("available_status") : t("unavailable_status")}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-gray-500">{l.totalCourses}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(l)}
                          className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-blue-50 text-blue-600 transition">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(l._id, l.nom)}
                          className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-red-50 text-red-500 transition">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-50">
              {livreurs.map(l => (
                <div key={l._id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-black flex items-center justify-center">
                        {l.nom.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{l.nom}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} />{l.ville}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleDispo(l)}
                      className={`px-3 py-1 rounded-full text-xs font-black ${l.disponible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {l.disponible ? t("available_short") : t("unavailable_short")}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-bold text-gray-700 flex items-center gap-1"><Phone size={11} />{l.telephone}</p>
                      <p className="text-xs text-gray-400">{l.vehicule} · {l.totalCourses} courses</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(l)} className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(l._id, l.nom)} className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
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

      {/* ── Modal Ajout / Édition ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-black text-gray-900 text-lg">
                {editing ? t("modal_edit_livreur") : t("modal_add_livreur")}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-gray-100 transition"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              {[
                { label: t("label_full_name"),    key: "nom",       placeholder: t("placeholder_full_name"), type: "text" },
                { label: t("label_phone"),      key: "telephone", placeholder: t("placeholder_phone"),       type: "tel" },
                { label: t("label_whatsapp"),       key: "whatsapp",  placeholder: t("placeholder_whatsapp"), type: "tel" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key} className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{label}</label>
                  <input type={type}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                  />
                </div>
              ))}

              {/* Ville */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t("label_city")}</label>
                <select
                  className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.ville}
                  onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                >
                  <option value="">{t("select_city_placeholder")}</option>
                  {VILLES.sort().map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              {/* Véhicule */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t("label_vehicule")}</label>
                <select
                  className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.vehicule}
                  onChange={e => setForm(f => ({ ...f, vehicule: e.target.value }))}
                >
                  {[
                    { value: "Moto",     label: t("vehicle_moto") },
                    { value: "Voiture",  label: t("vehicle_voiture") },
                    { value: "Tricycle", label: t("vehicle_tricycle") },
                    { value: "Vélo",     label: t("vehicle_velo") },
                    { value: "À pied",   label: t("vehicle_a_pied") },
                  ].map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              {/* Mot de passe (requis seulement à la création) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  {t("label_livreur_password")} {editing ? t("password_keep_hint") : "*"}
                </label>
                <input type="password"
                  className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={t("placeholder_livreur_password")}
                />
              </div>

              {error && (
                <p className="text-red-500 text-xs font-bold bg-red-50 px-4 py-3 rounded-xl">{error}</p>
              )}

              <button onClick={handleSave} disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <><Check size={16} /> {editing ? t("save_btn") : t("create_livreur_btn")}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
