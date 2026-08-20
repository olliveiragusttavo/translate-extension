
const sourceText = document.getElementById('source-text');
const sourceLanguage = document.getElementById('source-language');
const targetLanguage = document.getElementById('target-language');
const translateButton = document.getElementById('translate-button');
const result = document.getElementById('result');
const status = document.getElementById('status');

async function translateText() {
    const text = sourceText.value.trim();

    if (!text) {
        result.textContent = '';
        status.textContent = 'Enter some text first.';
        return;
    }

    translateButton.disabled = true;
    status.textContent = 'Translating...';

    try {
        const params = new URLSearchParams({
            client: 'gtx',
            sl: sourceLanguage.value,
            tl: targetLanguage.value,
            dt: 't',
            q: text
        });
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);

        if (!response.ok) {
            throw new Error('Translation request failed');
        }

        const data = await response.json();
        result.textContent = data[0].map((part) => part[0]).join('');
        status.textContent = '';
    } catch (error) {
        result.textContent = '';
        status.textContent = 'Translation failed. Check your internet connection.';
    } finally {
        translateButton.disabled = false;
    }
}

translateButton.addEventListener('click', translateText);
sourceText.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
        translateText();
    }
});
