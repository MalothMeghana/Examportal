import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { Eye, Pencil, Trash2, X, CalendarDays } from "lucide-react";
import api from "../../api";
export default function AdminExamMenu() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [searchDate, setSearchDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  const [invigilatorQuery, setInvigilatorQuery] = useState("");
  const [invigilatorSuggestions, setInvigilatorSuggestions] = useState([]);
  const [showInvigilatorDropdown, setShowInvigilatorDropdown] = useState(false);

  const [newExam, setNewExam] = useState({
    title: "",
    description: "",
    type: [],
    duration: "",
    q: "",
    startDate: new Date().toISOString().split('T')[0], // Default to today
    endDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0], // Default to 7 days from now
    totalMarks: "",
    negative: "",
    invigilators: [],

  });

  const resetForm = () => {
    setNewExam({
      title: "",
      description: "",
      type: [],
      duration: "",
      q: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
      totalMarks: "",
      negative: "",
      invigilators: [],
    });
    setInvigilatorQuery("");
    setInvigilatorSuggestions([]);
    setShowInvigilatorDropdown(false);
  };

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/exams");
      console.log(res,"res")
      if(res.status === 200){
        const mappedExams = res?.data?.data.map((e) => ({
            id: e.exam_id || e.id,
            exam_id: e.exam_id || e.id, // Keep original for API calls
            title: e.title,
            description: e.description || "",
            type: e.type,
            duration: e.duration_min || e.duration,
            q: e.total_questions || e.q,
            status: capitalize(e.status),
            attempts: e.attemptcount || e.attempts || 0,
            avg: `${Math.round(e.avg || 0)}%`,
            startDate: e.start_date || e.startDate,
            endDate: e.end_date || e.endDate,
          }));
        setExams(mappedExams);
      }
      
    } catch (err) {
      console.error('❌ Fetch exams error:', err); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const searchInvigilators = async (query) => {
    if (!query || query.trim().length < 2) {
      setInvigilatorSuggestions([]);
      setShowInvigilatorDropdown(false);
      return;
    }

    try {
      const res = await api.get("/admin/exams/invigilator/search", {
        params: { query: query.trim() }
      });
      
      setInvigilatorSuggestions(res.data || []);
      setShowInvigilatorDropdown(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Invigilator search error:", err);
      setInvigilatorSuggestions([]);
    }
  };

const selectInvigilator = (invigilator) => {
  if (newExam.invigilators.some(i => i.asi_id === invigilator.asi_id)) return;

  setNewExam(prev => ({
    ...prev,
    invigilators: [...prev.invigilators, invigilator],
  }));

  setShowInvigilatorDropdown(false);

  
};
const removeInvigilator = (id) => {
  setNewExam(prev => ({
    ...prev,
    invigilators: prev.invigilators.filter(i => i.asi_id !== id),
  }));
};

  const createExam = async () => {
   
    if (!newExam.title || !newExam.title.trim()) {
      alert("Please enter exam title");
      return;
    }
    
    if (!newExam.duration || Number(newExam.duration) <= 0) {
      alert("Please enter valid duration (in minutes)");
      return;
    }
    
    if (!newExam.q || Number(newExam.q) <= 0) {
      alert("Please enter valid number of questions");
      return;
    }

    if (!newExam.type || newExam.type.length === 0) {
      alert("Please select at least one exam type");
      return;
    }

    if (!newExam.startDate) {
      alert("Please select start date");
      return;
    }

    if (!newExam.endDate) {
      alert("Please select end date");
      return;
    }

    const payload = {
      title: newExam.title.trim(),
      description: newExam.description?.trim() || "",
     type:
  Array.isArray(newExam.type)
    ? (newExam.type.length > 1 ? "MIXED" : newExam.type[0])
    : newExam.type,

      duration: Number(newExam.duration),
      questions: Number(newExam.q),
      startDate: newExam.startDate,
      endDate: newExam.endDate,
      totalMarks: Number(newExam.totalMarks) || Number(newExam.q),
      negativeMarking: newExam.negative,
     invigilators: newExam.invigilators.map(i => ({
  id: i.asi_id,
  name: i.full_name,
}))

    };

    try {
      const res = await api.post("/admin/exams", payload);
      const json = res.data;
      
      if (json.success) {
        alert("Exam created successfully!");
        setShowCreateModal(false);
        resetForm();
        fetchExams();
      } else {
        alert(json.message || "Exam creation failed");
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Create exam error:", err);
      
 
      if (err.response) {
        const errorMsg = err.response.data?.message || err.response.data?.error || "Server error occurred";
        alert(`Failed to create exam: ${errorMsg}`);
      } else if (err.request) {
        alert("No response from server. Please check your connection.");
      } else {
        alert("Error: " + err.message);
      }
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/admin/exams/${selectedExam.exam_id}`);

      alert("✅ Exam deleted successfully!");
      setShowDeleteModal(false);
      setSelectedExam(null);
      fetchExams();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Delete Exam Error:', err);
      
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to delete exam';
      
      alert(`❌ ${errorMessage}`);
    }
  };

  const filtered = exams.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      (e.title.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q)) &&
      (filterType === "All" || e.type.includes(filterType)) &&
      (!searchDate || e.startDate === searchDate || e.endDate === searchDate)
    );
  });

  const todayISO = new Date().toISOString().slice(0, 10);
  useEffect(()=>{
    console.log(selectedExam,"selectedExam")
  },[selectedExam])
  return (
    <AdminLayout>
      <main className="px-1">

     
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Exam Menu</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Manage and monitor all exams
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl"
          >
            Create Exam
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <input
            className="px-4 py-2 border rounded-xl"
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="px-4 py-2 border rounded-xl"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="Descriptive">Descriptive</option>
            <option value="Coding">Coding</option>
          </select>

          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full px-4 py-2 border rounded-xl flex justify-between items-center"
            >
              {searchDate || "Today"} <CalendarDays size={18} />
            </button>

            {showDatePicker && (
              <div className="absolute mt-2 bg-white border p-3 rounded-xl w-full z-10">
                <input
                  type="date"
                  className="border p-2 w-full"
                  value={searchDate}
                  onChange={(e) => {
                    setSearchDate(e.target.value);
                    setShowDatePicker(false);
                  }}
                />
                <button
                  className="mt-2 w-full bg-blue-100 rounded p-2"
                  onClick={() => {
                    setSearchDate(todayISO);
                    setShowDatePicker(false);
                  }}
                >
                  Today
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border rounded-xl bg-white dark:bg-[#0d0d0d]">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Avg</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="p-6 text-center">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="p-6 text-center">No exams</td></tr>
              ) : (
                filtered.map((e) => (
                  <tr
                    key={e.id ?? `${e.title}-${e.startDate}`}
                    className="border-t"
                  >
                    <td className="p-3">{e.title}</td>
                    <td>{e.type}</td>
                    <td>{e.duration} min</td>
                    <td>{e.q}</td>
                    <td><StatusPill status={e.status} /></td>
                    <td>{e.attempts}</td>
                    <td>{e.avg}</td>
                    <td className="flex gap-4 p-3 justify-center">
                      <Eye onClick={() => { setSelectedExam(e); setShowViewModal(true); }} />
                      <Pencil onClick={() => navigate(`/admin/exam-management?id=${e.exam_id}`)} />
                      <Trash2 className="text-red-600" onClick={() => { setSelectedExam(e); setShowDeleteModal(true); }} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showViewModal && (
          <Modal title="Exam Details" onClose={() => setShowViewModal(false)}>
            <ExamDetails exam={selectedExam} selectedExam={selectedExam}/>
          </Modal>
        )}

        {showDeleteModal && (
          <Modal title="Delete Exam" onClose={() => setShowDeleteModal(false)}>
            <DeleteConfirm selectedExam={selectedExam} onDelete={confirmDelete} />
          </Modal>
        )}

        {showCreateModal && (
          <Modal title="Create Exam" onClose={() => setShowCreateModal(false)}>
            <CreateExamForm
  newExam={newExam}
  setNewExam={setNewExam}
  createExam={createExam}
  onClose={() => {
    resetForm();
    setShowCreateModal(false);
  }}
  invigilatorQuery={invigilatorQuery}
  setInvigilatorQuery={setInvigilatorQuery}
  searchInvigilators={searchInvigilators}
  invigilatorSuggestions={invigilatorSuggestions}
  showInvigilatorDropdown={showInvigilatorDropdown}
  selectInvigilator={selectInvigilator}
  setShowInvigilatorDropdown={setShowInvigilatorDropdown}
  removeInvigilator={removeInvigilator}
/>

          </Modal>
        )}

      </main>
    </AdminLayout>
  );
}
const capitalize = (s = "") =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

function StatusPill({ status }) {
  const map = {
    Active: "bg-green-100 text-green-700",
    Upcoming: "bg-yellow-100 text-yellow-700",
    Completed: "bg-blue-100 text-blue-700",
  };

  const cls = map[status] ?? "bg-gray-100 text-gray-700"; 

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
<div className="bg-white dark:bg-[#1a1a1a] text-black dark:text-white p-4 sm:p-6 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold">{title}</h2>
          <X onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

function ExamDetails({ exam,selectedExams }) {
  if (!exam) return null;
  return (
    <div className="space-y-2 text-sm">
      <p><b>Title:</b> {exam.title}</p>
      <p><b>Type:</b> {exam.type}</p>
      <p><b>Duration:</b> {exam.duration} min</p>
      <p><b>Questions:</b> {exam.q}</p>
      <p><b>Start:</b> {exam.startDate}</p>
      <p><b>End:</b> {exam.endDate}</p>
    </div>
  );
}

function DeleteConfirm({ selectedExam, onDelete }) {
  if (!selectedExam) return null;
  return (
    <>
      <p>Delete <b>{selectedExam.title}</b>?</p>
      <div className="flex justify-end mt-4">
        <button
          className="px-4 py-2 bg-red-600 text-white rounded"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </>
  );
}

function CreateExamForm({ 
  newExam, 
  setNewExam, 
  createExam, 
  onClose,
  invigilatorQuery,
  setInvigilatorQuery,
  searchInvigilators,
  invigilatorSuggestions,
  showInvigilatorDropdown,
  selectInvigilator,
  setShowInvigilatorDropdown,
  removeInvigilator
}) {

  const input = "w-full px-4 py-2 border rounded-lg text-sm";

  return (
    <div className="space-y-4">

      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">
        Define the details for your new exam. Click create when you're done.
      </p>

      <div className="space-y-1">
        <label className="text-sm font-medium">Exam Title</label>
        <input
          className={input}
          placeholder="Mathematics Exam"
          value={newExam.title}
          onChange={(e) =>
            setNewExam({ ...newExam, title: e.target.value })
          }
        />
      </div>

      <div className="space-y-1">
        <textarea
          className={`${input} resize-none`}
          rows={3}
          placeholder="Description"
          value={newExam.description}
          onChange={(e) =>
            setNewExam({ ...newExam, description: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Exam Type</label>
        <div className="flex gap-6 text-sm">
          {["MCQ", "Descriptive", "Coding"].map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newExam.type.includes(t)}
                onChange={() =>
                  setNewExam((prev) => ({
                    ...prev,
                    type: prev.type.includes(t)
                      ? prev.type.filter((x) => x !== t)
                      : [...prev.type, t],
                  }))
                }
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1 relative">
        <label className="text-sm font-medium">Assign Invigilator (Optional)</label>
        <input
          className={input}
          placeholder="Search invigilator by name..."
          value={invigilatorQuery}
          onChange={(e) => {
            setInvigilatorQuery(e.target.value);
            searchInvigilators(e.target.value);
          }}
          onFocus={() => {
            if (invigilatorSuggestions.length > 0) {
              setShowInvigilatorDropdown(true);
            }
          }}
        />
        {showInvigilatorDropdown && invigilatorSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {invigilatorSuggestions.map((inv) => (
             <div
  key={inv.asi_id}
  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
  onMouseDown={(e) => {
    e.preventDefault();
    selectInvigilator(inv);
  }}
>

                <div className="font-medium text-gray-900 dark:text-white">{inv.full_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{inv.email}</div>
              </div>
            ))}
          </div>
        )}
       {newExam.invigilators.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-2">
    {newExam.invigilators.map(inv => (
      <span
        key={inv.asi_id}
        className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs"
      >
        {inv.full_name}
        <button
          type="button"
          onClick={() => removeInvigilator(inv.asi_id)}
          className="text-red-500"
        >
          ✕
        </button>
      </span>
    ))}
  </div>
)}

      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Duration (min)</label>
        <input
          type="text"
          className={input}
          placeholder="120"
          value={newExam.duration}
        onChange={(e) =>
  setNewExam({ ...newExam, duration: Number(e.target.value) })
}

        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Start Date</label>
          <input
            type="date"
            className={input}
            value={newExam.startDate}
            onChange={(e) =>
              setNewExam({ ...newExam, startDate: e.target.value })
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">End Date</label>
          <input
            type="date"
            className={input}
            value={newExam.endDate}
            onChange={(e) =>
              setNewExam({ ...newExam, endDate: e.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Number of Questions</label>
        <input
          type="text"
          className={input}
          placeholder="50"
          value={newExam.q}
          onChange={(e) =>
           setNewExam({ ...newExam, q: Number(e.target.value) })

          }
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Total Marks</label>
        <input
          type="text"
          className={input}
          placeholder="100"
          value={newExam.totalMarks}
          onChange={(e) =>
           setNewExam({ ...newExam, totalMarks: Number(e.target.value) })

          }
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Negative Marking</label>
        <select
          className={input}
          value={newExam.negative}
          onChange={(e) =>
            setNewExam({ ...newExam, negative: e.target.value })
          }
        >
          <option value={0}>None</option>
          <option value={1/3}>1/3 (33%)</option>
          <option value={1/4}>1/4 (25%)</option>
          <option value={1/2}>1/2 (50%)</option>
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          className="px-4 py-2 border rounded-lg text-sm"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          onClick={createExam}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          Create Exam
        </button>
      </div>
    </div>
  );
}
