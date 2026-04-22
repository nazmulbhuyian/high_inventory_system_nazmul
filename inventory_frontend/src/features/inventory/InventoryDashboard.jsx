import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { queryClient } from "../../lib/queryClient";
import { connectInventorySocket } from "../../lib/socket";
import { fetchDrops, purchaseDrop, reserveDrop } from "../../lib/drops.api";
import { useSessionStorage } from "../../hooks/useSessionStorage";
import { DropCard } from "./components/DropCard";
import { CreateDropModal } from "./components/CreateDropModal";

const RESERVATION_STORAGE_KEY = "active-reservations-by-user-v1";
const RESERVATION_HOLD_MS = 60 * 1000;
const MAX_ALLOWED_FUTURE_MS = 2 * 60 * 1000;

function loadReservationStore() {
    try {
        const raw = window.sessionStorage.getItem(RESERVATION_STORAGE_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function saveReservationStore(store) {
    try {
        window.sessionStorage.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(store));
    } catch {
        // Ignore session storage write errors.
    }
}

function getActiveReservationsForUser(store, userId) {
    if (!userId) {
        return {};
    }

    const key = String(userId);
    const userReservations = store[key] && typeof store[key] === "object" ? store[key] : {};
    const now = Date.now();

    const cleaned = {};
    Object.entries(userReservations).forEach(([dropId, expiresAt]) => {
        const numericExpiresAt = Number(expiresAt);
        const remaining = numericExpiresAt - now;

        // Keep only realistic active reservations and drop corrupted/stale values.
        if (remaining > 0 && remaining <= MAX_ALLOWED_FUTURE_MS) {
            cleaned[dropId] = numericExpiresAt;
        }
    });

    return cleaned;
}

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.errorMessages?.[0]?.message ||
        error?.message ||
        "Something went wrong"
    );
}

