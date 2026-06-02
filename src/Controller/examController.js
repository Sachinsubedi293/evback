import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import schedule from "node-schedule";
import User from "../Models/user.model.js";
import Exam from "../Models/exam.model.js";
import { emit, emitToRoom } from "../sse.js";
import { v4 as uuidv4 } from "uuid";
import { releaseResultsForExam } from "../Calc.js";

const VALID_VISIBILITIES = new Set(["private", "invite", "public"]);

const getTokenParts = (token) => {
  const tokenPart = token.split(" ")[1] || token;
  return jwt.verify(tokenPart, process.env.JWT_SECRET);
};

const getAuthenticatedUser = async (token) => {
  if (!token) {
    return null;
  }

  const decodedToken = getTokenParts(token);
  return User.findById(decodedToken.userId);
};

const canManageExam = (user, exam) => {
  if (!user || !exam) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  return user.role === "teacher" && String(exam.createdBy) === String(user._id);
};

const canAccessExam = (user, exam) => {
  if (!user || !exam) {
    return false;
  }

  if (canManageExam(user, exam)) {
    return true;
  }

  if (exam.visibility === "public") {
    return true;
  }

  const joined = (exam.joinedStudents || []).some(
    (studentId) => String(studentId) === String(user._id),
  );
  const invited = (exam.invitedStudents || []).some(
    (studentId) => String(studentId) === String(user._id),
  );

  return joined || invited;
};

const jwtverify = (token) => {
  return getTokenParts(token);
};

// Function to start the exam
const startExam = async (examId) => {
  try {
    const exam = await Exam.findById(examId);
    if (!exam) {
      console.error(`Exam with ID ${examId} not found`);
      return;
    }

    if (exam.startDate <= new Date() && exam.status === "scheduled") {
      exam.status = "ongoing";
      exam.startedAt = new Date();
      await exam.save();
      console.log(`Exam ${examId} has started`);

      // Notify only clients in this exam room that the exam has started
      emitToRoom(String(examId), "ExamStarted", true);

      // Schedule the exam stop
      scheduleExamStop(examId, exam.endDate);
    }
  } catch (error) {
    console.error(`Error starting exam ${examId}:`, error);
  }
};

const scheduleExamStop = (examId, endDate) => {
  schedule.scheduleJob(endDate, () => closeExam(examId));
};

const closeExam = async (examId) => {
  try {
    const exam = await Exam.findById(examId);
    if (!exam) {
      console.error(`Exam with ID ${examId} not found`);
      return;
    }

    if (exam.status === "ongoing") {
      exam.status = "completed";
      exam.completedAt = new Date();
      await exam.save();
      console.log(`Exam ${examId} has completed`);

      // Notify all room clients the exam is over
      emitToRoom(String(examId), "ExamComplete", { examId: String(examId) });

      // Calculate scores and release result codes for every student
      const releases = await releaseResultsForExam(examId);
      for (const { studentId, resultCode } of releases) {
        emitToRoom(String(examId), "ResultsReady", {
          examId: String(examId),
          studentId,
          resultCode,
        });
      }
    }
  } catch (error) {
    console.error(`Error completing exam ${examId}:`, error);
  }
};

// Schedule the exam start
const scheduleExamStart = (examId, startDate) => {
  schedule.scheduleJob(startDate, () => startExam(examId));
};

const generateUniqueCode = () => {
  const uuid = uuidv4().replace(/-/g, "");
  const intVal = BigInt("0x" + uuid);
  const normalizedVal = Number(intVal % BigInt(1e18)) / 1e18;
  const uniqueCode = 0.001 + normalizedVal * (0.999 - 0.001);
  return uniqueCode.toFixed(3);
};

const generateInviteCode = () => uuidv4().replace(/-/g, "");

export const syncExamStatus = async (exam) => {
  if (!exam) {
    return exam;
  }

  const now = new Date();
  let changed = false;

  if (exam.endDate && new Date(exam.endDate) <= now) {
    if (exam.status !== "completed") {
      exam.status = "completed";
      exam.completedAt = exam.completedAt || now;
      changed = true;
    }
  } else if (exam.startDate && new Date(exam.startDate) <= now) {
    if (exam.status !== "ongoing") {
      exam.status = "ongoing";
      exam.startedAt = exam.startedAt || now;
      changed = true;
    }
  }

  if (changed) {
    await exam.save();
  }

  return exam;
};

