
import React, { useEffect, useState } from "react";
import { Clock, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const InvigilatorSubmissions = () => {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

 
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await api.get("/invigilator/submissions/exams");
      setExams(res.data.exams || []);
    } catch (err) {
      console.error("Failed to load exams:", err);
      setError("Failed to load exams");
    }
    setLoading(false);
  };

  
  const getStatusColor = (status) => {
    if (status === "Completed")
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
  };

  return (
    <div className="p-8 min-h-screen bg-gray-50 dark:bg-[#1b1c1f] transition-all">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Student Submissions
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Evaluate and grade student submissions
        </p>
      </div>

      
      {loading && (
        <p className="text-gray-500 dark:text-gray-300">Loading exams...</p>
      )}

      
      {error && (
        <p className="text-red-500 dark:text-red-300">{error}</p>
      )}

      
      {!loading && exams.length === 0 && (
        <p className="text-gray-500 dark:text-gray-300">No exams found.</p>
      )}

      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {exams.map((exam, index) => (
          <div
            key={index}
            className="
              bg-white dark:bg-[#23272A]
              border border-gray-200 dark:border-[#2f3237]
              shadow-sm rounded-lg p-5 flex flex-col
            "
          >

            
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1">
                  {exam.exam_title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {exam.exam_description || "No description"}
                </p>
              </div>

              <span className={`${getStatusColor(exam.exam_status)} px-3 py-1 rounded-full text-xs font-medium`}>
                {exam.exam_status}
              </span>
            </div>

           
            <div className="flex gap-6 mb-4 mt-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {exam.total}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Graded</p>
                <p className="text-xl font-semibold text-green-500">
                  {exam.graded}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pending</p>
                <p className="text-xl font-semibold text-red-500">
                  {exam.pending}
                </p>
              </div>
            </div>

            
            <div className="space-y-1 mb-4">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                <span>{exam.duration} Mins</span>
              </div>

              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                <span>{exam.total_questions} Questions</span>
              </div>
            </div>

            
            <div className="mb-4">
              <span
                className="
                  inline-block px-3 py-1 text-xs font-medium 
                  text-blue-600 dark:text-blue-400 
                  border border-blue-600 dark:border-blue-400 
                  rounded-full
                "
              >
                {exam.exam_type}
              </span>
            </div>

            
            <button
              onClick={() => navigate("/gradingqueue")}
              className="
                w-full bg-indigo-600 hover:bg-indigo-700 
                text-white font-medium py-2.5 px-4 
                rounded-md shadow-sm transition
              "
            >
              Start Grading
            </button>

          </div>
        ))}
      </div>
    </div>
  );
};

export default InvigilatorSubmissions;
