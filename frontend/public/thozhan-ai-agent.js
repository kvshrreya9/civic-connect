
(function () {
  if (window.__THOZHAN_AI_LOADED__) return;
  window.__THOZHAN_AI_LOADED__ = true;

  // ==========================================
  // 2. KNOWLEDGE BASE & INTENTS (15 ZONES & FAQS)
  // ==========================================
  const CHENNAI_ZONES = {
    1: { name: "Thiruvottiyur", lms: ["thiruvottiyur", "wimco nagar", "ennore", "tollgate"] },
    2: { name: "Manali", lms: ["manali", "mathur", "sadayankuppam"] },
    3: { name: "Madhavaram", lms: ["madhavaram", "retteri", "puzhal"] },
    4: { name: "Tondiarpet", lms: ["tondiarpet", "korukkupet", "washermanpet"] },
    5: { name: "Royapuram", lms: ["royapuram", "sowcarpet", "george town", "broadway", "egmore"] },
    6: { name: "Thiru Vi Ka Nagar", lms: ["perambur", "jamalia", "sembium", "kolathur", "ayanavaram"] },
    7: { name: "Ambattur", lms: ["ambattur", "mogappair", "korattur", "padi"] },
    8: { name: "Anna Nagar", lms: ["anna nagar", "shenoy nagar", "kilpauk", "aminjikarai", "koyambedu"] },
    9: { name: "Teynampet", lms: ["teynampet", "mylapore", "triplicane", "alwarpet", "nungambakkam", "marina", "royapettah"] },
    10: { name: "Kodambakkam", lms: ["kodambakkam", "t nagar", "t.nagar", "ashok nagar", "vadapalani", "kk nagar", "saidapet"] },
    11: { name: "Valasaravakkam", lms: ["valasaravakkam", "porur", "ramapuram", "virugambakkam"] },
    12: { name: "Alandur", lms: ["alandur", "guindy", "nanganallur", "meenambakkam", "pallavaram"] },
    13: { name: "Adyar", lms: ["adyar", "besant nagar", "thiruvanmiyur", "velachery", "indira nagar", "kotturpuram"] },
    14: { name: "Perungudi", lms: ["perungudi", "palavakkam", "kottivakkam", "neelankarai", "thoraipakkam", "omr", "madipakkam"] },
    15: { name: "Sholinganallur", lms: ["sholinganallur", "semmancheri", "injambakkam", "akkarai", "navalur", "ecr", "medavakkam"] }
  };

  const FAQS = {
    sla: {
      en: "⏱️ **GCC SLA Timelines:**\n• P0 Critical (Live wire/Open manhole): 2-4 Hours\n• Stormwater Flood: 12 Hours\n• Solid Waste / Garbage: 24 Hours\n• Streetlight: 24 Hours\n• Pothole repair: 48 Hours\n• General Health/Dogs: 48 Hours",
      ta: "⏱️ **மாநகராட்சி தீர்வு காலக்கெடு (SLA):**\n• P0 அவசரம் (மின்கம்பி/திறந்த மேன்ஹோல்): 2-4 மணி நேரம்\n• மழைநீர் தேக்கம்: 12 மணி நேரம்\n• குப்பைக் கழிவு: 24 மணி நேரம்\n• தெருவிளக்கு: 24 மணி நேரம்\n• சாலைக் குழி: 48 மணி நேரம்",
      tanglish: "⏱️ **SLA Timings:**\n• Live wire/Open manhole: 2-4 Hours la solve aagum\n• Water logging: 12 Hours\n• Garbage issue: 24 Hours\n• Streetlight: 24 Hours\n• Pothole: 48 Hours",
      hi: "⏱️ **जीसीसी समाधान समय सीमा (SLA):**\n• P0 आपातकाल (खुला मैनहोल/बिजली का तार): 2-4 घंटे\n• जलभराव/बाढ़: 12 घंटे\n• कचरा प्रबंधन: 24 घंटे\n• स्ट्रीटलाइट: 24 घंटे\n• गड्ढा मरम्मत: 48 घंटे"
    },
    track: {
      en: "🔍 **How to track a complaint:**\n1. Enter your ticket ID to find its current status.\n2. Ask for pending cases, solved cases or reports from the past month.\n3. Contact the responsible municipality for urgent issues.",
      ta: "🔍 **புகாரைக் கண்காணிப்பது எப்படி:**\n1. தற்போதைய நிலையை அறிய உங்கள் புகார் எண்ணை உள்ளிடுங்கள்.\n2. நிலுவை வழக்குகள், தீர்க்கப்பட்ட வழக்குகள் அல்லது கடந்த மாத அறிக்கையைக் கேளுங்கள்.\n3. அவசரப் பிரச்சினைகளுக்கு சம்பந்தப்பட்ட உள்ளாட்சி அலுவலகத்தைத் தொடர்பு கொள்ளுங்கள்.",
      tanglish: "🔍 **Track panna:**\n1. Current status paaka unga ticket ID enter pannunga.\n2. Pending cases, solved cases, illa past month reports kelunga.\n3. Urgent issue-na responsible municipality-a contact pannunga.",
      hi: "🔍 **शिकायत की स्थिति देखें:**\n1. मौजूदा स्थिति जानने के लिए अपना टिकट आईडी लिखें।\n2. लंबित मामले, हल हुए मामले या पिछले महीने की रिपोर्ट पूछें।\n3. तत्काल समस्या के लिए संबंधित नगरपालिका से संपर्क करें।"
    },
    helpline: {
      en: "📞 **Emergency Helplines:**\n• GCC Civic Grievances: **1913**\n• Chennai MetroWater (Water/Sewage): **044-4567 4567**\n• TANGEDCO Electricity Board: **1912**\n• Traffic Police WhatsApp: **90031 30103**",
      ta: "📞 **அவசர உதவி எண்கள்:**\n• சென்னை மாநகராட்சி: **1913**\n• குடிநீர் & கழிவுநீர் வாரியம்: **044-4567 4567**\n• மின்சார வாரியம்: **1912**\n• போக்குவரத்து போலீஸ்: **90031 30103**",
      tanglish: "📞 **Helplines:**\n• GCC Complaint: **1913**\n• MetroWater: **044-4567 4567**\n• EB / Current Cut: **1912**\n• Traffic Police: **90031 30103**",
      hi: "📞 **आपातकालीन हेल्पलाइन:**\n• जीसीसी नागरिक शिकायत: **1913**\n• मेट्रोवाटर (पानी/सीवर): **044-4567 4567**\n• बिजली बोर्ड (TANGEDCO): **1912**"
    }
  };

  // State
  let currentLang = 'ta'; // 'ta', 'en', 'tanglish', 'hi'
  let currentRole = 'citizen'; // 'citizen' or 'staff'
  let voiceEnabled = true;
  let currentPath = window.__THOZHAN_ROUTE__ || window.location.pathname;
  let reportContext = window.__THOZHAN_REPORT_CONTEXT__ || null;

  // ==========================================
  // 3. INJECT CSS STYLES (Self-Contained)
  // ==========================================
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #thozhan-ai-root[hidden] { display: none !important; }
    .thozhan-float-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #072146 0%, #0f3d6c 100%);
      color: #ffffff;
      border: 2px solid #f59e0b;
      border-radius: 50px;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(15, 61, 108, 0.45);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 700;
      transition: all 0.25s ease;
    }
    .thozhan-float-btn:hover {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 14px 28px -5px rgba(15, 61, 108, 0.6);
      border-color: #fbbf24;
    }
    .thozhan-avatar-icon {
      width: 34px;
      height: 34px;
      background: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .thozhan-pulse-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
      animation: thozhan-pulse 2s infinite;
    }
    @keyframes thozhan-pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
    .thozhan-chat-panel {
      position: fixed;
      bottom: 84px;
      right: 24px;
      width: 430px;
      max-width: calc(100vw - 32px);
      height: 640px;
      max-height: calc(100vh - 105px);
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      border: 1px solid #cbd5e1;
      opacity: 0;
      transform: translateY(20px) scale(0.96);
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .thozhan-chat-panel.active {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }
    .thozhan-top-header {
      background: linear-gradient(135deg, #072146 0%, #0f3d6c 100%);
      color: #ffffff;
      padding: 12px 16px;
      border-bottom: 2px solid #f59e0b;
    }
    .thozhan-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .thozhan-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .thozhan-title {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .thozhan-sub {
      font-size: 11px;
      color: #cbd5e1;
    }
    .thozhan-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .thozhan-icon-btn {
      background: rgba(255,255,255,0.15);
      border: none;
      color: #ffffff;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      transition: background 0.2s;
    }
    .thozhan-icon-btn:hover { background: rgba(255,255,255,0.3); }
    .thozhan-icon-btn.active-voice { background: #16a34a; color: #fff; }

    /* Lang & Role Bar */
    .thozhan-mode-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 11.5px;
    }
    .thozhan-pill-toggle {
      background: rgba(0,0,0,0.25);
      border-radius: 20px;
      padding: 2px;
      display: flex;
    }
    .thozhan-pill-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 3px 8px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .thozhan-pill-btn.active {
      background: #f59e0b;
      color: #072146;
    }
    .thozhan-lang-select {
      background: rgba(255,255,255,0.15);
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 11px;
      outline: none;
      cursor: pointer;
    }
    .thozhan-lang-select option {
      background: #072146;
      color: #ffffff;
    }

    /* Chat Area */
    .thozhan-chat-body {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .thozhan-msg {
      max-width: 88%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.45;
      word-break: break-word;
    }
    .thozhan-msg.bot {
      align-self: flex-start;
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-top-left-radius: 3px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    }
    .thozhan-msg.user {
      align-self: flex-end;
      background: #0f3d6c;
      color: #ffffff;
      border-top-right-radius: 3px;
    }
    .thozhan-voice-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #16a34a;
      margin-top: 4px;
    }

    /* Report Card */
    .thozhan-report-card {
      margin-top: 8px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px;
      font-size: 12px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }
    .thozhan-report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .thozhan-status-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
    }
    .status-in-progress { background: #fef9c3; color: #ca8a04; border: 1px solid #fde047; }
    .status-resolved { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
    .status-pending { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }

    /* Action Chips Bar */
    .thozhan-chips-bar {
      padding: 8px 12px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 6px;
      overflow-x: auto;
      white-space: nowrap;
    }
    .thozhan-chip {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 5px 10px;
      border-radius: 16px;
      font-size: 11px;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }
    .thozhan-chip:hover {
      background: #fef3c7;
      border-color: #f59e0b;
      color: #92400e;
    }

    /* Footer Input */
    .thozhan-footer {
      padding: 10px 14px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .thozhan-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 9px 14px;
      font-size: 13px;
      outline: none;
    }
    .thozhan-input:focus {
      border-color: #0f3d6c;
      box-shadow: 0 0 0 3px rgba(15, 61, 108, 0.1);
    }
    .thozhan-mic-btn {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      transition: all 0.2s;
    }
    .thozhan-mic-btn.recording {
      background: #ef4444;
      color: #ffffff;
      border-color: #dc2626;
      animation: thozhan-pulse 1s infinite;
    }
    .thozhan-send-btn {
      background: #0f3d6c;
      border: none;
      color: #ffffff;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .thozhan-send-btn:hover { background: #072146; }
  `;
  document.head.appendChild(styleEl);

  // Friendly Mascot Avatar SVG
  const AVATAR_SVG = `
    <svg width="22" height="22" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="18" fill="#0F3D6C"/>
      <path d="M18 7C12.477 7 8 11.477 8 17C8 20.89 10.22 24.26 13.5 25.9V29L17.15 27.43C17.43 27.46 17.71 27.5 18 27.5C23.523 27.5 28 23.023 28 17.5C28 11.977 23.523 7 18 7Z" fill="#F59E0B"/>
      <circle cx="14.5" cy="16" r="2" fill="#072146"/>
      <circle cx="21.5" cy="16" r="2" fill="#072146"/>
      <path d="M14 20.5C15 22 21 22 22 20.5" stroke="#072146" stroke-width="2" stroke-linecap="round"/>
      <polygon points="18,10 20,13 16,13" fill="#FFFFFF"/>
    </svg>
  `;

  // ==========================================
  // 4. SPEECH SYNTHESIS & RECOGNITION (Voice Engine)
  // ==========================================
  function speakTamilOrEnglish(text) {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      
      // Clean markdown tags for natural speech
      const cleanText = text.replace(/[*_#•]/g, '').replace(/https?:\/\/\S+/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Select appropriate voice language
      if (currentLang === 'ta') {
        utterance.lang = 'ta-IN';
      } else if (currentLang === 'hi') {
        utterance.lang = 'hi-IN';
      } else {
        utterance.lang = 'en-IN';
      }

      // Try finding an installed Indian voice
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.lang.startsWith(utterance.lang.slice(0, 2)));
      if (match) utterance.voice = match;

      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  }

  function setupSpeechRecognition(onResult, onStatus) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => onStatus(true);
    recognition.onend = () => onStatus(false);
    recognition.onerror = () => onStatus(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    return recognition;
  }

  // Reports are fetched from the application's complaint API when requested.

  function getLocalizedText(key) {
    return (FAQS[key] && FAQS[key][currentLang]) || (FAQS[key] && FAQS[key]['en']) || "";
  }

  function getWelcomeMessage() {
    if (currentRole === 'staff') {
      return {
        ta: "வணக்கம் அதிகாரி அவர்களே! 👔 நான் தோழன்.\nநிலுவை புகார்கள், தீர்க்கப்பட்ட வழக்குகள் மற்றும் மாதாந்திர அறிக்கைகளைப் பற்றி கேளுங்கள்.",
        en: "Vanakkam Officer! 👔 I am **Thozhan Staff Copilot**.\nAsk me to view current pending complaints, solved cases, monthly reports, or SLA breach warnings.",
        tanglish: "Vanakkam Officer! 👔 Naan unga **Thozhan Staff Copilot**.\nPending complaints, solved cases, monthly reports pathi enkitta kelunga.",
        hi: "नमस्ते अधिकारी महोदय! 👔 मैं **Thozhan Staff Copilot** हूँ।\nलंबित शिकायतें, हल हुए मामले और मासिक रिपोर्ट पूछें।"
      }[currentLang];
    }

    return {
      ta: "வணக்கம்! நான் **தோழன்** (சிங்கார சென்னை உதவியாளர்) 🙏\nநிலுவை புகார்கள், தீர்க்கப்பட்ட வழக்குகள் மற்றும் கடந்த மாத அறிக்கையைப் பற்றி கேளுங்கள். தமிழிலும் பேசலாம்! 🎙️",
      en: "Vanakkam! I am **Thozhan** (Your Chennai Civic Copilot) 🙏\nI can help you file a grievance, find already reported issues, track your complaint status, or answer civic SLAs. You can speak to me in Tamil or English! 🎙️",
      tanglish: "Vanakkam! Naan unga **Thozhan** 🙏\nPuthiya complaint register panna, old complaint status paaka, pending cases, solved cases, or past month reports pathi enkitta kelunga. Voice input-um irukku! 🎙️",
      hi: "नमस्ते! मैं **Thozhan** (चेन्नई नागरिक सहायक) हूँ 🙏\nलंबित मामले, हल हुए मामले और पिछले महीने की रिपोर्ट पूछें।"
    }[currentLang];
  }

  // ==========================================
  // 6. BUILD UI & EVENT WIRING
  // ==========================================
  function initThozhan() {
    const container = document.createElement('div');
    container.id = 'thozhan-ai-root';
    container.hidden = /^\/(?:login|signup|municipality\/login)\/?$/.test(currentPath);
    container.innerHTML = `
      <!-- Floating Action Button -->
      <button class="thozhan-float-btn" id="thozhan-trigger" aria-label="Open Thozhan">
        <div class="thozhan-avatar-icon">${AVATAR_SVG}</div>
        <span>தோழன் (Thozhan)</span>
        <span class="thozhan-pulse-dot"></span>
      </button>

      <!-- Chat Drawer Panel -->
      <div class="thozhan-chat-panel" id="thozhan-panel">
        <div class="thozhan-top-header">
          <div class="thozhan-header-row">
            <div class="thozhan-brand">
              <div class="thozhan-avatar-icon">${AVATAR_SVG}</div>
              <div>
                <div class="thozhan-title">தோழன் (Thozhan)</div>
                <div class="thozhan-sub">Namma Chennai Civic Copilot</div>
              </div>
            </div>
            <div class="thozhan-controls">
              <button class="thozhan-icon-btn ${voiceEnabled ? 'active-voice' : ''}" id="thozhan-voice-toggle" title="Toggle Voice Output (ஒலி)">
                ${voiceEnabled ? '🔊' : '🔇'}
              </button>
              <button class="thozhan-icon-btn" id="thozhan-close" title="Close">&times;</button>
            </div>
          </div>

          <!-- Role Toggle & Language Selector -->
          <div class="thozhan-mode-bar">
            <div class="thozhan-pill-toggle">
              <button class="thozhan-pill-btn active" id="thozhan-role-citizen">👤 Citizen</button>
              <button class="thozhan-pill-btn" id="thozhan-role-staff">👔 Staff</button>
            </div>

            <div>
              <select class="thozhan-lang-select" id="thozhan-lang">
                <option value="ta" selected>தமிழ் (Tamil)</option>
                <option value="tanglish">Tanglish</option>
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Chat Body -->
        <div class="thozhan-chat-body" id="thozhan-body"></div>

        <!-- Quick Action Chips -->
        <div class="thozhan-chips-bar" id="thozhan-chips"></div>

        <!-- Input Bar with Mic & Send -->
        <div class="thozhan-footer">
          <button class="thozhan-mic-btn" id="thozhan-mic" title="Speak in Tamil/English (குரல் பதிவு)">🎙️</button>
          <input type="text" class="thozhan-input" id="thozhan-input" placeholder="கேளுங்கள் / Type your question or Ticket ID...">
          <button class="thozhan-send-btn" id="thozhan-send" title="Send">➤</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const panel = document.getElementById('thozhan-panel');
    const trigger = document.getElementById('thozhan-trigger');
    const closeBtn = document.getElementById('thozhan-close');
    const body = document.getElementById('thozhan-body');
    const input = document.getElementById('thozhan-input');
    const sendBtn = document.getElementById('thozhan-send');
    const micBtn = document.getElementById('thozhan-mic');
    const voiceToggle = document.getElementById('thozhan-voice-toggle');
    const langSelect = document.getElementById('thozhan-lang');
    const roleCitizen = document.getElementById('thozhan-role-citizen');
    const roleStaff = document.getElementById('thozhan-role-staff');
    const chipsBar = document.getElementById('thozhan-chips');

    window.addEventListener('thozhan:route', (event) => {
      currentPath = event.detail?.path || window.location.pathname;
      container.hidden = /^\/(?:login|signup|municipality\/login)\/?$/.test(currentPath);
      if (container.hidden) panel.classList.remove('active');
      updateChips();
    });
    window.addEventListener('thozhan:context', (event) => {
      reportContext = event.detail || null;
      updateChips();
    });

    // Speech recognition setup
    let recognition = null;
    let isRecording = false;

    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      recognition = setupSpeechRecognition(
        (transcript) => {
          input.value = transcript;
          handleSend(transcript);
        },
        (recording) => {
          isRecording = recording;
          if (recording) {
            micBtn.classList.add('recording');
            micBtn.innerHTML = '🔴';
          } else {
            micBtn.classList.remove('recording');
            micBtn.innerHTML = '🎙️';
          }
        }
      );
    } else {
      micBtn.title = "Microphone not supported on this browser";
      micBtn.style.opacity = '0.5';
    }

    micBtn.onclick = () => {
      if (!recognition) {
        alert("Speech recognition is not supported in this browser. Please use Chrome, Safari or Edge.");
        return;
      }
      if (isRecording) {
        recognition.stop();
      } else {
        // Set recognition language
        recognition.lang = currentLang === 'ta' ? 'ta-IN' : (currentLang === 'hi' ? 'hi-IN' : 'en-IN');
        recognition.start();
      }
    };

    voiceToggle.onclick = () => {
      voiceEnabled = !voiceEnabled;
      voiceToggle.classList.toggle('active-voice', voiceEnabled);
      voiceToggle.innerHTML = voiceEnabled ? '🔊' : '🔇';
      if (!voiceEnabled && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };

    // Toggle Chat Panel
    trigger.onclick = () => {
      panel.classList.toggle('active');
      if (panel.classList.contains('active')) input.focus();
    };
    closeBtn.onclick = () => panel.classList.remove('active');

    // Language Change
    langSelect.onchange = (e) => {
      currentLang = e.target.value;
      updateChips();
      addMessage(getWelcomeMessage(), 'bot', null, true);
    };

    // Role Toggles
    roleCitizen.onclick = () => {
      currentRole = 'citizen';
      roleCitizen.classList.add('active');
      roleStaff.classList.remove('active');
      updateChips();
      addMessage(getWelcomeMessage(), 'bot');
    };

    roleStaff.onclick = () => {
      currentRole = 'staff';
      roleStaff.classList.add('active');
      roleCitizen.classList.remove('active');
      updateChips();
      addMessage(getWelcomeMessage(), 'bot');
    };

    function updateChips() {
      chipsBar.innerHTML = '';
      let chips = [];

      if (currentRole === 'staff') {
        chips = [
          { label: "📋 Pending cases", text: "Show pending cases" },
          { label: "✅ Solved cases", text: "Show solved cases" },
          { label: "📊 Past month report", text: "Show report for the past month" },
          { label: "⏱️ SLA Breaches", text: "Check SLA status" }
        ];
      } else {
        if (currentPath === '/citizen/report') {
          chips = [{ label: '📝 Explain my report', text: 'Explain my current report details' }];
        }
        if (currentLang === 'ta') {
          chips = currentPath === '/citizen/report' ? chips : [
            { label: "📋 நிலுவை புகார்கள்", text: "நிலுவை புகார்களை காட்டு" },
            { label: "✅ தீர்க்கப்பட்டவை", text: "தீர்க்கப்பட்ட புகார்களை காட்டு" },
            { label: "📊 கடந்த மாத அறிக்கை", text: "கடந்த மாத புகார் அறிக்கை" },
            { label: "⏱️ தீர்வு கால அளவு", text: "பழுது நீக்க எவ்வளவு நேரம் ஆகும்?" },
            { label: "📞 உதவி எண்கள்", text: "அவசர உதவி எண்கள் என்ன?" }
          ];
        } else if (currentLang === 'tanglish') {
          chips = currentPath === '/citizen/report' ? chips : [
            { label: "📋 Pending cases", text: "Show pending cases" },
            { label: "✅ Solved cases", text: "Show solved cases" },
            { label: "📊 Past month report", text: "Show report for the past month" },
            { label: "⏱️ SLA Timings", text: "How long will pothole fix take?" },
            { label: "📞 Helplines", text: "GCC emergency contact numbers" }
          ];
        } else if (currentLang === 'hi') {
          chips = currentPath === '/citizen/report' ? chips : [
            { label: "📋 लंबित मामले", text: "लंबित शिकायतें दिखाएं" },
            { label: "✅ हल हुए मामले", text: "हल हुई शिकायतें दिखाएं" },
            { label: "📊 पिछले महीने की रिपोर्ट", text: "पिछले महीने की शिकायत रिपोर्ट" },
            { label: "⏱️ समाधान समय", text: "कचरा उठाने में कितना समय लगेगा?" },
            { label: "📞 हेल्पलाइन", text: "आपातकालीन नंबर" }
          ];
        } else {
          chips = currentPath === '/citizen/report' ? chips : [
            { label: "📋 Pending cases", text: "Show pending cases" },
            { label: "✅ Solved cases", text: "Show solved cases" },
            { label: "📊 Past month report", text: "Show report for the past month" },
            { label: "⏱️ Resolution SLAs", text: "What are the GCC resolution SLAs?" },
            { label: "📞 Helplines", text: "Emergency contacts" }
          ];
        }
      }

      chips.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'thozhan-chip';
        btn.textContent = c.label;
        btn.onclick = () => handleSend(c.text);
        chipsBar.appendChild(btn);
      });
    }

    function explainCurrentReport() {
      if (!reportContext) return 'Open the report form and enter some details first; I can then explain the information you have entered.'
      const details = [
        reportContext.category && `Issue type: ${reportContext.category}`,
        reportContext.title && `Title: ${reportContext.title}`,
        reportContext.description && `Description: ${reportContext.description}`,
        reportContext.severity && `Severity: ${reportContext.severity}`,
        reportContext.department && `Suggested department: ${reportContext.department}`,
        reportContext.priority !== null && reportContext.priority !== undefined && `Estimated priority score: ${reportContext.priority}`,
        reportContext.address && `Location: ${reportContext.address}`,
        reportContext.affected_count > 0 && `People affected: ${reportContext.affected_count}`,
        reportContext.safety_risk && 'Immediate safety risk: marked',
      ].filter(Boolean)
      if (!details.length) return 'No report information has been entered yet. Choose an issue type, add a title or description, and I can explain those details.'
      const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      })[character])
      return `Here is what you have entered so far:<br>${details.map((detail) => `• ${escapeHtml(detail)}`).join('<br>')}<br><br>Tell me which field you want help understanding or improving.`
    }

    function addMessage(text, sender = 'bot', customHtml = null, playAudio = false) {
      const msg = document.createElement('div');
      msg.className = `thozhan-msg ${sender}`;

      if (customHtml) {
        msg.innerHTML = customHtml;
      } else {
        msg.innerHTML = (text || '').replace(/\n/g, '<br/>');
      }

      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;

      if (sender === 'bot' && (playAudio || voiceEnabled) && text) {
        speakTamilOrEnglish(text);
      }
    }

    function renderReportCard(r) {
      const status = String(r.status || 'Unknown');
      const statusClass = status.toLowerCase().includes('progress') ? 'status-in-progress' :
                          (['resolution_submitted', 'verified', 'closed'].includes(status) ? 'status-resolved' : 'status-pending');
      const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      })[character]);

      return `
        <div class="thozhan-report-card">
          <div class="thozhan-report-header">
            <strong>${escapeHtml(r.reference || r.id)} • ${escapeHtml(r.title || r.category)}</strong>
            <span class="thozhan-status-pill ${statusClass}">${escapeHtml(status.replace(/_/g, ' '))}</span>
          </div>
          <div>📍 <strong>Category:</strong> ${escapeHtml(r.category)}</div>
          <div>⚠️ <strong>Severity:</strong> ${escapeHtml(r.severity)} · <strong>Priority:</strong> ${escapeHtml(r.priority_score ?? r.priority ?? 'N/A')}</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">
            🗓️ Reported: ${escapeHtml(r.created_at || r.filedDate || 'Date unavailable')}
          </div>
        </div>
      `;
    }

    async function showComplaintResults({ status, dateFrom, dateTo, query, title, emptyMessage }) {
      const params = new URLSearchParams({ limit: '2000' });
      if (status) params.set('status', status);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (query) params.set('q', query);
      addMessage('Checking the latest reports…', 'bot');
      try {
        const response = await fetch(`/api/complaints/map?${params.toString()}`, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        const data = await response.json();
        const reports = Array.isArray(data.points) ? data.points : [];
        if (!reports.length) {
          addMessage(emptyMessage, 'bot');
          return;
        }
        const safeTitle = String(title).replace(/[&<>"']/g, (character) => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[character]);
        const html = `<strong>${safeTitle} (${reports.length})</strong><div style="margin-top:6px;">${reports.map(renderReportCard).join('')}</div>`;
        addMessage(`${title}. ${reports.length} cases found.`, 'bot', html, true);
      } catch (error) {
        console.error('[Thozhan] Could not load complaint results:', error);
        addMessage('I could not load the latest reports. Please try again in a moment.', 'bot');
      }
    }

    function handleSend(userText) {
      const txt = (userText || input.value || '').trim();
      if (!txt) return;

      addMessage(txt, 'user');
      input.value = '';

      // Processing AI response
      setTimeout(async () => {
        const lower = txt.toLowerCase();

        if (currentPath === '/citizen/report' &&
            (/current report|this report|my report|what (?:did i|have i) entered|explain.*(?:report|details|input)|(?:report|input|form) details/.test(lower))) {
          addMessage(explainCurrentReport(), 'bot', null, true);
          return;
        }

        const ticketMatch = txt.match(/\b(?:[a-z]{2,6}[- ]?)?\d{5,}\b/i);
        if (ticketMatch && /\b(?:status|ticket|report|complaint)\b/i.test(lower)) {
          await showComplaintResults({
            query: ticketMatch[0].replace(/[- ]/g, ''),
            title: `Report matching ${ticketMatch[0]}`,
            emptyMessage: `I could not find a report matching ${ticketMatch[0]}. Check the ticket number and try again.`,
          });
          return;
        }

        if (/\bpending\b|நிலுவை/i.test(lower)) {
          await showComplaintResults({
            status: 'submitted,reviewed,assigned,in_progress,reopened',
            title: 'Pending cases',
            emptyMessage: 'There are no pending cases right now.',
          });
          return;
        }

        if (/\b(?:solved|resolved|closed|completed)\b|தீர்க்கப்பட்ட/i.test(lower)) {
          await showComplaintResults({
            status: 'resolution_submitted,verified,closed',
            title: 'Solved cases',
            emptyMessage: 'There are no solved cases to show right now.',
          });
          return;
        }

        if (/\breports?\b|\bcomplaints?\b|புகார்/i.test(lower)) {
          const today = new Date();
          const oneMonthAgo = new Date(today);
          const dayOfMonth = oneMonthAgo.getDate();
          oneMonthAgo.setDate(1);
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const lastDayOfPreviousMonth = new Date(
            oneMonthAgo.getFullYear(),
            oneMonthAgo.getMonth() + 1,
            0
          ).getDate();
          oneMonthAgo.setDate(Math.min(dayOfMonth, lastDayOfPreviousMonth));
          const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          await showComplaintResults({
            dateFrom: formatDate(oneMonthAgo),
            dateTo: formatDate(today),
            title: 'Reports from the past month',
            emptyMessage: 'No reports were submitted in the past month.',
          });
          return;
        }

        // 2. FAQ Queries
        if (lower.includes("sla") || lower.includes("time") || lower.includes("நேரம்") || lower.includes("காலக்கெடு") || lower.includes("kitna time")) {
          addMessage(getLocalizedText('sla'), 'bot', null, true);
          return;
        }

        if (lower.includes("track") || lower.includes("status") || lower.includes("கண்காணி") || lower.includes("நிலை")) {
          addMessage(getLocalizedText('track'), 'bot', null, true);
          return;
        }

        if (lower.includes("helpline") || lower.includes("phone") || lower.includes("number") || lower.includes("எண்") || lower.includes("call")) {
          addMessage(getLocalizedText('helpline'), 'bot', null, true);
          return;
        }

        // 3. New Complaint Triage & Municipal Call Alert Dispatcher
        const isCivicComplaint = [
          "wire", "spark", "current", "shock", "manhole", "waterlog", "water log", "flood", "vellam",
          "pothole", "kuzhi", "pallam", "garbage", "kuppai", "trash", "waste", "sewage", "saakkadai",
          "drain", "street light", "light", "eriyala", "water supply", "thanni", "pipe leak", "naai", "dog"
        ].some(kw => lower.includes(kw));

        if (isCivicComplaint) {
          // Detect zone & landmark
          let detectedZone = null;
          let detectedLandmark = "";
          for (const [zid, zdata] of Object.entries(CHENNAI_ZONES)) {
            for (const lm of zdata.lms) {
              if (lower.includes(lm)) {
                detectedZone = zid;
                detectedLandmark = lm.charAt(0).toUpperCase() + lm.slice(1);
                break;
              }
            }
            if (detectedZone) break;
          }

          const isCritical = lower.includes("wire") || lower.includes("spark") || lower.includes("shock") ||
                             lower.includes("manhole") || lower.includes("flood") || lower.includes("danger") ||
                             lower.includes("urgent") || lower.includes("emergency") || lower.includes("accident");

          const isHigh = isCritical || lower.includes("waterlog") || lower.includes("sewage") || lower.includes("overflow") || lower.includes("vellam");

          let category = "General Civic Grievance";
          let dept = "Greater Chennai Corporation (GCC) - Roads & Works";
          let hotline = "1913";

          if (lower.includes("wire") || lower.includes("spark") || lower.includes("current")) {
            category = "Live Wire / Electrical Hazard";
            dept = "TANGEDCO - Tamil Nadu Electricity Board";
            hotline = "1912";
          } else if (lower.includes("manhole") || lower.includes("waterlog") || lower.includes("flood") || lower.includes("vellam")) {
            category = lower.includes("manhole") ? "Open Manhole Hazard" : "Waterlogging / Storm Water Drain";
            dept = "Greater Chennai Corporation (GCC) - Storm Water Drains";
          } else if (lower.includes("sewage") || lower.includes("saakkadai")) {
            category = "Sewage Overflow";
            dept = "Chennai MetroWater (CMWSSB) - Underground Sewerage";
            hotline = "044-4567 4567";
          } else if (lower.includes("kuppai") || lower.includes("garbage")) {
            category = "Garbage Overflow";
            dept = "Greater Chennai Corporation (GCC) - Solid Waste Management";
          } else if (lower.includes("pothole") || lower.includes("kuzhi")) {
            category = "Pothole / Road Repair";
            dept = "Greater Chennai Corporation (GCC) - Roads & Works";
          }

          const priorityStr = isCritical ? "CRITICAL (P0)" : (isHigh ? "HIGH (P1)" : "MEDIUM (P2)");
          const zoneStr = detectedZone ? `Zone ${detectedZone} (${detectedLandmark})` : "Chennai Corporation Zone";
          const refTicket = "GCC-CHN-" + Math.floor(100000 + Math.random() * 900000);

          if (isHigh) {
            // TRIGGER OUTBOUND EMERGENCY CALL TO MUNICIPALITY!
            const alertSpeech = (currentLang === 'ta')
              ? `அவசர எச்சரிக்கை! இந்த புகார் முன்னுரிமை உயர்வாக (P0/P1) இருப்பதால், சென்னை மாநகராட்சி கட்டுப்பாட்டு அறை எண் 1913-க்கு அவசர தொலைபேசி அழைப்பு இணைக்கப்பட்டுள்ளது.`
              : `High Priority Alert! Because of high hazard priority, an automated emergency outbound call has been dispatched to Greater Chennai Corporation (GCC 1913).`;

            const callCardHtml = `
              <div style="background:#fff1f2; border:1.5px solid #f43f5e; border-radius:12px; padding:12px 14px; margin-top:8px; font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <strong style="color:#9f1239; font-size:13px; display:flex; align-items:center; gap:5px;">
                    <span>🚨</span> Municipal Emergency Call Dispatched!
                  </strong>
                  <span style="background:#e11d48; color:#fff; font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px;">${priorityStr}</span>
                </div>
                <div style="font-size:12px; color:#334155; line-height:1.5; margin-bottom:8px;">
                  🏢 <strong>Target Agency:</strong> ${dept}<br>
                  📞 <strong>Dispatched Line:</strong> ${hotline} (GCC 24/7 Control Desk)<br>
                  📍 <strong>Location:</strong> ${zoneStr}<br>
                  🎫 <strong>Ticket Ref:</strong> ${refTicket}<br>
                  <span style="color:#059669; font-weight:700;">● Status: Call Connected • Incident Details Transmitted to Control Room</span>
                </div>
                <div style="font-size:11.5px; font-style:italic; background:#fff; padding:6px 10px; border-radius:6px; border:1px solid #fecdd3; margin-bottom:10px; color:#475569;">
                  "Attention Municipal Control Desk: ${priorityStr} civic hazard reported for ${category} at ${zoneStr}. Immediate emergency dispatch requested."
                </div>
                <div style="display:flex; gap:8px;">
                  <a href="tel:${hotline.replace(/[^0-9]/g,'')}" style="flex:1; background:#e11d48; color:#fff; text-align:center; padding:7px 10px; border-radius:6px; text-decoration:none; font-size:11.5px; font-weight:700;">
                    📞 Direct Call ${hotline}
                  </a>
                  <button type="button" onclick="window.Thozhan.autoFill('${category}', '${detectedZone || 13}', '${detectedLandmark || 'Velachery'}', '${priorityStr}', '${dept}')" style="background:#0284c7; color:#fff; border:none; padding:7px 10px; border-radius:6px; font-size:11.5px; font-weight:600; cursor:pointer;">
                    ⚡ Auto-Fill Form
                  </button>
                </div>
              </div>
            `;

            addMessage(alertSpeech, 'bot', callCardHtml, true);
            return;
          } else {
            // Normal priority
            const normalSpeech = `I triaged your grievance as ${category} under ${dept} (${priorityStr}). Target SLA: 48 hours.`;
            const normalCard = `
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; margin-top:6px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <strong>${category}</strong>
                  <span style="background:#e2e8f0; font-size:10.5px; font-weight:600; padding:2px 6px; border-radius:8px;">${priorityStr}</span>
                </div>
                <div style="font-size:12px; color:#475569;">📍 ${zoneStr} • SLA: 48 hrs</div>
                <button type="button" onclick="window.Thozhan.autoFill('${category}', '${detectedZone || 8}', '${detectedLandmark || 'Anna Nagar'}', '${priorityStr}', '${dept}')" style="margin-top:8px; width:100%; background:#0f3d6c; color:#fff; border:none; padding:6px; border-radius:6px; font-size:11.5px; font-weight:600; cursor:pointer;">
                  ⚡ Auto-Fill Portal Form
                </button>
              </div>
            `;
            addMessage(normalSpeech, 'bot', normalCard, true);
            return;
          }
        }

        // 4. Default fallback
        const responseText = (currentLang === 'ta')
          ? `உங்கள் தகவலைப் பெற்றேன். இந்த புகாரை மாநகராட்சி குறைதீர்க்கும் படிவத்தில் பதிவு செய்ய வேண்டுமா? "Yes" அல்லது புகார் விவரங்களை முழுமையாக கூறுங்கள்.`
          : `I have noted the details. Would you like me to dispatch this official ticket to the Chennai Corporation portal?`;

        addMessage(responseText, 'bot', null, true);
      }, 350);
    }

    sendBtn.onclick = () => handleSend();
    input.onkeydown = (e) => { if (e.key === 'Enter') handleSend(); };

    // Initial greeting
    updateChips();
    addMessage(getWelcomeMessage(), 'bot');

    // Global public API for widget controls and report-form helpers.
    window.Thozhan = {
      open: () => panel.classList.add('active'),
      close: () => panel.classList.remove('active'),
      setRole: (role) => {
        if (role === 'staff' || role === 'citizen') {
          currentRole = role;
          if (role === 'staff') roleStaff.click(); else roleCitizen.click();
        }
      },
      autoFill: (category, zoneId, landmark, priority, dept) => {
        try {
          const setVal = (sel, val) => {
            const el = document.querySelector(sel);
            if (el && val) { 
              el.value = val; 
              el.dispatchEvent(new Event('change')); 
            }
          };
          setVal('#category', category);
          setVal('#zone', zoneId);
          setVal('#landmark', landmark);
          setVal('#priority', priority);
          setVal('#department', dept);
          setVal('#complaint-title', `${category} issue near ${landmark}`);
          panel.classList.remove('active');
          const submitBtn = document.getElementById('portal-submit-btn');
          if (submitBtn) submitBtn.scrollIntoView({ behavior: 'smooth' });
        } catch(e) {
          console.error("[Thozhan AutoFill Error]:", e);
        }
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThozhan);
  } else {
    initThozhan();
  }
})();
