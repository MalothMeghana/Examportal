import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import { GraduationCap } from "lucide-react";

export default function ExamPage() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [examInfo, setExamInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
  const startExam = async () => {
    try {
      await api.post("/user/start-exam", { examId });
      const qRes = await api.get("/user/get-questions", {
        params: { examId },
      });

      if (qRes.data?.success) {
        const { exam, questions } = qRes.data;
        setExamInfo(exam);
        setQuestions(questions);
        setAnswers(new Array(questions.length).fill(null));
        setTimeLeft((exam.duration || 60) * 60);
        setLoading(false);
          }
        } catch (err) {
          console.error("Failed to start exam:", err);
          alert(err.response?.data?.message || "Failed to start exam");
          setLoading(false);
          navigate("/user/exams");
        }
      };

      startExam();
    }, [examId]);


  useEffect(() => {
    if (!timeLeft || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const formatTime = useMemo(() => {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const s = String(timeLeft % 60).padStart(2, "0");
    return `00:${m}:${s}`;
  }, [timeLeft]);

  const handleSubmit = async () => {
    if (submitted) return; 
    try {
      await api.post("/user/submit-exam", {
        examId,
        answers: answers.map((a, i) => ({
          questionId: questions[i]?.questionId,
          answer: a,
        })),
      },
      );

      setSubmitted(true);
      setTimeout(() => navigate("/user/exams"), 2000);
    } catch (err) {
      alert(err.response?.data?.message || "Submit failed");
    }
  };

  const chooseOption = (optionId) => {
    const copy = [...answers];
    copy[index] = optionId;
    setAnswers(copy);

  };

  const currentQ = questions[index];
  const qType = (currentQ?.questionType || examInfo?.type || "").toLowerCase();

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <GraduationCap size={22} className="text-indigo-600" />
          <span className="text-lg font-semibold text-indigo-600">
            ExamMarkPro
          </span>
        </div>
        <h2 className="font-semibold text-gray-900"> {examInfo?.title || "Exam"} </h2>

        <div className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-sm">
          {formatTime}
        </div>
      </header>

      {submitted && (
        <div className="flex justify-center mt-4">
          <div className="max-w-4xl w-full bg-white border border-green-500 rounded-lg px-4 py-3 text-center text-green-700 text-sm shadow-sm">
            Your exam has been submitted successfully. Redirecting…
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="lg:col-span-3 flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading exam...</p>
            </div>
          </div>
        ) : !currentQ ? (
          <div className="lg:col-span-3 flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-gray-600">No questions available.</p>
              <button 
                onClick={() => navigate("/user/exams")}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Back to Exams
              </button>
            </div>
          </div>
        ) : (
          <>
        <div className="lg:col-span-2 bg-white rounded-2xl shadow p-8">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            QUESTION {index + 1} OF {questions.length}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {currentQ?.questionText}
          </h3>

          <div className="space-y-6">
            {qType === "mcq" && currentQ.options && (
              currentQ.options.map((op) => (
                <label
                  key={op.optionId}
                  className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition ${
                    answers[index] === op.optionId
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-400"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${index}`}
                    checked={answers[index] === op.optionId}
                    onChange={() => chooseOption(op.optionId)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-800">{op.optionText}</span>
                </label>
              ))
            )}

            {(qType === "descriptive") && (
              <textarea
                rows={6}
                value={answers[index] || ""}
                onChange={(e) => {
                  const copy = [...answers];
                  copy[index] = e.target.value;
                  setAnswers(copy);
                }}
                placeholder="Write your answer here..."
                className="w-full p-4 rounded-xl bg-white text-gray-900 font-mono border border-gray-400 outline-none focus:outline-none focus:border-gray-500"

              />
            )}
            {(qType === "coding") && (
              <textarea
                rows={6}
                value={answers[index] || ""}
                onChange={(e) => {
                  const copy = [...answers];
                  copy[index] = e.target.value;
                  setAnswers(copy);
                }}
                placeholder="Write your code here..."
                className="w-full p-4 rounded-xl bg-white text-gray-900 font-mono border border-gray-400 outline-none focus:outline-none focus:border-gray-500"
              />
            )}

          </div>

          <div className="flex justify-end mt-8 gap-4">
            <div className="flex gap-3">
              <button
                onClick={() => setIndex((p) => Math.max(0, p - 1))}
                disabled={index === 0}
                className="px-5 py-2 border rounded-lg text-sm disabled:opacity-40"
              >
                ← Previous
              </button>
            </div>

            <button
              onClick={() =>
                setIndex((p) => Math.min(questions.length - 1, p + 1))
              }
              disabled={index === questions.length - 1}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Question Navigator</h3>

          <div className="flex gap-4 text-xs mb-5">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded"></span> Answered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-300 rounded"></span> Not Visited
            </span>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-6">
            {questions.map((_, i) => {
            const answered = answers[i] !== null;
            const isCurrent = i === index;

            return (
              <button
                key={i}
                onClick={() => setIndex(i)}
                disabled={isCurrent}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition
                  ${
                    answered
                      ? "bg-green-500 text-white"
                      : isCurrent
                      ? "bg-white text-gray-900"
                      : "bg-gray-200 text-gray-700"
                  }
                  ${
                    isCurrent
                      ? "ring-2 ring-[#4F46E5] ring-offset-2 cursor-default"
                      : "cursor-pointer hover:opacity-80"
                  }
                `}
              >
                {i + 1}
              </button>
            );
          })}

          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-2 border border-green-600 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-50"
          >
            Submit Exam
          </button>
        </div>
          </>
        )}
      </div>
      
    </div>
  );
}