import React, { useState, useMemo, useEffect } from "react";
import { PlusCircle, Search, Edit, Trash, X, Plus } from "lucide-react";
import api from "../../api";

export default function Superadmin_SubscriptionManagement() {
  const API_BASE = "/super-admin/subscriptions";

  const [plans, setPlans] = useState([]);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  /* Initial form shape matching backend fields */
  const initialForm = {
    planTitle: "",
    price: "",
    billingCycle: "monthly", // monthly | yearly
    features: [""], // dynamic inputs
    description: "",
    activeClients: 0,
    status: "Active",
  };

  const [form, setForm] = useState(initialForm);

  /* UTIL: normalize features from backend (handles arrays or JSON strings) */
  const normalizeFeatures = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((f) => (f == null ? "" : String(f)));
    try {
      // sometimes DB returns JSON string
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed.map((f) => (f == null ? "" : String(f)));
    } catch (e) {
      // not JSON, try comma-split fallback
      return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [String(raw)];
  };

  /* FETCH PLANS - GET / */
  const fetchPlans = async () => {
    try {
      const res = await api.get(API_BASE);
      const rows = res.data.data || [];

      const mapped = rows.map((p) => ({
        id: p.plan_id ?? p.id,
        planname: p.plan_name ?? p.planname ?? "",
        price: Number(p.price ?? 0),
        billingCycle: (p.billing_cycle || "monthly").toLowerCase(),
        features: normalizeFeatures(p.features),
        description: p.description || "",
        activeclients: Number(p.active_clients ?? p.activeClients ?? p.activeclients ?? 0),
        status: p.status || "Active",
        createdAt: p.created_at ?? p.createdAt,
      }));

      setPlans(mapped);
    } catch (err) {
      console.error("Error fetching plans", err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  /* SEARCH FILTER */
  const filtered = useMemo(() => {
    if (!query) return plans;
    return plans.filter((p) =>
      (p.planname || "").toLowerCase().includes(query.toLowerCase())
    );
  }, [plans, query]);

  /* MODAL OPEN HANDLERS */

  const openNewPlanModal = () => {
    setEditingPlan(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  /* When editing, GET single plan from backend to ensure freshest data */
  const openEditModal = async (plan) => {
    try {
      // plan may have id or planId
      const planId = plan.id;
      const res = await api.get(`${API_BASE}/${planId}`);
      const data = res.data.data || {};

      setEditingPlan({ id: data.plan_id ?? planId });

      setForm({
        planTitle: data.plan_name ?? data.planTitle ?? plan.planname,
        price: data.price ?? plan.price ?? "",
        billingCycle: (data.billing_cycle ?? "monthly").toLowerCase(),
        features: normalizeFeatures(data.features).length ? normalizeFeatures(data.features) : [""],
        description: data.description ?? "",
        activeClients: Number(data.active_clients ?? data.activeClients ?? plan.activeclients ?? 0),
        status: data.status ?? plan.status ?? "Active",
      });

      setIsModalOpen(true);
    } catch (err) {
      console.error("Error fetching single plan for edit", err);
      // fallback to using plan object already present
      setEditingPlan(plan);
      setForm({
        planTitle: plan.planname,
        price: plan.price,
        billingCycle: plan.billingCycle || "monthly",
        features: plan.features && plan.features.length ? plan.features : [""],
        description: plan.description || "",
        activeClients: plan.activeclients || 0,
        status: plan.status || "Active",
      });
      setIsModalOpen(true);
    }
  };

  /* FEATURES list helpers */
  const updateFeatureAt = (index, value) => {
    const next = [...form.features];
    next[index] = value;
    setForm({ ...form, features: next });
  };

  const addFeatureAfter = (index) => {
    const next = [...form.features];
    next.splice(index + 1, 0, "");
    setForm({ ...form, features: next });
  };

  const removeFeatureAt = (index) => {
    const next = [...form.features];
    // keep at least one input
    if (next.length === 1) {
      next[0] = "";
    } else {
      next.splice(index, 1);
    }
    setForm({ ...form, features: next });
  };

  /* SAVE PLAN - POST / & PUT /:planId */
  const savePlan = async (e) => {
    e.preventDefault();

    // clean features: trim and filter out empty strings
    const featuresArray = (form.features || [])
      .map((f) => (f == null ? "" : String(f).trim()))
      .filter(Boolean);

    const payload = {
      planTitle: form.planTitle,
      price: Number(form.price),
      billingCycle: (form.billingCycle || "monthly").toLowerCase(),
      features: featuresArray,
      description: form.description,
      activeClients: Number(form.activeClients || 0),
      status: form.status,
    };

    try {
      if (editingPlan && editingPlan.id) {
        await api.put(`${API_BASE}/${editingPlan.id}`, payload);
      } else {
        await api.post(API_BASE, payload);
      }

      await fetchPlans();
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save error", err);
      alert("Error saving plan");
    }
  };

  /* DELETE PLAN */
  const removePlan = async (id) => {
    if (!window.confirm("Delete this plan?")) return;

    try {
      await api.delete(`${API_BASE}/${id}`);
      fetchPlans();
    } catch (err) {
      console.error("Delete error", err);
      alert("Error deleting plan");
    }
  };

  /* UI RENDER */
  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-[#050505]">
      {/* HEADER - FIXED STICKY */}
      <div className="sticky top-16 z-30 bg-gray-50 dark:bg-[#050505] border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-black dark:text-white">
                Subscription Plans
              </h1>
              <p className="text-sm text-slate-500">Manage subscription tiers</p>
            </div>

            <button
              onClick={openNewPlanModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4f6df5] hover:bg-[#3f5de5] text-white rounded-lg shadow-md hover:shadow-lg transition whitespace-nowrap font-medium"
            >
              <PlusCircle size={18} /> New Plan
            </button>
          </div>
          
          {/* SEARCH */}
          <div className="w-full sm:w-2/3 lg:w-1/2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                className="pl-10 pr-3 py-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f2125] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4f6df5] transition"
                placeholder="Search plans..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* PLANS GRID */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No subscription plans found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((plan) => (
              <div
                key={plan.id}
                className="bg-white dark:bg-[#1f2125] border border-gray-200 dark:border-gray-700 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex flex-col h-full"
              >
                {/* HEADER */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-[#4f6df5] text-xl font-semibold truncate">
                      {plan.planname}
                    </h3>
                    <p className="text-3xl font-bold text-black dark:text-white mt-2">
                      ₹{plan.price}
                    </p>
                    <p className="text-sm text-slate-500 capitalize mt-1">{plan.billingCycle}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${plan.status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                    {plan.status}
                  </span>
                </div>

                {/* FEATURES */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Features:</p>
                  <ul className="space-y-2 text-black dark:text-gray-200">
                    {(plan.features || []).slice(0, 5).map((f, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="w-5 h-5 bg-[#4f6df5] text-white rounded-full flex justify-center items-center text-xs flex-shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span className="text-sm break-words">{f}</span>
                      </li>
                    ))}
                    {plan.features && plan.features.length > 5 && (
                      <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                        +{plan.features.length - 5} more features
                      </li>
                    )}
                  </ul>
                </div>

                {/* ACTIONS */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="flex-1 px-4 py-2.5 border border-[#4f6df5] text-[#4f6df5] rounded-lg flex items-center justify-center gap-2 hover:bg-[#4f6df5] hover:text-white transition-all duration-200 font-medium"
                  >
                    <Edit size={16} /> Edit
                  </button>

                  <button
                    onClick={() => removePlan(plan.id)}
                    className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1f2125] w-full max-w-2xl rounded-lg shadow-xl border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                {editingPlan ? "Edit Plan" : "New Plan"}
              </h2>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-md border dark:border-[#3a3d44]"
              >
                <X size={18} className="text-black dark:text-white" />
              </button>
            </div>

            <form onSubmit={savePlan} className="space-y-4">
              {/* NAME + PRICE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-black dark:text-white">Plan Title</label>
                  <input
                    value={form.planTitle}
                    onChange={(e) => setForm({ ...form, planTitle: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 
                    bg-white dark:bg-[#2a2d33] dark:text-white dark:border-[#3a3d44]"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-black dark:text-white">Price</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 
                    bg-white dark:bg-[#2a2d33] dark:text-white dark:border-[#3a3d44]"
                    required
                  />
                </div>
              </div>

              {/* BILLING CYCLE */}
              <div>
                <label className="text-sm text-black dark:text-white">Billing Cycle</label>
                <select
                  value={form.billingCycle}
                  onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                  className="mt-1 w-40 rounded-md border px-3 py-2
                    bg-white dark:bg-[#2a2d33] dark:text-white dark:border-[#3a3d44]"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* FEATURES (dynamic inputs like Figma) */}
              <div>
                <label className="text-sm text-black dark:text-white">Features</label>
                <div className="mt-2 space-y-2">
                  {form.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={feat}
                        onChange={(e) => updateFeatureAt(idx, e.target.value)}
                        className="flex-1 rounded-md border px-3 py-2 bg-white dark:bg-[#2a2d33] dark:text-white dark:border-[#3a3d44]"
                        placeholder={`Feature ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => addFeatureAfter(idx)}
                        className="p-2 rounded-full border"
                        title="Add feature"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFeatureAt(idx)}
                        className="p-2 rounded-full border text-red-600"
                        title="Remove feature"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-md dark:border-[#3a3d44] text-black dark:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 bg-[#4f6df5] text-white rounded-md"
                >
                  {editingPlan ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
