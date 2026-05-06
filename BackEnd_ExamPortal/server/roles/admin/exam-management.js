const pool = require("../../config/db");

const validateRequest = (examId, questions) => {
  if (!examId || !Array.isArray(questions) || !questions.length) {
    throw new Error("Exam ID and questions required");
  }
};

const getAllowedTypes = async (examId) => {
  const exam = await pool.query(
    "SELECT type FROM mainexamportal.exams WHERE exam_id = $1",
    [examId]
  );

  if (!exam.rowCount) {
    throw new Error("Exam not found");
  }

  const examType = exam.rows[0].type;
  if (examType === "MIXED") {
    return ["MCQ", "Coding", "Descriptive"];
  }
  return [examType];
};


const validateQuestion = (q, allowedTypes) => {
  if (!q.type || !q.questionText) {
    throw new Error("Every question needs type & text");
  }

  if (!allowedTypes.includes(q.type)) {
    throw new Error(`Invalid question type: ${q.type}`);
  }

  if (q.type === "MCQ") {
    if (!Array.isArray(q.choices) || q.choices.length < 2) {
      throw new Error("MCQ must have at least 2 options");
    }
    if (!q.choices.some(c => c.isCorrect)) {
      throw new Error("MCQ must have one correct answer");
    }
  }
};

const insertQuestion = async (examId, q, createdBy) => {
  const result = await pool.query(
    `INSERT INTO mainexamportal.questions
     (exam_id, question_text, question_type, marks, created_by)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING question_id`,
    [examId, q.questionText, q.type, q.marks || 1, createdBy]
  );
  return result.rows[0].question_id;
};

const insertMCQOptions = async (questionId, choices, createdBy) => {
  for (const opt of choices) {
    await pool.query(
      `INSERT INTO mainexamportal.mcq_questions
       (question_id, option_text, is_correct, created_by)
       VALUES ($1,$2,$3,$4)`,
      [questionId, opt.text, opt.isCorrect, createdBy]
    );
  }
};


const createQuestions = async (req, res) => {
  const examId = req.params.id;
  const { questions } = req.body;
  const createdBy = req.user.id;

  try {
    validateRequest(examId, questions);

    const allowedTypes = await getAllowedTypes(examId);

    await pool.query("BEGIN");

    await pool.query(
      "DELETE FROM mainexamportal.questions WHERE exam_id=$1",
      [examId]
    );

    const insertedIds = [];

    for (const q of questions) {
      validateQuestion(q, allowedTypes);

      const qId = await insertQuestion(examId, q, createdBy);
      insertedIds.push(qId);

      if (q.type === "MCQ") {
        await insertMCQOptions(qId, q.choices, createdBy);
      }
    }

    await pool.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Questions saved successfully",
      questionIds: insertedIds
    });

  } catch (err) {
    await pool.query("ROLLBACK");
    res.status(400).json({ message: err.message });
  }
};

module.exports = createQuestions;