const buildExamQueryForUser = (user) => {
  if (!user) {
    return { status: "ongoing" };
  }

  if (user.role === "admin") {
    return {};
  }

  if (user.role === "teacher") {
    return { createdBy: user._id };
  }

  return {
    $or: [
      { visibility: "public" },
      { invitedStudents: user._id },
      { joinedStudents: user._id },
    ],
  };
};

// Function to create a new exam
export const createExam = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decodedToken = jwtverify(token);

    const user = await User.findById(decodedToken.userId);
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      name,
      title,
      description = "",
      startDate,
      endDate,
      startAt,
      endAt,
      durationMinutes,
      visibility,
      inviteMode,
      private: isPrivate,
      invitedStudents = [],
    } = req.body;

    const examName =
      typeof title === "string" && title.trim()
        ? title.trim()
        : typeof name === "string" && name.trim()
          ? name.trim()
          : `Exam-${uuidv4()}`;

    const normalizedDescription =
      typeof description === "string" ? description.trim() : "";

    const rawStart = startDate || startAt;
    const rawEnd = endDate || endAt;
    const parsedStartDate = rawStart ? new Date(rawStart) : null;
    const parsedEndDate = rawEnd ? new Date(rawEnd) : null;

    if (
      !parsedStartDate ||
      Number.isNaN(parsedStartDate.getTime()) ||
      !parsedEndDate ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      return res.status(400).json({
        error: "Valid startDate/endDate or startAt/endAt are required",
      });
    }

    const examVisibility =
      isPrivate || inviteMode === "private"
        ? "private"
        : VALID_VISIBILITIES.has(visibility)
          ? visibility
          : "invite";

    const derivedDurationMinutes =
      typeof durationMinutes === "number" && Number.isFinite(durationMinutes)
        ? durationMinutes
        : Math.max(
            1,
            Math.round(
              (parsedEndDate.getTime() - parsedStartDate.getTime()) /
                (1000 * 60),
            ),
          );

    const durationInMilliseconds =
      parsedEndDate.getTime() - parsedStartDate.getTime();

    if (durationInMilliseconds <= 0) {
      return res
        .status(400)
        .json({ error: "endAt/endDate must be after startAt/startDate" });
    }
    const students = User.find({ role: "student" });
    const overlappingExam = await Exam.findOne({
      $or: [
        { startDate: { $lt: parsedEndDate, $gt: parsedStartDate } },
        { endDate: { $gt: parsedStartDate, $lt: parsedEndDate } },
        {
          startDate: { $lt: parsedStartDate },
          endDate: { $gt: parsedEndDate },
        },
      ],
    });

    if (overlappingExam) {
      return res.status(400).json({
        error: "An exam is already scheduled during this time period",
      });
    }

    const Code = Number(generateUniqueCode());

    const exam = new Exam({
      name: examName,
      description: normalizedDescription,
      createdBy: user._id,
      visibility: examVisibility,
      inviteCode: generateInviteCode(),
      invitedStudents,
      joinedStudents: [],
      totalStudents: (await students).length,
      duration: derivedDurationMinutes,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      Code,
      status: "scheduled",
    });

    await exam.save();

    await syncExamStatus(exam);

    scheduleExamStart(exam._id, parsedStartDate, parsedEndDate);

    res
      .status(201)
      .json({ message: "Exam created successfully", examId: exam._id, exam });
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({ error: "Failed to create exam" });
  }
};

export const joinExam = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const user = await getAuthenticatedUser(token);
    if (!user || user.role !== "student") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    const exam = await Exam.findOne({ inviteCode });
    if (!exam) {
      return res.status(404).json({ error: "Invite not found" });
    }

    await syncExamStatus(exam);

    const now = new Date();
    if (
      exam.status === "completed" ||
      (exam.endDate && new Date(exam.endDate) <= now)
    ) {
      return res.status(400).json({ error: "This exam has finished" });
    }

    const alreadyJoined = (exam.joinedStudents || []).some(
      (studentId) => String(studentId) === String(user._id),
    );
    if (!alreadyJoined) {
      exam.joinedStudents = [...(exam.joinedStudents || []), user._id];
      await exam.save();
    }

    return res.status(200).json({
      message: "Joined exam successfully",
      examId: exam._id,
      inviteCode: exam.inviteCode,
    });
  } catch (error) {
    console.error("Error joining exam:", error);
    return res.status(500).json({ error: "Failed to join exam" });
  }
};

export const getOngoingExams = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const user = await getAuthenticatedUser(token);
    const query = buildExamQueryForUser(user);
    const exams = await Exam.find(query);
    const syncedExams = [];
    for (const exam of exams) {
      const syncedExam = await syncExamStatus(exam);
      if (syncedExam.status === "ongoing") {
        syncedExams.push(syncedExam);
      }
    }
    res.status(200).json(syncedExams);
  } catch (error) {
    console.error("Error retrieving exams:", error);
    res.status(500).json({ error: "Failed to retrieve exams" });
  }
};

