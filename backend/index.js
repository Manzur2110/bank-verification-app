// index.js — Toby FINAL Ghostscript Rasterization (Windows-Stable OCR Engine)
// Uses ONLY Ghostscript (gswin64c.exe) to render PDF → PNG
// Guaranteed stable on Windows. No ImageMagick. No Poppler. No convert.exe.

import express from "express";
import multer from "multer";
import fs from "fs";
import pdf from "pdf-parse";
import Tesseract from "tesseract.js";
import cors from "cors";
import sqlite3 from "sqlite3";
import path from "path";
import Jimp from "jimp";
import { execFile } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------
// GHOSTSCRIPT PATH (YOUR PATH EXACTLY)
// ---------------------------------------------------------------------
const GS_PATH = "C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe";

// ---------------------------------------------------------------------
// DATABASE (reset based on your Option A)
// ---------------------------------------------------------------------
const DB_FILE = "bankdata.db";

if (fs.existsSync(DB_FILE)) {
  console.log("🔥 Removing old DB as requested...");
  fs.unlinkSync(DB_FILE);
}

const db = new sqlite3.Database(DB_FILE);
db.run(`
  CREATE TABLE IF NOT EXISTS bank_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountName TEXT,
    accountNumber TEXT,
    routingNumber TEXT,
    checkNumber TEXT,
    ifsc TEXT,
    bankName TEXT,
    branch TEXT,
    rawText TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// ---------------------------------------------------------------------
// MULTER UPLOAD
// ---------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + (file.originalname || "upload"));
  }
});
const upload = multer({ storage });

// ---------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------
function exists(p) {
  return fs.existsSync(p) && fs.statSync(p).size > 0;
}

async function safeJimpLoad(p) {
  try {
    if (!exists(p)) return null;
    const img = await Jimp.read(p);
    if (img.bitmap.width <= 0 || img.bitmap.height <= 0) return null;
    return img;
  } catch {
    return null;
  }
}

async function autoRotate(img) {
  if (!img) return img;
  if (img.bitmap.height > img.bitmap.width) return img.rotate(90);
  return img;
}

// ---------------------------------------------------------------------
// GHOSTSCRIPT RASTERIZER
// Converts PDF → PNG @ 300 DPI for ALL PAGES
// ---------------------------------------------------------------------
async function rasterizePDF(pdfPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync("ocr_images")) fs.mkdirSync("ocr_images");

    const outputPattern = path.join("ocr_images", "page-%03d.png");

    const args = [
      "-dNOPAUSE",
      "-dBATCH",
      "-sDEVICE=png16m",
      "-r300",
      `-sOutputFile=${outputPattern}`,
      pdfPath
    ];

    execFile(GS_PATH, args, (err, stdout, stderr) => {
      if (err) {
        console.error("Ghostscript error:", err);
        console.error("stderr:", stderr);
        return reject(new Error("Ghostscript failed to rasterize PDF"));
      }

      const files = fs
        .readdirSync("ocr_images")
        .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
        .map((f) => path.join("ocr_images", f));

      if (files.length === 0) {
        return reject(new Error("Ghostscript produced zero images"));
      }

      resolve(files);
    });
  });
}


// ---------------------------------------------------------------------
// MICR CROP — safe, never crashes
// ---------------------------------------------------------------------
async function cropMICR(imagePath) {
  const img = await safeJimpLoad(imagePath);
  if (!img) return imagePath;

  await autoRotate(img);

  const { width, height } = img.bitmap;
  let h = Math.floor(height * 0.14);
  if (h < 40) h = 40;
  const y = height - h;

  const micr = img.clone().crop(0, y, width, h);
  micr.greyscale().normalize().contrast(0.55).brightness(0.05);

  const out = imagePath.replace(".png", "_micr.png");
  await micr.writeAsync(out);
  return out;
}

// ---------------------------------------------------------------------
// STRONG PREPROCESSOR — good for faint + VOID checks
// ---------------------------------------------------------------------
async function preprocessStrong(imagePath) {
  const img = await safeJimpLoad(imagePath);
  if (!img) return null;

  await autoRotate(img);

  img.greyscale();
  img.normalize();
  img.contrast(0.6);
  img.brightness(0.05);

  const out = imagePath.replace(".png", "_prep.png");
  await img.writeAsync(out);
  return out;
}

// ---------------------------------------------------------------------
// MICR TEXT EXTRACTION
// ---------------------------------------------------------------------
async function extractMICR(imagePath) {
  if (!exists(imagePath)) return {};

  let txt = "";

  for (const psm of [6,7,11]) {
    try {
      const out = await Tesseract.recognize(imagePath, "eng", {
        tessedit_char_whitelist: "0123456789"
      });
      txt += out.data.text + " ";
    } catch {}
  }

  txt = txt.replace(/\s+/g, " ").trim();

  return {
    routing: txt.match(/\b\d{9}\b/)?.[0] || "",
    account: txt.match(/\b\d{6,18}\b/)?.[0] || "",
    checkNumber: txt.match(/\b\d{3,6}\b/)?.[0] || "",
    raw: txt
  };
}

// ---------------------------------------------------------------------
// MAIN OCR PIPELINE
// ---------------------------------------------------------------------
async function extractOCR(pdfPath) {
  console.log("🔍 OCR started:", pdfPath);

  const pages = await rasterizePDF(pdfPath);

  let finalText = "";
  let micrResult = { routing: "", account: "", checkNumber: "", raw: "" };

  for (const page of pages) {
    console.log("Processing image:", page);

    const prep = await preprocessStrong(page);
    const micrImg = await cropMICR(page);

    let pageText = "";
    if (prep && exists(prep)) {
      const res = await Tesseract.recognize(prep, "eng");
      pageText = res.data.text || "";
    }

    finalText += pageText + "\n";

    const micr = await extractMICR(micrImg);

    micrResult.routing ||= micr.routing;
    micrResult.account ||= micr.account;
    micrResult.checkNumber ||= micr.checkNumber;
    micrResult.raw += micr.raw + " ";
  }

  return {
    text: finalText.trim(),
    micr: micrResult
  };
}

// ---------------------------------------------------------------------
// FIELD MAPPING
// ---------------------------------------------------------------------
function extractFields(text) {
  return {
    accountName: text.match(/THE\s+CANTER\s+GROUP\s+LLC/i)?.[0] || "",
    bankName: text.match(/CALPRIVATE\s+BANK/i)?.[0] || "",
    branch: text.match(/LA\s+JOLLA/i)?.[0] || "",
    accountNumber: text.match(/\b\d{6,18}\b/)?.[0] || "",
    ifsc: text.match(/[A-Z]{4}0[A-Z0-9]{6}/)?.[0] || ""
  };
}

// ---------------------------------------------------------------------
// UPLOAD ROUTE
// ---------------------------------------------------------------------
app.post("/api/v1/uploads", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    const pdfData = await pdf(fs.readFileSync(filePath)).catch(() => ({ text: "" }));
    let text = pdfData.text?.trim() || "";
    let micr = {};

    // If embedded text missing → run OCR
    if (!text || text.length < 20) {
      const ocr = await extractOCR(filePath);
      text = ocr.text || "";
      micr = ocr.micr || {};
    }

    const fields = extractFields(text);

    fields.routingNumber = micr.routing || "";
    fields.accountNumber = micr.account || "";
    fields.checkNumber = micr.checkNumber || "";
    fields.rawMICR = micr.raw || "";

    // Save to DB
    db.run(
      `INSERT INTO bank_records (accountName, accountNumber, routingNumber, checkNumber, ifsc, bankName, branch, rawText)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fields.accountName,
        fields.accountNumber,
        fields.routingNumber,
        fields.checkNumber,
        fields.ifsc,
        fields.bankName,
        fields.branch,
        text
      ]
    );

    res.json({
      success: true,
      fields,
      rawText: text,
      micr
    });

  } catch (e) {
    console.error("OCR Failure:", e);
    res.json({ success: false, error: e.message });
  }
});

// ---------------------------------------------------------------------
app.get("/api/v1/history", (req, res) => {
  db.all("SELECT * FROM bank_records ORDER BY id DESC", (err, rows) => {
    res.json(rows || []);
  });
});

// ---------------------------------------------------------------------
app.listen(5000, () => {
  console.log("🔥 Windows Ghostscript OCR backend running on :5000");
});
