
const LANGUAGE_OPTIONS = [
    { code: 'auto', label: 'Detect language' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'it', label: 'Italian' },
    { code: 'pt', label: 'Portuguese' }
];

const LANGUAGE_STORAGE_KEYS = {
    source: 'translator-source-language',
    target: 'translator-target-language'
};

const TRANSLATION_STORAGE_KEYS = {
    text: 'translator-source-text',
    response: 'translator-last-translation'
};

const USAGE_STORAGE_KEYS = {
    date: 'translator-usage-date',
    chars: 'translator-usage-chars'
};

// MyMemory's anonymous (no email/key) free tier allows ~5000 chars/day per IP.
// The quota is tracked server-side per IP, not per browser, so this is only a local estimate.
const MYMEMORY_DAILY_CHAR_LIMIT = 5000;

// MyMemory rejects queries longer than 500 characters per request.
const MYMEMORY_MAX_QUERY_CHARS = 500;

const TRANSLATION_DELAY = 1000;
const COPY_FEEDBACK_DELAY = 1000;

class App {
    /**
     * Initialize DOM references, application timers, and startup state.
     */
    constructor() {
        this.sourceText = document.getElementById('source-text');
        this.sourceLanguage = document.getElementById('source-language');
        this.targetLanguage = document.getElementById('target-language');
        this.swapLanguagesButton = document.getElementById('swap-languages');
        this.clearButton = document.getElementById('clear-button');
        this.copyButton = document.getElementById('copy-button');
        this.result = document.getElementById('result');
        this.statusLabel = document.getElementById('status');
        this.usageBar = document.getElementById('usage-bar');
        this.usageBarFill = document.getElementById('usage-bar-fill');
        this.usagePercentage = document.getElementById('usage-percentage');
        this.charCounter = document.getElementById('char-counter');
        this.translationTimeout = null;
        this.copyResetTimeout = null;

        this.initialize();
    }

    /**
     * Prepare localization, theme, languages, saved data, and events.
     * @returns {void}
     */
    initialize() {
        this.setUpLocalization();
        this.setUpTheme();
        this.setUpLanguage();
        this.sourceText.maxLength = MYMEMORY_MAX_QUERY_CHARS;
        this.restoreLastTranslation();
        this.updateCharCounter();
        this.updateUsageDisplay();
        this.bindEvents();
    }

    /**
     * Connect user interactions to the application workflows.
     * @returns {void}
     */
    bindEvents() {
        this.sourceText.addEventListener('beforeinput', () => this.startTranslationFeedback());
        this.sourceText.addEventListener('input', () => {
            localStorage.setItem(TRANSLATION_STORAGE_KEYS.text, this.sourceText.value);
            this.updateCharCounter();
            this.scheduleTranslation();
        });
        this.sourceLanguage.addEventListener('change', () => {
            this.saveLanguage(this.sourceLanguage, LANGUAGE_STORAGE_KEYS.source);
            this.scheduleTranslation();
        });
        this.targetLanguage.addEventListener('change', () => {
            this.saveLanguage(this.targetLanguage, LANGUAGE_STORAGE_KEYS.target);
            this.scheduleTranslation();
        });
        this.swapLanguagesButton.addEventListener('click', () => this.swapLanguages());
        this.clearButton.addEventListener('click', () => this.clearInput());
        this.copyButton.addEventListener('click', () => this.copyResult());
    }

    /**
     * Resolve a localized message through the browser extension API.
     * @param {string} messageName - Localization message key.
     * @returns {string} The localized message or its key as a fallback.
     */
    getMessage(messageName) {
        const i18n = globalThis.browser?.i18n || globalThis.chrome?.i18n;
        return typeof i18n?.getMessage === 'function'
            ? i18n.getMessage(messageName) || messageName
            : messageName;
    }

