# Prompto modernization design

Prompto is a client-only Angular PWA that talks to LLM providers from the browser. Angular 22, LangChain 1.5, reasoning streams, stop, and PDF file parts are already on `main` (PRs #46 and #52). This spec covers the remaining work.

## Goal

Make Prompto a 2026-grade chat UI without adding a backend: settings that match current models, UI state that works zoneless, chats that survive quota and can be exported, and a small set of missing chat actions (system prompt, edit, regenerate, search).

## Non-goals

- No server, proxy, or key vault. Keys stay in the browser.
- No MCP host and no custom tool runtime. A browser PWA cannot safely run arbitrary tools; that original roadmap item stays deferred.
- No visual redesign. Keep the current layout, orange accents, and dark mode.
- Do not rewrite Arena, Discussion, Notebook, or Templates as products. They must keep working as each phase lands.
- Do not mention AI tooling in commits or PR text.

## Constraints

- Node `^22.22.3 || >=24.15.0`. Local `/usr/local/bin/node` 24.14 is too old; use Node 22.22.3+, 24.15+, or 26 for CLI.
- Angular 22.1, TypeScript `>=6.0 <6.1`, LangChain 1.x.
- Stay a PWA. `ng build --configuration=production` must pass after every phase.
- Existing `localStorage` data must still load.
- Commits and PRs are authored as Antonio Sánchez.

## Current shape (do not regress)

- `LcService` lazily imports provider packages, builds multimodal `HumanMessage`s (`image` / `file`), and exposes `beginRun` / `abort` / `endRun`.
- `ChatService.chat` / `chatArena` stream via `extractChunkParts`, show thinking, and name chats after the first token.
- `SharedModule` is an empty NgModule that only re-exports standalone pieces. Six pages still import it.
- `ChatService.history` and `arena` are mutable objects. Components are `ChangeDetectionStrategy.Eager`. `zone.js` is still a polyfill.
- `HelpersService.presentMessage` runs from the template on every change-detection cycle and uses `bypassSecurityTrustHtml`.
- API keys are stored in plaintext in `localStorage` (`STORAGE_KEYS.SETTINGS`). The key input is `type="text"`.
- `getModels` dumps the raw provider catalog (OpenAI includes embeddings, TTS, whisper).
- Default models: Ollama `llama4`, OpenAI `gpt-5.4`, Anthropic `claude-sonnet-4-6-20260217`, xAI `grok-4`.
- System prompt is hardcoded: `"You are a nice chatbot having a conversation with a human."`
- Temperature UI is capped at 1.0.
- Persistence is `localStorage` only. Base64 attachments are not stored (placeholders only).

## Phase 1 — Settings

Ship first. It does not depend on zoneless and is what users hit after an upgrade.

### Model lists

Add `src/app/core/model-filter.ts` with `filterChatModels(provider: Provider, ids: string[]): string[]`.

- OpenAI: keep ids matching `/^(gpt-|o[1-9]|chatgpt-)/i`. Drop `whisper`, `tts`, `davinci`, `dall-e`, `embedding`, `moderation`, `babbage`, `ada`, `gpt-image`.
- xAI: keep ids starting with `grok-`.
- Google: already filtered by `generateContent`; also strip the `models/` prefix if present.
- Anthropic, Mistral, Cohere, Ollama, OpenRouter: keep the list as returned, minus empty strings.
- After filtering, if the currently selected model is not in the list, keep it as an extra option so old settings still work.

### Defaults

Update `DEFAULT_SETTINGS` only for empty/new installs. `loadSettings` must merge missing providers and missing option fields into existing saved settings without wiping keys.

- OpenAI: `gpt-5.6`
- Anthropic: `claude-sonnet-4-6`
- xAI: `grok-4.6`
- Ollama: `llama4` (unchanged)

If `/v1/models` does not contain that default, the selected value still shows (see extra option above).

### API keys

- Key input is `type="password"` with a show/hide control.
- New settings flag `persistKeys: boolean`, default `true`.
- When `persistKeys` is false, `saveSettings` writes `apiKey: ''` for every provider. In-memory keys stay until the tab closes.
- `setApiKeyTemporarily` already exists; use it when persist is off.
- OpenRouter and other URL-based providers still use the same key field.

### OpenRouter

Add `Provider.OPENROUTER = 'OpenRouter'`.

- Default `apiUrl`: `https://openrouter.ai/api/v1`
- Models: `GET {apiUrl}/models` with `Authorization: Bearer {apiKey}`, ids from `data[].id`
- LLM: `@langchain/openrouter` `ChatOpenRouter`, same constructor options as other providers (`apiKey`, `model`, `temperature`, `baseUrl` from `apiUrl`)
- Register in `PROVIDER_REGISTRY` and `MODEL_FETCH_CONFIGS`
- Endpoint constant `API_ENDPOINTS.OPENROUTER`

### System prompt and temperature

- Add `Settings.defaultSystemPrompt: string`, default `"You are a helpful assistant."`
- `ChatService` / arena / notebook use that string instead of the hardcoded nice-chatbot line.
- Temperature input `min=0` `max=2` `step=0.1`. Remove the inline `max=1.0` clamp.

## Phase 2 — Runtime (signals, zoneless, markdown, SharedModule)

### Markdown

`MessageDisplayComponent` owns rendering.

- Convert `@Input()` to `input()` / `input.required` where used.
- `html = computed(() => this.helpers.presentMessage(this.message()))` so marked + highlight run only when the string changes.
- `HelpersService.presentMessage` returns sanitized HTML: `this.sanitizer.sanitize(SecurityContext.HTML, parsed) ?? ''` and bind with `[innerHTML]` without `bypassSecurityTrustHtml`.
- Keep GFM, `breaks: true`, `target="_blank"` links, highlight.js for fenced code.

### SharedModule

Delete `src/app/shared/shared.module.ts`. Each consumer imports what it uses:

`CommonModule`, `FormsModule`, `RouterModule`, `ErrorComponent`, `NotConnectedComponent`, `MessageDisplayComponent`.

Discussion already does this. Home, settings, conversation, arena, notebook, template, sidebar do not.

### Signals

`SettingsService.settings` is already a signal. Finish the job:

- `chats`, `arenas`, `discussions`, `templates`, `currentChatKey` become signals (or one `sidebarState` signal). Sidebar reads them in the template with `()`.
- `ChatService.history` and `arena` become signals. During streaming, update by replacing the last message object and calling `.set` / `.update` so zoneless CD runs. Do not rely on mutating a nested field.
- `DiscussionService.currentDiscussion` becomes a signal the same way.
- `connected` is a signal, not two booleans.

Pattern for a stream delta:

```ts
this.history.update(chat => {
  const messages = chat.messages.slice();
  const last = messages[messages.length - 1];
  messages[messages.length - 1] = {
    ...last,
    text: last.text + parts.text,
    thinking: parts.thinking ? (last.thinking || '') + parts.thinking : last.thinking
  };
  return { ...chat, messages };
});
```

### Zoneless

- `provideZonelessChangeDetection()` in `app.config.ts`.
- Remove `zone.js` from `polyfills` in `angular.json` and from `package.json` when nothing else imports it.
- Drop `ChangeDetectionStrategy.Eager` from components that now read signals (v22 default is OnPush).
- Verify streaming still paints every chunk, sidebar lists update on save, and theme toggle still works (`ThemeService`).

## Phase 3 — Chat actions

### Per-chat system prompt

- `Chat` gains `systemPrompt?: string`. Empty means use `Settings.defaultSystemPrompt`.
- Conversation composer gets a one-line “System” details/disclosure, not a second page.
- Persist with the chat record.

### Edit and regenerate

- **Regenerate**: if the last message is assistant, drop it and resend the last user text (no new user bubble). Same attachments placeholders as stored; live binary attachments are still ephemeral.
- **Edit**: only the last user message. Replace its text, drop every message after it, resend.
- Both use the existing `stop` / `beginRun` path. Disable while `isRunning()`.

### Search

- Sidebar search box filters `chats`, `arenas`, `discussions`, `templates` by name (case-insensitive).
- Optional: when the query is 3+ characters, also scan stored message text for chats (IndexedDB/localStorage get). Do not load every body on sidebar init.

## Phase 4 — Persistence

Keep settings, theme, and templates in `localStorage` (small). Move `chat_*`, `arena_*`, `discussion_*` to IndexedDB via `idb-keyval`.

- `StorageService` API stays (`getItem`, `setItem`, `removeItem`, `loadChats`, …) but chat-sized keys go to IDB.
- On first load after upgrade: copy matching `localStorage` keys into IDB, then delete the `localStorage` copies so quota is freed. Settings stay put.
- Quota errors surface as a user-visible error string, not `console.error` only.
- Export: download `prompto-export-YYYY-MM-DD.json` with version `1`, chats, arenas, discussions, templates, settings **with apiKey stripped**.
- Import: merge by key; never overwrite a non-empty apiKey with empty; confirm before merge.

## Phase 5 — CI

`.github/workflows/ci.yml`:

- `pull_request` and `push` to `main`
- Node 22
- `npm ci`
- `npx ng test --no-watch --browsers=ChromeHeadless`
- `npx ng build --configuration=production`

Existing `*.spec.ts` “should be created” tests stay until replaced. New code in phases 1–4 lands with real tests (`model-filter`, persistKeys strip, markdown sanitize, storage migrate).

## Order and PRs

| PR | Phase | Depends on |
|---|---|---|
| A | Settings | main |
| B | Runtime | A (templates still work if B is first, but merge A first) |
| C | Chat actions | B (signals make edit/regenerate updates reliable) |
| D | Persistence | C (search can live on C with localStorage, then D swaps backend) |
| E | CI | A at minimum; land after B so zoneless is tested in CI |

Each PR is independently runnable: `ng serve` + `ng build --configuration=production`.

## Success

- OpenAI model dropdown does not list `whisper-1` or embedding models.
- Key field is masked. With persist off, reload clears keys from disk (`localStorage.settings` has empty `apiKey`).
- OpenRouter appears as a settings tab and can stream.
- Typing a stream does not re-parse the whole transcript through `marked` on every token (only the active message string).
- App runs without `zone.js`.
- Stop, regenerate, and edit work on conversation.
- Export/import round-trips chats without keys.
- CI is green on the PR.
