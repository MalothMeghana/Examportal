
import React, { useEffect, useState } from "react";
import api from "../../api";
import { FileText } from "lucide-react";

const InvigilatorGradingQueue = () => {
  const [step, setStep] = useState("queue");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [marks, setMarks] = useState({});
  const [totalMarks, setTotalMarks] = useState(0);

  
  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await api.get("/invigilator/grading-queue/priorityQueue");
      setQueue(res.data.priority_queue || []);
    } catch (err) {
      console.error("Queue Error:", err);
      setQueue([]);
    }
  };

  
  const loadQuestions = async (submission_id) => {
    try {
      const res = await api.get(`/invigilator/grading-queue/priorityQueue/${submission_id}/questions`);

      const qList = res.data.question || [];
      setQuestions(qList);

      
      const initialMarks = {};
      qList.forEach((q) => {
        initialMarks[q.question_id] = q.marks;
      });

      setMarks(initialMarks);
    } catch (err) {
      console.error("Questions error:", err);
      setQuestions([]);
    }
  };

  const handleGradeNow = (item) => {
    setSelectedStudent(item);
    loadQuestions(item.submission_id);
    setStep("questions");
  };

  const updateQuestionMark = async (question_id, value) => {
    setMarks({ ...marks, [question_id]: value });

    try {
      await api.put(
        `/invigilator/grading-queue/priorityQueue/${selectedStudent.submission_id}/update-mark`,
        { question_id, marks: value }
      );
    } catch (err) {
      console.error("Mark update error:", err);
    }
  };

  const goToFinalSubmit = () => {
    const total = Object.values(marks).reduce((sum, m) => sum + Number(m || 0), 0);
    setTotalMarks(total);
    setStep("marks");
  };

  const submitFinalMarks = async () => {
    try {
      await api.put(
        `/invigilator/grading-queue/priorityQueue/${selectedStudent.submission_id}/submit`,
        { total_marks: totalMarks }
      );

      setStep("queue");
      setSelectedStudent(null);
      fetchQueue();
    } catch (err) {
      console.error("Final submit error:", err);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-gray-50 dark:bg-[#1b1c1f] transition-all">

      <style>
        {`
          input[type=number]::-webkit-inner-spin-button,
          input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
          input[type=number] { -moz-appearance: textfield; }
        `}
      </style>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Grading Queue
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
        Prioritized list of submissions to grade
      </p>

      
      {step === "queue" && (
        <div className="bg-white dark:bg-[#23272A] rounded-xl border border-gray-200 dark:border-[#2f3237] p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4">
            Priority Queue
          </h2>

          {(queue || []).map((item) => (
            <div
              key={item.submission_id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1f2225] rounded-lg border dark:border-[#2f3237] mb-3"
            >
              <div>
                <h3 className="font-semibold dark:text-white">{item.student_name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-300">{item.student_rollno}</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">
                  Submitted: {new Date(item.submitted_at).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => handleGradeNow(item)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Grade Now
              </button>
            </div>
          ))}
        </div>
      )}

     
      {step === "questions" && (
        <div className="bg-white dark:bg-[#23272A] border dark:border-[#2f3237] p-6 rounded-xl max-w-3xl mx-auto">

          <h2 className="text-xl font-semibold dark:text-white mb-6">Questions</h2>

          {(questions || []).map((q) => (
            <div key={q.question_id} className="mb-6">
              <p className="text-gray-800 dark:text-gray-200 mb-2 font-medium">
                Q{q.question_id}. {q.question_text}
              </p>

              <input
                type="number"
                value={marks[q.question_id] || ""}
                onChange={(e) => updateQuestionMark(q.question_id, e.target.value)}
                placeholder="Marks"
                className="w-24 p-3 rounded border dark:bg-[#1f2225] dark:border-[#2f3237] dark:text-white text-center"
              />
            </div>
          ))}

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep("queue")}
              className="px-6 py-2 border rounded-lg dark:border-[#2f3237] dark:text-white"
            >
              Back
            </button>

            <button
              onClick={goToFinalSubmit}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg"
            >
              Next
            </button>
          </div>
        </div>
      )}

      
      {step === "marks" && (
        <div className="bg-white dark:bg-[#23272A] border dark:border-[#2f3237] p-8 rounded-xl max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold dark:text-white text-center mb-6">
            {selectedStudent?.student_name}
          </h2>

          <div className="text-center text-xl text-gray-700 dark:text-gray-200 mb-6">
            Total Marks: <span className="font-bold">{totalMarks}</span>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setStep("questions")}
              className="px-10 py-3 border rounded-lg dark:border-[#2f3237] dark:text-white"
            >
              Back
            </button>

            <button
              onClick={submitFinalMarks}
              className="px-12 py-3 bg-indigo-600 text-white rounded-lg"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvigilatorGradingQueue;


