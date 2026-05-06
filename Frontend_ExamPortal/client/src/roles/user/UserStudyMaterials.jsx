import UserLayout from "../../components/UserLayout";
import { useState, useMemo, useEffect } from "react";
import { FileText, Search, ChevronDown, ChevronUp } from "lucide-react";
import api from "../../api";

function MaterialRow({ material, activeFilter, onView }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0F1216] border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 shadow-sm">
      <div className="flex gap-4 items-start">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
          <FileText size={20} className="text-blue-600" />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
            {material.title}
          </h3>

          <p className="text-xs md:text-[13px] text-gray-600 dark:text-gray-300">
            {material.description}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {activeFilter === "Materials" ? material.type : activeFilter}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-400" />
            <span className="px-2 py-[2px] rounded-md bg-red-500 text-white text-[11px]">
              PDF
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">
              Uploaded: {new Date(material.uploadedOn).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onView(material.id)}
        className="w-full md:w-auto px-5 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
      >
        View
      </button>
    </div>
  );
}

export default function StudyMaterials() {
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState(["Materials"]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Materials");
  const [dropdown, setDropdown] = useState(false);

  useEffect(() => {
    fetchCategories();
    }, []);

  useEffect(() => {
    fetchMaterials();
  }, [categoryFilter]);

  const fetchMaterials = async () => {
    try {
      const url =
        categoryFilter === "Materials"
          ? "/user/study-materials"
          : `/user/study-materials?category=${encodeURIComponent(
              categoryFilter
            )}`;

      const res = await api.get(url);

      if (res.data.success) {
        setMaterials(res.data.data);
      } else {
        setMaterials([]);
      }
    } catch (err) {
      console.error("Study materials error:", err);
      setMaterials([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/user/study-materials/categories");

      if (res.data.success) {
        setCategories(["Materials", ...res.data.data]);
      }
    } catch (err) {
      console.error("Category fetch error:", err);
    }
  };

  const fetchSingleMaterial = async (id) => {
    try {
      const existingMaterial = materials.find(m => m.id === id);
      if (existingMaterial) {
        const url = existingMaterial.fileUrl || existingMaterial.fileURL || existingMaterial.storageUrl || existingMaterial.url;
        if (url) {
          window.open(url, "_blank");
          return;
        }
      }

      const res = await api.get(`/user/study-materials/${id}`);
      
      if (res.data.success && res.data.data) {
        const material = res.data.data;
        const url = material.fileUrl || material.fileURL || material.storageUrl || material.url;
        
        if (url) {
          window.open(url, "_blank");
        } else {
          alert("File URL not found in material data");
        }
      } else {
        alert("File not available");
      }
    } catch (err) {
      console.error("View material error:", err);
      alert("Failed to load file. Please try again.");
    }
  };

  const filteredMaterials = useMemo(() => {
    const term = search.trim().toLowerCase();
    return materials.filter(
      (m) => !term || m.title.toLowerCase().includes(term)
    );
  }, [materials, search]);

  return (
    <UserLayout>
      <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0B0F14] px-2 sm:px-4 pt-1 pb-6">
        <div className="max-w-6xl mx-auto space-y-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-[26px] font-semibold text-gray-900 dark:text-white">
                Study Materials
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Access learning resources provided by your organization
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={16} />
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-200"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setDropdown(!dropdown)}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-900 text-sm min-w-[150px] flex items-center justify-between text-gray-900 dark:text-gray-200"
                >
                  {categoryFilter}
                  {dropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {dropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    {categories
                      .filter((c) => c !== categoryFilter)
                      .map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setCategoryFilter(option);
                            setDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          {option}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 pb-10">
            {filteredMaterials.length === 0 ? (
              <div className="mt-6 p-10 border border-dashed border-gray-300 rounded-xl text-center text-gray-500">
                No materials found
              </div>
            ) : (
              filteredMaterials.map((m) => (
                <MaterialRow
                  key={m.id}
                  material={m}
                  activeFilter={categoryFilter}
                  onView={fetchSingleMaterial}
                />
              ))
            )}
          </div>

        </div>
      </div>
    </UserLayout>
  );
}


