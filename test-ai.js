import { askAI } from "./ai.js";

async function run() {
  const reply = await askAI("Hello, say something short.");
  console.log("AI reply:\n", reply);
}

run();
