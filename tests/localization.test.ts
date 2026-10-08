import test from 'node:test';
import assert from 'node:assert';
import { translations } from '../src/core/localization/translations.ts';

test('all supported languages (en, hi, mr) exist', () => {
  assert.ok(translations.en, 'English translations must exist');
  assert.ok(translations.hi, 'Hindi translations must exist');
  assert.ok(translations.mr, 'Marathi translations must exist');
});

test('every English key has a matching Hindi and Marathi translation', () => {
  const enKeys = Object.keys(translations.en);
  const hiKeys = new Set(Object.keys(translations.hi));
  const mrKeys = new Set(Object.keys(translations.mr));

  assert.ok(enKeys.length > 50, 'Translation dictionary should have substantial coverage');

  const missingInHi: string[] = [];
  const missingInMr: string[] = [];

  for (const key of enKeys) {
    if (!hiKeys.has(key)) {
      missingInHi.push(key);
    }
    if (!mrKeys.has(key)) {
      missingInMr.push(key);
    }
  }

  assert.deepStrictEqual(missingInHi, [], `Missing Hindi keys: ${missingInHi.join(', ')}`);
  assert.deepStrictEqual(missingInMr, [], `Missing Marathi keys: ${missingInMr.join(', ')}`);
});

test('no translation string is empty or whitespace only', () => {
  const languages = ['en', 'hi', 'mr'] as const;

  for (const lang of languages) {
    const dict = translations[lang];
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(
        value && value.trim().length > 0,
        `Key ${key} in language ${lang} must not be empty or whitespace`
      );
    }
  }
});

test('parameterized translation strings substitute variables properly', () => {
  const template = translations.en['seats.summary']; // '{count} Seats Selected'
  assert.ok(template.includes('{count}'), 'Template should contain {count} placeholder');

  const interpolated = template.replace(new RegExp(`\\{count\\}`, 'g'), String(3));
  assert.strictEqual(interpolated, '3 Seats Selected');
});
