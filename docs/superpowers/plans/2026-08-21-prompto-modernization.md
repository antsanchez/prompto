# Prompto modernization implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish Prompto’s remaining 2026 work: usable settings, zoneless signal state, chat edit/regenerate/search, IndexedDB + export, and CI — without a backend.

**Architecture:** Five stacked PRs on `main`. Each PR is a working PWA. Settings is independent of zoneless. Runtime (signals + zoneless) is the foundation for edit/regenerate. Persistence swaps the storage backend behind the existing `StorageService` API. CI locks the build.

**Tech Stack:** Angular 22.1, TypeScript 6.0, LangChain 1.5, Tailwind 4, Jasmine/Karma, `idb-keyval`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-21-prompto-modernization-design.md`

## Global Constraints

- Node `^22.22.3 || >=24.15.0`. If `node -v` is 24.14 or lower, prefix commands with `export PATH="/opt/homebrew/opt/node@26/bin:$PATH"` (or equivalent Node 22.22.3+ / 24.15+ / 26).
- Angular 22.1, TypeScript `~6.0.3`.
- Client-only PWA. No server, no MCP host, no custom tool runtime.
- `npx ng build --configuration=production` must pass after every task that touches app code.
- Tests: `npx ng test --no-watch --browsers=ChromeHeadless --include='**/<file>.spec.ts'`
- Do not wipe existing `localStorage` settings. Merge new fields.
- Commits and PRs authored as Antonio Sánchez. Do not mention AI tooling.
- Keep Arena, Discussion, Notebook, Templates working after every phase.
- Branch per phase from updated `main`: `feat/settings-2026`, `feat/zoneless-signals`, `feat/chat-actions`, `feat/indexeddb-export`, `feat/ci`.

## File map

| File | Responsibility |
|---|---|
| `src/app/core/model-filter.ts` | Pure chat-model allowlist |
| `src/app/core/constants.ts` | Endpoints, defaults, storage keys |
| `src/app/core/types.ts` | `Message`, later `Chat` fields used across services |
| `src/app/services/settings.service.ts` | Provider enum, persistKeys, OpenRouter, defaultSystemPrompt |
| `src/app/services/lc.service.ts` | Provider registry + createLLM |
| `src/app/services/chat.service.ts` | History/arena signals, system prompt, edit/regenerate |
| `src/app/services/discussion.service.ts` | Discussion signal + stream updates |
| `src/app/services/storage.service.ts` | localStorage + IndexedDB backend |
| `src/app/services/helpers.service.ts` | Markdown → sanitized HTML |
| `src/app/components/message-display/*` | Cached markdown render |
| `src/app/pages/settings/*` | Key masking, persist toggle, OpenRouter tab |
| `src/app/pages/conversation/*` | System prompt, edit, regenerate |
| `src/app/components/sidebar/*` | Search box |
| `src/app/shared/shared.module.ts` | Delete after consumers import standalone |
| `src/app/app.config.ts` | Zoneless provider |
| `angular.json` | Drop zone.js polyfill |
| `.github/workflows/ci.yml` | Test + production build |

---

### Task 1: Filter provider model lists

**Files:**
- Create: `src/app/core/model-filter.ts`
- Create: `src/app/core/model-filter.spec.ts`
- Modify: `src/app/services/settings.service.ts` (`getModels`, after `allModels` is built)

**Interfaces:**
- Consumes: `Provider` from `settings.service.ts`
- Produces: `filterChatModels(provider: Provider, ids: string[]): string[]`

- [ ] **Step 1: Write the failing tests**

```ts
import { filterChatModels } from './model-filter';
import { Provider } from '../services/settings.service';

describe('filterChatModels', () => {
  it('keeps OpenAI chat ids and drops embeddings/audio', () => {
    expect(filterChatModels(Provider.OPENAI, [
      'gpt-5.6', 'o3', 'whisper-1', 'tts-1', 'text-embedding-3-large', 'dall-e-3'
    ])).toEqual(['gpt-5.6', 'o3']);
  });

  it('keeps grok ids for xAI', () => {
    expect(filterChatModels(Provider.XAI, ['grok-4.6', 'grok-4', 'other']))
      .toEqual(['grok-4.6', 'grok-4']);
  });

  it('strips Google models/ prefix', () => {
    expect(filterChatModels(Provider.GOOGLE, ['models/gemini-2.5-pro', 'gemini-2.5-flash']))
      .toEqual(['gemini-2.5-pro', 'gemini-2.5-flash']);
  });

  it('preserves a selected id that the filter would drop', () => {
    expect(filterChatModels(Provider.OPENAI, ['whisper-1'], 'whisper-1'))
      .toEqual(['whisper-1']);
  });
});
```

Signature: `filterChatModels(provider: Provider, ids: string[], selected?: string): string[]`

- [ ] **Step 2: Run tests — expect FAIL** (file missing)

Run: `npx ng test --no-watch --browsers=ChromeHeadless --include='**/model-filter.spec.ts'`

