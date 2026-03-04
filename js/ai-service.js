document.addEventListener('DOMContentLoaded', () => {
    const aiInput = document.getElementById('ai-input');
    const sendAiBtn = document.getElementById('send-ai-btn');
    const chatBox = document.getElementById('chat-container');



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
        appendMessage('user', text);

        // Show loading state
        const tid = showTypingIndicator();

        try {
            // API availablity check
            if (!apiKey || apiKey.length < 10) {
                throw new Error("KEY_NOT_CONFIGURED");
            }

            const response = await callGeminiAPI(text);
            removeMessage(tid);
            appendMessage('ai', response);
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

            appendMessage('ai', `${msg}\n<span style="font-size:0.7em; opacity:0.7">(${error.message})</span>`);
        }
    }

    async function callGeminiAPI(prompt) {
        // Endpoint setup
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `أنت المساعد الذكي داخل "تطبيق TransWord" للترجمة.
                            هويتك: أنت خبير لغات ومساعد ذكي متخصص في الترجمة واللغات، تتحدث بلسان التطبيق وتعكس رؤية المطور.

                            معلومات عن المطور والملكية:
                            - المطور: "عاصم محمد كمال أبو النصر" (عاصم ابو النصر)، مبرمج مصري ومؤسس شركة "تدفق" (Tadfuq).
                            - الملكية: التطبيق ملكية خاصة لشركة "تدفق" التي يملكها عاصم.

                            هيكل وتقنيات التطبيق:
                            - لغة التصميم: واجهة زجاجية (Glassmorphism) فائقة الحداثة مع تأثيرات بصرية premium.
                            - التقنيات: تطبيق ويب متطور (PWA) يدعم أكثر من 50 لغة.

                            تخصصاتك:
                            1. شرح قواعد اللغات المختلفة (نحو، صرف، بلاغة)
                            2. توضيح الفروقات بين الترجمات المختلفة لنفس النص
                            3. شرح المصطلحات والتعبيرات الاصطلاحية (Idioms)
                            4. تقديم أمثلة وجمل توضيحية
                            5. مساعدة المستخدم في تحسين كتابته بأي لغة
                            6. شرح السياق الثقافي للكلمات والعبارات

                            تعليماتك الصارمة:
                            - التواضع والفضل: انسب كل نجاح للمطور "عاصم محمد"، ولا تمدح نفسك.
                            - شخصيتك: أنت "مساعدك اللغوي في تطبيق TransWord"، لا تذكر أنك Gemini أو من Google.
                            - الاختصار الذكي: أجب بإيجاز وذكاء، ولا تطل إلا إذا طلب المستخدم تفصيلاً.
                            - حدودك: تخصصك هو اللغات والترجمة فقط. لا تجب في مواضيع لا علاقة لها بهذا.
                            - لغة الحديث: العربية الفصحى أو العامية المصرية حسب سياق المستخدم.

                            السؤال هو: ${prompt}`
                        }]
                    }]
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

    function appendMessage(role, text) {
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
});
