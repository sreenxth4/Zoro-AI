   const BACKEND_URL =
    (location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")
      ? "http://127.0.0.1:8080/generate"
      : "https://zoro-ai.onrender.com/generate";

  let currentLanguage = "";

  function isFrontEndCode(code, language = "") {
    const text = (code || "").toLowerCase();
    const lang = (language || "").toLowerCase();

    return (
      lang === "html" ||
      lang === "css" ||
      lang === "javascript" ||
      lang === "js" ||
      lang === "jsx" ||
      lang === "tsx" ||
      text.includes("<!doctype html") ||
      text.includes("<html") ||
      text.includes("<body") ||
      text.includes("<div") ||
      text.includes("<form") ||
      text.includes("<scr" + "ipt") ||
      text.includes("<style")
    );
  }

  function normalizeCode(code) {
    return (code || "")
      .replace(/```[\w-]*\s*/g, "")
      .replace(/```/g, "")
      .trim();
  }

  function parseSectionedCode(code) {
    const normalized = normalizeCode(code);
    const inlineSections = parseInlineSections(normalized);
    if (inlineSections.foundMarker) {
      return inlineSections;
    }

    const lines = normalized.split(/\r?\n/);
    const sections = { html: [], css: [], js: [] };
    let current = "html";
    let foundMarker = false;

    for (const line of lines) {
      const marker = line.trim().match(/^(?:\/\/|\/\*+|\*+|#)?\s*(HTML|CSS|JAVASCRIPT|JS|SCRIPT)(?:\s+code)?\s*:?\s*(?:\*\/)?$/i);
      if (marker) {
        const label = marker[1].toLowerCase();
        current = label === "css" ? "css" : label === "html" ? "html" : "js";
        foundMarker = true;
        continue;
      }
      sections[current].push(line);
    }

    return {
      html: sections.html.join("\n").trim(),
      css: sections.css.join("\n").trim(),
      js: sections.js.join("\n").trim(),
      foundMarker
    };
  }

  function parseInlineSections(code) {
    const sections = { html: "", css: "", js: "", foundMarker: false };
    const markerPattern = /(?:^|[\r\n]\s*|\/\/\s*)(HTML|CSS|JAVASCRIPT|JS|SCRIPT)(?:\s+code)?\s*(?::|\/\/)?\s*/gi;
    const matches = Array.from(code.matchAll(markerPattern));

    if (matches.length < 2) {
      return sections;
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const label = match[1].toLowerCase();
      const key = label === "css" ? "css" : label === "html" ? "html" : "js";
      const start = match.index + match[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : code.length;
      sections[key] += "\n" + code.slice(start, end).trim();
      sections.foundMarker = true;
    }

    sections.html = sanitizePreviewHTML(sections.html);
    sections.css = sanitizePreviewCSS(sections.css);
    sections.js = sanitizePreviewJS(sections.js);

    return sections;
  }

  function sanitizePreviewHTML(html) {
    return (html || "")
      .replace(/^\s*\/\/\s*/gm, "")
      .trim();
  }

  function sanitizePreviewCSS(css) {
    return (css || "")
      .replace(/\/\/\s*/g, "\n")
      .replace(/\bAdd this to your stylesheet\b/gi, "")
      .replace(/\bButton CSS\b/gi, "")
      .replace(/\bButton hover effect\b/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function sanitizePreviewJS(js) {
    return (js || "")
      .replace(/^\s*\/\/\s*/gm, "")
      .trim();
  }

  function escapeHTML(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getPreviewHTML(code, language = "") {
    const cleaned = normalizeCode(code);
    const parsed = parseSectionedCode(cleaned);
    const hasSections = parsed.foundMarker && (parsed.html || parsed.css || parsed.js);
    const scriptOpen = "<" + "script>";
    const scriptClose = "</" + "script>";
    const docStart = [
      "<!DOCTYPE html>",
      "<html>",
      "<head>",
      '  <meta charset="UTF-8">'
    ];
    const docEnd = [
      "</body>",
      "</html>"
    ];

    if (hasSections) {
      const htmlContent = parsed.html || "";
      const cssContent = parsed.css || "";
      const jsContent = parsed.js || "";

      return docStart.concat([
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        "  <style>",
        "    body{font-family:Arial,sans-serif;padding:16px;box-sizing:border-box;}",
        cssContent,
        "  </style>",
        "</head>",
        "<body>",
        htmlContent,
        scriptOpen,
        jsContent,
        scriptClose
      ], docEnd).join("\n");
    }

    if (/<!doctype html>|<html[\s>]/i.test(cleaned)) {
      return cleaned;
    }

    if (/<[a-z][\s\S]*>/i.test(cleaned)) {
      return docStart.concat([
        "  <style>body{font-family:Arial,sans-serif;padding:16px;}</style>",
        "</head>",
        "<body>",
        cleaned
      ], docEnd).join("\n");
    }

    const lang = (language || "").toLowerCase();

    if (lang === "css") {
      return docStart.concat([
        "  <style>",
        "    body{font-family:Arial,sans-serif;padding:16px;}",
        "    .demo-box{padding:20px;border:1px solid #ccc;border-radius:8px;}",
        cleaned,
        "  </style>",
        "</head>",
        "<body>",
        '  <div class="demo-box">Preview area</div>'
      ], docEnd).join("\n");
    }

    if (lang === "javascript" || lang === "js") {
      return docStart.concat([
        "  <style>body{font-family:Arial,sans-serif;padding:16px;}</style>",
        "</head>",
        "<body>",
        '  <div id="app">Preview area</div>',
        scriptOpen,
        cleaned,
        scriptClose
      ], docEnd).join("\n");
    }

    return docStart.concat([
      "  <style>body{font-family:Arial,sans-serif;padding:16px;}</style>",
      "</head>",
      "<body>",
      "  <pre>" + escapeHTML(cleaned) + "</pre>"
    ], docEnd).join("\n");
  }

  function adjustTextareaHeight(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  function showAlert(message, type = "info", title = "") {
    const alertOverlay = document.getElementById("alertOverlay");
    const customAlert = document.getElementById("customAlert");
    const alertMessage = document.getElementById("alertMessage");
    const alertIcon = customAlert?.querySelector(".custom-alert-icon i");
    const alertTitle = customAlert?.querySelector(".custom-alert-title");

    if (!alertOverlay || !customAlert || !alertMessage || !alertIcon || !alertTitle) return;

    customAlert.className = "custom-alert";
    alertMessage.textContent = message;

    switch (type) {
      case "success":
        customAlert.classList.add("success");
        alertIcon.className = "fas fa-check-circle";
        alertTitle.textContent = title || "Success";
        break;
      case "error":
        customAlert.classList.add("error");
        alertIcon.className = "fas fa-exclamation-circle";
        alertTitle.textContent = title || "Error";
        break;
      case "warning":
        customAlert.classList.add("warning");
        alertIcon.className = "fas fa-exclamation-triangle";
        alertTitle.textContent = title || "Warning";
        break;
      default:
        alertIcon.className = "fas fa-info-circle";
        alertTitle.textContent = title || "Information";
    }

    alertOverlay.classList.add("active");
    setTimeout(() => customAlert.classList.add("active"), 10);
  }

  function closeAlert() {
    const alertOverlay = document.getElementById("alertOverlay");
    const customAlert = document.getElementById("customAlert");
    if (!alertOverlay || !customAlert) return;

    customAlert.classList.remove("active");
    setTimeout(() => alertOverlay.classList.remove("active"), 300);
  }

  function showToast(message, type = "info", duration = 3000) {
    const existingToast = document.querySelector(".toast-notification");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.className = "toast-notification";

    let icon = "info-circle";
    if (type === "success") {
      toast.classList.add("success");
      icon = "check-circle";
    } else if (type === "error") {
      toast.classList.add("error");
      icon = "exclamation-circle";
    } else if (type === "warning") {
      toast.classList.add("warning");
      icon = "exclamation-triangle";
    }

    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("active"), 10);

    setTimeout(() => {
      toast.classList.remove("active");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function showScrollIndicator() {
    const el = document.getElementById("scrollIndicator");
    if (el) el.classList.add("active");
  }

  function hideScrollIndicator() {
    const el = document.getElementById("scrollIndicator");
    if (el) el.classList.remove("active");
  }

  async function generateCode(prompt) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      currentLanguage = data.language || "";
      let code = normalizeCode(data.code || "");
      const explanation = data.explanation || "No explanation provided.";

      const codeOutput = document.getElementById("codeOutput");
      codeOutput.textContent = code;
      codeOutput.className = `language-${currentLanguage || "html"}`;
      codeOutput.classList.remove("generating");

      const explanationTextarea = document.getElementById("explanation");
      explanationTextarea.value = explanation;
      adjustTextareaHeight(explanationTextarea);

      document.getElementById("btnGroup").style.display =
        isFrontEndCode(code, currentLanguage) ? "flex" : "none";

      Prism.highlightElement(codeOutput);
      showToast("Code generated successfully!", "success");
      showScrollIndicator();
    } catch (error) {
      const codeOutput = document.getElementById("codeOutput");
      codeOutput.textContent = "Error: " + error.message;
      codeOutput.classList.remove("generating");
      showAlert("Failed to generate code: " + error.message, "error", "Generation Error");
    } finally {
      const generateBtn = document.getElementById("generateBtn");
      if (generateBtn) generateBtn.classList.remove("animating");
    }
  }

  function startGeneration() {
    const promptInput = document.getElementById("promptInput");
    const prompt = promptInput ? promptInput.value.trim() : "";

    if (!prompt) {
      showAlert("Please enter a prompt to generate code.", "warning", "Empty Prompt");
      return;
    }

    const generateBtn = document.getElementById("generateBtn");
    if (generateBtn) generateBtn.classList.add("animating");

    const codeOutput = document.getElementById("codeOutput");
    if (codeOutput) {
      codeOutput.innerHTML = 'Preparing your code... <span class="typing-indicator"><span></span><span></span><span></span></span>';
      codeOutput.classList.add("generating");
    }

    document.getElementById("explanation").value = "";
    document.getElementById("btnGroup").style.display = "none";

    setTimeout(() => generateCode(prompt), 1500);
  }

  function previewCode() {
    const code = document.getElementById("codeOutput").textContent;
    if (!code.trim()) {
      showAlert("No code to preview.", "warning", "Empty Code");
      return;
    }

    const previewBlob = new Blob([getPreviewHTML(code, currentLanguage)], { type: "text/html" });
    const previewUrl = URL.createObjectURL(previewBlob);
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      URL.revokeObjectURL(previewUrl);
      showAlert("Popup blocked. Allow popups to preview code.", "warning", "Preview Blocked");
      return;
    }

    previewWindow.location.href = previewUrl;
    setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
    showToast("Preview opened in new tab", "info");
  }

  function copyCode() {
    const code = document.getElementById("codeOutput").textContent;
    if (!code.trim()) {
      showAlert("No code to copy.", "warning", "Empty Code");
      return;
    }

    navigator.clipboard.writeText(code)
      .then(() => {
        const copyBtn = document.querySelector(".btn-secondary");
        if (copyBtn) {
          const originalText = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
          setTimeout(() => (copyBtn.innerHTML = originalText), 2000);
        }
        showToast("Code copied to clipboard!", "success");
      })
      .catch(err => showAlert("Failed to copy code: " + err.message, "error", "Copy Error"));
  }

  function downloadCode() {
    const code = document.getElementById("codeOutput").textContent;
    if (!code.trim()) {
      showAlert("No code to download.", "warning", "Empty Code");
      return;
    }

    const extMap = {
      html: "html",
      css: "css",
      js: "js",
      javascript: "js",
      jsx: "jsx",
      tsx: "tsx",
      python: "py"
    };

    const extension = extMap[(currentLanguage || "").toLowerCase()] || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `generated_code.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const downloadBtn = document.querySelector(".btn-info");
    if (downloadBtn) {
      const originalText = downloadBtn.innerHTML;
      downloadBtn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
      setTimeout(() => (downloadBtn.innerHTML = originalText), 2000);
    }

    showToast("Code downloaded successfully!", "success");
  }

  function createCodeSymbols() {
    const symbolsContainer = document.getElementById("codeSymbols");
    if (!symbolsContainer) return;

    const symbols = ["{ }", "< >", "( )", ";", "[ ]", "/*", "*/", "// ", "+=", "=>", "&&", "||", "==", "!=", "++"];
    symbolsContainer.innerHTML = "";

    for (let i = 0; i < 15; i++) {
      const symbol = document.createElement("div");
      symbol.className = "code-symbol";
      symbol.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      symbol.style.left = `${Math.random() * 90 + 5}%`;
      const duration = Math.random() * 2 + 1;
      const delay = Math.random() * 2;
      symbol.style.animation = `float-symbol ${duration}s linear infinite ${delay}s`;
      symbolsContainer.appendChild(symbol);
    }
  }

  function setupBackgroundAnimations() {
    const background = document.getElementById("animatedBackground");
    if (!background) return;

    for (let i = 0; i < 30; i++) createParticle(background);
    for (let i = 1; i < 10; i++) {
      createGridLine(background, "horizontal", i * 10);
      createGridLine(background, "vertical", i * 10);
    }
    for (let i = 0; i < 5; i++) createFloatingCube(background);
    for (let i = 0; i < 3; i++) createCirclePulse(background);
    for (let i = 0; i < 8; i++) createDataStream(background);
  }

  function createParticle(parent) {
    const particle = document.createElement("div");
    particle.className = "particle";
    const size = Math.random() * 4 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.opacity = Math.random() * 0.5 + 0.1;
    particle.style.animation = `pulse ${Math.random() * 4 + 2}s infinite alternate`;
    parent.appendChild(particle);
  }

  function createGridLine(parent, direction, position) {
    const line = document.createElement("div");
    line.className = `grid-line ${direction === "horizontal" ? "horizontal-line" : "vertical-line"}`;

    if (direction === "horizontal") {
      line.style.top = `${position}%`;
      line.style.animationDelay = `${position / 10}s`;
    } else {
      line.style.left = `${position}%`;
      line.style.animationDelay = `${position / 10}s`;
    }

    parent.appendChild(line);
  }

  function createFloatingCube(parent) {
    const cube = document.createElement("div");
    cube.className = "floating-cube";
    cube.style.left = `${Math.random() * 90 + 5}%`;
    cube.style.top = `${Math.random() * 90 + 5}%`;
    const size = Math.random() * 30 + 20;
    cube.style.width = `${size}px`;
    cube.style.height = `${size}px`;
    const duration = Math.random() * 10 + 10;
    const delay = Math.random() * 5;
    cube.style.animation = `float ${duration}s infinite linear ${delay}s`;
    cube.style.transform = `rotate(${Math.random() * 360}deg)`;
    parent.appendChild(cube);
  }

  function createCirclePulse(parent) {
    const circle = document.createElement("div");
    circle.className = "circle-pulse";
    circle.style.left = `${Math.random() * 100}%`;
    circle.style.top = `${Math.random() * 100}%`;
    const duration = Math.random() * 4 + 3;
    const delay = Math.random() * 2;
    circle.style.animation = `pulse-ring ${duration}s infinite ${delay}s`;
    parent.appendChild(circle);
  }

  function createDataStream(parent) {
    const stream = document.createElement("div");
    stream.className = "data-stream";
    let data = "";
    const chars = "01";

    for (let i = 0; i < 100; i++) {
      data += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    stream.textContent = data;
    stream.style.left = `${Math.random() * 90}%`;
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 5;
    stream.style.animation = `stream-data ${duration}s linear infinite ${delay}s`;
    parent.appendChild(stream);
  }

  function loadExample(exampleType) {
    const examples = {
      "responsive-layout": "Create a responsive grid layout with header, sidebar, main content and footer that adapts to mobile, tablet and desktop screens",
      "user-auth": "Build a user login and registration form with client-side validation and password strength meter",
      "ecommerce": "Create a product listing page with filter options, shopping cart functionality and checkout form",
      "data-viz": "Generate a dashboard with bar charts, line graphs and pie charts using Chart.js",
      "image-gallery": "Build a responsive image gallery with lightbox effect and thumbnail navigation",
      "mobile-ui": "Create a mobile app interface with bottom navigation, swipeable cards and pull-to-refresh"
    };

    document.getElementById("promptInput").value = examples[exampleType] || "";
    document.querySelector(".card.p-4.glow")?.scrollIntoView({ behavior: "smooth" });

    setTimeout(() => {
      document.getElementById("promptInput")?.focus();
    }, 800);

    showToast(`Example loaded: ${exampleType.replace("-", " ")}`, "success");
  }

  function scrollToGenerator() {
    const generatorCard = document.querySelector(".card.p-4.glow");
    if (!generatorCard) return;

    generatorCard.scrollIntoView({ behavior: "smooth" });
    generatorCard.style.transition = "box-shadow 0.5s ease";
    generatorCard.style.boxShadow = "0 0 30px rgba(108, 92, 231, 0.8)";
    setTimeout(() => (generatorCard.style.boxShadow = ""), 1500);
    setTimeout(() => document.getElementById("promptInput")?.focus(), 800);
  }

  function scrollToAboutMe() {
    const aboutMeSection = document.querySelector(".credit-section");
    if (!aboutMeSection) return;

    aboutMeSection.scrollIntoView({ behavior: "smooth" });

    const creatorInfo = document.querySelector(".creator-info");
    if (creatorInfo) {
      creatorInfo.style.transition = "box-shadow 0.5s ease";
      creatorInfo.style.boxShadow = "0 0 30px rgba(108, 92, 231, 0.8)";
      setTimeout(() => (creatorInfo.style.boxShadow = ""), 1500);
    }
  }

  function scrollToOutput() {
    const outputCard = document.querySelector(".card.glow-effect");
    if (!outputCard) return;

    outputCard.scrollIntoView({ behavior: "smooth" });
    outputCard.style.transition = "box-shadow 0.5s ease";
    outputCard.style.boxShadow = "0 0 30px rgba(108, 92, 231, 0.8)";
    setTimeout(() => (outputCard.style.boxShadow = ""), 1500);
  }

  function showScrollIndicator() {
    document.getElementById("scrollIndicator")?.classList.add("active");
  }

  function hideScrollIndicator() {
    document.getElementById("scrollIndicator")?.classList.remove("active");
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupBackgroundAnimations();
    createCodeSymbols();

    const cards = document.querySelectorAll(".card");
    cards.forEach((card, index) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(20px)";
      setTimeout(() => {
        card.style.transition = "all 0.5s ease";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, 100 * index);
    });

    const robot = document.getElementById("floatingRobot");
    const promptCard = document.querySelector(".card.p-4.glow");
    const outputCard = document.querySelector(".card.p-4.mt-4.glow-effect");
    const promptInput = document.getElementById("promptInput");
    const generateBtn = document.getElementById("generateBtn");
    const explanationTextarea = document.getElementById("explanation");

    function positionRobot() {
      if (!robot || !promptCard) return;
      const cardRect = promptCard.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      robot.style.top = (cardRect.top + scrollY + cardRect.height - 30) + "px";
      robot.style.left = (cardRect.left + 30) + "px";
    }

    setTimeout(positionRobot, 500);
    window.addEventListener("resize", positionRobot);
    window.addEventListener("scroll", positionRobot);

    promptInput?.addEventListener("focus", function () {
      if (!robot || !promptCard) return;
      const cardRect = promptCard.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      robot.classList.add("active");
      robot.style.top = (cardRect.top + scrollY - 50) + "px";
      robot.style.left = "50%";
      robot.style.transform = "translateX(-50%)";
    });

    promptInput?.addEventListener("blur", function () {
      if (generateBtn && !generateBtn.classList.contains("animating")) {
        robot?.classList.remove("active");
        positionRobot();
      }
    });

    const originalStartGeneration = window.startGeneration || startGeneration;
    window.startGeneration = function () {
      if (robot && outputCard) {
        const outputRect = outputCard.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        robot.classList.add("active");
        robot.style.top = (outputRect.top + scrollY - 50) + "px";
        robot.style.left = "50%";
        robot.style.transform = "translateX(-50%)";
      }

      originalStartGeneration();

      setTimeout(function () {
        robot?.classList.remove("active");
        positionRobot();
      }, 5000);
    };

    explanationTextarea?.addEventListener("input", function () {
      adjustTextareaHeight(this);
    });

    if (explanationTextarea?.value) {
      adjustTextareaHeight(explanationTextarea);
    }
  });

  window.addEventListener("scroll", function () {
    const outputCard = document.querySelector(".card.glow-effect");
    if (!outputCard) return;

    const rect = outputCard.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom >= 0) {
      hideScrollIndicator();
    }
  });

  document.querySelector(".card.glow-effect")?.addEventListener("click", function () {
    hideScrollIndicator();
  });

  document.getElementById("suggestionBtn")?.addEventListener("mouseover", function () {
    this.classList.remove("pulse-btn");
  });

  document.getElementById("suggestionBtn")?.addEventListener("click", function () {
    const examples = [
      "Create a responsive navbar with dropdown menus",
      "Build a contact form with validation",
      "Make a dark/light theme toggle button",
      "Create an image carousel with thumbnails",
      "Design a pricing table with hover effects"
    ];

    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    document.getElementById("promptInput").value = randomExample;
    showToast("Example prompt added! Click Generate to try it.", "info");
  });
