import axios from "axios";

export async function askAI(prompt: string) {
  const res = await axios.post(
    "http://localhost:11434/api/generate",
    { model: "llama3", prompt },
    { responseType: "stream" }
  );

  return new Promise((resolve, reject) => {
    let out = "";
    res.data.on("data", (chunk: any) => {
      const lines = chunk.toString().trim().split("\n");
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.response) out += obj.response;
          if (obj.token) out += obj.token;
        } catch {}
      }
    });
    res.data.on("end", () => resolve(out));
    res.data.on("error", reject);
  });
}
