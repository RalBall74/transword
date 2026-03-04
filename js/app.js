document.addEventListener('DOMContentLoaded', () => {
    // العناصر والحاجات اللي في الصفحة
    const sourceTextEl = document.getElementById('source-text');
    const resultTextEl = document.getElementById('result-text');
    const resultCard = document.getElementById('result-card');
    const translateBtn = document.getElementById('translate-btn');
    const swapBtn = document.getElementById('swap-btn');
    const sourceLangBtn = document.getElementById('source-lang-btn');
    const targetLangBtn = document.getElementById('target-lang-btn');
    const sourceFlagEl = document.getElementById('source-flag');
    const sourceLangNameEl = document.getElementById('source-lang-name');
    const targetFlagEl = document.getElementById('target-flag');
    const targetLangNameEl = document.getElementById('target-lang-name');
    const resultFlagEl = document.getElementById('result-flag');
    const resultLangLabel = document.getElementById('result-lang-label');
    const charCountEl = document.getElementById('char-count');
    const speakSourceBtn = document.getElementById('speak-source-btn');
    const copySourceBtn = document.getElementById('copy-source-btn');
    const clearSourceBtn = document.getElementById('clear-source-btn');
    const speakResultBtn = document.getElementById('speak-result-btn');
    const copyResultBtn = document.getElementById('copy-result-btn');
    const favResultBtn = document.getElementById('fav-result-btn');
    const shareResultBtn = document.getElementById('share-result-btn');
    const themeSwitch = document.getElementById('theme-switch');
    const offlineBanner = document.getElementById('offline-banner');
    const navItems = document.querySelectorAll('.nav-item');
    const historyList = document.getElementById('history-list');
    const historyTabBtns = document.querySelectorAll('.history-tab-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyActionsBar = document.getElementById('history-actions-bar');
    const aboutDevBtn = document.getElementById('about-dev-btn');
    const aboutView = document.getElementById('about-view');
    const aboutBack = document.getElementById('about-back');
    const appInfoBtn = document.getElementById('app-info-btn');
    const appInfoView = document.getElementById('app-info-view');
    const appInfoBack = document.getElementById('app-info-back');
    const langModal = document.getElementById('lang-modal');
    const langModalTitle = document.getElementById('lang-modal-title');
    const closeLangModal = document.getElementById('close-lang-modal');
    const langSearch = document.getElementById('lang-search');
    const langListEl = document.getElementById('lang-list');
    const toastEl = document.getElementById('toast');

    // حالة التطبيق والحاجات اللي بتتحفظ
    let sourceLang = languagesData.find(l => l.code === (localStorage.getItem('tw_source_lang') || 'ar'));
    let targetLang = languagesData.find(l => l.code === (localStorage.getItem('tw_target_lang') || 'en'));
    let history = JSON.parse(localStorage.getItem('tw_history')) || [];
    let isTranslating = false;
    let currentLangModalType = 'source'; // 'source' أو 'target'
    let currentHistoryFilter = 'all';
    let lastTranslation = null; // آخر ترجمة عشان المفضلة والمشاركة
    let toastTimeout = null;
    const MAX_CHARS = 500;

    // تشغيل الـ App أول ما يفتح
    init();

    function init() {
        // console.log('Starting TransWord...');
        updateLanguageUI();
        setupEventListeners();
        applyTheme();
        renderHistory();

        // مراقبة الاتصال بالنت
        updateOnlineStatus();
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
    }

    // ===== ربط كل الأحداث =====
    function setupEventListeners() {
        // زر الترجمة
        translateBtn.addEventListener('click', handleTranslate);

        // الـ Enter في الـ textarea يترجم
        sourceTextEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTranslate();
            }
        });

        // عداد الحروف
        sourceTextEl.addEventListener('input', () => {
            updateCharCount();
        });

        // تبديل اللغات
        swapBtn.addEventListener('click', swapLanguages);

        // فتح مودال اللغات
        sourceLangBtn.addEventListener('click', () => openLanguageModal('source'));
        targetLangBtn.addEventListener('click', () => openLanguageModal('target'));

        // إغلاق مودال اللغات
        closeLangModal.addEventListener('click', closeLanguageModal);
        langModal.addEventListener('click', (e) => {
            if (e.target === langModal) closeLanguageModal();
        });

        // بحث في اللغات
        langSearch.addEventListener('input', (e) => {
            renderLanguageList(e.target.value.trim());
        });

        // أزرار النص المصدر
        speakSourceBtn.addEventListener('click', () => speakText(sourceTextEl.value, sourceLang.code));
        copySourceBtn.addEventListener('click', () => copyToClipboard(sourceTextEl.value));
        clearSourceBtn.addEventListener('click', () => {
            sourceTextEl.value = '';
            updateCharCount();
            resultCard.classList.remove('visible');
            lastTranslation = null;
        });

        // أزرار النتيجة
        speakResultBtn.addEventListener('click', () => speakText(resultTextEl.textContent, targetLang.code));
        copyResultBtn.addEventListener('click', () => copyToClipboard(resultTextEl.textContent));
        favResultBtn.addEventListener('click', handleFavResult);
        shareResultBtn.addEventListener('click', handleShareResult);

        // تبديل الثيم
        themeSwitch.addEventListener('change', () => {
            const isDark = themeSwitch.checked;
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            document.body.className = isDark ? 'dark-mode' : 'light-mode';
            updateMetaThemeColor(isDark);
        });

        // أزرار التنقل
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const target = item.dataset.target;
                handleNavigation(target);
            });
        });

        // تابات التاريخ
        historyTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                historyTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentHistoryFilter = btn.dataset.filter;
                renderHistory();
            });
        });

        // مسح التاريخ
        clearHistoryBtn.addEventListener('click', clearHistory);

        // عن المطور
        aboutDevBtn.addEventListener('click', () => showSubview('about-view'));
        aboutBack.addEventListener('click', () => hideSubview('about-view'));

        // عن التطبيق
        appInfoBtn.addEventListener('click', () => showSubview('app-info-view'));
        appInfoBack.addEventListener('click', () => hideSubview('app-info-view'));
    }

    // ===== الترجمة الفعلية =====
    async function handleTranslate() {
        const text = sourceTextEl.value.trim();
        if (!text || isTranslating) return;

        if (!navigator.onLine) {
            showToast('معلش، لازم تكون واصل بالنت عشان أترجم لك.');
            return;
        }

        if (text.length > MAX_CHARS) {
            showToast(`كفاية كده! المسموح ${MAX_CHARS} حرف بس.`);
            return;
        }

        isTranslating = true;
        translateBtn.classList.add('loading');
        translateBtn.disabled = true;
        resultCard.classList.remove('visible');

        try {
            const translated = await translateText(text, sourceLang.code, targetLang.code);

            // أظهر النتيجة
            resultTextEl.textContent = translated;
            resultFlagEl.textContent = targetLang.flag;
            resultLangLabel.textContent = targetLang.nameAr;
            resultCard.classList.add('visible');

            // حفظ الترجمة في التاريخ
            lastTranslation = {
                id: Date.now(),
                source: text,
                target: translated,
                sourceLangCode: sourceLang.code,
                targetLangCode: targetLang.code,
                sourceLangName: sourceLang.nameAr,
                targetLangName: targetLang.nameAr,
                sourceFlag: sourceLang.flag,
                targetFlag: targetLang.flag,
                timestamp: Date.now(),
                isFav: false
            };

            saveTranslation(lastTranslation);
            updateFavBtnUI();

        } catch (error) {
            console.error('Translation error:', error);
            showToast('حصلت مشكلة في الترجمة.. جرب تضغط تاني كده؟');
        } finally {
            isTranslating = false;
            translateBtn.classList.remove('loading');
            translateBtn.disabled = false;
        }
    }

    async function translateText(text, from, to) {
        // استخدام MyMemory API - مجاني وبدون key
        const encodedText = encodeURIComponent(text);
        const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${from}|${to}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData) {
            return data.responseData.translatedText;
        } else {
            throw new Error(data.responseDetails || 'Translation failed');
        }
    }

    // ===== حفظ الترجمة في التاريخ =====
    function saveTranslation(data) {
        // نشيل لو نفس الترجمة موجودة قبل كده
        history = history.filter(h =>
            !(h.source === data.source && h.sourceLangCode === data.sourceLangCode && h.targetLangCode === data.targetLangCode)
        );

        // نحطها في الأول
        history.unshift(data);

        // نحافظ على آخر 100 ترجمة بس عشان مانكبرش الـ localStorage
        if (history.length > 100) history = history.slice(0, 100);

        localStorage.setItem('tw_history', JSON.stringify(history));
    }

    // ===== عرض التاريخ =====
    function renderHistory() {
        let filteredHistory = history;
        if (currentHistoryFilter === 'favorites') {
            filteredHistory = history.filter(h => h.isFav);
        }

        // اخفي زر المسح لو مفيش حاجة
        if (historyActionsBar) {
            historyActionsBar.style.display = filteredHistory.length > 0 ? 'flex' : 'none';
        }

        if (filteredHistory.length === 0) {
            const emptyMsg = currentHistoryFilter === 'favorites'
                ? '<i class="far fa-heart"></i> لسه ما أضفتش حاجة للمفضلة..'
                : '<i class="fas fa-history"></i> مفيش ترجمات سابقة هنا لسه..';
            historyList.innerHTML = `<div class="no-results">${emptyMsg}</div>`;
            return;
        }

        historyList.innerHTML = filteredHistory.map((item, index) => `
            <div class="history-card" data-id="${item.id}" style="animation-delay: ${index * 0.05}s">
                <div class="history-card-header">
                    <div class="history-lang-pair">
                        <span>${item.sourceFlag} ${item.sourceLangName}</span>
                        <i class="fas fa-arrow-left"></i>
                        <span>${item.targetFlag} ${item.targetLangName}</span>
                    </div>
                    <div class="history-card-actions">
                        <button class="history-fav-btn ${item.isFav ? 'fav-active' : ''}" data-id="${item.id}" title="مفضلة">
                            <i class="${item.isFav ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                        <button class="history-delete-btn" data-id="${item.id}" title="حذف">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <p class="history-source-text">${escapeHtml(item.source)}</p>
                <p class="history-target-text">${escapeHtml(item.target)}</p>
                <span class="history-time">${formatTimeAgo(item.timestamp)}</span>
            </div>
        `).join('');

        // ربط أحداث الكاردات
        document.querySelectorAll('.history-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // متعملش حاجة لو ضغط على زر
                if (e.target.closest('button')) return;

                const id = parseInt(card.dataset.id);
                const item = history.find(h => h.id === id);
                if (item) {
                    // رجعه للترجمة عشان يستخدمه تاني
                    sourceLang = languagesData.find(l => l.code === item.sourceLangCode) || sourceLang;
                    targetLang = languagesData.find(l => l.code === item.targetLangCode) || targetLang;
                    updateLanguageUI();
                    sourceTextEl.value = item.source;
                    updateCharCount();
                    resultTextEl.textContent = item.target;
                    resultFlagEl.textContent = item.targetFlag;
                    resultLangLabel.textContent = item.targetLangName;
                    resultCard.classList.add('visible');
                    lastTranslation = item;
                    updateFavBtnUI();
                    handleNavigation('translate');
                }
            });
        });

        // أزرار المفضلة في التاريخ
        document.querySelectorAll('.history-fav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                toggleHistoryFavorite(id);
            });
        });

        // أزرار الحذف في التاريخ
        document.querySelectorAll('.history-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                deleteHistoryItem(id);
            });
        });
    }

    function toggleHistoryFavorite(id) {
        const item = history.find(h => h.id === id);
        if (item) {
            item.isFav = !item.isFav;
            localStorage.setItem('tw_history', JSON.stringify(history));
            renderHistory();

            // لو نفس الترجمة في كارت النتيجة
            if (lastTranslation && lastTranslation.id === id) {
                lastTranslation.isFav = item.isFav;
                updateFavBtnUI();
            }
        }
    }

    function deleteHistoryItem(id) {
        history = history.filter(h => h.id !== id);
        localStorage.setItem('tw_history', JSON.stringify(history));
        renderHistory();
        showToast('اتمسحت بنجاح 👍');
    }

    function clearHistory() {
        if (history.length === 0) return;
        // تأكيد بسيط
        history = [];
        localStorage.setItem('tw_history', JSON.stringify(history));
        renderHistory();
        showToast('التاريخ اتمسح كله.. صفحة جديدة! ✨');
    }

    // ===== مودال اختيار اللغة =====
    function openLanguageModal(type) {
        currentLangModalType = type;
        langModalTitle.textContent = type === 'source' ? 'لغة المصدر' : 'لغة الترجمة';
        langSearch.value = '';
        renderLanguageList('');

        langModal.style.display = 'flex';
        setTimeout(() => langModal.classList.add('show'), 10);

        // فوكس على البحث
        setTimeout(() => langSearch.focus(), 300);
    }

    function closeLanguageModal() {
        langModal.classList.remove('show');
        setTimeout(() => langModal.style.display = 'none', 300);
    }

    function renderLanguageList(query) {
        let filtered = languagesData;
        if (query) {
            const normalizedQuery = query.toLowerCase();
            filtered = languagesData.filter(l =>
                l.nameAr.includes(query) ||
                l.nameEn.toLowerCase().includes(normalizedQuery) ||
                l.code.toLowerCase().includes(normalizedQuery)
            );
        }

        const selectedCode = currentLangModalType === 'source' ? sourceLang.code : targetLang.code;

        langListEl.innerHTML = filtered.map(lang => `
            <button class="lang-item ${lang.code === selectedCode ? 'selected' : ''}" data-code="${lang.code}">
                <span class="item-flag">${lang.flag}</span>
                <span class="item-name">${lang.nameAr}
                    <span class="item-name-en">${lang.nameEn}</span>
                </span>
                <i class="fas fa-check item-check"></i>
            </button>
        `).join('');

        // ربط الأحداث
        document.querySelectorAll('.lang-item').forEach(item => {
            item.addEventListener('click', () => {
                const code = item.dataset.code;
                const lang = languagesData.find(l => l.code === code);
                if (lang) {
                    selectLanguage(lang, currentLangModalType);
                }
            });
        });
    }

    function selectLanguage(lang, type) {
        if (type === 'source') {
            // لو اختار نفس لغة الهدف، بدلهم
            if (lang.code === targetLang.code) {
                targetLang = sourceLang;
            }
            sourceLang = lang;
            localStorage.setItem('tw_source_lang', lang.code);
        } else {
            // لو اختار نفس لغة المصدر، بدلهم
            if (lang.code === sourceLang.code) {
                sourceLang = targetLang;
            }
            targetLang = lang;
            localStorage.setItem('tw_target_lang', lang.code);
        }

        updateLanguageUI();
        closeLanguageModal();
    }

    function swapLanguages() {
        // أنيميشن الزر
        swapBtn.classList.add('rotating');
        setTimeout(() => swapBtn.classList.remove('rotating'), 400);

        // بدلهم
        const temp = sourceLang;
        sourceLang = targetLang;
        targetLang = temp;

        localStorage.setItem('tw_source_lang', sourceLang.code);
        localStorage.setItem('tw_target_lang', targetLang.code);

        updateLanguageUI();

        // لو فيه نص مكتوب والنتيجة ظاهرة بدلهم كمان
        if (sourceTextEl.value.trim() && resultCard.classList.contains('visible')) {
            const oldSource = sourceTextEl.value;
            sourceTextEl.value = resultTextEl.textContent;
            updateCharCount();
            // ترجم تلقائي بالعكس
            handleTranslate();
        }
    }

    function updateLanguageUI() {
        sourceFlagEl.textContent = sourceLang.flag;
        sourceLangNameEl.textContent = sourceLang.nameAr;
        targetFlagEl.textContent = targetLang.flag;
        targetLangNameEl.textContent = targetLang.nameAr;

        // ظبط اتجاه النص حسب اللغة
        sourceTextEl.dir = sourceLang.dir;
        sourceTextEl.style.textAlign = sourceLang.dir === 'rtl' ? 'right' : 'left';
    }

    // ===== النطق والنسخ والمشاركة =====
    function speakText(text, langCode) {
        if (!text.trim()) {
            showToast('اكتب حاجة الأول عشان أقدر أنطقها.');
            return;
        }

        // وقف أي نطق شغال
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.rate = 0.9;
        utterance.pitch = 1;

        // اختيار صوت جودته عالية بدل أصوات النظام الآلية
        const availableVoices = speechSynthesis.getVoices();
        const baseLang = langCode.split('-')[0];
        let voice = availableVoices.find(v => v.lang.startsWith(baseLang) && (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('online') || v.name.toLowerCase().includes('premium')));
        if (!voice) {
            voice = availableVoices.find(v => v.lang.startsWith(baseLang));
        }
        if (voice) {
            utterance.voice = voice;
        }

        speechSynthesis.speak(utterance);
    }

    function copyToClipboard(text) {
        if (!text.trim()) {
            showToast('مفيش نص للنسخ');
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            showToast('اتنسخت خلاص! ✓');
        }).catch(() => {
            // Fallback للمتصفحات القديمة
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('تم النسخ ✓');
        });
    }

    function handleFavResult() {
        if (!lastTranslation) return;

        lastTranslation.isFav = !lastTranslation.isFav;

        // حدث في التاريخ
        const historyItem = history.find(h => h.id === lastTranslation.id);
        if (historyItem) {
            historyItem.isFav = lastTranslation.isFav;
            localStorage.setItem('tw_history', JSON.stringify(history));
        }

        updateFavBtnUI();
        showToast(lastTranslation.isFav ? 'تمت الإضافة للمفضلة ❤️' : 'تمت الإزالة من المفضلة');
    }

    function updateFavBtnUI() {
        if (!lastTranslation) return;
        const isFav = lastTranslation.isFav;
        favResultBtn.classList.toggle('active', isFav);
        favResultBtn.querySelector('i').className = isFav ? 'fas fa-heart' : 'far fa-heart';
    }

    function handleShareResult() {
        if (!lastTranslation) return;

        const shareText = `${lastTranslation.source}\n\n${lastTranslation.target}\n\n— TransWord`;

        if (navigator.share) {
            navigator.share({
                title: 'TransWord - ترجمة',
                text: shareText
            }).catch(() => { });
        } else {
            copyToClipboard(shareText);
        }
    }

    // ===== التنقل بين الأقسام =====
    function handleNavigation(target) {
        // اخفي كل الأقسام
        const sections = ['translate-section', 'history-section', 'ai-section', 'others-section'];
        const subviews = ['about-view', 'app-info-view'];

        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        subviews.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // أظهر القسم المطلوب
        const sectionMap = {
            'translate': 'translate-section',
            'history': 'history-section',
            'ai': 'ai-section',
            'others': 'others-section'
        };

        const sectionId = sectionMap[target];
        if (sectionId) {
            const el = document.getElementById(sectionId);
            if (el) {
                el.style.display = '';
                // ريفرش الأنيميشن
                el.classList.remove('page-animate');
                void el.offsetWidth; // Force reflow
                el.classList.add('page-animate');
            }
        }

        // حدث التاريخ لو فتحه
        if (target === 'history') {
            renderHistory();
        }

        // حدث الـ nav
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.target === target);
        });
    }

    function showSubview(viewId) {
        // اخفي القسم الأصلي
        document.getElementById('others-section').style.display = 'none';

        const view = document.getElementById(viewId);
        if (view) {
            view.style.display = '';
            view.classList.remove('page-animate');
            void view.offsetWidth;
            view.classList.add('page-animate');
        }
    }

    function hideSubview(viewId) {
        document.getElementById(viewId).style.display = 'none';
        document.getElementById('others-section').style.display = '';
    }

    // ===== أدوات وإعدادات عامة =====
    function applyTheme() {
        const isDark = localStorage.getItem('theme') === 'dark';
        themeSwitch.checked = isDark;
        document.body.className = isDark ? 'dark-mode' : 'light-mode';
        updateMetaThemeColor(isDark);
    }

    function updateMetaThemeColor(isDark) {
        // تحديث لون الـ Status Bar في الموبايلات عشان يبقى لايق ع الثيم
        const themeColor = isDark ? '#0f172a' : '#ffffff';
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', themeColor);
        }
    }

    function updateOnlineStatus() {
        if (!navigator.onLine) {
            offlineBanner.style.display = 'flex';
        } else {
            offlineBanner.style.display = 'none';
        }
    }

    function updateCharCount() {
        const count = sourceTextEl.value.length;
        charCountEl.textContent = `${count} / ${MAX_CHARS}`;

        charCountEl.classList.remove('warn', 'danger');
        if (count > MAX_CHARS) {
            charCountEl.classList.add('danger');
        } else if (count > MAX_CHARS * 0.8) {
            charCountEl.classList.add('warn');
        }
    }

    function showToast(message) {
        if (toastTimeout) clearTimeout(toastTimeout);

        toastEl.textContent = message;
        toastEl.classList.add('visible');

        toastTimeout = setTimeout(() => {
            toastEl.classList.remove('visible');
        }, 2500);
    }

    function formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        if (days < 7) return `منذ ${days} يوم`;
        return new Date(timestamp).toLocaleDateString('ar-EG');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
