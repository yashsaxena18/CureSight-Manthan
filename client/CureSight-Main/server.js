import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
// NOTE: pdf-parse is imported lazily to avoid initialization side-effects in some environments
import Tesseract from 'tesseract.js';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const groqApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
const groq = new Groq({ apiKey: groqApiKey });
const preferredModel = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
const fallbackModels = [
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Multer memory storage for in-memory OCR
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

app.post('/api/analyze', upload.array('files'), async (req, res) => {
  try {
    if (!groqApiKey) {
      return res.status(500).json({ error: 'Server missing GROQ API key' });
    }

    // Extract text from uploaded files
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const extractedChunks = [];
    for (const file of files) {
      const mime = file.mimetype || '';
      if (mime.includes('pdf')) {
        try {
          const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
          const pdfData = await pdfParse(file.buffer);
          if (pdfData.text) extractedChunks.push(pdfData.text);
        } catch (e) {
          console.warn('pdf parse failed, skipping text extraction:', e);
        }
      } else if (mime.startsWith('image/')) {
        const { data } = await Tesseract.recognize(file.buffer, 'eng');
        if (data?.text) extractedChunks.push(data.text);
      } else if (mime === 'text/plain') {
        extractedChunks.push(file.buffer.toString('utf-8'));
      } else {
        // Unsupported file: skip but note
        extractedChunks.push(`Unsupported file type ${mime}. Name: ${file.originalname}`);
      }
    }

    const combinedText = extractedChunks.join('\n\n---\n\n').slice(0, 20000);

    const prompt = `You are "MediScan AI", an Indian patient-focused medical assistant. Analyze the following medical text and produce a concise, friendly, and actionable report for a layperson. Be accurate, avoid hallucinations, and prefer Indian clinical context.\n\nINPUT TEXT:\n${combinedText}\n\nOUTPUT RULES (very important):\n1) BILINGUAL: Provide BOTH English and Hindi (simple) for key sections as shown below. Use clear headings and bullets.\n2) PARAMETERS: Detect common health parameters (HbA1c, FBS/PPBS, BP, Total Cholesterol, LDL, HDL, Triglycerides, Creatinine, eGFR, TSH, Vitamin D, Hemoglobin, etc.). If a value is not found, write "Not available" without guessing.\n3) STATUS: For each parameter found, show Value + Unit, Status (Normal/High/Low) using typical Indian reference ranges, and a one-line Hinglish meaning + one Indian-context tip.\n4) DOCTORS: Recommend which specialist(s) to consult (e.g., Cardiologist, Endocrinologist, Nephrologist) with a one-line reason for each.\n5) TESTS: Recommend follow-up tests/checkups (what & when).\n6) SAFETY: Add red-flag symptoms that need urgent medical attention if applicable.\n7) TONE: Friendly, respectful, and clear.\n8) FORMAT: Output STRICTLY in Markdown using this template. Keep it under ~500-700 words.\n\nTEMPLATE (Markdown):\n# ✅ AI Health Report Summary (English)\n- Overall Status: [Normal / Mild concern / Needs attention / Urgent]\n- Key Highlights (3-6 bullets)\n\n# ✅ स्वास्थ्य सारांश (Hindi)\n- समग्र स्थिति: [Normal / हल्की समस्या / ध्यान देने योग्य / तुरंत ध्यान]\n- मुख्य बिंदु (3-6 बुलेट)\n\n## 📊 Parameters Overview\nFor each parameter found, one block like this (only include those present):\n- HbA1c: [Value Unit] — Status: [Normal/High/Low] | Ref: [X–Y]\n  - समझें (Hinglish): [Meaning]\n  - Tip: [1 short Indian-context tip]\n\n## 🩺 Recommended Doctors (किससे दिखाएँ)\n- [Specialist] — Why: [one line]\n- [Specialist] — Why: [one line]\n\n## 🧪 Recommended Tests / Follow-ups (जाँच)\n- [Test] — [When/How often] — [Purpose]\n- [Test] — [When/How often] — [Purpose]\n\n## 🧠 Lifestyle Guidance (जीवनशैली सुझाव)\n- Diet: [1-2 points, Indian context]\n- Activity: [1-2 points]\n- Sleep/Stress: [1 point]\n\n## 🚩 Red Flags (यदि हों)\n- [Symptom] — Seek urgent care\n\n---\n⚠ Disclaimer: AI analysis only. Always consult your doctor.`;

    async function runWithModel(model) {
      const chat = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'Be precise, patient-friendly, and use Indian clinical context.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });
      return chat.choices?.[0]?.message?.content || 'No analysis generated.';
    }

    let modelsToTry = [preferredModel, ...fallbackModels];
    let lastError;
    for (const model of modelsToTry) {
      try {
        const content = await runWithModel(model);
        return res.json({ markdown: content, model });
      } catch (e) {
        lastError = e;
        const message = String(e?.message || e);
        const isDecommissioned = message.includes('model_decommissioned') || message.includes('decommissioned');
        const isUnavailable = message.includes('Service Unavailable') || message.includes('503');
        if (!(isDecommissioned || isUnavailable)) {
          break;
        }
        // otherwise try next model
      }
    }

    throw lastError || new Error('Unknown error during analysis');
  } catch (err) {
    console.error('analyze failed:', err);
    const message = String(err?.message || err);
    const status = message.includes('rate limit') ? 429 : (message.includes('Invalid API key') ? 401 : 503);
    res.status(status).json({ error: 'Service unavailable', details: message });
  }
});

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});


