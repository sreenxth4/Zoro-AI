from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import re
import traceback

app = Flask(__name__)
CORS(app)  # Enable cross-origin requests

# Configure Google Generative AI API with your actual API key
API_KEY = os.getenv("GEMINI_API_KEY")  # Replace with your real key
genai.configure(api_key=API_KEY)

@app.route("/", methods=["GET"])
def home():
    return "AI Code Generator API is running!"

@app.route("/generate", methods=["POST"])
def generate_code():
    data = request.json
    prompt = data.get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "Prompt is required!"}), 400

    system_instruction = (
        "You are an AI that writes clean, efficient code with proper indentation and formatting. "
        "Separate code from explanation clearly. Return them in this format:\n\n"
        "CODE:\n```<language>\n<your code here>\n```\n\n"
        "EXPLANATION:\n<your explanation here>\n\n"
        "Replace <language> with the appropriate programming language (e.g., c, cpp, python, java, etc.). "
        "Do not include any other text."
    )

    full_prompt = f"{system_instruction}\nUser Prompt: {prompt}"

    try:
        model = genai.GenerativeModel("gemini-1.5-pro")
        response = model.generate_content(full_prompt)
        raw_output = response.text.strip()

        # Updated regex to capture ANY language, not just HTML
        code_block_match = re.search(r"CODE:\s*```(\w+)\s*(.*?)\s*```", raw_output, re.DOTALL | re.IGNORECASE)
        explanation_match = re.search(r"EXPLANATION:\s*(.*)", raw_output, re.DOTALL | re.IGNORECASE)

        code_language = code_block_match.group(1) if code_block_match else "unknown"
        code = code_block_match.group(2).strip() if code_block_match else ""
        explanation = explanation_match.group(1).strip() if explanation_match else "No explanation provided."

        return jsonify({
            "language": code_language,
            "code": code,
            "explanation": explanation
        })
    except Exception as e:
    traceback.print_exc()  # This will print the full error in Render logs
    return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
