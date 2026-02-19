# i18n Translation Check & Fill Command

Check and fill missing translations in web and chrome extension i18n files.

## Your Task

Analyze and synchronize translation files across the project:

### Step 1: Read Translation Files

Read all 4 translation files:
1. `packages/web/src/modules/i18n/locales/en/translation.json` (Web English)
2. `packages/web/src/modules/i18n/locales/ko/translation.json` (Web Korean)
3. `chrome-extension/public/_locales/en/messages.json` (Extension English)
4. `chrome-extension/public/_locales/ko/messages.json` (Extension Korean)

### Step 2: Compare and Identify Missing Keys

**For Web Translation Files:**
- Compare all nested keys between EN and KO
- Identify keys present in EN but missing in KO
- Identify keys present in KO but missing in EN
- Report the full key path (e.g., `introduce.hero.title`)

**For Chrome Extension Messages:**
- Compare top-level keys between EN and KO
- Identify keys present in EN but missing in KO
- Identify keys present in KO but missing in EN
- Note: Extension messages use `{ "message": "..." }` format

### Step 3: Report Findings

Create a summary report in this format:

```
## Web Translation Files

### Missing in KO (exists in EN):
- key.path.here

### Missing in EN (exists in KO):
- key.path.here

## Chrome Extension Messages

### Missing in KO (exists in EN):
- keyName

### Missing in EN (exists in KO):
- keyName
```

### Step 4: Fill Missing Translations

For each missing translation:

**If missing in KO:**
- Translate the EN text to natural Korean
- Match the tone and style of existing KO translations
- Preserve any interpolation variables like `{{variable}}`

**If missing in EN:**
- Translate the KO text to natural English
- Match the tone and style of existing EN translations
- Preserve any interpolation variables like `{{variable}}`

**Extension Message Format:**
```json
{
  "keyName": {
    "message": "Translated text here"
  }
}
```

**Web Translation Format:**
- Maintain the same nested structure
- Use proper JSON formatting with tabs for indentation

### Step 5: Apply Changes

Edit the translation files to add the missing translations:
- Insert new keys in alphabetical order within their section when possible
- Maintain consistent formatting (tabs, not spaces)
- Preserve the existing structure

### Quality Guidelines

1. **Tone Consistency:**
   - Korean: Friendly, casual tone with "~해요" endings (e.g., "저장했어요", "확인해주세요")
   - English: Clear, concise, user-friendly

2. **Technical Terms:**
   - Keep technical terms consistent (memo, category, wishlist, etc.)
   - Don't over-translate brand/feature names

3. **Variables:**
   - Never translate `{{variable}}` placeholders
   - Ensure variable positions make grammatical sense in target language

4. **Format Preservation:**
   - Maintain newlines (`\n`) as in source
   - Keep Unicode escapes if present
   - Preserve bullet point formatting

## Output

After completing the task, provide:
1. Summary of all missing translations found
2. List of translations added with before/after context
3. Confirmation that files have been updated
