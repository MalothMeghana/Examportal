import React, { useState, useMemo, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Search, Eye, Trash2, X } from "lucide-react";
import { baseUrl } from "../../config";
export default function AdminUserManagement() {
  const token = sessionStorage.getItem("token");

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    age: "",
    role: "Invigilator",
    status: "Active",
    date: "",
    attempts: 0,
    score: "0%",
  });
  const getStatusColor = (s) => {
    if (!s) return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-white";
    if (s.toLowerCase() === "active") return "bg-green-100 text-green-700 dark:bg-green-700 dark:text-white";
    if (s.toLowerCase() === "upcoming") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-white";
    if (s.toLowerCase() === "completed") return "bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-white";
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-white";
  };
const fetchUsers = useCallback(async () => {
  try {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (filterRole && filterRole !== "all") q.set("role", filterRole);
    const res = await fetch(`${baseUrl}/admin/users?${q.toString()}`, {
  credentials: "include",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

    if (!res.ok) throw new Error(res.statusText);

    const json = await res.json();
    setUsers(json.success ? json.users || [] : []);
  } catch (err) {
    if (import.meta.env.DEV) console.error(err);
    setUsers([]);
  }
}, [search, filterRole, token]);

useEffect(() => {
  fetchUsers();
}, [fetchUsers]);
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.phone) {
      alert("Please fill Name, Email and Phone");
      return;
    }
    try {
      const body = {
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.phone,
        gender: newUser.gender,
        age: newUser.age,
      };

      const res = await fetch(`${baseUrl}/admin/users/invigilators`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(body),
});


      const json = await res.json();
      if (!res.ok) {
        alert(json.message || "Failed to create invigilator");
        return;
      }

      alert("Invigilator created!");
      setShowAddModal(false);
      resetNewUser();
      fetchUsers();
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      alert("Server error");
    }
  };

  const resetNewUser = () =>
    setNewUser({
      name: "",
      email: "",
      phone: "",
      gender: "",
      age: "",
      role: "Invigilator",
      status: "Active",
      date: "",
      attempts: 0,
      score: "0%",
    });

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
const res = await fetch(
  `${baseUrl}/admin/users/${userToDelete.id}?role=${userToDelete.role.toLowerCase()}`,
  {
    method: "DELETE",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);



      if (!res.ok) throw new Error(res.statusText);

      alert("User deleted");
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      alert("Server error");
    }
  };

  const openViewModal = async (user) => {
  try {
    const res = await fetch(
  `${baseUrl}/admin/users/${user.id}?role=${user.role.toLowerCase()}`,
  {
    credentials: "include",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);



    if (!res.ok) throw new Error(res.statusText);

    const json = await res.json();
    setSelectedUser(json.data);
    setShowViewModal(true);
  } catch (err) {
    if (import.meta.env.DEV) console.error(err);
    alert("Server error");
  }
};


  const sortedFilteredUsers = useMemo(() => {
    let list = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        (u.status || "").toLowerCase().includes(search.toLowerCase())
    );

    if (filterRole !== "all") {
      list = list.filter(
        (u) => (u.role || "").toLowerCase() === filterRole.toLowerCase()
      );
    }

    return list;
  }, [users, search, filterRole]);

  return (
    <AdminLayout>

   <div className="px-1 dark:text-white">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">User Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Manage users in your organization
          </p>
        </div>
        <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="relative w-full md:w-1/2">
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border rounded-lg shadow-sm dark:bg-[#1a1a1a] dark:border-gray-700 dark:text-white"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 rounded-lg border dark:bg-[#1a1a1a] dark:text-white dark:border-gray-700"
            >
              <option value="all">All</option>
             <option value="student">Student</option>
             <option value="invigilator">Invigilator</option>
              <option value="admin">Admin</option>

            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="ml-2 px-4 py-2 bg-[#4f6df5] text-white rounded-lg shadow"
            >
              Add New Invigilator
            </button>
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-[#0f0f0f] rounded-xl shadow border dark:border-gray-700 overflow-hidden">
          <div className="max-h-[380px] overflow-y-auto">
            <table className="min-w-full text-sm divide-y dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-[#1b1b1b] sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-left">Email</th>
                  <th className="py-3 px-4 text-left">Role</th>
                  <th className="py-3 px-4 text-left">Enroll Date</th>
                  <th className="py-3 px-4 text-center">Exam Attempted</th>
                  <th className="py-3 px-4 text-center">Avg Score</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white dark:bg-[#0f0f0f] dark:text-white">
                {sortedFilteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center dark:text-gray-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  sortedFilteredUsers.map((u) => (
                    <tr key={u.id} className="border-t dark:border-gray-700">
                      <td className="py-3 px-4">{u.name}</td>
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4">{u.role}</td>
                      <td className="py-3 px-4">{u.enroll_date ?? u.date ?? ""}</td>
                      <td className="py-3 px-4 text-center">{u.attempts ?? 0}</td>
                      <td className="py-3 px-4 text-center">{u.score ?? "0%"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(u.status)}`}>
                          {u.status || "Unknown"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                      <Eye
  size={18}
  className="cursor-pointer"
  onClick={() => openViewModal(u)}
/>

                        {u.role !== "admin" && (
  <Trash2
    size={18}
    className="cursor-pointer text-rose-500"
    onClick={() => openDeleteModal(u)}
  />
)}

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-6" />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl p-6 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-[#4f6df5]">Add New Invigilator</h2>
              <button onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm">Full Name</label>
                <input value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} className="w-full mt-1 p-3 border rounded-lg dark:bg-[#0f0f0f] dark:border-gray-700" placeholder="Enter name" />
              </div>
              <div>
                <label className="text-sm">Email</label>
                <input value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} className="w-full mt-1 p-3 border rounded-lg dark:bg-[#0f0f0f] dark:border-gray-700" placeholder="Enter email" />
              </div>
              <div>
                <label className="text-sm">Phone Number</label>
                <input value={newUser.phone} onChange={(e) => setNewUser((p) => ({ ...p, phone: e.target.value }))} className="w-full mt-1 p-3 border rounded-lg dark:bg-[#0f0f0f] dark:border-gray-700" placeholder="+91 1234567891" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Gender</label>
                  <select value={newUser.gender} onChange={(e) => setNewUser((p) => ({ ...p, gender: e.target.value }))} className="w-full mt-1 p-3 border rounded-lg dark:bg-[#0f0f0f] dark:border-gray-700">
                    <option>male</option>
                    <option>female</option>
                    <option>other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm">Age</label>
                  <input type="number" value={newUser.age} onChange={(e) => setNewUser((p) => ({ ...p, age: e.target.value }))} className="w-full mt-1 p-3 border rounded-lg dark:bg-[#0f0f0f] dark:border-gray-700" placeholder="35" />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={handleAddUser} className="px-6 py-2 bg-[#4f6df5] text-white rounded-lg w-full">Create</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl p-6 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Delete User</h2>
              <button onClick={() => setShowDeleteModal(false)}><X size={18} /></button>
            </div>
            <p>Are you sure you want to delete <strong>{userToDelete.name}</strong>? This action cannot be undone.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-rose-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl p-6 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">User Details</h2>
              <button onClick={() => setShowViewModal(false)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-300">Phone Number</p>
                <p className="font-medium">{selectedUser.phone}</p>
              </div>

        
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-300">Gender</p>
                <p className="font-medium">{selectedUser.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-300">Age</p>
                <p className="font-medium">{selectedUser.age}</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowViewModal(false)} className="px-5 py-2 bg-[#4f6df5] text-white rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
