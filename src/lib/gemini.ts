import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const extractBillData = async (base64Image: string) => {
  const model = genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Extract the following details from this bill image in JSON format:
            - vendorName
            - invoiceDate (YYYY-MM-DD)
            - items: array of { description, qty, unitPrice, total }
            - subtotal
            - taxAmount
            - totalAmount
            - currency
            
            Return ONLY the JSON object.`,
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const response = await model;
  return JSON.parse(response.text || "{}");
};

export const extractSettlementData = async (base64Image: string) => {
  const model = genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Extract the following details from this settlement sheet image in JSON format:
            - date (YYYY-MM-DD)
            - totalSales
            - cash
            - card
            - online
            
            Return ONLY the JSON object.`,
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const response = await model;
  return JSON.parse(response.text || "{}");
};
