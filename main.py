# main.py — reads NDJSON stream and reconstructs text-friendly output
import requests, json

URL = "http://localhost:11434/api/generate"
PAYLOAD = {
    "model": "llama3",
    "prompt": "Hello from my laptop — say something short.",
    "max_tokens": 150
}

def parse_ndjson_stream(resp):
    # collect token-like pieces and join them into a single string
    pieces = []
    for raw in resp.iter_lines(decode_unicode=True):
        if not raw:
            continue
        # try to parse JSON line
        try:
            obj = json.loads(raw)
        except Exception:
            # fallback: raw text line
            pieces.append(raw)
            continue

        # common shapes: {'token': '...'} or {'response': '...'} or {'content': '...'}
        if isinstance(obj, dict):
            for k in ("token", "content", "text", "response", "generated_text"):
                if k in obj and obj[k] is not None:
                    pieces.append(str(obj[k]))
                    break
            else:
                # fallback: take entire dict string
                pieces.append(json.dumps(obj))
        else:
            pieces.append(str(obj))

    # tokens from many servers include leading spaces when needed,
    # so simply concatenate without adding extra spaces.
    return "".join(pieces).strip()

def main():
    try:
        r = requests.post(URL, json=PAYLOAD, stream=True, timeout=30)
    except Exception as e:
        print("Request failed:", e)
        return

    print("Status:", r.status_code, "Content-Type:", r.headers.get("Content-Type"))
    output = parse_ndjson_stream(r)
    print("\n== Model output ==\n")
    print(output)

if __name__ == "__main__":
    main()