export const getAllExams = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const user = await getAuthenticatedUser(token);

    const { status } = req.query;

    // Validate status filter if provided
    const VALID_STATUSES = new Set(["scheduled", "ongoing", "completed"]);
    if (status && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: `Invalid status filter. Allowed values: ${[...VALID_STATUSES].join(", ")}` });
    }

    const statusFilter = status ? { status } : {};

    if (!user) {
      const exams = await Exam.find({
        visibility: "public",
        ...statusFilter,
      });
      const syncedExams = [];
      for (const exam of exams) {
        syncedExams.push(await syncExamStatus(exam));
      }
      return res.status(200).json(syncedExams);
    }

    if (user.role === "student") {
      const exams = await Exam.find({
        $or: [
          { visibility: "public" },
          { invitedStudents: user._id },
          { joinedStudents: user._id },
        ],
        ...statusFilter,
      });
      const syncedExams = [];
      for (const exam of exams) {
        syncedExams.push(await syncExamStatus(exam));
      }
      return res.status(200).json(syncedExams);
    }

    const baseQuery = user.role === "teacher" ? { createdBy: user._id } : {};
    const exams = await Exam.find({
      ...baseQuery,
      ...statusFilter,
    });
    const syncedExams = [];
    for (const exam of exams) {
      syncedExams.push(await syncExamStatus(exam));
    }
    res.status(200).json(syncedExams);
  } catch (error) {
    console.error("Error retrieving exams:", error);
    res.status(500).json({ error: "Failed to retrieve exams" });
  }
};
export const getExamById = async (req, res) => {
  try {
    const { examId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }
    const token = req.headers.authorization;
    const user = await getAuthenticatedUser(token);
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    await syncExamStatus(exam);

    if (!canAccessExam(user, exam)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    return res.status(200).json(exam);
  } catch (error) {
    console.error("Error retrieving exam:", error);
    return res.status(500).json({ error: "Failed to retrieve exam" });
  }
};

export const getMyExams = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const user = await getAuthenticatedUser(token);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const exams =
      user.role === "teacher"
        ? await Exam.find({ createdBy: user._id }).sort({ created_date: -1 })
        : await Exam.find({ invitedStudents: user._id }).sort({
            created_date: -1,
          });

    for (const exam of exams) {
      await syncExamStatus(exam);
    }

    return res.status(200).json(exams);
  } catch (error) {
    console.error("Error retrieving my exams:", error);
    return res.status(500).json({ error: "Failed to retrieve exams" });
  }
};

export const getInviteLink = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const user = await getAuthenticatedUser(token);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { examId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    if (!canManageExam(user, exam)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    return res.status(200).json({
      examId: exam._id,
      inviteCode: exam.inviteCode,
      inviteLink: `${req.headers.origin || ""}/exam/join/${exam.inviteCode}`,
    });
  } catch (error) {
    console.error("Error creating invite link:", error);
    return res.status(500).json({ error: "Failed to create invite link" });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const { examid } = req.body;
    if (!mongoose.Types.ObjectId.isValid(examid)) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const user = await getAuthenticatedUser(token);
    const exam = await Exam.findById(examid);
    if (!user || (!canManageExam(user, exam) && user.role !== "admin")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await Exam.deleteOne({ _id: examid });
    res.status(200).json({ message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete exam" });
  }
};

export const startExamNow = async (req, res) => {
  try {
    const { examId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }

    const token = req.headers.authorization;
    const user = await getAuthenticatedUser(token);
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    if (!canManageExam(user, exam)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (exam.status !== "scheduled") {
      return res.status(400).json({ error: `Exam is already in ${exam.status} status` });
    }

    exam.status = "ongoing";
    exam.startedAt = new Date();
    exam.startDate = exam.startedAt;
    await exam.save();

    console.log(`Exam ${examId} has been manually started by teacher`);

    // Notify only clients in this exam room that the exam has started
    emitToRoom(String(examId), "ExamStarted", {
      examId: exam._id,
      status: "ongoing",
      startDate: exam.startDate,
      endDate: exam.endDate,
    });

    // Schedule the exam stop
    scheduleExamStop(examId, exam.endDate);

    return res.status(200).json({ message: "Exam started successfully", exam });
  } catch (error) {
    console.error("Error manually starting exam:", error);
    return res.status(500).json({ error: "Failed to start exam" });
  }
};