- [ ] **Step 3: Implement**

```ts
import { Provider } from '../services/settings.service';

const OPENAI_DROP = /(whisper|tts|davinci|dall-e|embedding|moderation|babbage|^ada$|gpt-image)/i;

export function filterChatModels(
  provider: Provider,
  ids: string[],
  selected?: string
): string[] {
  const cleaned = ids.map(id => id.trim()).filter(Boolean);
  let kept: string[];
  switch (provider) {
    case Provider.OPENAI:
      kept = cleaned.filter(id => /^(gpt-|o[1-9]|chatgpt-)/i.test(id) && !OPENAI_DROP.test(id));
      break;
    case Provider.XAI:
      kept = cleaned.filter(id => id.toLowerCase().startsWith('grok-'));
      break;
    case Provider.GOOGLE:
      kept = cleaned.map(id => id.replace(/^models\//, ''));
      break;
    default:
      kept = cleaned;
  }
  const unique = [...new Set(kept)];
  if (selected && !unique.includes(selected)) {
    unique.unshift(selected);
  }
  return unique;
}
```

In `settings.service.ts` `getModels`, after `allModels` is assigned:

```ts
const selected = this.settings().options[provider].model;
allModels = filterChatModels(provider, allModels, selected);
```

- [ ] **Step 4: Re-run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/core/model-filter.ts src/app/core/model-filter.spec.ts src/app/services/settings.service.ts
git commit -m "Filter provider model lists to chat models"
```

---

### Task 2: Mask keys and optional persist

**Files:**
- Modify: `src/app/services/settings.service.ts` (`Settings` type, `DEFAULT_SETTINGS`, `saveSettings`, `loadSettings`)
- Modify: `src/app/pages/settings/settings.component.html` (key input)
- Modify: `src/app/pages/settings/settings.component.ts`
- Create: `src/app/services/settings-persist.spec.ts` for the strip logic (extract a pure helper if the service is awkward to boot)

**Interfaces:**
- Consumes: existing `Settings` / `Options`
- Produces: `Settings.persistKeys: boolean`; `stripKeysForStorage(settings: Settings): Settings`

- [ ] **Step 1: Failing tests for strip helper**

Put `stripKeysForStorage` next to settings or in `src/app/core/settings-keys.ts`:

```ts
it('clears apiKey when persistKeys is false', () => {
  const stripped = stripKeysForStorage(sampleSettings({ persistKeys: false, apiKey: 'sk-test' }));
  expect(stripped.options[Provider.OPENAI].apiKey).toBe('');
});

