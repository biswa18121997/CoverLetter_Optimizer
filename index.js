import express from "express";
import cors from "cors";
import openAI from "openai";
import { PDFDocument, StandardFonts } from "pdf-lib";
import 'dotenv/config';
import { UserModel } from "./UserModel.js";
import mongoose from "mongoose";
import {ProfileModel} from './ProfileModel.js';

const app = express();
app.use(cors());
app.use(express.json());

const openai = new openAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/allusers', async (req, res) => {
  try {
    const users = await ProfileModel.find();
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
    const { jobDesc, fields: fieldsRaw, userDetails } = req.body;

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
You are a professional career coach and expert cover letter writer.

Your task is to optimize and rewrite a cover letter using the provided job description and the existing cover letter fields.

Follow these rules carefully:

1. Maintain a **professional, confident, and persuasive tone**.
2. Use **strong action verbs** and **industry-relevant keywords**.
3. Keep the structure and flow similar to a professional cover letter.
4. Expand and elaborate all sections so that the final content can fill a full A4 page and ensure that the cover letter should not go beyond 1 page(~under 150 words).
5. Ensure that **each of the array fields ("whyMe", "whatSetsMeApart", "whatILookForwardTo") contains at least 2 detailed points**, each being atleast 2-3 lines long and keep it descriptive through keywords
6.** The field **"recentExperience"** must be a detailed within 2-3 line paragraph that emphasizes achievements and impact.each line containing 8-12 words only 
7. The **"improvements"** array must list clear, actionable feedback points (each 3–4 lines long) explaining what was enhanced and why, such as tone, flow, structure, or clarity.
8. Use **important headings or phrases** (like role, company, etc.) in a slightly elaborated and keyword-rich manner.
9. Avoid any empty or generic lines — the letter should feel rich and complete.
10. Return ONLY **valid JSON** (no markdown, no commentary).
11. Also replace the company Name of the feilds with company name from jobDescription . also ensure that feilds of userDetails should be appropriately be filled in releevant feilds like the name , email address and so on.

Your output must include ALL of these fields:
[
  "name",
  "email",
  "phone",
  "location",
  "company",
  "role",
  "greeting",
  "intro",
  "whyMe" (array),
  "whatSetsMeApart" (array),
  "recentExperience",
  "whatILookForwardTo" (array),:
  "whySelected",
  "closing",
  "signoff",
  "improvements" (array)
]

Keep the total content well-structured, with natural flow and transitions between sections.

---

Job Description:
${jobDesc}

Current Cover Letter Fields:
${JSON.stringify(fields, null, 2)}

Current User Data:
${JSON.stringify(userDetails,null,2)}

Return only **valid JSON** in the exact schema described above. Do not include any text outside the JSON.
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
