import express from "express";
import { askAI } from "../ai.ts";

const router = express.Router();

router.post("/ask", async (req, res) => {
  const userText = req.body.text || "Say something";
  const reply = await askAI(userText);
  res.json({ reply });
});

export default router;
