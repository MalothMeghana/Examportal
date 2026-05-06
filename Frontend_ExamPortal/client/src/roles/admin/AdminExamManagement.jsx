import React, { useState, useEffect } from "react";

import { Plus, Trash2 } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api";
const uid = () => Date.now() + Math.floor(Math.random() * 999999);

export default function AdminExamManagement() {
  const examId = new URLSearchParams(window.location.search).get("id");
  console.log(examId,"examId")
  const [examInfo, setExamInfo] = useState({
    title: "",
    type: "Mixed",
    duration: "",
    totalQuestions: "",
  });

  const [mcq, setMcq] = useState([
    { id: uid(), question: "", choices: ["", ""], correct: null, type: "MCQ" },
  ]);

  

  useEffect(() => {
    if (!examId) return;

    const fetchExamDetails = async () => {
      try {
        const res = await api.get(`/admin/exams/${examId}`);
        const exam = res.data.data;
        console.log(exam,"exam")

   
        setExamInfo({
          title: exam.title || "",
          type: exam.type || "Mixed",
          duration: exam.duration_min || "",
          totalQuestions: exam.total_questions || "",
        });

        const mcqs = [];
        const coding = [];
        const descriptive = [];

        exam.questions?.forEach((q) => {
          if (q.type === "MCQ") {
            mcqs.push({
              id: uid(),
              question: q.questionText,
              choices: q.choices.map(c => c.text),
              correct: q.choices.findIndex(c => c.isCorrect),
              type: "MCQ",
            });
          }

          if (q.type === "Coding") {
            coding.push({
              id: uid(),
              question: q.questionText,
            });
          }

          if (q.type === "Descriptive") {
            descriptive.push({
              id: uid(),
              question: q.questionText,
            });
          }
        });

        if (mcqs.length) setMcq(mcqs);
        if (coding.length) setCodingQuestions(coding);
        if (descriptive.length) setDescriptiveQuestions(descriptive);

      } catch (err) {
        console.error("Failed to load exam", err);
        alert("Unable to load exam details");
      }
    };

    fetchExamDetails();
  }, [examId]);
  const handleInfoChange = (field, value) => {
    setExamInfo((prev) => ({ ...prev, [field]: value }));
  };
 

  const addMcq = () => {
    setMcq([
      { id: uid(), question: "", choices: ["", ""], correct: null, type: "MCQ" },
      ...mcq,
    ]);
  };
const deleteMcq = (id) => {
  setMcq(mcq.filter((m) => m.id !== id));
};


  const updateMcqQuestion = (id, value) => {
    setMcq(mcq.map((m) => (m.id === id ? { ...m, question: value } : m)));
  };

  const updateChoice = (mcqId, index, value) => {
    setMcq(
      mcq.map((m) =>
        m.id === mcqId
          ? {
              ...m,
              choices: m.choices.map((c, i) => (i === index ? value : c)),
            }
          : m
      )
    );
  };

  const addChoice = (id) => {
    setMcq(
      mcq.map((m) =>
        m.id === id ? { ...m, choices: [...m.choices, ""] } : m
      )
    );
  };

  const removeChoice = (id, index) => {
    setMcq(
      mcq.map((m) => {
        if (m.id === id) {
          if (m.choices.length <= 2) {
            alert("MCQ must have at least 2 options.");
            return m;
          }
          return { ...m, choices: m.choices.filter((_, i) => i !== index) };
        }
        return m;
      })
    );
  };

  const setCorrectAnswer = (mcqId, index) => {
    setMcq(
      mcq.map((m) =>
        m.id === mcqId
          ? { ...m, correct: index }
          : m
      )
    );
  };

  const [codingQuestions, setCodingQuestions] = useState([
    { id: uid(), question: "" },
  ]);

  const addCoding = () => {
    setCodingQuestions([{ id: uid(), question: "" }, ...codingQuestions]);
  };

  const updateCoding = (id, value) => {
    setCodingQuestions(
      codingQuestions.map((c) => (c.id === id ? { ...c, question: value } : c))
    );
  };

 const deleteCoding = (id) => {
  setCodingQuestions(codingQuestions.filter((c) => c.id !== id));
};



  const [descriptiveQuestions, setDescriptiveQuestions] = useState([
    { id: uid(), question: "" },
  ]);

  const addDescriptive = () => {
    setDescriptiveQuestions([{ id: uid(), question: "" }, ...descriptiveQuestions]);
  };

  const updateDescriptive = (id, value) => {
    setDescriptiveQuestions(
      descriptiveQuestions.map((d) =>
        d.id === id ? { ...d, question: value } : d
      )
    );
  };

 const deleteDescriptive = (id) => {
  setDescriptiveQuestions(descriptiveQuestions.filter((d) => d.id !== id));
};


  const submitExamQuestions = async () => {
    const examId = new URLSearchParams(window.location.search).get("id");
    if (!examId) return alert("Exam ID missing");

    const questions = [];

    for (let m of mcq) {
      if (!m.question.trim()) return alert("MCQ question cannot be empty.");
      if (m.choices.some((c) => !c.trim()))
        return alert("MCQ options cannot be empty.");
      if (m.correct === null)
        return alert("Please select a correct answer for all MCQs.");

      questions.push({
        type: "MCQ",
        questionText: m.question.trim(),
        marks: 1,
        choices: m.choices.map((c, i) => ({
          text: c.trim(),
          isCorrect: i === m.correct,
        })),
      });
    }
    for (let c of codingQuestions) {
      if (!c.question.trim())
        return alert("Coding question cannot be empty.");
      questions.push({
        type: "Coding",
        questionText: c.question.trim(),
        marks: 1,
      });
    }

    for (let d of descriptiveQuestions) {
      if (!d.question.trim())
        return alert("Descriptive question cannot be empty.");
      questions.push({
        type: "Descriptive",
        questionText: d.question.trim(),
        marks: 1,
      });
    }

    try {
     await api.put(`/admin/questions/${examId}`, { questions });

      alert("Questions saved successfully ✅");
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      alert("Unable to connect to server. Check backend.");
    }
  };

  return (
    <AdminLayout>
      <h2 className="text-2xl font-semibold mb-3">MCQ Questions</h2>
      <div className="bg-white dark:bg-[#0f0f0f] rounded-xl shadow p-6 mb-8">
  <h2 className="text-xl font-semibold mb-4 dark:text-white">
    Exam Details
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 
    <div>
      <label className="text-sm text-gray-600 dark:text-gray-300">
        Exam Title
      </label>
      <input
        type="text"
        value={examInfo.title}
        onChange={(e) => handleInfoChange("title", e.target.value)}
        className="w-full border rounded-lg p-3 mt-1 dark:bg-[#1a1a1a]"
        placeholder="Mathematics Exam"
      />
    </div>

  
    <div>
      <label className="text-sm text-gray-600 dark:text-gray-300">
        Exam Type
      </label>
      <select
        value={examInfo.type}
        onChange={(e) => handleInfoChange("type", e.target.value)}
        className="w-full border rounded-lg p-3 mt-1 dark:bg-[#1a1a1a]"
      >
        <option value="Mixed">Mixed</option>
        <option value="MCQ">MCQ</option>
        <option value="Coding">Coding</option>
        <option value="Descriptive">Descriptive</option>
      </select>
    </div>

   
    <div>
      <label className="text-sm text-gray-600 dark:text-gray-300">
        Duration (min)
      </label>
      <input
        type="number"
        value={examInfo.duration}
        onChange={(e) => handleInfoChange("duration", e.target.value)}
        className="w-full border rounded-lg p-3 mt-1 dark:bg-[#1a1a1a]"
        placeholder="120"
      />
    </div>

  
    <div>
      <label className="text-sm text-gray-600 dark:text-gray-300">
        Number of Questions
      </label>
      <input
        type="number"
        value={examInfo.totalQuestions}
        onChange={(e) =>
          handleInfoChange("totalQuestions", e.target.value)
        }
        className="w-full border rounded-lg p-3 mt-1 dark:bg-[#1a1a1a]"
        placeholder="50"
      />
    </div>
  </div>
</div>
      <div className="px-1 max-w-7xl mx-auto">
    
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Exam Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage exam questions for your assessment
          </p>
        </div>

     
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">MCQ</span>
                </div>
                Multiple Choice Questions
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-13">
                {mcq.length} question{mcq.length !== 1 ? 's' : ''} added
              </p>
            </div>
            <button
              onClick={addMcq}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2 transition shadow-sm"
            >
              <Plus size={20} /> Add MCQ
            </button>
          </div>

          <div className="space-y-4">
  {mcq.length === 0 && (
    <p className="text-sm text-gray-500 italic">
      No MCQ questions added yet.
    </p>
  )}

  {mcq.map((m, index) => (

              <div
                key={m.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                        Q{index + 1}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      MCQ Question
                    </span>
                  </div>
                  <button
                    onClick={() => deleteMcq(m.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    title="Delete question"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Question Text
                  </label>
                  <textarea
                    value={m.question}
                    onChange={(e) => updateMcqQuestion(m.id, e.target.value)}
                    placeholder="Enter your question here..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-4 text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
                    rows={3}
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Answer Options (Select correct answer)
                  </label>
                  <div className="space-y-2">
                    {m.choices.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <div className="flex items-center gap-2 flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                          <input
                            type="radio"
                            name={`correct-${m.id}`}
                            checked={m.correct === i}
                            onChange={() => setCorrectAnswer(m.id, i)}
                            className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
                            value={c}
                            onChange={(e) => updateChoice(m.id, i, e.target.value)}
                            placeholder={`Option ${i + 1}`}
                          />
                          <button
                            onClick={() => removeChoice(m.id, i)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition"
                            title="Remove option"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => addChoice(m.id)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <Plus size={16} /> Add Another Option
                </button>
              </div>
            ))}
          </div>
        </div>

  
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-bold text-xs">{"</>"}</span>
                </div>
                Coding Questions
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-13">
                {codingQuestions.length} question{codingQuestions.length !== 1 ? 's' : ''} added
              </p>
            </div>
            <button
              onClick={addCoding}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center gap-2 transition shadow-sm"
            >
              <Plus size={20} /> Add Coding Question
            </button>
          </div>

          <div className="space-y-4">
  {codingQuestions.length === 0 && (
    <p className="text-sm text-gray-500 italic">
      No coding questions added yet.
    </p>
  )}

  {codingQuestions.map((c, index) => (

              <div
                key={c.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                      <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                        C{index + 1}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Coding Question
                    </span>
                  </div>
                  <button
                    onClick={() => deleteCoding(c.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    title="Delete question"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Problem Statement
                  </label>
                  <textarea
                    value={c.question}
                    onChange={(e) => updateCoding(c.id, e.target.value)}
                    placeholder="Describe the coding problem, input format, output format, constraints, and examples..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-4 text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition font-mono text-sm"
                    rows={6}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

 
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-xl">✍️</span>
                </div>
                Descriptive Questions
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-13">
                {descriptiveQuestions.length} question{descriptiveQuestions.length !== 1 ? 's' : ''} added
              </p>
            </div>
            <button
              onClick={addDescriptive}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium flex items-center gap-2 transition shadow-sm"
            >
              <Plus size={20} /> Add Descriptive Question
            </button>
          </div>

          <div className="space-y-4">
  {descriptiveQuestions.length === 0 && (
    <p className="text-sm text-gray-500 italic">
      No descriptive questions added yet.
    </p>
  )}

  {descriptiveQuestions.map((d, index) => (

              <div
                key={d.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">
                        D{index + 1}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Descriptive Question
                    </span>
                  </div>
                  <button
                    onClick={() => deleteDescriptive(d.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    title="Delete question"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Question Text
                  </label>
                  <textarea
                    value={d.question}
                    onChange={(e) => updateDescriptive(d.id, e.target.value)}
                    placeholder="Enter a descriptive question that requires detailed written answer..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-4 text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition"
                    rows={4}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-4 flex justify-center pt-6 pb-4">
          <button
            onClick={submitExamQuestions}
            className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Submit All Questions
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
