// // index.js
// import express from "express";
// import multer from "multer";
// import cors from "cors";
// import openAI from "openai";
// import fs from "fs/promises";
// import pdfParse from "pdf-parse";
// import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
// import 'dotenv/config';
// import mongoose from "mongoose";
// import { UserModel } from "./UserModel.js";


// const app = express();
// const upload = multer({ dest: "uploads/" });

// app.use(cors());
// app.use(express.json());

// const openai = new openAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// app.post('/api/allusers', async (req, res) => {
//   try {
//     const users = await UserModel.find();
//     res.status(200).json({message : "Users fetched successfully", users });
//   }
//   catch (error) {
//     console.error("Error fetching users:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });
// app.post("/api/optimize-cover-letter", upload.single("baseLetter"), async (req, res) => {
//   try {
//     const { jobDesc, fields: fieldsRaw } = req.body;
//     let fields = {};
//     if (typeof fieldsRaw === "string") {
//       try {
//         fields = JSON.parse(fieldsRaw);
//       } catch {
//         fields = {};
//       }
//     } else if (fieldsRaw) {
//       fields = fieldsRaw;
//     }

//     let baseLetterText = "";

//     if (req.file) {
//       // ✅ Parse uploaded PDF text
//       const fileBuffer = await fs.readFile(req.file.path);
//       const pdfData = await pdfParse(fileBuffer);
//       baseLetterText = pdfData.text || "";
//       await fs.unlink(req.file.path); // cleanup after parsing
//     } else {
//       // ✅ Fallback template
//       baseLetterText = `
// Dear Hiring Manager,

// I bring a strong blend of cloud engineering, IT support, and data analytics expertise...

// Earlier at ${fields.company || "Company"}, I engineered a Node.js chatbot...

// Warm regards,
// ${fields.name || ""}
// ${fields.email || ""} | ${fields.phone || ""} | ${fields.location || ""}
//       `;
//     }

//     // Replace placeholders in uploaded template or fallback
//     const filledLetter = baseLetterText
//       .replace(/{{name}}/g, fields.name || "")
//       .replace(/{{email}}/g, fields.email || "")
//       .replace(/{{phone}}/g, fields.phone || "")
//       .replace(/{{location}}/g, fields.location || "")
//       .replace(/{{company}}/g, fields.company || "")
//       .replace(/{{role}}/g, fields.role || "");

//     // Call OpenAI to optimize the cover letter text
//     const prompt = `
// You are a professional career coach. Rewrite and optimize the following cover letter
// so that it matches the provided job description. Keep the same structure and professional style.


// Job Description:
// ${jobDesc}

// Cover Letter Draft:
// ${filledLetter}

// Return only the improved cover letter text.
//     `;

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//     });

//     const optimizedText = completion.choices?.[0]?.message?.content?.trim();
//     if (!optimizedText) {
//       throw new Error("No optimized letter returned from OpenAI.");
//     }

//     // ✅ Generate PDF with pdf-lib
//     const pdfDoc = await PDFDocument.create();
//     const page = pdfDoc.addPage([595.28, 841.89]); // A4
//     const { height, width } = page.getSize();

//     const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
//     const fontSize = 11;
//     const margin = 50;
//     const textWidth = width - margin * 2;

//     page.drawText(optimizedText, {
//       x: margin,
//       y: height - margin,
//       size: fontSize,
//       font,
//       lineHeight: 14,
//       maxWidth: textWidth,
//     });

//     const pdfBytes = await pdfDoc.save();

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Disposition", "attachment; filename=optimized-cover-letter.pdf");
//     res.send(Buffer.from(pdfBytes));
//   } catch (err) {
//     console.error("❌ Error in /api/optimize-cover-letter:", err);
//     res.status(500).json({ error: err.message || "Something went wrong" });
//   }
// });
// mongoose.connect(process.env.MONGODB_URI).then(() => {
//   console.log("Connected to MongoDB");
// }).catch((err) => {
//   console.error("MongoDB connection error:", err);
// });
// const PORT = process.env.PORT || 8086;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });


// index.js
import express from "express";
import cors from "cors";
import openAI from "openai";
import { PDFDocument, StandardFonts } from "pdf-lib";
import 'dotenv/config';
import { UserModel } from "./UserModel.js";
import mongoose from "mongoose";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new openAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/allusers', async (req, res) => {
  try {
    const users = await UserModel.find();
    res.status(200).json({message : "Users fetched successfully", users });
  }
  catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- Optimize Cover Letter ----------------
