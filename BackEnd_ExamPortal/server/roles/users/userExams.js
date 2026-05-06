

const express = require("express");
const db = require("../../config/db.js");
const router = express.Router();


function getContext(req) {
  return {
    userId: req.user?.id || null,
    userRole: req.user?.role ? String(req.user.role).toUpperCase() : null,
    orgId: req.user?.organizationId || req.user?.organization_id || null,
    query: req.query || {},
    body: req.body || {},
  };
}

function formatExamType(type) {
  if (!type) return "MCQ";
  const t = String(type).toUpperCase();
  if (t === "MCQ" || t === "MCQS") return "MCQ";
  if (t === "CODING" || t === "CODE" || t === "PROGRAMMING") return "Coding";
  if (t === "DESCRIPTIVE" || t === "DESC") return "Descriptive";
  if (t === "MIXED") return "Mixed";
  return type;
}

function computeAttemptStatus(exam) {
  const now = new Date();
  
  const end = exam.end_date ? new Date(exam.end_date) : null;

  if (exam.attempt_id) return "Attempted";
  
  
  if (end && now > end) return "Missed";
  
  return "Not Attempted";
}

function computeActiveStatus(exam) {
  const now = new Date();
  if (!exam.start_date || !exam.end_date) return "Inactive";
  const start = new Date(exam.start_date);
  const end = new Date(exam.end_date);
  return now >= start && now <= end ? "Active" : "Inactive";
}

function computeButtonUI(exam) {
  const attempt = exam.attempt_ui;
  const active = exam.active_ui;
  if (attempt === "Attempted") return "View Result";
  if (attempt === "Missed") return "Missed";
  if (active === "Active" && attempt === "Not Attempted") return "Start Exam";
  return "Not Available";
}


