import UserLayout from "../../components/UserLayout";
import { useState, useEffect,useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { Clock, FileText, Play, ChevronDown, ChevronUp, X } from "lucide-react";

const filter1Options = ["All", "Name", "Date", "Type", "Status"];

const filter2Options = {
  All: [],
  Name: ["Ascending (A→Z)", "Descending (Z→A)"],
  Date: ["Ascending", "Descending"],
  Type: ["MCQ", "Coding", "Descriptive", "Mixed"],
  Status: ["Active", "Inactive"],
};

const convertDate = (d) =>  d ? new Date(d) : new Date(0);

function StatusBadge({ status }) {
  return status === "Active" ? (
    <span className="px-2.5 py-[3px] text-[11px] rounded-md border border-green-500 text-green-700 bg-white">
      Active
    </span>
  ) : (
    <span className="px-2.5 py-[3px] text-[11px] rounded-md border border-gray-300 text-gray-600 bg-white">
      Inactive
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span className="inline-block px-3 py-[3px] text-[11px] rounded-md bg-[#EEF2FF] text-[#4F46E5] border border-[#DDE3FF]">
      {type}
    </span>
  );
}

function AttemptBadge({ label, variant }) {
  const base = "px-3 py-[3px] text-[11px] rounded-md border bg-white";
  if (variant === "attempted")
    return <span className={`${base} border-[#4CAF50] text-[#2E7D32]`}>{label}</span>;
  if (variant === "not")
    return <span className={`${base} border-[#EF4444] text-[#B91C1C]`}>{label}</span>;
  return <span className={`${base} border-[#EAB308] text-[#B45309]`}>{label}</span>;
}

function ExamCard({ exam, onViewResult }) {
  const navigate = useNavigate();

  const startExam = () => {
    navigate(`/user/exam/${exam.examId}`);
  };

  return (
    <div className="bg-white dark:bg-[#0F1216] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-5 flex flex-col justify-between min-h-[300px]">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">
            {exam.name}
          </h2>
          <StatusBadge status={exam.active_ui} />
        </div>

        <div className="flex gap-2 flex-wrap">
          {exam.attempt_ui === "Attempted" && <AttemptBadge label="Attempted" variant="attempted" />}
          {exam.attempt_ui === "Not Attempted" && <AttemptBadge label="Not Attempted" variant="not" />}
          {exam.attempt_ui === "Missed" && <AttemptBadge label="Missed" variant="missed" />}
        </div>

        <TypeBadge type={exam.examType} />

        <div className="flex gap-6 text-[13px] text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-1">
            <Clock size={15} /> {exam.duration} Min
          </div>
          <div className="flex items-center gap-1">
            <FileText size={15} /> {exam.totalQuestions}
          </div>
        </div>

        <div className="flex gap-6 text-[12px] text-gray-600 dark:text-gray-400">
          <span>Start date: {exam.startDate?.slice(0, 10)}</span>
          <span>End date: {exam.endDate?.slice(0, 10)}</span>
        </div>

        {exam.percentage !== null && (
          <div className="mt-1">
            <p className="text-[12px] text-gray-700 mb-1">Your score :</p>
            <div className="w-full h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 rounded-full bg-[#4F46E5]"
                style={{ width: `${exam.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        {exam.button_ui === "Start Exam" && (
          <button
            onClick={startExam}
            className="w-full h-10 bg-[#4F46E5] text-white rounded-md flex items-center justify-center"
          >
            <Play size={16} /> Start Exam
          </button>
        )}

        {exam.button_ui === "View Result" && (
          <div className="flex justify-between gap-6">
            <button className="h-9 px-6 bg-[#E5E7EB] rounded-md text-gray-800 text-[13px]">
              Completed
            </button>
            <button
              onClick={() => onViewResult(exam.examId)}
              className="h-9 px-6 border border-[#4F46E5] text-[#4F46E5] rounded-md text-[13px]"
            >
              View Result
            </button>
          </div>
        )}

        {exam.button_ui === "Missed" && (
          <button disabled className="h-9 px-6 bg-gray-200 rounded-md text-gray-500 text-[13px] cursor-not-allowed">
            Missed
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyExam() {
  const [exams, setExams] = useState([]);
  const [filter1, setFilter1] = useState("All");
  const [filter2, setFilter2] = useState("");
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [finalFilter, setFinalFilter] = useState({});
  const [resultPopup, setResultPopup] = useState(null);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get("/user/my-exams",
        );
        if (res.data?.success) {
          setExams(res.data.exams || []);
        } else {
          setExams([]);
        }
      } catch {
        setExams([]);
      }
    };
    fetchExams();
  }, []);

  const fetchResult = async (examId) => {
    try {
      const res = await api.get("/user/view-result", {
        params: { examId },
      });
      if (res.data?.success) {
        setResultPopup(res.data.attempt);
      }
    } catch {
      setResultPopup(null);
    }
  };

  const applyFilter = () => {
    let data = [...exams];

    if (finalFilter.sort === "date-new")
      data.sort((a, b) => convertDate(b.startDate) - convertDate(a.startDate));
    if (finalFilter.sort === "date-old")
      data.sort((a, b) => convertDate(a.startDate) - convertDate(b.startDate));
    if (finalFilter.sort === "name-asc")
      data.sort((a, b) => a.name.localeCompare(b.name));
    if (finalFilter.sort === "name-desc")
      data.sort((a, b) => b.name.localeCompare(a.name));
    if (finalFilter.type)
      data = data.filter((e) => e.examType.toLowerCase() === finalFilter.type.toLowerCase());
    if (finalFilter.status)
      data = data.filter((e) => e.active_ui === finalFilter.status);

    return data;
  };

  const finalList = useMemo(() => applyFilter(), [exams, finalFilter])

  return (
    <UserLayout>
      <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-[#0B0F14]">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="pt-1 flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-[26px] font-semibold text-gray-900 dark:text-white">
                Available Exams
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Take mock tests and organization exams
              </p>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="relative">
                <button
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm min-w-[120px] flex justify-between items-center text-gray-900 dark:text-gray-200"
                  onClick={() => {
                    setOpen1(!open1);
                    setOpen2(false);
                  }}
                >
                  {filter1}
                  {open1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {open1 && (
                  <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1F2937]">
                    {filter1Options.map((o) => (
                      <button
                        key={o}
                        onClick={() => {
                          setFilter1(o);
                          setFilter2("");
                          setFinalFilter({});
                          setOpen1(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2A3244]"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  disabled={filter2Options[filter1].length === 0}
                  className={`px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm min-w-[120px] flex justify-between items-center ${
                    filter2Options[filter1].length === 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
                  }`}
                  onClick={() => {
                    if (filter2Options[filter1].length > 0) {
                      setOpen2(!open2);
                      setOpen1(false);
                    }
                  }}
                >
                  {filter2 || "Select"}
                  {open2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {open2 && (
                  <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1F2937] border border-gray-300 dark:border-gray-700 rounded-md shadow-xl z-50">
                    {filter2Options[filter1].map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setFilter2(item);
                          if (filter1 === "Name")
                            setFinalFilter({ sort: item.includes("Asc") ? "name-asc" : "name-desc" });
                          if (filter1 === "Date")
                            setFinalFilter({ sort: item.includes("Asc") ? "date-old" : "date-new" });
                          if (filter1 === "Type") setFinalFilter({ type: item });
                          if (filter1 === "Status") setFinalFilter({ status: item });
                          setOpen2(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
            {finalList.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-10">
                No exams found
              </div>
            ) : (
              finalList.map((exam, index) => <ExamCard key={`${exam.examId}-${index}`} exam={exam} onViewResult={fetchResult} />)
            )}
          </div>
        </div>
      </div>

      {resultPopup && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F1216] rounded-2xl shadow-xl w-[380px] p-6 relative">
            <button
              onClick={() => setResultPopup(null)}
              className="absolute top-3 right-3 text-gray-500"
            >
              <X size={20} />
            </button>

            <h2 className="text-center text-xl font-semibold text-gray-900 dark:text-white">
              {resultPopup.examTitle}
            </h2>

            <p className="text-center text-sm text-gray-500 mt-2">
              Score: {resultPopup.score} / {resultPopup.totalMarks}
            </p>

            <p className="text-center text-sm text-gray-500 mt-1">
              Percentage: {resultPopup.percentage !== null
              ? `${Math.round(resultPopup.percentage)}%`
              : "Pending evaluation"}
            </p>
          </div>
        </div>
      )}
    </UserLayout>
  );
}