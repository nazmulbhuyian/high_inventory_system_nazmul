import { useState } from "react";
import toast from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../../../lib/queryClient";
import { createDrop } from "../../../lib/drops.api";

function getLocalDateTimeValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
}

export function CreateDropModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    total_stock: "",
    start_time: getLocalDateTimeValue(),
  });

  const createDropMutation = useMutation({
    mutationFn: createDrop,
    onSuccess: () => {
      toast.success("Drop created successfully!");
      setFormData({
        name: "",
        price: "",
        total_stock: "",
        start_time: getLocalDateTimeValue(),
      });
      queryClient.invalidateQueries({ queryKey: ["drops"] });
      onClose();
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errorMessages?.[0]?.message ||
        error?.message ||
        "Failed to create drop";
      toast.error(message);
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.name.trim()) {
      toast.error("Drop name is required");
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }
    if (!formData.total_stock || Number(formData.total_stock) <= 0) {
      toast.error("Total stock must be greater than 0");
      return;
    }
    if (!formData.start_time) {
      toast.error("Start time is required");
      return;
    }

    const startDateTime = new Date(formData.start_time);
    if (isNaN(startDateTime.getTime())) {
      toast.error("Invalid start time");
      return;
    }

    createDropMutation.mutate({
      name: formData.name.trim(),
      price: Number(formData.price),
      total_stock: Number(formData.total_stock),
      start_time: startDateTime.toISOString(),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Create New Drop</h2>
          <button
            onClick={onClose}
            disabled={createDropMutation.isPending}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Drop Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">Drop Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Air Jordan 1 Retro"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              disabled={createDropMutation.isPending}
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">Price (৳) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="e.g., 15000"
              min="1"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              disabled={createDropMutation.isPending}
            />
          </div>

          {/* Total Stock */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">Total Stock *</label>
            <input
              type="number"
              name="total_stock"
              value={formData.total_stock}
              onChange={handleChange}
              placeholder="e.g., 100"
              min="1"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              disabled={createDropMutation.isPending}
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">Start Time *</label>
            <input
              type="datetime-local"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              disabled={createDropMutation.isPending}
              min={getLocalDateTimeValue()}
            />
            <p className="mt-1 text-xs text-slate-500">
              This input uses your local timezone. The backend stores the value in UTC.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={createDropMutation.isPending}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createDropMutation.isPending}
              className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              {createDropMutation.isPending ? "Creating..." : "Create Drop"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
