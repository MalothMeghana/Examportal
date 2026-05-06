import { useEffect, useState, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import { ArrowLeft, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../api";

export default function AdminReports() {
  const [tab, setTab] = useState("overview");

  const [overview, setOverview] = useState([]);
  const [examSummary, setExamSummary] = useState([]);
  const [userSummary, setUserSummary] = useState([]);

  const [examDetails, setExamDetails] = useState([]);
  const [userDetails, setUserDetails] = useState([]);

  const [loading, setLoading] = useState(false);



  const fetchOverview = useCallback(async () => {
    const res = await api.get("/admin/reports/overview");
    setOverview(res.data.data || []);
  }, []);

  const fetchExamSummary = useCallback(async () => {
    const res = await api.get("/admin/reports/exams");
    setExamSummary(res.data.data || []);
  }, []);

  const fetchUserSummary = useCallback(async () => {
    const res = await api.get("/admin/reports/users");
    setUserSummary(res.data.data || []);
  }, []);

  const fetchExamDetails = async (id) => {
    setLoading(true);
    const res = await api.get(`/admin/reports/exams/${id}`);
    setExamDetails(res.data.data || []);
    setTab("examDetails");
    setLoading(false);
  };

  const fetchUserDetails = async (id) => {
    setLoading(true);
    const res = await api.get(`/admin/reports/users/${id}`);
    setUserDetails(res.data.data || []);
    setTab("userDetails");
    setLoading(false);
  };

  useEffect(() => {
    fetchOverview();
    fetchExamSummary();
    fetchUserSummary();
  }, [fetchOverview, fetchExamSummary, fetchUserSummary]);


  const handleExport = () => {
    let rows = [];

    if (tab === "overview") {
      rows = [
        ["User", "Attempts", "Average %", "Last Attempt"],
        ...overview.map(o => [o.name, o.attempts, o.avg, o.date]),
      ];
    }

    if (tab === "examSummary") {
      rows = [
        ["Exam", "Students", "Average %", "Date"],
        ...examSummary.map(e => [e.title, e.totalStudents, e.avg, e.date]),
      ];
    }

    if (!rows.length) return;

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "reports.xlsx");
  };



  return (
    <AdminLayout>
      <div className="bg-white dark:bg-black p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Reports</h1>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
          >
            <Download size={16} /> Export
          </button>
        </div>

        {tab !== "overview" && (
          <button
            onClick={() => setTab("overview")}
            className="flex items-center gap-2 text-blue-600"
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}

        {tab === "overview" && (
          <>
            <Section title="User Overview">
              <Table
                headers={["User", "Attempts", "Average %", "Action"]}
                rows={overview.map(u => [
                  u.name,
                  u.attempts,
                  u.avg,
                  <button
                    className="border px-2 py-1"
                    onClick={() => fetchUserDetails(u.userId)}
                  >
                    View
                  </button>,
                ])}
              />
            </Section>

            <Section title="Exam Summary">
              <Table
                headers={["Exam", "Students", "Average %", "Action"]}
                rows={examSummary.map(e => [
                  e.title,
                  e.totalStudents,
                  e.avg,
                  <button
                    className="border px-2 py-1"
                    onClick={() => fetchExamDetails(e.examId)}
                  >
                    View
                  </button>,
                ])}
              />
            </Section>
          </>
        )}

        {tab === "examDetails" && (
          <Section title="Exam Details">
            {loading ? (
              "Loading..."
            ) : (
              <Table
                headers={[
                  "User",
                  "MCQ",
                  "Code",
                  "Total",
                  "%",
                  "Date",
                  "Status",
                ]}
                rows={examDetails.map(d => [
                  d.name,
                  d.mcq_score,
                  d.codescrip_score,
                  d.total_marks,
                  d.percentage,
                  d.date,
                  d.status,
                ])}
              />
            )}
          </Section>
        )}

        {tab === "userDetails" && (
          <Section title="User Exam History">
            {loading ? (
              "Loading..."
            ) : (
              <Table
                headers={[
                  "Exam",
                  "MCQ",
                  "Code",
                  "Total",
                  "%",
                  "Date",
                  "Status",
                ]}
                rows={userDetails.map(d => [
                  d.title,
                  d.mcq_score,
                  d.codescrip_score,
                  d.total_marks,
                  d.percentage,
                  d.date,
                  d.status,
                ])}
              />
            )}
          </Section>
        )}
      </div>
    </AdminLayout>
  );
}

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </div>
);

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full border">
      <thead className="bg-gray-100">
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="border p-2 text-left">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-gray-50">
            {r.map((c, j) => (
              <td key={j} className="border p-2">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);