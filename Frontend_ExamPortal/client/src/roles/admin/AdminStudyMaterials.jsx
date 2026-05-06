import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Upload, Trash2, Edit, X } from "lucide-react";
import { storage } from "../../firebase";
import { baseUrl } from "../../config";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

const API_BASE =baseUrl + "/admin/study-materials";


export default function AdminStudyMaterials() {
  const token = sessionStorage.getItem("token");

  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const orgName = localStorage.getItem("orgName") || "ExamMarkPro";

 const [form, setForm] = useState({
  title: "",
  description: "",
  file: null,
});


  useEffect(() => {
    fetchMaterials();
  }, []);

  async function fetchMaterials() {
    try {
      setLoading(true);
     const res = await fetch(API_BASE, {
  credentials: "include",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

      const data = await res.json();
      setMaterials(data.success ? data.data : []);
    } catch (err) {
      console.error("Fetch materials error:", err);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }

  function getFileMeta(file) {
    if (!file) return { type: null, size: null };

    const name = file.name.toLowerCase();
    const mime = (file.type || "").toLowerCase();

    let type = "File";
    if (name.endsWith(".pdf") || mime.includes("pdf")) type = "PDF";
    else if (name.endsWith(".doc") || name.endsWith(".docx")) type = "DOC";
    else if (name.endsWith(".ppt") || name.endsWith(".pptx")) type = "PPT";

    const bytes = file.size;
    let sizeStr =
      bytes >= 1024 * 1024
        ? (bytes / (1024 * 1024)).toFixed(2) + " MB"
        : bytes >= 1024
        ? (bytes / 1024).toFixed(1) + " KB"
        : bytes + " B";

    return { type, size: sizeStr };
  }

  const openUploadModal = (item = null) => {
    setEditItem(item);
setForm({
  title: item?.title || "",
  description: item?.description || "",
  file: null,
});

    setOpenModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

async function uploadToFirebase(file, fileType) {
    if (!file) return null;

    const folder = fileType || "Others";

    const filePath = `Docs/${orgName}/${folder}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

    const fileRef = storageRef(storage, filePath);

    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        () => {},
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, path: filePath });
        }
      );
    });
  }

  async function deleteFromFirebase(path) {
    if (!path) return;
    try {
      const refToDelete = storageRef(storage, path);
      await deleteObject(refToDelete);
    } catch (err) {
      console.error("Firebase delete error:", err);
    }
  }


const handleSubmit = async () => {
  if (!form.title) {
    alert("Title is required");
    return;
  }

  try {
    setLoading(true);

    const fileMeta = getFileMeta(form.file);
    let uploaded = null;

    if (form.file) {
      uploaded = await uploadToFirebase(form.file, fileMeta.type);
    }

    const payload = {
      title: form.title,
      description: form.description,
      type: fileMeta.type || editItem?.type || "File",
      fileURL: uploaded?.url || editItem?.fileURL || null,
      filePath: uploaded?.path || editItem?.filePath || null,
    };

    if (editItem) {
      if (uploaded && editItem.filePath) {
        await deleteFromFirebase(editItem.filePath);
      }

      await fetch(`${API_BASE}/${editItem.material_id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(API_BASE, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    }

    setOpenModal(false);
    setEditItem(null);
    setForm({ title: "", category: "", description: "", file: null });
    fetchMaterials();
  } catch (err) {
    console.error("Submit error:", err);
    alert("Upload failed — check console.");
  } finally {
    setLoading(false);
  }
};


  const handleDelete = async (item) => {
    if (!confirm("Delete this material?")) return;

    try {
      if (item.filePath) await deleteFromFirebase(item.filePath);

      await fetch(`${API_BASE}/${item.material_id}`, {
  method: "DELETE",
  credentials: "include",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

      fetchMaterials();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed — check console");
    }
  };

  
  const filteredMaterials = materials.filter((m) => {
    const s = search.toLowerCase();
    return (
     
     m.title?.toLowerCase().includes(s) ||
m.description?.toLowerCase().includes(s)

    );
  });

  return (
    <AdminLayout>
      <div className="px-1 mb-6 dark:text-white">
        <h1 className="text-2xl sm:text-3xl font-semibold">Study Materials</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Upload and manage study resources</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center mb-4">
        <input
          type="text"
placeholder="Search Title or Description"

          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-4 py-3 rounded-lg w-full md:max-w-2xl bg-white text-black dark:bg-[#111] dark:text-white"
        />

        <button
          onClick={() => openUploadModal(null)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <Upload size={16} />
          Upload Material
        </button>
      </div>

      <div className="bg-white dark:bg-[#0a0a0a] rounded-xl shadow p-4 sm:p-6 dark:text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">All Materials</h2>
          <div className="text-sm text-gray-500">{loading ? "Loading..." : `${materials.length} items`}</div>
        </div>

        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-blue-50 text-gray-700 dark:bg-[#111] dark:text-gray-200">
                <th className="p-3">Title</th>
                
                <th className="p-3">Type</th>
               <th className="p-3">Description</th>

                <th className="p-3">Upload Date</th>
               
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredMaterials.map((m) => (
                <tr key={m.id} className="border-b border-gray-200 dark:border-gray-700 dark:text-gray-200">
                  <td className="p-3">{m.title}</td>
                 
                  <td className="p-3">{m.type || "File"}</td>
<td className="p-3">
  {m.description ? m.description.slice(0, 60) : "-"}
</td>
<td className="p-3">{m.upload_date}</td>




                  <td className="p-3 flex gap-3">
                    <button onClick={() => openUploadModal(m)} className="text-blue-600 hover:text-blue-800" title="Edit">
                      <Edit size={16} />
                    </button>

                    <button onClick={() => handleDelete(m)} className="text-red-600 hover:text-red-800" title="Delete">
                      <Trash2 size={16} />
                    </button>

                    
                  </td>
                </tr>
              ))}

              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    No materials found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editItem ? "Edit Material" : "Upload Material"}</h2>
              <button onClick={() => { setOpenModal(false); setEditItem(null); }} className="text-black">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300">Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full border rounded-lg mt-1 p-2 bg-white"
                  placeholder="Material title"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300">Category</label>
              
              </div>

              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  className="w-full border rounded-lg mt-1 p-2 bg-white h-24 resize-none"
                  placeholder="Short description"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Select File {editItem ? "(leave empty to keep existing file)" : ""}
                </label>
                <input
                  type="file"
                  name="file"
                  onChange={handleFormChange}
                  className="w-full border rounded-lg mt-1 p-2 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => { setOpenModal(false); setEditItem(null); }} className="px-4 py-2 rounded-lg border">
                  Cancel
                </button>

                <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-blue-600 text-white">
                  {loading ? "Please wait..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}