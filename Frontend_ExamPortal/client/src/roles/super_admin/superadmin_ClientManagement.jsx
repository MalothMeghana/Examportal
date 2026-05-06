

import React, { useState, useRef, useEffect } from "react";
import api from "../../api";
import CredentialsModal from "../../components/CredentialsModal";

import {
  Eye,
  ChevronDown,
  X,
  Plus,
  Edit,
  Trash2,
  Search,
} from "lucide-react";

export default function Superadmin_ClientManagement() {

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All"); // All, Subscription, Name
  const [subFilter, setSubFilter] = useState("");
  const [openFilter, setOpenFilter] = useState(false);
  const [openSubFilter, setOpenSubFilter] = useState(null);

  const [sortOrder, setSortOrder] = useState(""); // asc / desc (when Name)
  const [modalOpen, setModalOpen] = useState(false);
  const [editOrg, setEditOrg] = useState(null); // used when opening edit modal (we keep edit modal for full edit if needed)

  const [statusMenuOrg, setStatusMenuOrg] = useState(null); // org_id for open small status menu per row
  const [infoModal, setInfoModal] = useState(null);

  // Credentials modal state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState([]);
  const [createdOrgName, setCreatedOrgName] = useState("");

  // Add-org users UI
  const [orgUsers, setOrgUsers] = useState([{ email: "", role: "Admin", fullName: "" }]);

  // data
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 4; // rows per page — adjust to match Figma
  const totalPages = Math.max(1, Math.ceil(clients.length / perPage));

  const filterRef = useRef(null);
  const menuRef = useRef(null);

  /* -----------------------
     Fetch Organizations
     GET /superadmin
     ----------------------- */
  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await api.get("/super-admin/clients");
      let data = res.data.data || [];

      // normalize keys if backend returns different names (we expect name, org_id, subscription, contact_person, contact_email)
      data = data.map((d) => ({
        name: d.name ?? d.organizationname ?? "",
        org_id: d.org_id ?? d.organizationid ?? d.organizationid?.toString(),
        subscription: d.subscription ?? d.plan_name ?? d.subscription,
        contact_person: d.contact_person ?? d.contactperson ?? d.contact_person,
        contact_email: d.contact_email ?? d.contact_email ?? d.contact_email ?? d.contactemail ?? d.contact_email,
        description: d.description ?? "",
        status: (d.status ?? "active").toLowerCase(),
        raw: d,
      }));

      setClients(data);
    } catch (err) {
      console.error("Failed to load organizations:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // initial load + filters watch
  useEffect(() => {
    fetchClients();
  }, []);

  /* -----------------------
     Click outside for dropdowns
     ----------------------- */
  useEffect(() => {
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setOpenFilter(false);
        setOpenSubFilter(null);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setStatusMenuOrg(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* -----------------------
     Derived: filtered + sorted list
     ----------------------- */
  const getFilteredSorted = () => {
    let data = [...clients];

    // filter out suspended organizations first
    data = data.filter((c) => c.status !== "suspended");

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.contact_email || "").toLowerCase().includes(q)
      );
    }

    // subscription filter
    if (filterStatus === "Subscription" && subFilter) {
      data = data.filter((c) =>
        (c.subscription || "none").toLowerCase() === subFilter.toLowerCase()
      );
    }

    // name sorting if selected
    if (filterStatus === "Name" && sortOrder) {
      data.sort((a, b) =>
        sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      );
    }

    return data;
  };

  const filteredData = getFilteredSorted();

  // update pagination if filtered length changes
  useEffect(() => {
    const newTotal = Math.max(1, Math.ceil(filteredData.length / perPage));
    if (currentPage > newTotal) setCurrentPage(newTotal);
  }, [search, filterStatus, subFilter, sortOrder, clients]); // eslint-disable-line

  /* -----------------------
     Pagination helpers
     ----------------------- */
  const totalFilteredPages = Math.max(1, Math.ceil(filteredData.length / perPage));
  const pageItems = () => {
    // produce an array of page numbers with ellipsis similar to Figma: show first 3, last 1 if many.
    const pages = [];
    const maxShow = 5;
    if (totalFilteredPages <= maxShow) {
      for (let i = 1; i <= totalFilteredPages; i++) pages.push(i);
    } else {
      // show current, neighbors, first, last
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalFilteredPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalFilteredPages - 2) pages.push("...");
      pages.push(totalFilteredPages);
    }
    return pages;
  };

  /* -----------------------
     Update organization status (from small status menu)
     Uses PUT /superadmin/:orgId
     ----------------------- */
  const updateOrgStatus = async (org, newStatus) => {
    try {
      await api.put(`/super-admin/clients/${org.org_id}`, {
        organizationName: org.name,
        description: org.description,
        status: org.status === "active" ? "inactive" : "active"
      });

      await fetchClients();
      setStatusMenuOrg(null);
    } catch (err) {
      console.error("Update status failed", err);
      alert("Failed to update status");
    }
  };

  /* -----------------------
     Delete organization
     DELETE /superadmin/:orgId
     ----------------------- */
  const deleteOrganization = async (org) => {
    if (!window.confirm("Are you sure you want to delete this organization?")) return;
    try {
      await api.put(`/super-admin/clients/${org.org_id}`,{
        organizationName: org.name,
        description: org.description,
        status: "suspended"
      });
      await fetchClients();
      
      // After deletion, check if current page is now empty and adjust if needed
      setCurrentPage((prev) => {
        const newTotal = Math.max(1, Math.ceil(filteredData.length / perPage));
        return prev > newTotal ? newTotal : prev;
      });
    } catch (err) {
      console.error(err);
      alert("Failed to delete organization");
    }
  };

  /* -----------------------
     Open Info Popup
     GET /superadmin/:orgId/info
     ----------------------- */
  const openInfo = async (org) => {
    try {
      const res = await api.get(`/super-admin/clients/${org.org_id}/info`);
      setInfoModal(res.data.data);
    } catch (err) {
      console.error("Failed to load info", err);
      alert("Failed to load information");
    }
  };

  /* -----------------------
     Create Organization + users
     POST /superadmin  (create org + admin)
     then POST /superadmin/:orgId/users for extra users
     ----------------------- */
  const saveOrganization = async (e) => {
    e.preventDefault();
    // read form fields
    const form = new FormData(e.target);
    const orgName = form.get("organizationName");
    const description = form.get("description") || "";

    try {
      if (editOrg) {
        // update org
        await api.put(`/super-admin/clients/${editOrg.org_id}`, {
          name: orgName,
          description,
        });
      } else {
        // create org with users
        // Validate all users have required fields
        const invalidUsers = orgUsers.filter((u, idx) => !u.email || !u.fullName);
        if (invalidUsers.length > 0) {
          alert("Please fill in Full Name and Email for all users.");
          return;
        }

        // Build users array from orgUsers - include full_name for backend
        const users = orgUsers
          .filter((u) => u.email && u.fullName)
          .map((u) => ({
            email: u.email.trim(),
            // include a couple of name variants to match backend expectations
            full_name: u.fullName.trim(),
            fullName: u.fullName.trim(),
            name: u.fullName.trim(),
            // keep role value as selected (e.g. 'Admin' / 'Invigilator') — don't lowercase
            role: u.role
          }));

        if (users.length === 0) {
          alert("Please add at least one user.");
          return;
        }

        const payload = {
          organizationName: orgName && orgName.trim(),
          description,
          // send several common variants for contact person to satisfy different backends
          contactPerson: orgUsers[0].fullName?.trim(),
          contact_person: orgUsers[0].fullName?.trim(),
          contactPersonName: orgUsers[0].fullName?.trim(),
          // Backwards-compatible top-level fields (some backends expect these)
          email: orgUsers[0].email?.trim(),
          role: orgUsers[0].role,
          fullName: orgUsers[0].fullName?.trim(),
          users: users
        };

        const res = await api.post("/super-admin/clients", payload);

        // Try to extract returned organization id from several possible keys
        const orgId =
          res.data.organization?.org_id ||
          res.data.organization?.organization_id ||
          res.data.data?.org_id ||
          res.data.data?.organization_id;

        // Build a normalized org object so the table can display it immediately
        const returnedOrg = res.data.organization || res.data.data || null;
        const newOrg = {
          name: (returnedOrg?.name || orgName || "").toString(),
          org_id: orgId || returnedOrg?.org_id || returnedOrg?.organization_id || "",
          subscription: returnedOrg?.subscription || null,
          contact_person: returnedOrg?.contact_person || payload.contactPerson || payload.contact_person || payload.contactPersonName || payload.fullName,
          contact_email: returnedOrg?.contact_email || payload.email || "",
          description: returnedOrg?.description || description || "",
          status: (returnedOrg?.status || "active").toLowerCase(),
          raw: returnedOrg || {},
        };

        // collect credentials from initial response (if any)
        const credentialsCollected = res.data.credentials ? [...res.data.credentials] : [];

        // If orgId exists and there are additional users, create them via POST /:orgId/users
        if (orgId && users.length > 1) {
          for (let i = 1; i < users.length; i++) {
            const u = users[i];
            try {
              const r = await api.post(`/super-admin/clients/${orgId}/users`, {
                email: u.email,
                role: u.role,
                fullName: u.full_name || u.fullName || u.name,
              });

              // extract credential from response
              if (r.data?.loginPassword) {
                credentialsCollected.push({
                  email: u.email,
                  full_name: u.full_name || u.fullName || u.name,
                  role: u.role,
                  password: r.data.loginPassword,
                });
              } else if (r.data?.credentials) {
                credentialsCollected.push(...r.data.credentials);
              } else if (r.data?.user) {
                credentialsCollected.push({
                  email: r.data.user.email,
                  full_name: r.data.user.full_name || r.data.user.fullName || "",
                  role: r.data.user.role,
                  password: r.data.loginPassword || "",
                });
              }
            } catch (err) {
              console.error("Failed to create additional user", users[i], err?.response?.data || err.message);
            }
          }
        }

        // If we collected credentials, show them
        if (credentialsCollected.length > 0) {
          setCreatedCredentials(credentialsCollected);
          setCreatedOrgName(orgName);
          setShowCredentialsModal(true);
        }

        // Optimistically add new org to list so table updates immediately
        if (newOrg.org_id) {
          setClients((prev) => [newOrg, ...prev]);
        } else {
          await fetchClients();
        }
      }

      // close modal and reload
      setModalOpen(false);
      setOrgUsers([{ email: "", role: "Admin", fullName: "" }]);
      setEditOrg(null);
      await fetchClients();
    } catch (err) {
      console.error("Save organization error:", err);
      console.error("Error response:", err.response?.data);
      const msg = err.response?.data?.message || err.message || "Error while saving organization";
      alert(msg);
    }
  };

  /* -----------------------
     Add / Remove user rows in Add-org modal
     ----------------------- */
  const addUserField = () => {
    setOrgUsers([...orgUsers, { email: "", role: "Admin", fullName: "" }]);
  };
  const removeUserField = (idx) => {
    setOrgUsers(orgUsers.filter((_, i) => i !== idx));
  };
  const updateUserField = (idx, key, val) => {
    const copy = [...orgUsers];
    copy[idx][key] = val;
    setOrgUsers(copy);
  };

  /* -----------------------
     Render
     ----------------------- */
  if (loading) {
    return (
      <div className="p-6 text-center text-lg font-semibold">Loading organizations...</div>
    );
  }

  // slice for current page
  const pagedData = filteredData.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="p-4 sm:p-6 w-full">
      {/* Top search + filter row (responsive layout) */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Search bar - full width on mobile, max-width on desktop */}
        <div className="relative w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={18} />
          </span>
          <input
            className="w-2/3 pl-10 pr-4 py-2.5 rounded-full border border-gray-300 bg-white text-gray-700 dark:bg-[#10131a] dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Search organization"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Filter button - full width on mobile, auto on desktop */}
        <div className="flex justify-start sm:justify-end">
          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <button
              className="w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2 bg-white border rounded-xl px-4 py-2 shadow-sm dark:bg-[#10131a] dark:border-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
              onClick={() => setOpenFilter((s) => !s)}
            >
              <span className="flex-1 sm:flex-none text-left sm:text-center">
                {filterStatus === "All"
                  ? "All"
                  : filterStatus === "Subscription"
                  ? `Subscription${subFilter ? ` (${subFilter})` : ""}`
                  : `Name${sortOrder ? ` (${sortOrder})` : ""}`}
              </span>
              <ChevronDown size={16} className={`transition ${openFilter ? "rotate-180" : ""}`} />
            </button>

            {openFilter && (
              <div className="absolute left-0 right-0 sm:right-auto sm:left-auto mt-2 w-full sm:w-56 bg-white border rounded-lg shadow-lg z-50 dark:bg-[#111827] dark:border-gray-700">
                <div
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setFilterStatus("All");
                    setSubFilter("");
                    setSortOrder("");
                    setOpenFilter(false);
                    setCurrentPage(1);
                  }}
                >
                  All
                </div>

                {/* Subscription */}
                <div>
                  <div
                    className="px-4 py-2 flex justify-between cursor-pointer hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                    onClick={() =>
                      setOpenSubFilter((s) => (s === "Subscription" ? null : "Subscription"))
                    }
                  >
                    Subscription <ChevronDown size={14} />
                  </div>
                  {openSubFilter === "Subscription" && (
                    <div className="bg-gray-50 dark:bg-gray-800">
                      {["Active", "Inactive", "Trial"].map((s) => (
                        <div
                          key={s}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-700"
                          onClick={() => {
                            setFilterStatus("Subscription");
                            setSubFilter(s);
                            setOpenFilter(false);
                            setCurrentPage(1);
                          }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <div
                    className="px-4 py-2 flex justify-between cursor-pointer hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setOpenSubFilter((s) => (s === "Name" ? null : "Name"))}
                  >
                    Name <ChevronDown size={14} />
                  </div>

                  {openSubFilter === "Name" && (
                    <div className="bg-gray-50 dark:bg-gray-800">
                      <div
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setFilterStatus("Name");
                          setSortOrder("asc");
                          setOpenFilter(false);
                        }}
                      >
                        Ascending (A → Z)
                      </div>
                      <div
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setFilterStatus("Name");
                          setSortOrder("desc");
                          setOpenFilter(false);
                        }}
                      >
                        Descending (Z → A)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card container */}
      <div className="bg-white rounded-xl shadow-lg border p-4 sm:p-6 dark:bg-[#1f2933] dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Client Management</h3>
            <p className="text-gray-500 text-sm dark:text-gray-400">All Clients in the system</p>
          </div>

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
            onClick={() => {
              setEditOrg(null);
              setOrgUsers([{ email: "", role: "Admin", fullName: "" }]);
              setModalOpen(true);
            }}
          >
            <Plus size={14} /> Add New Organization
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#eef3ff] text-blue-700 dark:bg-[#111827] dark:text-blue-300">
                <th className="py-3 px-2 text-left">Organization Name</th>
                <th className="py-3 px-2 text-left">Organization ID</th>
                <th className="py-3 px-2 text-left">Subscription</th>
                <th className="py-3 px-2 text-left">Contact Person</th>
                <th className="py-3 px-2 text-left">Email</th>
                <th className="py-3 px-2 text-left">Status</th>
                <th className="py-3 px-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody ref={menuRef}>
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                pagedData.map((org) => (
                  <tr key={org.org_id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-[#020617]">
                    <td className="px-2 py-3 text-gray-800 dark:text-gray-100">{org.name}</td>
                    <td className="px-2 py-3 text-gray-800 dark:text-gray-100">{org.org_id}</td>
                    <td className="px-2 py-3 text-gray-800 dark:text-gray-100">{org.subscription || "None"}</td>
                    <td className="px-2 py-3 text-gray-800 dark:text-gray-100">{org.contact_person}</td>
                    <td className="px-2 py-3 text-gray-800 dark:text-gray-100">{org.contact_email}</td>

                    <td className="px-2 py-3">
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${
                          org.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {org.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-2 py-3 flex items-center gap-3 relative">
                      {/* View */}
                      <button
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-100"
                        onClick={() => openInfo(org)}
                        title="View Information"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Status edit small menu (pencil icon) */}
                      <div className="relative">
                        <button
                          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-100"
                          onClick={() =>
                            setStatusMenuOrg((prev) => (prev === org.org_id ? null : org.org_id))
                          }
                          title="Change status"
                        >
                          <Edit size={16} />
                        </button>

                        {statusMenuOrg === org.org_id && (
                          <div className="absolute right-0 top-8 w-32 bg-white border rounded-md shadow-md z-50 text-sm dark:bg-[#020617] dark:border-gray-700 dark:text-gray-100">
                            {org.status === "active" ? (
                              <div
                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                onClick={() => updateOrgStatus(org, "Inactive")}
                              >
                                Make Inactive
                              </div>
                            ) : (
                              <div
                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                onClick={() => updateOrgStatus(org, "Active")}
                              >
                                Make Active
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600 dark:text-red-400"
                        onClick={() => deleteOrganization(org)}
                        title="Delete organization"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (Figma-like) */}
        <div className="flex items-center justify-center mt-6 gap-1 sm:gap-2 flex-wrap">
          <button
            className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm ${currentPage === 1 ? "bg-gray-100 text-gray-400" : "bg-white border"}`}
            onClick={() => currentPage > 1 && setCurrentPage((p) => p - 1)}
            disabled={currentPage === 1}
          >
            Prev
          </button>

          {pageItems().map((p, idx) =>
            p === "..." ? (
              <span key={`dot-${idx}`} className="px-1 sm:px-2 py-1 text-gray-400 text-xs sm:text-sm">...</span>
            ) : (
              <button
                key={p}
                className={`px-2 sm:px-3 py-2 rounded-full text-xs sm:text-sm ${currentPage === p ? "bg-blue-600 text-white" : "bg-white border"}`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            )
          )}

          <button
            className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm ${currentPage === totalFilteredPages ? "bg-gray-100 text-gray-400" : "bg-white border"}`}
            onClick={() => currentPage < totalFilteredPages && setCurrentPage((p) => p + 1)}
            disabled={currentPage === totalFilteredPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* Info Modal (View) */}
      {infoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-xl p-6 w-[360px] relative shadow-xl">
            <button
              className="absolute right-4 top-4"
              onClick={() => setInfoModal(null)}
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-semibold text-[#4f6df5] mb-4">Information</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <p>Total Number of Exams</p>
                <span>{infoModal.totals?.totalExams ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <p>Total Admins</p>
                <span>{infoModal.totals?.totalAdmins ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <p>Total Invigilator</p>
                <span>{infoModal.totals?.totalInvigilators ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <p>Total Students</p>
                <span>{infoModal.totals?.totalStudents ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Organization Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-[#1f2933] p-6 rounded-xl w-full max-w-lg relative max-h-[80vh] overflow-y-auto border dark:border-gray-700">
            <button
              className="absolute right-4 top-4 text-gray-700 dark:text-gray-300"
              onClick={() => {
                setModalOpen(false);
                setEditOrg(null);
              }}
            >
              <X size={20} />
            </button>

            <h3 className="text-2xl font-semibold text-[#4f6df5] mb-4">
              {editOrg ? "Edit Organization" : "Add New Organization"}
            </h3>

            <form onSubmit={saveOrganization} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">Organization Name</label>
                <input
                  name="organizationName"
                  defaultValue={editOrg?.name || ""}
                  className="w-full border rounded-lg px-3 py-2 mt-1 bg-white dark:bg-[#2a2d33] dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">Description</label>
                <textarea
                  name="description"
                  defaultValue={editOrg?.description || ""}
                  className="w-full border rounded-lg px-3 py-2 mt-1 bg-white dark:bg-[#2a2d33] dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Users list (Email + Full Name + Role) */}
              {!editOrg && (
                <>
                  <div className="border-t dark:border-gray-700 pt-4">
                    <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">Users (First user will be the contact person)</label>
                    <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-2">
                      {orgUsers.map((u, idx) => (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50 dark:bg-[#2a2d33] dark:border-gray-600">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                              User {idx + 1} {idx === 0 && "(Contact Person)"}
                            </span>
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => removeUserField(idx)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                title="Remove user"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <input
                              placeholder="Full Name *"
                              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#353a42] dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                              value={u.fullName}
                              onChange={(e) => updateUserField(idx, "fullName", e.target.value)}
                              required
                            />

                            <input
                              type="email"
                              placeholder="Email Address *"
                              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#353a42] dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                              value={u.email}
                              onChange={(e) => updateUserField(idx, "email", e.target.value)}
                              required
                            />

                            <select
                              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#353a42] dark:border-gray-600 dark:text-white"
                              value={u.role}
                              onChange={(e) => updateUserField(idx, "role", e.target.value)}
                            >
                              <option>Admin</option>
                              <option>Invigilator</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addUserField}
                      className="mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2 text-sm font-medium"
                    >
                      <Plus size={16} /> Add Another User
                    </button>
                  </div>
                </>
              )}

              <div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
                >
                  {editOrg ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && (
        <CredentialsModal
          credentials={createdCredentials}
          organizationName={createdOrgName}
          onClose={() => {
            setShowCredentialsModal(false);
            setCreatedCredentials([]);
            setCreatedOrgName("");
          }}
        />
      )}
    </div>
  );
}




