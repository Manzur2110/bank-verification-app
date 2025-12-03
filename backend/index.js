import express from "express";
import multer from "multer";
import fs from "fs";
import pdf from "pdf-parse";
import Tesseract from "tesseract.js";
import cors from "cors";
import { openDB } from "./database.js";

const app = express();
app.use(cors());
app.use(express.json());

// =======================================
// STORAGE (multer)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// =======================================
// OCR fallback
const extractWithOCR = async (filePath) => {
  console.log("Running OCR fallback...");
  try {
    const result = await Tesseract.recognize(filePath, "eng", {
      logger: (m) => console.log(m)
    });
    return result.data.text || "";
  } catch (err) {
    console.error("OCR Error:", err);
    return "";
  }
};

// =======================================
// IFSC lookup
const lookupIFSC = async (ifsc) => {
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
};

// =======================================
// Extract fields
const extractFields = (text) => {
  return {
    id: null, // will be assigned after DB insert
    accountName: (text.match(/MR\s+[A-Z]+[A-Z\s]*/i) || [""])[0].trim(),
    accountNumber: (text.match(/\b\d{9,16}\b/) || [""])[0],
    ifsc: (text.match(/\b[A-Z]{4}0[A-Z0-9]{6}\b/) || [""])[0],
    bankName: (text.match(/(?:Bank(?:ing)?\s+[A-Za-z]+)/i) || [""])[0],
    branch: (text.match(/Branch[:\s]+([A-Za-z ]+)/i) || [""])[1] || ""
  };
};

// =======================================
// PDF upload + extract + OCR + DB insert
app.post("/api/v1/uploads", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.json({ success: false, error: "No file uploaded" });

    const filePath = req.file.path;
    console.log("Uploaded:", filePath);

    // try text extraction
    let buffer = fs.readFileSync(filePath);
    let parsed = await pdf(buffer);
    let extractedText = parsed.text.trim();

    // fallback to OCR
    if (!extractedText || extractedText.length < 10) {
      console.log("PDF text empty → running OCR");
      extractedText = await extractWithOCR(filePath);
    }

    // extract structured values
    let fields = extractFields(extractedText);

    // IFSC verify
    let ifscData = null;
    if (fields.ifsc) {
      ifscData = await lookupIFSC(fields.ifsc);
    }

    // save into DB
    const db = await openDB();
    const result = await db.run(
      `INSERT INTO bank_records (accountName, accountNumber, ifsc, bankName, branch, extractedText)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        fields.accountName,
        fields.accountNumber,
        fields.ifsc,
        fields.bankName,
        fields.branch,
        extractedText
      ]
    );

    fields.id = result.lastID;

    res.json({
      success: true,
      text: extractedText,
      fields,
      ifscVerification: ifscData
    });

  } catch (err) {
    console.error("🔥 Upload error:", err);
    res.json({ success: false, error: err.message });
  }
});

// =======================================
// GET history
app.get("/api/v1/history", async (req, res) => {
  const db = await openDB();
  const rows = await db.all(`SELECT * FROM bank_records ORDER BY createdAt DESC`);
  res.json(rows);
});

// =======================================
// DELETE record
app.delete("/api/v1/history/:id", async (req, res) => {
  console.log("DELETE request received:", req.params.id);
  try {
    const db = await openDB();
    const result = await db.run(`DELETE FROM bank_records WHERE id = ?`, [
      req.params.id,
    ]);

    console.log("DELETE result:", result);

    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: "Record not found" });
    }
  } catch (err) {
    console.log("DELETE ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =======================================
// UPDATE edited fields
app.post("/api/v1/updateRecord", async (req, res) => {
  try {
    const { id, accountName, accountNumber, ifsc, bankName, branch } = req.body;
    const db = await openDB();

    await db.run(
      `UPDATE bank_records SET 
      accountName = ?, 
      accountNumber = ?, 
      ifsc = ?, 
      bankName = ?,
      branch = ?
      WHERE id = ?`,
      [accountName, accountNumber, ifsc, bankName, branch, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.json({ success: false, error: err.message });
  }
});

// =======================================
// SERVER START
app.listen(5000, () => {
  console.log("🔥 Backend running on http://localhost:5000");
});