export function InventoryDashboard() {
    const [demoUserId, setDemoUserId] = useSessionStorage("demo-user-id", "1");
    const [socketReady, setSocketReady] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState(null);
    const [loadingAction, setLoadingAction] = useState(null);
    const [isCreateDropModalOpen, setIsCreateDropModalOpen] = useState(false);
    const [activeReservations, setActiveReservations] = useState({});
    const [hasHydratedReservations, setHasHydratedReservations] = useState(false);

    const userId = Number(demoUserId);
    const validUserId = Number.isFinite(userId) && userId > 0 ? userId : null;

    const dropsQuery = useQuery({
        queryKey: ["drops"],
        queryFn: fetchDrops,
        // Future drops become active by time, not by stock event.
        // Keep a lightweight polling fallback so they appear automatically.
        refetchInterval: 5000,
        refetchIntervalInBackground: true,
    });

    const reserveMutation = useMutation({
        mutationFn: reserveDrop,
        onMutate: ({ dropId }) => setLoadingAction({ type: "reserve", dropId }),
        onSuccess: () => {
            toast.success("Reservation created for 60 seconds");
            queryClient.invalidateQueries({ queryKey: ["drops"] });
        },
        onError: (error) => toast.error(getErrorMessage(error)),
        onSettled: () => setLoadingAction(null),
    });

    const purchaseMutation = useMutation({
        mutationFn: purchaseDrop,
        onMutate: ({ dropId }) => setLoadingAction({ type: "purchase", dropId }),
        onSuccess: (_data, variables) => {
            toast.success("Purchase completed successfully");
            setActiveReservations((prev) => {
                if (!prev[variables.dropId]) {
                    return prev;
                }

                const next = { ...prev };
                delete next[variables.dropId];
                return next;
            });
            queryClient.invalidateQueries({ queryKey: ["drops"] });
        },
        onError: (error) => toast.error(getErrorMessage(error)),
        onSettled: () => setLoadingAction(null),
    });

    useEffect(() => {
        if (!Object.keys(activeReservations).length) {
            return;
        }

        const intervalId = setInterval(() => {
            const now = Date.now();
            setActiveReservations((prev) => {
                const next = { ...prev };
                let changed = false;

                Object.entries(next).forEach(([dropId, expiresAt]) => {
                    if (Number(expiresAt) <= now) {
                        delete next[dropId];
                        changed = true;
                    }
                });

                return changed ? next : prev;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [activeReservations]);

    useEffect(() => {
        const store = loadReservationStore();
        const nextReservations = getActiveReservationsForUser(store, validUserId);

        if (validUserId) {
            const userKey = String(validUserId);
            store[userKey] = nextReservations;
            saveReservationStore(store);
        }

        setActiveReservations(nextReservations);
        setHasHydratedReservations(true);
    }, [validUserId]);

    useEffect(() => {
        if (!hasHydratedReservations || !validUserId) {
            return;
        }

        const store = loadReservationStore();
        const userKey = String(validUserId);

        if (Object.keys(activeReservations).length === 0) {
            delete store[userKey];
        } else {
            store[userKey] = activeReservations;
        }

        saveReservationStore(store);
    }, [activeReservations, hasHydratedReservations, validUserId]);

    useEffect(() => {
        const socket = connectInventorySocket();

        const onConnect = () => setSocketReady(true);
        const onDisconnect = () => setSocketReady(false);
        const onStockUpdate = ({ dropId, available_stock }) => {
            let hasMatchingDrop = false;

            queryClient.setQueryData(["drops"], (currentDrops) => {
                if (!Array.isArray(currentDrops)) {
                    return currentDrops;
                }

                const nextDrops = currentDrops.map((drop) => {
                    if (drop.id === dropId) {
                        hasMatchingDrop = true;
                        return { ...drop, available_stock };
                    }
                    return drop;
                });

                return nextDrops;
            });

            // Always refetch to keep purchasers feed and newly created drops in sync across tabs.
            // This complements the fast local stock patch above.
            queryClient.invalidateQueries({ queryKey: ["drops"] });

            if (!hasMatchingDrop) {
                queryClient.refetchQueries({ queryKey: ["drops"] });
            }

            setLastSyncAt(new Date());
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("stock_update", onStockUpdate);

        if (socket.connected) {
            setSocketReady(true);
        }

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("stock_update", onStockUpdate);
            socket.disconnect();
        };
    }, []);

    const drops = useMemo(() => dropsQuery.data ?? [], [dropsQuery.data]);
    const totalStock = useMemo(
        () => drops.reduce((sum, drop) => sum + Number(drop.available_stock || 0), 0),
        [drops]
    );

    const handleReserve = (dropId) => {
        if (!validUserId) {
            toast.error("Set a valid Demo User ID first");
            return;
        }

        if (activeReservations[dropId] && activeReservations[dropId] > Date.now()) {
            return;
        }

        reserveMutation.mutate({ userId: validUserId, dropId });
    };

    const handlePurchase = (dropId) => {
        if (!validUserId) {
            toast.error("Set a valid Demo User ID first");
            return;
        }

        if (!activeReservations[dropId] || activeReservations[dropId] <= Date.now()) {
            toast.error("Reserve this item first before completing purchase");
            return;
        }

        purchaseMutation.mutate({ userId: validUserId, dropId });
    };

    useEffect(() => {
        if (!reserveMutation.isSuccess || !reserveMutation.data || !reserveMutation.variables) {
            return;
        }

        const dropId = reserveMutation.variables.dropId;
        const parsedExpiresAt = reserveMutation.data?.expires_at
            ? new Date(reserveMutation.data.expires_at).getTime()
            : NaN;
        const now = Date.now();
        const remainingFromServer = parsedExpiresAt - now;

        // Reservation window is always 60s. If server timestamp looks off, trust local 60s window.
        const expiresAt = Number.isFinite(parsedExpiresAt) && remainingFromServer > 0 && remainingFromServer <= MAX_ALLOWED_FUTURE_MS
            ? parsedExpiresAt
            : now + RESERVATION_HOLD_MS;

        setActiveReservations((prev) => ({
            ...prev,
            [dropId]: expiresAt,
        }));
    }, [reserveMutation.isSuccess, reserveMutation.data, reserveMutation.variables]);

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-slate-900">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">

                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                    <div className="flex items-center justify-end">
                        <button
                            onClick={() => setIsCreateDropModalOpen(true)}
                            className="flex h-fit items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Drop
                        </button>
                    </div>
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-600">
                                Sneaker Drop Control Room
                            </p>
                            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                                Real-time inventory dashboard for limited edition drops.
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                                Monitor live stock, reserve atomically, complete purchase inside a 60-second window,
                                and watch every browser stay in sync through Socket.io.
                            </p>
                        </div>


                        <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:min-w-[280px]">
                            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Demo User ID
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={demoUserId}
                                onChange={(event) => setDemoUserId(event.target.value)}
                                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium outline-none transition focus:border-slate-400"
                                placeholder="Enter user id"
                            />
                            <p className="text-xs leading-5 text-slate-500">
                                Use any valid numeric user ID from the database to test reserve and purchase. This value is saved per tab.
                            </p>
                        </div>

                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-950/10">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">
                                Socket
                            </p>
                            <p className="mt-3 text-2xl font-semibold">
                                {socketReady ? "Connected" : "Disconnected"}
                            </p>
                            <p className="mt-2 text-sm text-slate-300">Live stock updates enabled</p>
                        </div>
                        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Active Drops
                            </p>
                            <p className="mt-3 text-2xl font-semibold text-slate-950">{drops.length}</p>
                            <p className="mt-2 text-sm text-slate-500">Fetched from the drops API</p>
                        </div>
                        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Total Live Stock
                            </p>
                            <p className="mt-3 text-2xl font-semibold text-slate-950">{totalStock}</p>
                            <p className="mt-2 text-sm text-slate-500">Across all visible drops</p>
                        </div>
                        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Last Sync
                            </p>
                            <p className="mt-3 text-lg font-semibold text-slate-950">
                                {lastSyncAt ? lastSyncAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Waiting..."}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">Socket event or refetch</p>
                        </div>
                    </div>
                </div>

                {dropsQuery.isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-72 animate-pulse rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-slate-200"
                            >
                                <div className="h-4 w-24 rounded-full bg-slate-200" />
                                <div className="mt-6 h-6 w-3/4 rounded-full bg-slate-200" />
                                <div className="mt-4 h-24 rounded-2xl bg-slate-100" />
                            </div>
                        ))}
                    </div>
                ) : dropsQuery.isError ? (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                        <p className="font-semibold">Failed to load drops.</p>
                        <p className="mt-1 text-sm">{getErrorMessage(dropsQuery.error)}</p>
                        <button
                            type="button"
                            onClick={() => dropsQuery.refetch()}
                            className="mt-4 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                            Retry
                        </button>
                    </div>
                ) : drops.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {drops.map((drop) => (
                            <DropCard
                                key={drop.id}
                                drop={drop}
                                userId={validUserId}
                                loadingAction={loadingAction}
                                reservationExpiresAt={activeReservations[drop.id] ?? null}
                                onReserve={handleReserve}
                                onPurchase={handlePurchase}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                        <h2 className="text-xl font-semibold text-slate-900">No active drops yet</h2>
                        <p className="mt-2 text-slate-600">
                            Create a drop from the backend and this dashboard will show it automatically.
                        </p>
                    </div>
                )}
            </section>

            <CreateDropModal
                isOpen={isCreateDropModalOpen}
                onClose={() => setIsCreateDropModalOpen(false)}
            />
        </main>
    );
}
