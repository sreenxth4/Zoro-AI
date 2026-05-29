from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import os
import re
import traceback

load_dotenv()

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv("GROQ_API_KEY")
MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
client = Groq(api_key=API_KEY) if API_KEY else None

@app.route("/", methods=["GET"])
def home():
    return "AI Code Generator API is running!"

@app.route("/generate", methods=["POST"])
def generate_code():
    data = request.get_json(silent=True) or {}
    prompt = (data.get("prompt") or "").strip()

    if not prompt:
        return jsonify({"error": "Prompt is required!"}), 400

    if client is None:
        return jsonify({"error": "GROQ_API_KEY is not configured"}), 500

    system_instruction = (
        "You are an AI that writes clean, efficient code with proper indentation and formatting. "
        "Return exactly this format:\n\n"
        "CODE:\n```<language>\n<your code here>\n```\n\n"
        "EXPLANATION:\n<your explanation here>\n"
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
        )

        raw_output = response.choices[0].message.content.strip()

        code_match = re.search(
            r"CODE:\s*```([^\s`]*)?\s*(.*?)\s*```",
            raw_output,
            re.DOTALL | re.IGNORECASE,
        )
        explanation_match = re.search(
            r"EXPLANATION:\s*(.*)",
            raw_output,
            re.DOTALL | re.IGNORECASE,
        )

        return jsonify({
            "language": code_match.group(1) if code_match and code_match.group(1) else "unknown",
            "code": code_match.group(2).strip() if code_match else "",
            "explanation": explanation_match.group(1).strip() if explanation_match else "No explanation provided.",
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