it('keeps apiKey when persistKeys is true', () => {
  const stripped = stripKeysForStorage(sampleSettings({ persistKeys: true, apiKey: 'sk-test' }));
  expect(stripped.options[Provider.OPENAI].apiKey).toBe('sk-test');
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
export function stripKeysForStorage(settings: Settings): Settings {
  if (settings.persistKeys) {
    return settings;
  }
  const options = { ...settings.options };
  for (const provider of Object.values(Provider)) {
    options[provider] = { ...options[provider], apiKey: '' };
  }
  return { ...settings, options };
}
```

- Add `persistKeys: true` to `Settings` and `DEFAULT_SETTINGS`.
- `loadSettings`: if the stored object has no `persistKeys`, default `true`.
- `saveSettings`: `this.storage.setItem(STORAGE_KEYS.SETTINGS, stripKeysForStorage(this.settings()))`.
- Settings template: key input `type="{{ showKey ? 'text' : 'password' }}"` plus a “Show” button. Checkbox “Save API keys in this browser” bound to `persistKeys`. When the checkbox turns off, call `saveSettings` immediately so disk is wiped.

- [ ] **Step 4: Tests PASS. Manual: save a key with persist off, reload, key field empty, `localStorage.settings` has `"apiKey":""`.**

- [ ] **Step 5: Commit**

```bash
git commit -m "Mask API keys and allow session-only keys"
```

---

### Task 3: OpenRouter provider

**Files:**
- Modify: `package.json` (add `@langchain/openrouter`)
- Modify: `src/app/core/constants.ts` (`API_ENDPOINTS.OPENROUTER`)
- Modify: `src/app/services/settings.service.ts` (`Provider`, `DEFAULT_SETTINGS`, `MODEL_FETCH_CONFIGS`)
- Modify: `src/app/services/lc.service.ts` (`PROVIDER_REGISTRY`)
- Modify: `src/app/pages/settings/settings.component.html` — Ollama-only URL block should also show for OpenRouter (`apiUrl`)

**Interfaces:**
- Consumes: `Provider` enum, `PROVIDER_REGISTRY`
- Produces: `Provider.OPENROUTER = 'OpenRouter'`

- [ ] **Step 1: Install**

```bash
npm install @langchain/openrouter@^0.4.10
```

- [ ] **Step 2: Extend enum and defaults**

```ts
export enum Provider {
  OLLAMA = 'Ollama',
  OPENAI = 'OpenAI',
  ANTHROPIC = 'Anthropic',
  MISTRAL = 'Mistral',
  COHERE = 'Cohere',
  GOOGLE = 'Google',
  XAI = 'xAI',
  OPENROUTER = 'OpenRouter'
}
```

```ts
OPENROUTER: 'https://openrouter.ai/api/v1/models'
```

Default options:

```ts
[Provider.OPENROUTER]: {
  provider: Provider.OPENROUTER,
  model: '',
  apiKey: '',
  apiUrl: 'https://openrouter.ai/api/v1',
  temperature: DEFAULTS.TEMPERATURE,
  availableModels: []
}
```

`MODEL_FETCH_CONFIGS[Provider.OPENROUTER]`:

```ts
{
  getUrl: (opts) => `${opts.apiUrl.replace(/\/$/, '')}/models`,
  getHeaders: (opts) => ({ Authorization: `Bearer ${opts.apiKey}` }),
  extractModels: (data) => data?.data?.map(m => m.id) || [],
  requiresApiKey: true,
}
```

`loadSettings` already loops `listProviders()` and fills missing option objects — that must pick up OpenRouter for existing users.

- [ ] **Step 3: Register LLM**

In `lc.service.ts` `PROVIDER_REGISTRY`:

```ts
[Provider.OPENROUTER]: {
  importFn: () => import('@langchain/openrouter'),
  className: 'ChatOpenRouter',
  requiresApiKey: true,
},
```

`createLLM` already passes `baseUrl: options.apiUrl`. Keep that.

- [ ] **Step 4: Settings URL field**

Show the URL input for `OLLAMA` and `OPENROUTER` (copy the Ollama block, retarget the label). CORS note stays Ollama-only.

- [ ] **Step 5: Build**

Run: `npx ng build --configuration=production`  
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git commit -m "Add OpenRouter as an LLM provider"
```

---

### Task 4: Defaults, temperature, system prompt setting

**Files:**
- Modify: `src/app/services/settings.service.ts` (`DEFAULT_SETTINGS`, `Settings.defaultSystemPrompt`)
- Modify: `src/app/pages/settings/settings.component.html` (temperature max, system prompt textarea)
- Modify: `src/app/services/chat.service.ts` (replace hardcoded system string)
- Modify: `src/app/pages/notebook/notebook.component.ts` if it streams without a system prompt — leave notebook without system prompt (stateless). Arena uses the same default as chat.

**Interfaces:**
- Consumes: `Settings`
- Produces: `Settings.defaultSystemPrompt: string`; `ChatService` reads `this.lc.s.settings().defaultSystemPrompt`

- [ ] **Step 1: Change defaults**

```ts
[Provider.OPENAI].model = 'gpt-5.6'
[Provider.ANTHROPIC].model = 'claude-sonnet-4-6'
[Provider.XAI].model = 'grok-4.6'
defaultSystemPrompt: 'You are a helpful assistant.'
```

`loadSettings` merge: if stored settings lack `defaultSystemPrompt`, set the default string. Do not overwrite a user-selected model.

- [ ] **Step 2: Temperature**

In `settings.component.html` replace `min="0.0" max="1.0"` and the `oninput` clamp with `min="0" max="2" step="0.1"`. No inline JS clamp.

- [ ] **Step 3: Use the prompt**

In `chat.service.ts` both `'You are a nice chatbot having a conversation with a human.'` sites become:

```ts
this.lc.s.settings().defaultSystemPrompt || 'You are a helpful assistant.'
```

- [ ] **Step 4: Build + commit**

```bash
npx ng build --configuration=production
git commit -m "Update model defaults, temperature range, and system prompt"
```

Open PR **A** (`feat/settings-2026`) against `main`. Merge before Phase 2.

---

### Task 5: Cache markdown in MessageDisplay

**Files:**
- Modify: `src/app/services/helpers.service.ts`
- Modify: `src/app/services/helpers.service.spec.ts`
- Modify: `src/app/components/message-display/message-display.component.ts`
- Modify: `src/app/components/message-display/message-display.component.html`

**Interfaces:**
- Consumes: `message` string
- Produces: `HelpersService.presentMessage(message: string): string` (plain sanitized HTML, not `SafeHtml`)

- [ ] **Step 1: Failing test**

```ts
it('does not execute a script tag', () => {
  const html = service.presentMessage('<script>alert(1)</script>hello');
  expect(html).not.toContain('<script>');
  expect(html).toContain('hello');
});
```

Boot `HelpersService` with TestBed and `DomSanitizer`.

- [ ] **Step 2: Run — expect FAIL** (current code bypasses sanitizer)

- [ ] **Step 3: Implement**

```ts
import { SecurityContext } from '@angular/core';

presentMessage(message: string): string {
  const renderer = new marked.Renderer();
  // existing link / paragraph / code renderers
  const parsed = marked.parse(message, { renderer }) as string;
  return this.sanitizer.sanitize(SecurityContext.HTML, parsed) ?? '';
}
```

Message display:

```ts
message = input('');
thinking = input('');
cssClass = input('');
private helpers = inject(HelpersService);
html = computed(() => this.message() ? this.helpers.presentMessage(this.message()) : '');
```

Template: `[innerHTML]="html()"` instead of `helpers.presentMessage(message)`.

Call sites that pass `[message]="msg.text"` keep working (`input()` is compatible with `[message]`).

- [ ] **Step 4: Tests PASS. Build PASS.**

- [ ] **Step 5: Commit**

```bash
git commit -m "Sanitize and cache rendered markdown"
```

---

### Task 6: Remove SharedModule

**Files:**
- Modify: `src/app/pages/home/home.component.ts`
- Modify: `src/app/pages/settings/settings.component.ts`
- Modify: `src/app/pages/conversation/conversation.component.ts`
- Modify: `src/app/pages/arena/arena.component.ts`
- Modify: `src/app/pages/notebook/notebook.component.ts`
- Modify: `src/app/pages/template/template.component.ts`
- Modify: `src/app/components/sidebar/sidebar.component.ts`
- Delete: `src/app/shared/shared.module.ts`

**Interfaces:**
- Consumes: standalone `ErrorComponent`, `NotConnectedComponent`, `MessageDisplayComponent`
- Produces: no `SharedModule`

- [ ] **Step 1: Replace imports array** in each file above with the concrete modules that template needs. Pattern (conversation):

```ts
imports: [
  CommonModule,
  FormsModule,
  RouterModule,
  ErrorComponent,
  NotConnectedComponent,
  MessageDisplayComponent
]
```

Home needs `RouterModule` + `NotConnectedComponent`. Settings needs `FormsModule` + `NotConnectedComponent`. Sidebar needs `RouterModule`, `CommonModule`, `FormsModule` if it uses ngModel.

- [ ] **Step 2: Delete `shared.module.ts`**

- [ ] **Step 3: Build — expect exit 0** (missing import shows as NG8001/NG8002)

- [ ] **Step 4: Commit**

```bash
git commit -m "Replace SharedModule with direct standalone imports"
```

---

### Task 7: Signal state for chat, settings lists, discussion

**Files:**
- Modify: `src/app/services/chat.service.ts`
- Modify: `src/app/services/settings.service.ts` (`chats`, `arenas`, `discussions`, `templates`, `connected`)
- Modify: `src/app/services/discussion.service.ts`
- Modify: every template that reads `chatService.history`, `ss.chats`, `discussionService.currentDiscussion`

**Interfaces:**
- Consumes: existing `Chat`, `Arena`, `Keys`, `Discussion` shapes
- Produces:
  - `ChatService.history: Signal<Chat>`
  - `ChatService.arena: Signal<Arena>`
  - `SettingsService.chats: Signal<Keys[]>`
  - `DiscussionService.currentDiscussion: Signal<Discussion>`
  - `SettingsService.connected: Signal<boolean>`

- [ ] **Step 1: Convert ChatService public fields**

Replace `public history: Chat` with:

```ts
private readonly historyState = signal<Chat>(createEmptyChat());
readonly history = this.historyState.asReadonly();
```

Every `this.history.messages.push` / `this.history.name =` becomes `historyState.update(...)`. Stream loop uses the delta pattern from the spec.

Same for `arena`. `arenaStarted` can stay a signal too: `arenaStarted = signal(false)`.

- [ ] **Step 2: Update templates**

`chatService.history.messages` → `chatService.history().messages`  
`cs.arena.p1` → `cs.arena().p1`  
Two-way `[(ngModel)]="cs.arena.p1.provider"` cannot bind into a signal nested field. For arena provider/model selects, keep local component fields and write back through `cs.setPlayer(1, { provider })` helpers, or bind `[ngModel]="cs.arena().p1.provider"` `(ngModelChange)="setP1Provider($event)"`.

- [ ] **Step 3: Settings lists**

```ts
readonly chats = signal<Keys[]>([]);
```

`loadKeys` sets the signals. Sidebar: `@for (chat of ss.chats(); track chat.key)`.

`isConnected()` becomes `return this.connected();` with `connected = signal(false)`.

- [ ] **Step 4: Discussion**

`currentDiscussion = signal<Discussion>(createEmptyDiscussion())`. Stream updates use `.update` on the last message.

- [ ] **Step 5: Build. Manually: send a chat, tokens appear one by one, sidebar name appears after title job.**

- [ ] **Step 6: Commit**

```bash
git commit -m "Drive chat, sidebar, and discussion from signals"
```

---

### Task 8: Zoneless bootstrap

**Files:**
- Modify: `src/app/app.config.ts`
- Modify: `angular.json` (`polyfills` arrays — drop `zone.js` and `zone.js/testing` only after tests still run; Karma may still need `zone.js/testing`)
- Modify: every component with `changeDetection: ChangeDetectionStrategy.Eager` — remove the property (v22 default is OnPush)
- Modify: `package.json` — remove `zone.js` dependency **only if** tests do not need it

**Interfaces:**
- Consumes: signal-based services from Task 7
- Produces: zoneless app

- [ ] **Step 1: Add provider**

```ts
import { ApplicationConfig, isDevMode, provideZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
```

- [ ] **Step 2: Remove Eager** from all components that set it (app, pages, message-display, sidebar, error, not-connected).

- [ ] **Step 3: Drop `zone.js` from the **app** polyfills in `angular.json` build options. Leave `zone.js/testing` in the test target if Karma still requires it.

- [ ] **Step 4: Build + serve smoke**

Run: `npx ng build --configuration=production`  
Expected: exit 0, no `zone.js` in the polyfills bundle (`polyfills-*.js` should shrink).

Manually: stream a reply, toggle dark mode, switch routes, open settings, start arena. If a view sticks, a signal update is missing — fix that, do not add Zone back.

- [ ] **Step 5: Commit and open PR B**

```bash
git commit -m "Run Prompto zoneless with OnPush components"
```

---

### Task 9: Per-chat system prompt

**Files:**
- Modify: `src/app/services/chat.service.ts` (`Chat` type)
- Modify: `src/app/pages/conversation/conversation.component.html`
- Modify: `src/app/pages/conversation/conversation.component.ts`

**Interfaces:**
- Consumes: `Settings.defaultSystemPrompt`
- Produces: `Chat.systemPrompt?: string`

- [ ] **Step 1: Extend Chat**

```ts
type Chat = {
  name: string;
  messages: Message[];
  systemPrompt?: string;
};
```

Resolve prompt:

```ts
private systemPromptForChat(): string {
  return this.history().systemPrompt?.trim()
    || this.lc.s.settings().defaultSystemPrompt
    || 'You are a helpful assistant.';
}
```

Use that in `streamWithMessages`.

- [ ] **Step 2: UI** — in the composer, above the textarea:

```html
<details class="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
  <summary>System prompt</summary>
  <textarea rows="2" class="mt-2 w-full bg-transparent"
    [ngModel]="chatService.history().systemPrompt || ''"
    (ngModelChange)="setSystemPrompt($event)"
    placeholder="Uses the default from Settings when empty"></textarea>
</details>
```

`setSystemPrompt` writes the signal and `saveChat()` if a key exists.

- [ ] **Step 3: Build + commit**

```bash
git commit -m "Allow a per-chat system prompt"
```

---

### Task 10: Edit last user message and regenerate

**Files:**
- Modify: `src/app/core/types.ts` (optional `id` on `Message` if tracking by index is brittle — index of last user/assistant is enough)
- Modify: `src/app/services/chat.service.ts`
- Modify: `src/app/pages/conversation/conversation.component.html`
- Create: `src/app/services/chat.service.spec.ts` tests for the array surgery (extract pure helpers)

**Interfaces:**
- Consumes: `Chat.messages: Message[]`
- Produces:
  - `dropLastAssistant(messages: Message[]): Message[]`
  - `replaceLastUser(messages: Message[], text: string): Message[]`
  - `ChatService.regenerate(): Promise<void>`
  - `ChatService.editLastUser(text: string): Promise<void>`

- [ ] **Step 1: Failing tests**

```ts
const user = { text: 'u1', isUser: true, date: new Date() };
const bot = { text: 'b1', isUser: false, date: new Date() };

it('dropLastAssistant removes the trailing bot message', () => {
  expect(dropLastAssistant([user, bot])).toEqual([user]);
});

it('dropLastAssistant is a no-op when the last message is the user', () => {
  expect(dropLastAssistant([user])).toEqual([user]);
});

it('replaceLastUser rewrites the last user text and drops what follows', () => {
  const next = replaceLastUser([user, bot], 'u2');
  expect(next.length).toBe(1);
  expect(next[0].text).toBe('u2');
  expect(next[0].isUser).toBeTrue();
});
```

- [ ] **Step 2: Implement helpers + service methods**

`regenerate`: abort current run; `history.update` with `dropLastAssistant`; take last user text; call the same send path as `chat()` without pushing another user message.

`editLastUser(text)`: abort; `replaceLastUser`; send.

Disable both when `this.lc.isRunning()` or when there is no matching message.

- [ ] **Step 3: Buttons on the last assistant / last user bubble**

Show “Regenerate” on the last assistant message. Show “Edit” on the last user message; swapping the bubble for an input + Save calls `editLastUser`.

- [ ] **Step 4: Tests PASS. Build PASS. Commit**

```bash
git commit -m "Add regenerate and edit for the last chat turn"
```

---

### Task 11: Sidebar search

**Files:**
- Modify: `src/app/components/sidebar/sidebar.component.ts`
- Modify: `src/app/components/sidebar/sidebar.component.html`

**Interfaces:**
- Consumes: `ss.chats()`, `ss.arenas()`, `ss.discussions()`, `ss.templates`
- Produces: `query = signal('')`; `filteredChats = computed(() => ...)`

- [ ] **Step 1: Add search state**

```ts
query = signal('');
private match(name: string): boolean {
  const q = this.query().trim().toLowerCase();
  return !q || name.toLowerCase().includes(q);
}
filteredChats = computed(() => this.ss.chats().filter(c => this.match(c.name)));
```

Same for arenas, discussions, templates (`System.name`).

- [ ] **Step 2: Template** — one search input at the top of the lists; `@for` uses `filteredChats()` etc.

- [ ] **Step 3: Build + commit. Open PR C.**

```bash
git commit -m "Filter sidebar lists by name"
```

---

### Task 12: IndexedDB for large records

**Files:**
- Modify: `package.json` (`idb-keyval`)
- Modify: `src/app/services/storage.service.ts`
- Create: `src/app/services/storage.service.spec.ts` (migrate helper, using a fake store)

**Interfaces:**
- Consumes: existing `getItem<T>`, `setItem<T>`, `removeItem`, prefix loaders
- Produces: same API; chat/arena/discussion keys stored in IDB; `migrateLegacyLocalStorage(): Promise<number>` returns migrated key count

- [ ] **Step 1: Install**

```bash
npm install idb-keyval
```

- [ ] **Step 2: Helper** `isLargeKey(key: string): boolean` — true when key starts with `chat_`, `arena_`, or `discussion_`.

- [ ] **Step 3: Dual backend**

```ts
async getItem<T>(key: string): Promise<T | null> {
  if (isLargeKey(key)) {
    return (await idbGet(key)) as T ?? null;
  }
  // existing localStorage JSON.parse path
}
```

Make `getItem` / `setItem` async. Update callers (`ChatService.saveChat`, `loadChat`, settings still sync). To avoid a wide async retrofit of settings, keep a sync localStorage path for non-large keys and async only for large keys. Then `loadChats` becomes `async loadChats(): Promise<StoredItem[]>`.

Alternatively wrap IDB behind a small in-memory cache filled at app start:

```ts
async hydrate(): Promise<void>
```

Call `hydrate()` from `AppComponent.ngOnInit` before `loadKeys()`. After hydrate, `getItem` can stay sync against a `Map`. This is the smaller blast radius — **do this**.

```ts
private cache = new Map<string, string>();
private hydrated = false;

async hydrate(): Promise<void> {
  const legacy = this.migrateLegacy(); // copy localStorage large keys into idb, remove originals
  const entries = await idbEntries();
  for (const [key, value] of entries) {
    this.cache.set(key, JSON.stringify(value));
  }
  this.hydrated = true;
}
```

`getItem` reads `cache` then localStorage for small keys.

- [ ] **Step 4: Tests for `migrateLegacy`** with a mock `Storage` object: a `chat_1` key moves out of the mock localStorage.

- [ ] **Step 5: Quota** — `setItem` catch `QuotaExceededError` and rethrow `new Error('Storage is full. Export your chats and delete old ones.')` so the conversation error banner can show it.

- [ ] **Step 6: Commit**

```bash
git commit -m "Store chats in IndexedDB and migrate localStorage"
```

---

### Task 13: Export and import

**Files:**
- Create: `src/app/core/backup.ts`
- Create: `src/app/core/backup.spec.ts`
- Modify: `src/app/pages/settings/settings.component.html` (two buttons under the delete section)
- Modify: `src/app/pages/settings/settings.component.ts`

**Interfaces:**
- Consumes: hydrated storage + settings
- Produces:
  - `buildExport(input: BackupInput): BackupFile`
  - `mergeImport(current: BackupInput, incoming: BackupFile): BackupInput`

```ts
type BackupFile = {
  version: 1;
  exportedAt: string;
  settings: Settings; // keys stripped
  templates: System[];
  chats: { key: string; value: unknown }[];
  arenas: { key: string; value: unknown }[];
  discussions: { key: string; value: unknown }[];
};
```

- [ ] **Step 1: Tests**

```ts
it('strips api keys from exported settings', () => {
  const file = buildExport(sampleWithKeys());
  expect(file.settings.options[Provider.OPENAI].apiKey).toBe('');
});

it('does not overwrite a stored key with an empty imported key', () => {
  const merged = mergeImport(currentWithKey('sk-live'), incomingWithKey(''));
  expect(merged.settings.options[Provider.OPENAI].apiKey).toBe('sk-live');
});
```

- [ ] **Step 2: Implement + settings buttons**

Export: `URL.createObjectURL` + `<a download="prompto-export-YYYY-MM-DD.json">`.  
Import: file input, `JSON.parse`, confirm(), write via `StorageService`, `loadKeys()`, `loadSettings()`, `loadTemplates()`.

- [ ] **Step 3: Tests PASS. Commit. Open PR D.**

```bash
git commit -m "Add chat export and import"
```

---

### Task 14: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:** none.

- [ ] **Step 1: Add workflow**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx ng test --no-watch --browsers=ChromeHeadless
      - run: npx ng build --configuration=production
```

- [ ] **Step 2: Run the same commands locally. Fix any test that fails under zoneless/Karma.**

- [ ] **Step 3: Commit. Open PR E.**

```bash
git commit -m "Add GitHub Actions CI for test and production build"
```

---

## Self-review

- Spec Phase 1 (settings, OpenRouter, keys, defaults, temperature, system prompt) → Tasks 1–4
- Spec Phase 2 (markdown, SharedModule, signals, zoneless) → Tasks 5–8
- Spec Phase 3 (per-chat prompt, edit/regenerate, search) → Tasks 9–11
- Spec Phase 4 (IndexedDB, export/import) → Tasks 12–13
- Spec Phase 5 (CI) → Task 14
- Spec non-goal MCP: no task (intentional)
- Types: `Provider.OPENROUTER`, `persistKeys`, `defaultSystemPrompt`, `Chat.systemPrompt`, `filterChatModels`, `stripKeysForStorage`, `BackupFile` used consistently
- No TBD / “handle edge cases” leftovers

## Execution notes

- Do not start Task 7 until Task 5–6 templates still compile; zoneless (Task 8) will hide missed signal updates.
- Do not make `StorageService.getItem` async in a big bang — Task 12 hydrate + cache is required.
- After each phase PR: merge to `main` before branching the next (`feat/zoneless-signals` from updated `main`).
