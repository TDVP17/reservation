// wallet/BalanceCard.tsx
import { Eye, EyeOff, Plus, List } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/context/LanguageContext";

export default function BalanceCard({
  amount,
  onRecharge,
  onTransactions,
}: {
  amount: number;
  onRecharge: () => void;
  onTransactions: () => void;
}) {
  const { t } = useLang();
  const [show, setShow] = useState(false);

  return (
<div
  className="
    h-full
    w-full
    bg-[#F8FAFC] dark:bg-slate-900
    rounded-1xl
    border border-[#E2E8F0] dark:border-slate-700
    p-10
    flex flex-col justify-start
    shadow-[0_10px_30px_rgba(15,23,42,0.08)]
  "
>


 {/* HEADER */}
<div className="flex flex-col gap-4">
  {/* TITRE */}
<h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">

    {t("wallet_title")}
  </h1>

  {/* SOLDE */}
 <div>
  <p className="text-sm text-slate-500">
    {t("wallet_balance_label")}
  </p>

  <div className="mt-1 flex items-center gap-2">
    <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
      {show ? `${amount.toLocaleString()} FCFA` : "••••••"}
    </p>

    <button
      onClick={() => setShow(!show)}
      className="text-slate-400 hover:text-slate-700 transition"
    >
      {show ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  </div>
</div>

</div>

      {/* ACTIONS */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onRecharge}
          className="
            inline-flex items-center gap-2
            bg-[#5e7ddd] text-white
            px-5 py-2.5 rounded-xl
            text-sm font-medium

          "
        >
          <Plus size={16} /> {t("wallet_recharge_btn")}
        </button>

        <button
          onClick={onTransactions}
          className="
            inline-flex items-center gap-2
            px-5 py-2.5 rounded-xl
            border border-slate-300
            text-sm font-medium text-slate-700
            hover:bg-slate-50
            transition
          "
        >
          <List size={16} /> {t("wallet_transactions_btn")}
        </button>
      </div>
    </div>
  );
}
