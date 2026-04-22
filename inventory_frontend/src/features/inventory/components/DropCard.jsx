import { useEffect, useState } from "react";
import { formatLocalDateTime, getUserTimeZone } from "../../../utils/dateTime";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function DropCard({
  drop,
  userId,
  loadingAction,
  reservationExpiresAt,
  onReserve,
  onPurchase,
}) {
  const userTimeZone = getUserTimeZone();
  const [now, setNow] = useState(Date.now());
  const isReserveLoading = loadingAction?.type === "reserve" && loadingAction?.dropId === drop.id;
  const isPurchaseLoading = loadingAction?.type === "purchase" && loadingAction?.dropId === drop.id;
  const isSoldOut = drop.available_stock <= 0;
  const hasActiveReservation = Boolean(
    reservationExpiresAt && Number(reservationExpiresAt) > now
  );
  const remainingSeconds = hasActiveReservation
    ? Math.max(0, Math.ceil((Number(reservationExpiresAt) - now) / 1000))
    : 0;

  useEffect(() => {
    if (!hasActiveReservation) {
      return;
    }

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [hasActiveReservation]);

  return (
    <article className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_72px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
            Drop #{drop.id}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{drop.name}</h3>
          <p className="mt-2 text-sm text-slate-500">
            Starts {formatLocalDateTime(drop.start_time, userTimeZone)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isSoldOut
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {isSoldOut ? "Sold out" : "Live"}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Price</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {currencyFormatter.format(drop.price)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Live Stock</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{drop.available_stock}</p>
          <p className="text-xs text-slate-500">of {drop.total_stock}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Latest purchasers</p>
          <p className="text-xs text-slate-500">Top 3 successful buyers</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {drop.latest_purchasers?.length ? (
            drop.latest_purchasers.map((username, index) => (
              <span
                key={`${username}-${index}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
              >
                {username}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
              No successful purchases yet
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onReserve(drop.id)}
          disabled={!userId || isReserveLoading || isPurchaseLoading || isSoldOut || hasActiveReservation}
          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isReserveLoading
            ? "Reserving..."
            : hasActiveReservation
              ? `Reserved (${remainingSeconds}s)`
              : isSoldOut
                ? "Out of stock"
                : "Reserve"}
        </button>
        <button
          type="button"
          onClick={() => onPurchase(drop.id)}
          disabled={!userId || isReserveLoading || isPurchaseLoading || !hasActiveReservation}
          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {isPurchaseLoading ? "Completing..." : "Complete Purchase"}
        </button>
      </div>

      {!userId && (
        <p className="mt-3 text-xs text-amber-700">
          Set a demo User ID above to enable reserve and purchase actions.
        </p>
      )}
    </article>
  );
}