// app.post("/api/optimize-cover-letter", async (req, res) => {
//   try {
//     const { jobDesc, fields: fieldsRaw } = req.body;

//     let fields = {};
//     if (typeof fieldsRaw === "string") {
//       try {
//         fields = JSON.parse(fieldsRaw);
//       } catch {
//         fields = {};
//       }
//     } else if (fieldsRaw) {
//       fields = fieldsRaw;
//     }

//     // Prepare a detailed prompt for GPT
//     const prompt = `
// You are a professional career coach. Optimize the content of a cover letter
// based on the provided job description. Keep the structure and tone professional. 

// ****IMPORTANT: Return ALL fields from the original cover letter in an optimized form. This includes:
// - Personal information fields (name, email, phone, location, company, role)
// - Content fields (greeting, intro, whyMe, whatSetsMeApart, recentExperience, whatILookForwardTo, whySelected, closing, signoff)

// Guidelines:
// - Only modify content fields to better match the job description
// - Keep personal information fields (name, email, phone, location, company, role) EXACTLY as provided
// - Replace irrelevant keywords gracefully in content fields
// - Keep bullet points, paragraphs, and section headers intact
// - Make content fields detailed but ensure everything fits on one page
// -Ensure to highlight the things which are supposed to be optimized 
//   and after optimization how is it better than previous version. 
//   provide these point in an array object called improvements such that the prevoius (unoptimized and optimized could be compared)
// - Return the result in **valid JSON format** with ALL these keys:
//   name, email, phone, location, company, role, greeting, intro, 
//   whyMe (array), whatSetsMeApart (array), recentExperience, 
//   whatILookForwardTo (array), whySelected, closing, signoff

// Job Description:
// ${jobDesc}

// Current Cover Letter Fields:
// ${JSON.stringify(fields, null, 2)}

// Return only valid JSON with ALL fields included.
//     `;
//     console.log("✅ Prompt:", prompt);
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//     });

//     const gptText = completion.choices?.[0]?.message?.content?.trim();
//     if (!gptText) throw new Error("No response from GPT.");

//     // Parse JSON safely
//     // let optimizedFields;
//     // let improvements;
//     try {
//       const responseInJson = JSON.parse(gptText);
//       console.log(responseInJson);
//       const { improvements, ...optimizedFields } = responseInJson;
//       console.log("✅ Parsed optimized fields:", optimizedFields);
//     } catch (err) {
//       console.error("GPT output not valid JSON:", gptText);
//       throw new Error("GPT did not return valid JSON.");
//     }

//     res.status(200).json({ optimizedFields, improvements });
//   } catch (err) {
//     console.error("❌ Error in /api/optimize-cover-letter:", err);
//     res.status(500).json({ error: err.message || "Something went wrong" });
//   }
// });

app.post("/api/optimize-cover-letter", async (req, res) => {
  try {
    const { jobDesc, fields: fieldsRaw } = req.body;

    let fields = {};
    if (typeof fieldsRaw === "string") {
      try {
        fields = JSON.parse(fieldsRaw);
      } catch {
        fields = {};
      }
    } else if (fieldsRaw) {
      fields = fieldsRaw;
    }

    const prompt = `
You are a professional career coach. Optimize the content of a cover letter
based on the provided job description. Keep the structure and tone professional. 

IMPORTANT: Return ALL fields from the original cover letter in optimized form, plus an array called "improvements".  
Return ONLY **valid JSON** with these keys:  
name, email, phone, location, company, role, greeting, intro, whyMe (array), whatSetsMeApart (array), recentExperience, whatILookForwardTo (array), whySelected, closing, signoff, improvements

Job Description:
${jobDesc}

Current Cover Letter Fields:
${JSON.stringify(fields, null, 2)}

Return only valid JSON.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let gptText = completion.choices?.[0]?.message?.content?.trim();
    if (!gptText) throw new Error("No response from GPT.");

    // Strip possible code block formatting ```json ... ```
    gptText = gptText.replace(/```json|```/g, "").trim();

    let responseInJson;
    try {
      responseInJson = JSON.parse(gptText);
    } catch (err) {
      console.error("GPT output not valid JSON:", gptText);
      throw new Error("GPT did not return valid JSON.");
    }

    const { improvements, ...optimizedFields } = responseInJson;

    res.status(200).json({ optimizedFields, improvements });
  } catch (err) {
    console.error("❌ Error in /api/optimize-cover-letter:", err);
    res.status(500).json({ error: err.message || "Something went wrong" });
  }
});


mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});
const PORT = process.env.PORT || 8086;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
