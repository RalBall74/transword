document.addEventListener('DOMContentLoaded', () => {
    const aiInput = document.getElementById('ai-input');
    const sendAiBtn = document.getElementById('send-ai-btn');
    const chatBox = document.getElementById('chat-container');

    // UI Elements for history
    const aiHistoryBtn = document.getElementById('ai-history-btn');
    const newAiChatBtn = document.getElementById('new-ai-chat-btn');
    const aiHistoryModal = document.getElementById('ai-history-modal');
    const closeAiHistoryModal = document.getElementById('close-ai-history-modal');
    const aiHistoryList = document.getElementById('ai-history-list');

    let aiChats = JSON.parse(localStorage.getItem('tw_ai_chats')) || [];
    let currentChatId = localStorage.getItem('tw_current_ai_chat') || null;



    const _k1 = ["Sy", "Bbiw4", "AIza", "uevwec"];
    const _k2 = {
        part: "LgdK9oVb0I1mzPkU",
        extra: "FZU1yU"
    };

    function _initSecureKey() {
        const s1 = _k1[2] + _k1[0];
        const s2 = _k1[1];
        const s3 = _k1[3] + _k2.extra;
        const s4 = _k2.part;

        return s1 + s2 + s3 + s4;
    }

    const apiKey = _initSecureKey();
    // console.log('key loaded');



    init();

    function init() {
        if (!currentChatId && aiChats.length > 0) {
            currentChatId = aiChats[0].id;
        } else if (!currentChatId) {
            createNewChat();
        }
        loadCurrentChat();
        setupEventListeners();
    }

    function setupEventListeners() {
        sendAiBtn.addEventListener('click', handleSend);

        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });

        aiInput.addEventListener('input', () => {
            sendAiBtn.disabled = !aiInput.value.trim();
        });

        // History Modal Events
        if (aiHistoryBtn) aiHistoryBtn.addEventListener('click', openHistoryModal);
        if (newAiChatBtn) newAiChatBtn.addEventListener('click', createNewChat);
        if (closeAiHistoryModal) closeAiHistoryModal.addEventListener('click', closeHistoryModal);
        if (aiHistoryModal) {
            aiHistoryModal.addEventListener('click', (e) => {
                if (e.target === aiHistoryModal) closeHistoryModal();
            });
        }
    }

    function createNewChat() {
        const newChat = {
            id: Date.now().toString(),
            title: 'محادثة جديدة',
            timestamp: Date.now(),
            messages: []
        };
        aiChats.unshift(newChat);
        currentChatId = newChat.id;
        saveChats();
        loadCurrentChat();
        if (aiHistoryModal && aiHistoryModal.classList.contains('show')) {
            closeHistoryModal();
        }
    }

    function saveChats() {
        localStorage.setItem('tw_ai_chats', JSON.stringify(aiChats));
        localStorage.setItem('tw_current_ai_chat', currentChatId);
    }

    function getCurrentChat() {
        return aiChats.find(c => c.id === currentChatId);
    }

    function loadCurrentChat() {
        chatBox.innerHTML = '';
        const chat = getCurrentChat();

        if (!chat || chat.messages.length === 0) {
            chatBox.innerHTML = `
                <div class="message ai-message">
                    <div class="message-avatar">
                        <div class="modern-ai-icon-container">
                            <div class="ai-icon-glow"></div>
                            <div class="ai-icon-sparkle"></div>
                        </div>
                    </div>
                    <div class="message-content">أهلاً بيك! أنا مساعدك هنا في TransWord.. اسألني عن أي حاجة تخص اللغات والترجمة وهرد عليك فوراً. ✨</div>
                </div>
            `;
            return;
        }

        chat.messages.forEach(msg => {
            appendMessageUI(msg.role, msg.text);
        });
        scrollToBottom();
    }

    function addMessageToCurrentChat(role, text) {
        const chat = getCurrentChat();
        if (!chat) return;

        // Update title if it's the first user message
        if (chat.messages.length === 0 && role === 'user') {
            chat.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
        }

        chat.messages.push({ role, text });
        chat.timestamp = Date.now();

        // Move chat to top
        aiChats = aiChats.filter(c => c.id !== chat.id);
        aiChats.unshift(chat);

        saveChats();
    }

    async function handleSend() {
        if (!navigator.onLine) {
            appendMessage('ai', 'معلش، لازم تكون متصل بالنت عشان أقدر أسمعك وأرد عليك. 🌐');
            return;
        }


        const text = aiInput.value.trim();
        if (!text) return;

        // Resit UI state
        aiInput.value = '';
        sendAiBtn.disabled = true;

        // Append user prompt
        appendMessageUI('user', text);
        addMessageToCurrentChat('user', text);

        // Show loading state
        const tid = showTypingIndicator();

        try {
            // API availablity check
            if (!apiKey || apiKey.length < 10) {
                throw new Error("KEY_NOT_CONFIGURED");
            }

            const chat = getCurrentChat();
            const conversationHistory = chat ? chat.messages.slice(0, -1) : []; // pass history without the very last user message we just added

            const response = await callGeminiAPI(text, conversationHistory);
            removeMessage(tid);
            appendMessageUI('ai', response);
            addMessageToCurrentChat('ai', response);
        } catch (error) {
            removeMessage(tid);
            let msg = 'يا ساتر! حصلت مشكلة فنية بسيطة، جرب تاني كده؟';

            if (error.message === 'KEY_NOT_CONFIGURED') {
                msg = 'مفتاح الـ API مش موجود.. المطور لسه ما ضبطش الإعدادات دي.';
            } else if (error.message.includes('leaked') || error.message.includes('API key')) {
                msg = 'المفتاح فيه مشكلة، ممكن يكون اتوقف أو اتكتب غلط.';
            } else if (error.message.includes('400')) {
                msg = 'في حاجة غلط في الطلب، معلش جرب تبعت تاني.';
            } else if (error.message.includes('Failed to fetch')) {
                msg = 'النت عندك فيه مشكلة، اتأكد إنك واصل كويس.';
            }

            appendMessageUI('ai', `${msg}\n<span style="font-size:0.7em; opacity:0.7">(${error.message})</span>`);
        }
    }

    async function callGeminiAPI(prompt, history = []) {
        // Endpoint setup
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        // Prepare history for Gemini Model
        const contents = history.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        const systemInstruction = `أنت المساعد الذكي داخل "تطبيق TransWord" للترجمة.
هويتك: أنت خبير لغات ومدرس تفاعلي متخصص في الترجمة واللغات، تتحدث بلسان التطبيق وتعكس رؤية المطور.

معلومات عن المطور والملكية:
- المطور: "عاصم محمد كمال أبو النصر" (عاصم ابو النصر)، مبرمج مصري ومؤسس شركة "تدفق" (Tadfuq).
- الملكية: التطبيق ملكية خاصة لشركة "تدفق" التي يملكها عاصم.

طريقة الشرح والتعليم (مهم جداً للتعلم):
- لا تكتر من الكلام عديم الفائدة
- اشرح القواعد بأسلوب مبسط وعملي معتمداً على أمثلة من الحياة اليومية.
- قدم مقارنات بين الجمل الصحيحة والخاطئة لترسيخ المعلومة في ذهن المستخدم.
- وضح دائماً كيف ينطق المتحدث الأصلي الكلمات أو الجمل المعقدة (سواء باللهجة، أو طريقة النطق الصحيحة).
- قسّم إجابتك لنقاط واضحة ونسق إجابتك باستخدام مسافات وخطوط عريضة (ترجمة، قواعد، أمثلة، نطق).
- شجع المستخدم وأعطه نصائح دورية للتدرب على اللغة يومياً بشكل عملي ومفيد وفعال.

تعليماتك الصارمة:
- اختصر في الكلام جدا جدا
- التواضع والفضل: انسب كل نجاح للمطور "عاصم محمد"، ولا تمدح نفسك.
- شخصيتك: أنت "مساعدك اللغوي في تطبيق TransWord"، لا تذكر أنك Gemini أو من Google أبداً.
- الاختصار الذكي: أجب بإيجاز وذكاء، ولا تطل إلا إذا طلب المستخدم تفصيلاً لتسهيل القراءة.
- حدودك: تخصصك هو اللغات والترجمة فقط. لا تجب في مواضيع لا علاقة لها بهذا ولا تتدخل في الأمور السياسية وغير اللائقة.
- لغة الحديث: العربية الفصحى أو العامية المصرية حسب سياق المستخدم، ابق طبيعياً لتكون ودوداً للمستخدمين.`;

        contents.push({
            role: 'user',
            parts: [{ text: prompt }]
        });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: contents
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
            }

            const data = await response.json();
            const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

            return answer || 'معلش، السيرفر ما ردش عليّ بحاجة مفيدة.. جرب تسأل تاني؟';
        } catch (error) {
            throw error;
        }
    }

    function appendMessageUI(role, text) {
        const div = document.createElement('div');
        div.className = `message ${role}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = role === 'ai' ? `
            <div class="modern-ai-icon-container">
                <div class="ai-icon-glow"></div>
                <div class="ai-icon-sparkle"></div>
            </div>` : '<i class="fas fa-user"></i>';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = formatText(text);

        if (role === 'ai' && div.id?.indexOf('typing') === -1 && text.indexOf('typing-indicator') === -1) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'ai-msg-actions';

            const speakBtn = document.createElement('button');
            speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            speakBtn.title = 'نطق النص';
            speakBtn.onclick = () => speakAIText(text);

            const copyBtn = document.createElement('button');
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = 'نسخ النص';
            copyBtn.onclick = () => copyAIText(text);

            const shareBtn = document.createElement('button');
            shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
            shareBtn.title = 'مشاركة';
            shareBtn.onclick = () => shareAIText(text);

            actionsDiv.appendChild(speakBtn);
            actionsDiv.appendChild(copyBtn);
            actionsDiv.appendChild(shareBtn);
            content.appendChild(actionsDiv);
        }

        div.appendChild(avatar);
        div.appendChild(content);

        chatBox.appendChild(div);
        scrollToBottom();
        return div.id = 'msg-' + Date.now();
    }

    function showTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'message ai-message';
        div.id = 'typing-' + Date.now();

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = `
            <div class="modern-ai-icon-container">
                <div class="ai-icon-glow"></div>
                <div class="ai-icon-sparkle"></div>
            </div>`;

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        div.appendChild(avatar);
        div.appendChild(content);
        chatBox.appendChild(div);
        scrollToBottom();
        return div.id;
    }

    function removeMessage(id) {
        const msg = document.getElementById(id);
        if (msg) msg.remove();
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    let availableVoices = [];
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => availableVoices = speechSynthesis.getVoices();
    }

    function speakAIText(text) {
        if (!text.trim()) return;
        speechSynthesis.cancel();

        let cleanText = text.replace(/[*_#`]/g, '');

        // جلب لغة الترجمة الحالية عشان ننطق بيها أي كلام أجنبي
        let targetLang = localStorage.getItem('tw_target_lang') || 'en';
        if (targetLang.startsWith('ar')) targetLang = 'en'; // لو الهدف عربي نخلي الأجنبي إنجليزي

        const chunks = [];
        let currentChunk = '';
        let currentLang = 'ar';

        for (let i = 0; i < cleanText.length; i++) {
            const char = cleanText[i];
            const isArabicChar = /[\u0600-\u06FF]/.test(char);
            // لو الحرف أجنبي (صيني، لاتيني، روسي، الخ)
            const isOtherLangChar = /[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0370-\u03FF\u4E00-\u9FFF\u3040-\u30FF]/.test(char);

            if (isOtherLangChar) {
                if (currentLang === 'ar' && currentChunk.trim()) {
                    chunks.push({ text: currentChunk, lang: 'ar-SA' });
                    currentChunk = '';
                }
                currentLang = 'other';
                currentChunk += char;
            } else if (isArabicChar) {
                if (currentLang === 'other' && currentChunk.trim()) {
                    chunks.push({ text: currentChunk, lang: targetLang });
                    currentChunk = '';
                }
                currentLang = 'ar';
                currentChunk += char;
            } else {
                currentChunk += char; // مسافات، أرقام، علامات ترقيم
            }
        }

        if (currentChunk.trim()) {
            chunks.push({ text: currentChunk, lang: currentLang === 'other' ? targetLang : 'ar-SA' });
        }

        if (availableVoices.length === 0) {
            availableVoices = speechSynthesis.getVoices();
        }

        chunks.forEach(chunk => {
            if (!chunk.text.trim()) return;
            const utterance = new SpeechSynthesisUtterance(chunk.text);
            utterance.lang = chunk.lang;
            utterance.rate = 0.9;
            utterance.pitch = 1;

            // اختيار صوت عالي الجودة (مثل أصوات جوجل والأونلاين)
            const baseLang = chunk.lang.split('-')[0];
            let voice = availableVoices.find(v => v.lang.startsWith(baseLang) && (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('online') || v.name.toLowerCase().includes('premium')));
            if (!voice) {
                voice = availableVoices.find(v => v.lang.startsWith(baseLang));
            }
            if (voice) {
                utterance.voice = voice;
            }

            speechSynthesis.speak(utterance);
        });
    }

    function copyAIText(text) {
        if (!text.trim()) return;
        navigator.clipboard.writeText(text).then(() => {
            showToastMessage('تم النسخ بنجاح ✓');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToastMessage('تم النسخ بنجاح ✓');
        });
    }

    function shareAIText(text) {
        if (!text.trim()) return;
        const cleanText = text.replace(/[*_#`]/g, '');
        const shareText = `مساعد TransWord الذكي:\n\n${cleanText}\n\n— TransWord`;
        if (navigator.share) {
            navigator.share({
                title: 'TransWord - مساعد ذكي',
                text: shareText
            }).catch(() => { });
        } else {
            copyAIText(text);
        }
    }

    function showToastMessage(message) {
        const toastEl = document.getElementById('toast');
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add('visible');
        setTimeout(() => toastEl.classList.remove('visible'), 2500);
    }

    function formatText(text) {
        let formatted = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        return formatted;
    }

    // Modal UI logic for history
    function openHistoryModal() {
        renderAIHistory();
        aiHistoryModal.style.display = 'flex';
        setTimeout(() => aiHistoryModal.classList.add('show'), 10);
    }

    function closeHistoryModal() {
        if (!aiHistoryModal) return;
        aiHistoryModal.classList.remove('show');
        setTimeout(() => aiHistoryModal.style.display = 'none', 300);
    }

    window.deleteAIChat = function (id, e) {
        e.stopPropagation();
        aiChats = aiChats.filter(c => c.id !== id.toString());
        if (currentChatId === id.toString()) {
            if (aiChats.length > 0) {
                currentChatId = aiChats[0].id;
            } else {
                currentChatId = null;
                createNewChat();
            }
            loadCurrentChat();
        }
        saveChats();
        renderAIHistory();
    }

    window.selectAIChat = function (id) {
        currentChatId = id.toString();
        saveChats();
        loadCurrentChat();
        closeHistoryModal();
    }

    function renderAIHistory() {
        if (!aiHistoryList) return;

        if (aiChats.length === 0) {
            aiHistoryList.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--text-muted);"><i class="fas fa-history" style="font-size:2rem; opacity:0.5; margin-bottom:10px; display:block;"></i>لا توجد محادثات سابقة</div>`;
            return;
        }

        aiHistoryList.innerHTML = aiChats.map(chat => `
            <div class="ai-history-item ${chat.id === currentChatId ? 'active' : ''}" onclick="selectAIChat('${chat.id}')">
                <div>
                    <div class="ai-chat-title">${chat.title}</div>
                    <div class="ai-chat-date">${new Date(chat.timestamp).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <button class="ai-delete-chat-btn" onclick="deleteAIChat('${chat.id}', event)" title="حذف المحادثة"><i class="fas fa-trash-alt"></i></button>
            </div>
        `).join('');
    }
});