    /**
     * Apply localized text, placeholders, and accessible labels in the popup.
     * @returns {void}
     */
    setUpLocalization() {
        document.querySelectorAll('[data-i18n]').forEach((element) => {
            element.textContent = this.getMessage(element.dataset.i18n);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
            element.placeholder = this.getMessage(element.dataset.i18nPlaceholder);
        });

        document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
            element.setAttribute('aria-label', this.getMessage(element.dataset.i18nAriaLabel));
        });
    }

    /**
     * Apply the user's preferred color scheme to the Bootstrap theme.
     * @returns {void}
     */
    setUpTheme() {
        const theme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        document.body.setAttribute('data-bs-theme', theme);
    }

    /**
     * Restore saved languages or select a target based on the browser locale.
     * @returns {void}
     */
    setUpLanguage() {
        const browserLanguage = navigator.language.split('-')[0].toLowerCase();
        const savedTargetCode = this.findLanguage(
            localStorage.getItem(LANGUAGE_STORAGE_KEYS.target) || ''
        );
        const savedSourceCode = this.findLanguage(
            localStorage.getItem(LANGUAGE_STORAGE_KEYS.source) || ''
        );
        const targetCode = savedTargetCode && savedTargetCode !== 'auto'
            ? savedTargetCode
            : this.findLanguage(browserLanguage) || 'en';

        this.setLanguageInput(this.sourceLanguage, savedSourceCode || 'auto');
        this.setLanguageInput(this.targetLanguage, targetCode);
    }

    /**
     * Convert a language code or label into a supported language code.
     * @param {string} value - Language code or visible language label.
     * @returns {string|null} Supported language code, or null when unknown.
     */
    findLanguage(value) {
        const normalizedValue = String(value || '').trim().toLowerCase();
        const option = LANGUAGE_OPTIONS.find((languageOption) =>
            languageOption.code === normalizedValue ||
            languageOption.label.toLowerCase() === normalizedValue
        );
        return option ? option.code : null;
    }

    /**
     * Set a language control to a valid language option.
     * @param {HTMLSelectElement} input - Language select element.
     * @param {string} code - Language code to select.
     * @returns {void}
     */
    setLanguageInput(input, code) {
        const option = LANGUAGE_OPTIONS.find((languageOption) => languageOption.code === code);
        input.value = (option || LANGUAGE_OPTIONS[0]).code;
    }

    /**
     * Normalize and persist a language selection.
     * @param {HTMLSelectElement} input - Language select element.
     * @param {string} storageKey - Local-storage key for the selection.
     * @returns {void}
     */
    saveLanguage(input, storageKey) {
        const code = this.findLanguage(input.value);

        if (code) {
            this.setLanguageInput(input, code);
            localStorage.setItem(storageKey, code);
        }
    }

    /**
     * Exchange source and target languages, then translate with the new pair.
     * @returns {void}
     */
    swapLanguages() {
        const sourceCode = this.sourceLanguage.value;
        const targetCode = this.targetLanguage.value;

        if (sourceCode === 'auto' || targetCode === 'auto') {
            return;
        }

        this.sourceLanguage.value = this.targetLanguage.value;
        this.targetLanguage.value = sourceCode;
        this.saveLanguage(this.sourceLanguage, LANGUAGE_STORAGE_KEYS.source);
        this.saveLanguage(this.targetLanguage, LANGUAGE_STORAGE_KEYS.target);
        this.scheduleTranslation();
    }

    /**
     * Render how many characters were typed against the per-request API limit.
     * @returns {void}
     */
    updateCharCounter() {
        const charCount = this.sourceText.value.length;
        this.charCounter.textContent = `${charCount}/${MYMEMORY_MAX_QUERY_CHARS}`;
        this.charCounter.classList.toggle('text-danger', charCount >= MYMEMORY_MAX_QUERY_CHARS);
        this.charCounter.classList.toggle('text-secondary', charCount < MYMEMORY_MAX_QUERY_CHARS);
    }

    /**
     * Start the visual feedback shown while translation is pending.
     * @returns {void}
     */
    startTranslationFeedback() {
        this.result.classList.add('translation-loading');
    }

    /**
     * Debounce translation so typing does not create a request per keystroke.
     * @returns {void}
     */
    scheduleTranslation() {
        clearTimeout(this.translationTimeout);
        this.startTranslationFeedback();
        this.translationTimeout = setTimeout(() => this.translateText(), TRANSLATION_DELAY);
    }

    /**
     * Clear the source text, cached response, result, and pending translation.
     * @returns {void}
     */
    clearInput() {
        clearTimeout(this.translationTimeout);
        this.sourceText.value = '';
        this.updateCharCounter();
        localStorage.removeItem(TRANSLATION_STORAGE_KEYS.text);
        localStorage.removeItem(TRANSLATION_STORAGE_KEYS.response);
        this.result.textContent = '';
        this.result.classList.remove('translation-loading');
        this.copyButton.disabled = true;
        this.statusLabel.textContent = '';
    }

    /**
     * Restore the last source text and matching cached translation on startup.
     * @returns {void}
     */
    restoreLastTranslation() {
        const savedText = localStorage.getItem(TRANSLATION_STORAGE_KEYS.text);
        const savedResponse = localStorage.getItem(TRANSLATION_STORAGE_KEYS.response);

        if (!savedText) {
            return;
        }

        this.sourceText.value = savedText.slice(0, MYMEMORY_MAX_QUERY_CHARS);

        try {
            const cachedTranslation = JSON.parse(savedResponse);
            const sourceCode = this.findLanguage(this.sourceLanguage.value);
            const targetCode = this.findLanguage(this.targetLanguage.value);

            if (cachedTranslation?.text === savedText &&
                cachedTranslation.sourceCode === sourceCode &&
                cachedTranslation.targetCode === targetCode) {
                this.showTranslation(cachedTranslation.response);
            }
        } catch (error) {
            localStorage.removeItem(TRANSLATION_STORAGE_KEYS.response);
        }
    }

    /**
     * Read the recent cache only when all translation inputs match.
     * @param {string} text - Source text.
     * @param {string} sourceCode - Source language code.
     * @param {string} targetCode - Target language code.
     * @returns {string|null} Cached translation, or null when unavailable.
     */
    getCachedTranslation(text, sourceCode, targetCode) {
        try {
            const cachedTranslation = JSON.parse(
                localStorage.getItem(TRANSLATION_STORAGE_KEYS.response)
            );

            return cachedTranslation?.text === text &&
                cachedTranslation.sourceCode === sourceCode &&
                cachedTranslation.targetCode === targetCode
                ? cachedTranslation.response
                : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Render a translation and update whether the copy action is available.
     * @param {string} translation - Translation text to render.
     * @returns {void}
     */
    showTranslation(translation) {
        this.result.textContent = translation;
        this.result.classList.remove('translation-loading');
        this.copyButton.disabled = !translation;
    }

    /**
     * Copy the current result and show temporary button feedback.
     * @returns {Promise<void>}
     */
    async copyResult() {
        if (!this.result.textContent) {
            return;
        }

        try {
            await navigator.clipboard.writeText(this.result.textContent);
            clearTimeout(this.copyResetTimeout);
            this.copyButton.textContent = this.getMessage('copiedButton');
            this.copyButton.classList.remove('btn-outline-secondary');
            this.copyButton.classList.add('btn-success');
            this.copyResetTimeout = setTimeout(() => {
                this.copyButton.textContent = this.getMessage('copy');
                this.copyButton.classList.remove('btn-success');
                this.copyButton.classList.add('btn-outline-secondary');
            }, COPY_FEEDBACK_DELAY);
        } catch (error) {
            this.statusLabel.textContent = this.getMessage('copyFailed');
        }
    }

    /**
     * Read today's tracked character usage, resetting when the date has rolled over.
     * @returns {number} Characters used today, as a local estimate.
     */
    getUsedChars() {
        const today = new Date().toISOString().slice(0, 10);
        const storedDate = localStorage.getItem(USAGE_STORAGE_KEYS.date);

        if (storedDate !== today) {
            localStorage.setItem(USAGE_STORAGE_KEYS.date, today);
            localStorage.setItem(USAGE_STORAGE_KEYS.chars, '0');
            return 0;
        }

        return Number(localStorage.getItem(USAGE_STORAGE_KEYS.chars)) || 0;
    }

    /**
     * Add characters to today's tracked usage and refresh the usage bar.
     * @param {number} charCount - Characters to add to today's usage estimate.
     * @returns {void}
     */
    trackUsage(charCount) {
        const usedChars = this.getUsedChars() + charCount;
        localStorage.setItem(USAGE_STORAGE_KEYS.chars, String(usedChars));
        this.updateUsageDisplay();
    }

    /**
     * Render the estimated daily quota usage bar from tracked usage.
     * @returns {void}
     */
    updateUsageDisplay() {
        const usedChars = this.getUsedChars();
        const percentage = Math.min(100, Math.round((usedChars / MYMEMORY_DAILY_CHAR_LIMIT) * 100));

        this.usageBarFill.style.width = `${percentage}%`;
        this.usageBarFill.classList.toggle('bg-danger', percentage >= 100);
        this.usageBarFill.classList.toggle('bg-warning', percentage >= 75 && percentage < 100);
        this.usageBar.setAttribute('aria-valuenow', String(percentage));
        this.usagePercentage.textContent = `${percentage}%`;
    }

    /**
     * Detect MyMemory's quota-exhausted response, which still returns HTTP 200
     * and responseStatus 200 but replaces the translation with a warning string.
     * @param {object} data - Parsed MyMemory response body.
     * @returns {boolean} True when the free daily quota has been exhausted.
     */
    isQuotaExceededResponse(data) {
        return Boolean(data.quotaFinished) || /MYMEMORY WARNING/i.test(data.responseData?.translatedText || '');
    }

    /**
     * Validate input, use the cache when possible, or request a translation.
     * @returns {Promise<void>}
     */
    async translateText() {
        const text = this.sourceText.value.trim();
        const sourceCode = this.findLanguage(this.sourceLanguage.value);
        const targetCode = this.findLanguage(this.targetLanguage.value);

        if (!text) {
            this.result.textContent = '';
            this.result.classList.remove('translation-loading');
            this.copyButton.disabled = true;
            return;
        }

        if (!sourceCode || !targetCode || sourceCode === targetCode) {
            this.result.textContent = '';
            this.result.classList.remove('translation-loading');
            this.copyButton.disabled = true;
            this.statusLabel.textContent = sourceCode === targetCode
                ? this.getMessage('chooseDifferentLanguages')
                : this.getMessage('chooseSupportedLanguage');
            return;
        }

        const cachedTranslation = this.getCachedTranslation(text, sourceCode, targetCode);

        if (cachedTranslation !== null) {
            this.showTranslation(cachedTranslation);
            this.statusLabel.textContent = '';
            return;
        }

        try {
            const langpair = `${sourceCode === 'auto' ? 'autodetect' : sourceCode}|${targetCode}`;
            const params = new URLSearchParams({ q: text, langpair });
            const response = await fetch(
                `https://api.mymemory.translated.net/get?${params}`
            );

            if (!response.ok) {
                throw new Error('Translation request failed');
            }

            const data = await response.json();

            if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
                throw new Error('translationFailed');
            }

            if (this.isQuotaExceededResponse(data)) {
                localStorage.setItem(USAGE_STORAGE_KEYS.chars, String(MYMEMORY_DAILY_CHAR_LIMIT));
                this.updateUsageDisplay();
                throw new Error('quotaExceeded');
            }

            const translation = data.responseData.translatedText;
            localStorage.setItem(TRANSLATION_STORAGE_KEYS.response, JSON.stringify({
                text,
                sourceCode,
                targetCode,
                response: translation
            }));
            this.trackUsage(text.length);
            this.showTranslation(translation);
            this.statusLabel.textContent = '';
        } catch (error) {
            this.result.textContent = '';
            this.result.classList.remove('translation-loading');
            this.copyButton.disabled = true;
            this.statusLabel.textContent = error.message === 'quotaExceeded'
                ? this.getMessage('translationQuotaExceeded')
                : this.getMessage('translationFailedConnection');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
