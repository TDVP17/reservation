//wellet/transaction
"use client";

import { X, Receipt, CheckCircle, Clock, XCircle } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

type Transaction = {
  id: string;
  method: "ORANGE" | "MTN" | "MOBILE_MONEY" | "CARD";
  amount: number;
  status: "pending" | "success" | "canceled";
  createdAt: Date;
};

export default function TransactionModal({
  open,
  onClose,
  transactions,
}: {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
}) {
  const { t } = useLang();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-lg rounded-2xl border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-slate-900">
            <Receipt size={20} />
            <h2 className="text-lg font-semibold">
              {t("wallet_tx_history_title")}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-14 text-slate-500">
            {t("wallet_tx_empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl border p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {tx.amount.toLocaleString()} FCFA
                  </p>
                  <p className="text-xs text-slate-500">
                    {tx.method} •{" "}
                    {tx.createdAt.toLocaleString()}
                  </p>
                </div>

                <StatusBadge status={tx.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLang();

  if (status === "success")
    return (
      <span className="flex items-center gap-1 text-sm text-emerald-600">
        <CheckCircle size={16} /> {t("tx_status_success")}
      </span>
    );

  if (status === "canceled")
    return (
      <span className="flex items-center gap-1 text-sm text-red-600">
        <XCircle size={16} /> {t("status_cancelled")}
      </span>
    );

  return (
    <span className="flex items-center gap-1 text-sm text-yellow-600">
      <Clock size={16} /> {t("resa_badge_pending")}
    </span>
  );
}
