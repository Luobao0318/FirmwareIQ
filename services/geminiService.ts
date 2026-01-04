import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, STM32Series, ProjectFile, LibraryType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_MODEL = 'gemini-3-flash-preview';
const REPAIR_MODEL = 'gemini-3-pro-preview';

export const analyzeCode = async (
  files: ProjectFile[],
  series: STM32Series,
  library: LibraryType
): Promise<AnalysisResult> => {
  
  // Construct context from all files
  const fileContext = files.map(f => `
--- BEGIN FILE: ${f.name} ---
${f.content}
--- END FILE: ${f.name} ---
`).join('\n');

  const systemInstruction = `You are a world-class Embedded Systems Engineer specializing in STM32 microcontrollers using the ${library === LibraryType.HAL ? 'HAL/LL Library' : 'Standard Peripheral Library (SPL)'}. 
  Your task is to statically analyze a multi-file firmware project for the ${series} series.
  
  Check for:
  1. Syntax Errors (compilation blockers).
  2. Logic Errors (e.g., blocking delays in ISRs, race conditions, pointer misuse, buffer overflows).
  3. ${library} Misuse (incorrect parameter calls, missing initialization, mixing incompatible libraries).
  4. Hardware constraints violations (e.g., using a peripheral that doesn't exist on this specific series).
  5. Cross-file consistency (e.g., header guards, function declarations matching definitions).

  Be strict but helpful. Analyze ALL provided files.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      isValid: { type: Type.BOOLEAN, description: "True if code is likely to compile without errors." },
      summary: { type: Type.STRING, description: "A brief summary of the code quality and major issues found across the project." },
      issues: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            fileName: { type: Type.STRING, description: "The name of the file containing the issue." },
            line: { type: Type.INTEGER, description: "Line number of the issue (1-based)." },
            severity: { type: Type.STRING, enum: ["ERROR", "WARNING", "INFO", "OPTIMIZATION"] },
            message: { type: Type.STRING, description: "The error message or warning." },
            suggestion: { type: Type.STRING, description: "A brief suggestion on how to fix it." }
          },
          required: ["fileName", "line", "severity", "message", "suggestion"]
        }
      }
    },
    required: ["isValid", "issues", "summary"]
  };

  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: fileContext,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2, 
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const fixCode = async (
  files: ProjectFile[],
  targetFileName: string,
  series: STM32Series,
  issues: any,
  library: LibraryType
): Promise<string> => {
  const targetFile = files.find(f => f.name === targetFileName);
  if (!targetFile) throw new Error("Target file not found in project.");

  // Construct context from all files, highlighting the target
  const fileContext = files.map(f => `
--- BEGIN FILE: ${f.name} ---
${f.content}
--- END FILE: ${f.name} ---
`).join('\n');

  const systemInstruction = `You are an expert STM32 developer using the ${library === LibraryType.HAL ? 'HAL/LL Library' : 'Standard Peripheral Library (SPL)'}. 
  Refactor and fix the code in the file "${targetFileName}" for the ${series} series.
  You are provided with the entire project context, but you must ONLY output the full corrected content of "${targetFileName}".
  
  Rules:
  1. Fix all syntax errors found in the target file.
  2. Resolve logic issues (e.g., remove blocking delays in interrupts).
  3. Ensure standard STM32 ${library} conventions are followed.
  4. Use the context of other files (headers, etc.) to ensure correctness.
  5. Return ONLY the full, compilable source code for "${targetFileName}". Do not include markdown formatting or explanations outside code.`;

  const prompt = `
  Project Context:
  ${fileContext}

  Issues Detected:
  ${JSON.stringify(issues)}

  Task: Provide the fully corrected code for file: ${targetFileName}
  `;

  try {
    const response = await ai.models.generateContent({
      model: REPAIR_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    let fixed = response.text || "// Error: Could not generate fix.";
    
    // Cleanup markdown if present
    if (fixed.startsWith("```")) {
      fixed = fixed.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    }
    
    return fixed;
  } catch (error) {
    console.error("Fix failed:", error);
    throw error;
  }
};