router.get("/my-exams", async (req, res) => {
  try {
    const { userId, userRole, orgId, query } = getContext(req);

    if (!userId) return res.status(400).json({ success: false, message: "User not authenticated" });
    if (userRole !== "USER") return res.status(403).json({ success: false, message: "USER only" });


    const typeFilter = query.type ? String(query.type).toLowerCase() : null;      // "mcqs"/"coding"
    const attemptFilter = query.attempt ? String(query.attempt).toLowerCase() : null; // "attempted"/"not attempted"/"missed"
    const statusFilter = query.status ? String(query.status).toLowerCase() : null; // "active"/"inactive"
    const sortBy = query.sort_by || null; 
    const sortOrder = query.order === "desc" ? "DESC" : "ASC";

    
    const params = [userId];
    let orgWhere = ""
    if (orgId) {
      params.push(orgId);
      orgWhere = `AND e.org_id = $${params.length}`;
    }

    const sql = `
      SELECT
        e.exam_id,
        e.title AS name,
        e.type AS exam_type,
        e.duration_min AS duration,
        e.status AS exam_status,
        ed.total_questions,
        ed.total_marks,
        ed.start_date,
        ed.end_date,
        ed.description,
        ea.attempt_id,
        ea.started_at,
        ea.ended_at,
        ea.status AS attempt_status,
        ea.mcq_score AS score,
        ea.percentage
      FROM mainexamportal.exams e
      LEFT JOIN mainexamportal.exam_details ed ON ed.exam_id = e.exam_id
      LEFT JOIN mainexamportal.exam_attempt ea ON ea.exam_id = e.exam_id AND ea.user_id = $1
      WHERE e.is_deleted = FALSE
      ${orgWhere}
      ORDER BY ed.start_date DESC NULLS LAST
    `;

    const { rows: rawRows } = await db.query(sql, params);
    let rows = rawRows || [];

    
    rows = rows.map((r) => {
      const attempt_ui = computeAttemptStatus(r);
      const active_ui = computeActiveStatus(r);
      const examType = formatExamType(r.exam_type);
      const button_ui = computeButtonUI({ attempt_ui, active_ui });
      
      return {
        examId: r.exam_id,
        name: r.name,
        examType,
        duration: r.duration,
        totalQuestions: r.total_questions,
        totalMarks: r.total_marks,
        startDate: r.start_date,
        endDate: r.end_date,
        description: r.description,
        examStatus: r.exam_status,
        attemptId: r.attempt_id,
        attemptStatus: r.attempt_status,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        score: r.score,
        percentage: r.percentage,
        attempt_ui,
        active_ui,
        button_ui,
      };
    });

   
    if (typeFilter) {
      rows = rows.filter((x) => String(x.examType).toLowerCase().includes(typeFilter));
    }
    if (attemptFilter) {
      const norm = attemptFilter.replace(/[_-]/g, " ").trim();
      rows = rows.filter((x) => String(x.attempt_ui).toLowerCase() === norm);
    }
    if (statusFilter) {
      rows = rows.filter((x) => String(x.active_ui).toLowerCase() === statusFilter);
    }

    
    if (sortBy === "name") {
      rows.sort((a, b) => (sortOrder === "ASC" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    } else if (sortBy === "date") {
      rows.sort((a, b) => {
        const da = a.startDate ? new Date(a.startDate) : new Date(0);
        const db = b.startDate ? new Date(b.startDate) : new Date(0);
        return sortOrder === "ASC" ? da - db : db - da;
      });
    } else if (sortBy === "type") {
      rows.sort((a, b) => (sortOrder === "ASC" ? a.examType.localeCompare(b.examType) : b.examType.localeCompare(a.examType)));
    } else if (sortBy === "status") {
      rows.sort((a, b) => (sortOrder === "ASC" ? a.active_ui.localeCompare(b.active_ui) : b.active_ui.localeCompare(a.active_ui)));
    }

    return res.json({ success: true, total: rows.length, exams: rows });
  } catch (err) {
    console.error("Error /my-exams (auth):", err);
    return res.status(500).json({ success: false, message: "Failed to load exams", error: err.message });
  }
});



router.post("/start-exam", async (req, res) => {
  try {
    const { userId, userRole, orgId } = getContext(req);
    if (!userId) return res.status(400).json({ success: false, message: "User not authenticated" });
    if (userRole !== "USER") return res.status(403).json({ success: false, message: "USER only" });

    const examId = req.body?.examId || req.body?.exam_id;
    if (!examId) return res.status(400).json({ success: false, message: "examId or exam_id required" });

    const examQ = `
      SELECT e.*, ed.start_date, ed.end_date 
      FROM mainexamportal.exams e 
      LEFT JOIN mainexamportal.exam_details ed ON ed.exam_id = e.exam_id 
      WHERE e.exam_id = $1 AND e.is_deleted = FALSE
    `;
    const { rows } = await db.query(examQ, [examId]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Exam not found" });

    const exam = rows[0];
    
 
    if (orgId && exam.org_id !== orgId) {
      return res.status(403).json({ success: false, message: "Exam not in your organization" });
    }

    
    const now = new Date();
    if (exam.start_date && new Date(exam.start_date) > now) {
      return res.status(400).json({ 
        success: false, 
        message: "Exam has not started yet",
        startDate: exam.start_date,
        currentTime: now
      });
    }
    if (exam.end_date && new Date(exam.end_date) < now) {
      return res.status(400).json({ 
        success: false, 
        message: "Exam window has closed",
        endDate: exam.end_date,
        currentTime: now
      });
    }

    const findQ = `SELECT attempt_id, status FROM mainexamportal.exam_attempt WHERE user_id = $1 AND exam_id = $2 LIMIT 1`;
    const findR = await db.query(findQ, [userId, examId]);

    if (findR.rows.length) {
      const existing = findR.rows[0];
      if (existing.status === 'submitted') {
        return res.status(400).json({ success: false, message: "Exam already submitted" });
      }
      
      const updateQ = `
        UPDATE mainexamportal.exam_attempt
        SET status = 'in_progress', started_at = NOW()
        WHERE attempt_id = $1
        RETURNING attempt_id, started_at, status
      `;
      const u = await db.query(updateQ, [existing.attempt_id]);
      return res.json({ success: true, message: "Exam resumed", attempt: u.rows[0] });
    } else {
      
      const insertQ = `
        INSERT INTO mainexamportal.exam_attempt (user_id, exam_id, status, started_at)
        VALUES ($1, $2, 'in_progress', NOW())
        RETURNING attempt_id, started_at, status
      `;
      const ins = await db.query(insertQ, [userId, examId]);
      return res.json({ success: true, message: "Exam started", attempt: ins.rows[0] });
    }
  } catch (err) {
    console.error("Error /start-exam:", err);
    return res.status(500).json({ success: false, message: "Failed to start exam", error: err.message });
  }
});


router.get("/get-questions", async (req, res) => {
  try {
    const { userId, userRole, orgId } = getContext(req);
    if (!userId) return res.status(400).json({ success: false, message: "User not authenticated" });
    if (userRole !== "USER") return res.status(403).json({ success: false, message: "USER only" });

    const examId = req.query.examId || req.query.exam_id;
    if (!examId) return res.status(400).json({ success: false, message: "examId required" });

   
    const examQ = `
      SELECT e.*, ed.start_date, ed.end_date, ed.total_questions, ed.total_marks
      FROM mainexamportal.exams e
      LEFT JOIN mainexamportal.exam_details ed ON ed.exam_id = e.exam_id
      WHERE e.exam_id = $1 AND e.is_deleted = FALSE
    `;
    const examR = await db.query(examQ, [examId]);
    if (!examR.rows.length) return res.status(404).json({ success: false, message: "Exam not found" });

    const exam = examR.rows[0];
    

    if (orgId && exam.org_id !== orgId) {
      return res.status(403).json({ success: false, message: "Exam not in your organization" });
    }

    const now = new Date();
    if (exam.start_date && new Date(exam.start_date) > now) {
      return res.status(400).json({ success: false, message: "Exam has not started yet" });
    }
    if (exam.end_date && new Date(exam.end_date) < now) {
      return res.status(400).json({ success: false, message: "Exam window has closed" });
    }


    const attemptQ = `SELECT attempt_id, status FROM mainexamportal.exam_attempt WHERE user_id = $1 AND exam_id = $2`;
    const attemptR = await db.query(attemptQ, [userId, examId]);
    
    if (!attemptR.rows.length) {
      return res.status(400).json({ success: false, message: "Please start the exam first" });
    }

    const attempt = attemptR.rows[0];
    if (attempt.status === 'submitted') {
      return res.status(400).json({ success: false, message: "Exam already submitted" });
    }

    const examType = String(exam.type || "").toUpperCase();

    if (examType === "MCQ" || examType === "MCQS") {
      const q = `
        SELECT 
          q.question_id,
          q.question_text,
          q.marks,
          mq.option_id,
          mq.option_text
        FROM mainexamportal.questions q
        LEFT JOIN mainexamportal.mcq_questions mq ON mq.question_id = q.question_id
        WHERE q.exam_id = $1 AND q.is_deleted = FALSE
        ORDER BY q.question_id, mq.option_id
      `;
      const qR = await db.query(q, [examId]);

      const questionsMap = {};
      qR.rows.forEach((row) => {
        if (!questionsMap[row.question_id]) {
          questionsMap[row.question_id] = {
            questionId: row.question_id,
            questionText: row.question_text,
            marks: row.marks,
            options: []
          };
        }
        if (row.option_id) {
          questionsMap[row.question_id].options.push({
            optionId: row.option_id,
            optionText: row.option_text
          });
        }
      });

      return res.json({
        success: true,
        exam: {
          examId: exam.exam_id,
          title: exam.title,
          type: exam.type,
          duration: exam.duration_min,
          totalQuestions: exam.total_questions,
          totalMarks: exam.total_marks
        },
        attemptId: attempt.attempt_id,
        questions: Object.values(questionsMap)
      });
    } else if (examType === "CODING" || examType === "CODE") {
      const q = `
        SELECT 
          question_id,
          question_text,
          marks
        FROM mainexamportal.questions
        WHERE exam_id = $1 AND is_deleted = FALSE
        ORDER BY question_id
      `;
      const qR = await db.query(q, [examId]);

      return res.json({
        success: true,
        exam: {
          examId: exam.exam_id,
          title: exam.title,
          type: exam.type,
          duration: exam.duration_min,
          totalQuestions: exam.total_questions,
          totalMarks: exam.total_marks
        },
        attemptId: attempt.attempt_id,
        questions: qR.rows.map(r => ({
          questionId: r.question_id,
          questionText: r.question_text,
          marks: r.marks
        }))
      });
    } else if (examType === "DESCRIPTIVE" || examType === "DESC") {
      const q = `
        SELECT 
          question_id,
          question_text,
          marks
        FROM mainexamportal.questions
        WHERE exam_id = $1 AND is_deleted = FALSE
        ORDER BY question_id
      `;
      const qR = await db.query(q, [examId]);

      return res.json({
        success: true,
        exam: {
          examId: exam.exam_id,
          title: exam.title,
          type: exam.type,
          duration: exam.duration_min,
          totalQuestions: exam.total_questions,
          totalMarks: exam.total_marks
        },
        attemptId: attempt.attempt_id,
        questions: qR.rows.map(r => ({
          questionId: r.question_id,
          questionText: r.question_text,
          marks: r.marks
        }))
      });
    } else {
  
      const q = `
        SELECT 
          q.question_id,
          q.question_text,
          q.question_type,
          q.marks,
          mq.option_id,
          mq.option_text
        FROM mainexamportal.questions q
        LEFT JOIN mainexamportal.mcq_questions mq ON mq.question_id = q.question_id
        WHERE q.exam_id = $1 AND q.is_deleted = FALSE
        ORDER BY q.question_id, mq.option_id
      `;
      const qR = await db.query(q, [examId]);

      const questionsMap = {};
      qR.rows.forEach((row) => {
        if (!questionsMap[row.question_id]) {
          questionsMap[row.question_id] = {
            questionId: row.question_id,
            questionText: row.question_text,
            questionType: row.question_type,
            marks: row.marks,
            options: []
          };
        }
        if (row.option_id) {
          questionsMap[row.question_id].options.push({
            optionId: row.option_id,
            optionText: row.option_text
          });
        }
      });

      return res.json({
        success: true,
        exam: {
          examId: exam.exam_id,
          title: exam.title,
          type: exam.type,
          duration: exam.duration_min,
          totalQuestions: exam.total_questions,
          totalMarks: exam.total_marks
        },
        attemptId: attempt.attempt_id,
        questions: Object.values(questionsMap)
      });
    }
  } catch (err) {
    console.error("Error /get-questions:", err);
    return res.status(500).json({ success: false, message: "Failed to load questions", error: err.message });
  }
});

router.post("/submit-exam", async (req, res) => {
  try {
    const { userId, userRole } = getContext(req);
    if (!userId) return res.status(400).json({ success: false, message: "User not authenticated" });
    if (userRole !== "USER") return res.status(403).json({ success: false, message: "USER only" });

    let examId = req.body?.examId || req.body?.exam_id;
    const attemptId = req.body?.attemptId || req.body?.attempt_id;
    const answers = req.body?.answers;
    

    if (!examId && attemptId) {
      const attemptQ = `SELECT exam_id FROM mainexamportal.exam_attempt WHERE attempt_id = $1 AND user_id = $2`;
      const attemptR = await db.query(attemptQ, [attemptId, userId]);
      if (attemptR.rows.length) {
        examId = attemptR.rows[0].exam_id;
      } else {
        return res.status(404).json({ success: false, message: "Attempt not found" });
      }
    }
    
    if (!examId) {
      return res.status(400).json({ success: false, message: "examId or attempt_id required" });
    }

    const examQ = `
      SELECT e.type, ed.total_marks 
      FROM mainexamportal.exams e 
      LEFT JOIN mainexamportal.exam_details ed ON ed.exam_id = e.exam_id 
      WHERE e.exam_id = $1
    `;
    const examR = await db.query(examQ, [examId]);
    if (!examR.rows.length) return res.status(404).json({ success: false, message: "Exam not found" });

    const exam = examR.rows[0];
    const examType = String(exam.type || "").toUpperCase();

   
    let totalScore = 0;
    let maxScore = exam.total_marks || 0;
    const perQuestion = [];

    if (examType === "MCQ" || examType === "MCQS") {
     
      const q = `
        SELECT 
          q.question_id, 
          q.marks,
          mq.option_id,
          mq.is_correct
        FROM mainexamportal.questions q
        LEFT JOIN mainexamportal.mcq_questions mq ON mq.question_id = q.question_id
        WHERE q.exam_id = $1 AND q.is_deleted = FALSE
      `;
      const qR = await db.query(q, [examId]);
      
      const questionMap = {};
      qR.rows.forEach((row) => {
        if (!questionMap[row.question_id]) {
          questionMap[row.question_id] = {
            marks: row.marks || 1,
            correctOptionId: null
          };
        }
        if (row.is_correct) {
          questionMap[row.question_id].correctOptionId = row.option_id;
        }
      });

      
      const answerMap = {};
      (answers || []).forEach((a) => {
        answerMap[String(a.questionId)] = a.answer; 
      });

     
      for (const qid in questionMap) {
        const qData = questionMap[qid];
        const userAnswer = answerMap[qid];
        const isCorrect = userAnswer && String(userAnswer) === String(qData.correctOptionId);
        
        if (isCorrect) {
          totalScore += qData.marks;
        }
        
        perQuestion.push({
          questionId: qid,
          userAnswer: userAnswer || null,
          correctAnswer: qData.correctOptionId,
          marks: qData.marks,
          isCorrect
        });
      }
    } else {
     
      totalScore = null;
      maxScore = exam.total_marks || 0;
    }


    const percentage = maxScore > 0 && totalScore !== null ? (totalScore / maxScore) * 100 : null;

    let actualAttemptId = attemptId;
    
    if (!actualAttemptId) {
      const findQ = `SELECT attempt_id FROM mainexamportal.exam_attempt WHERE user_id = $1 AND exam_id = $2 LIMIT 1`;
      const findR = await db.query(findQ, [userId, examId]);
      if (findR.rows.length) {
        actualAttemptId = findR.rows[0].attempt_id;
      }
    }

    if (actualAttemptId) {
      const updateQ = `
        UPDATE mainexamportal.exam_attempt
        SET status = 'submitted',
            ended_at = NOW(),
            mcq_score = $1,
            percentage = $2
        WHERE attempt_id = $3
        RETURNING attempt_id, status, ended_at, mcq_score AS score, percentage
      `;
      const u = await db.query(updateQ, [totalScore, percentage, actualAttemptId]);
      
      return res.json({
        success: true,
        message: "Exam submitted successfully",
        result: {
          score: totalScore,
          maxScore,
          percentage: percentage ? parseFloat(percentage.toFixed(2)) : null,
          details: perQuestion
        },
        attempt: u.rows[0]
      });
    } else {
     
      const insertQ = `
        INSERT INTO mainexamportal.exam_attempt (user_id, exam_id, status, started_at, ended_at, mcq_score, percentage)
        VALUES ($1, $2, 'submitted', NOW(), NOW(), $3, $4)
        RETURNING attempt_id, status, ended_at, mcq_score AS score, percentage
      `;
      const ins = await db.query(insertQ, [userId, examId, totalScore, percentage]);
      
      return res.json({
        success: true,
        message: "Exam submitted successfully",
        result: {
          score: totalScore,
          maxScore,
          percentage: percentage ? parseFloat(percentage.toFixed(2)) : null,
          details: perQuestion
        },
        attempt: ins.rows[0]
      });
    }
  } catch (err) {
    console.error("Error /submit-exam:", err);
    return res.status(500).json({ success: false, message: "Failed to submit exam", error: err.message });
  }
});


router.get("/view-result", async (req, res) => {
  try {
    const { userId } = getContext(req);
    if (!userId) return res.status(400).json({ success: false, message: "User not authenticated" });

    const examId = req.query.examId || req.query.exam_id;
    const attemptId = req.query.attemptId || req.query.attempt_id;
    
    if (!examId && !attemptId) {
      return res.status(400).json({ success: false, message: "examId or attempt_id required" });
    }

    let attemptQ, attemptParams;
    
    if (attemptId) {
    
      attemptQ = `
        SELECT 
          ea.*,
          e.title AS exam_title,
          e.type AS exam_type,
          ed.total_marks,
          ed.total_questions
        FROM mainexamportal.exam_attempt ea
        LEFT JOIN mainexamportal.exams e ON e.exam_id = ea.exam_id
        LEFT JOIN mainexamportal.exam_details ed ON ed.exam_id = ea.exam_id
        WHERE ea.user_id = $1 AND ea.attempt_id = $2
        LIMIT 1
      `;
      attemptParams = [userId, attemptId];
    } else {
  
      attemptQ = `
        SELECT 
          ea.*,
          e.title AS exam_title,
          e.type AS exam_type,
          ed.total_marks,
          ed.total_questions
        FROM mainexamportal.exam_attempt ea
        LEFT JOIN mainexamportal.exams e ON e.exam_id = ea.exam_id
        LEFT JOIN mainexamportal.exam_details ed ON ed.exam_id = ea.exam_id
        WHERE ea.user_id = $1 AND ea.exam_id = $2
        LIMIT 1
      `;
      attemptParams = [userId, examId];
    }
    
    const attemptR = await db.query(attemptQ, attemptParams);
    if (!attemptR.rows.length) {
      return res.status(404).json({ success: false, message: "No attempt found for this exam" });
    }

    const attempt = attemptR.rows[0];
    
    const actualExamId = attempt.exam_id;

    let details = null;
    const examType = String(attempt.exam_type || "").toUpperCase();
    
    if (examType === "MCQ" || examType === "MCQS") {
      
      const q = `
        SELECT 
          q.question_id,
          q.question_text,
          q.marks,
          mq.option_id,
          mq.option_text,
          mq.is_correct
        FROM mainexamportal.questions q
        LEFT JOIN mainexamportal.mcq_questions mq ON mq.question_id = q.question_id
        WHERE q.exam_id = $1 AND q.is_deleted = FALSE
        ORDER BY q.question_id, mq.option_id
      `;
      const qR = await db.query(q, [actualExamId]);
 
      const questionsMap = {};
      qR.rows.forEach((row) => {
        if (!questionsMap[row.question_id]) {
          questionsMap[row.question_id] = {
            questionId: row.question_id,
            questionText: row.question_text,
            marks: row.marks,
            options: [],
            correctOptionId: null
          };
        }
        questionsMap[row.question_id].options.push({
          optionId: row.option_id,
          optionText: row.option_text,
          isCorrect: row.is_correct
        });
        if (row.is_correct) {
          questionsMap[row.question_id].correctOptionId = row.option_id;
        }
      });

      details = Object.values(questionsMap);
    }

    return res.json({
      success: true,
      attempt: {
        attemptId: attempt.attempt_id,
        examId: attempt.exam_id,
        examTitle: attempt.exam_title,
        examType: attempt.exam_type,
        status: attempt.status,
        startedAt: attempt.started_at,
        endedAt: attempt.ended_at,
        score: attempt.score,
        totalMarks: attempt.total_marks,
        percentage: attempt.percentage,
        totalQuestions: attempt.total_questions
      },
      details
    });
  } catch (err) {
    console.error("Error /view-result:", err);
    return res.status(500).json({ success: false, message: "Failed to load result", error: err.message });
  }
});

module.exports = router;
