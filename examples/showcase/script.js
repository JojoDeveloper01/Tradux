import { getAvailableLanguages, getCurrentLanguage, initTradux, onLanguageChange, setLanguage } from 'tradux';

const languageSelect = document.querySelector('[data-language-select]');
const languageForm = document.querySelector('[data-language-form]');

function updateLanguageUi(language) {
  if (languageSelect) {
    languageSelect.value = language;
  }
}

function syncLanguageOptions(languages) {
  if (!languageSelect || languages.length === 0) {
    return;
  }

  const currentOptions = [...languageSelect.options].map((option) => option.value);
  const nextOptions = languages.map((language) => language.value);

  if (currentOptions.join('|') === nextOptions.join('|')) {
    return;
  }

  languageSelect.innerHTML = languages
    .map((language) => `<option value="${language.value}">${language.name}</option>`)
    .join('');
}

async function goToLanguage(language) {
  if (!language) {
    return;
  }

  await setLanguage(language);
  updateLanguageUi(language);

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('lang', language);
  window.location.assign(nextUrl);
}

await initTradux(document.documentElement.lang || null);
syncLanguageOptions(getAvailableLanguages());
updateLanguageUi(await getCurrentLanguage());
onLanguageChange(async () => {
  updateLanguageUi(await getCurrentLanguage());
});

if (languageSelect && languageForm) {
  languageSelect.addEventListener('change', () => {
    languageForm.requestSubmit();
  });

  languageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void goToLanguage(languageSelect.value);
  });
}

document.querySelectorAll('[data-copy-command]').forEach((button) => {
  button.addEventListener('click', async () => {
    const command = decodeURIComponent(button.dataset.command ?? '');
    const defaultLabel = button.dataset.copyDefault ?? 'Copy command';
    const successLabel = button.dataset.copySuccess ?? 'Copied';
    const fallbackLabel = button.dataset.copyFallback ?? 'Copy manually';

    try {
      await navigator.clipboard.writeText(command);
      button.textContent = successLabel;
    } catch {
      button.textContent = fallbackLabel;
    }

    window.setTimeout(() => {
      button.textContent = defaultLabel;
    }, 1600);
  });
});
