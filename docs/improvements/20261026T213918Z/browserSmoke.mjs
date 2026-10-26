import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const ts = require("typescript");
const { chromium } = createRequire(resolve(root, "e2e/package.json"))(
	"@playwright/test",
);
const output = process.argv[2];
assert.ok(output, "provide a new output JSON path");
const source = readFileSync(
	resolve(root, "apps/chrome-extension/lib/background/index.ts"),
	"utf8",
);
const ast = ts.createSourceFile(
	"index.ts",
	source,
	ts.ScriptTarget.Latest,
	true,
);
const listeners = ast.statements.filter(
	(node) =>
		ts.isExpressionStatement(node) &&
		ts.isCallExpression(node.expression) &&
		[
			"chrome.tabs.onUpdated.addListener",
			"chrome.tabs.onActivated.addListener",
		].includes(node.expression.expression.getText(ast)),
);
assert.equal(
	listeners.length,
	2,
	"expected both actual tab listener registrations",
);
const javascript = ts.transpileModule(
	listeners.map((node) => node.getText(ast)).join("\n"),
	{ compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText;
const temporary = mkdtempSync(join(tmpdir(), "tab-update-smoke-"));
writeFileSync(
	join(temporary, "manifest.json"),
	JSON.stringify({
		manifest_version: 3,
		name: "Local tab update smoke",
		version: "1.0.0",
		permissions: ["tabs"],
		background: { service_worker: "worker.js" },
	}),
);
writeFileSync(
	join(temporary, "worker.js"),
	`globalThis.messages = []; globalThis.events = []; chrome.tabs.onUpdated.addListener((id, changes) => events.push({id,changes}));
const bridge = { request: { UPDATE_SIDE_PANEL() { messages.push(1); return Promise.resolve(); } } };
${javascript}
`,
);
let context;
try {
	context = await chromium.launchPersistentContext(join(temporary, "profile"), {
		channel: "chromium",
		headless: true,
		args: [
			`--disable-extensions-except=${temporary}`,
			`--load-extension=${temporary}`,
			"--disable-background-networking",
			"--disable-component-update",
		],
	});
	await context.route(/^https?:/, (route) => route.abort());
	const worker =
		context.serviceWorkers()[0] ??
		(await context.waitForEvent("serviceworker"));
	let timeout;
	const observations = await Promise.race([
		worker.evaluate(async () => {
			globalThis.phase = "create active tab";
			const dataPage = (title) =>
				`data:text/html,${encodeURIComponent(`<title>${title}</title>local fixture`)}`;
			const createCompleteTab = (properties) =>
				new Promise((resolveTab) => {
					const listener = (_id, change, tab) => {
						if (change.status === "complete" && tab.url === properties.url) {
							chrome.tabs.onUpdated.removeListener(listener);
							resolveTab(tab);
						}
					};
					chrome.tabs.onUpdated.addListener(listener);
					void chrome.tabs.create(properties);
				});
			const active = await createCompleteTab({
				url: dataPage("active"),
				active: true,
			});
			globalThis.phase = "create background tab";
			const background = await createCompleteTab({
				url: dataPage("background"),
				active: false,
			});
			const mutedEvent = async (tabId) => {
				const current = await chrome.tabs.get(tabId);
				globalThis.messages = [];
				await new Promise((resolveEvent) => {
					const listener = (id, change) => {
						if (id === tabId && "mutedInfo" in change) {
							chrome.tabs.onUpdated.removeListener(listener);
							resolveEvent();
						}
					};
					chrome.tabs.onUpdated.addListener(listener);
					void chrome.tabs.update(tabId, { muted: !current.mutedInfo?.muted });
				});
				return globalThis.messages.length;
			};
			globalThis.phase = "background mute";
			const backgroundMutedMessages = await mutedEvent(background.id);
			globalThis.phase = "active mute";
			const activeMutedMessages = await mutedEvent(active.id);
			globalThis.messages = [];
			await new Promise((resolveEvent) => {
				const listener = (id, change) => {
					if (id === active.id && change.status === "complete") {
						chrome.tabs.onUpdated.removeListener(listener);
						resolveEvent();
					}
				};
				chrome.tabs.onUpdated.addListener(listener);
				void chrome.tabs.update(active.id, { url: "about:blank" });
			});
			const navigationMessages = globalThis.messages.length;
			globalThis.phase = "activation";
			globalThis.messages = [];
			await new Promise((resolveEvent) => {
				const listener = (info) => {
					if (info.tabId === background.id) {
						chrome.tabs.onActivated.removeListener(listener);
						resolveEvent();
					}
				};
				chrome.tabs.onActivated.addListener(listener);
				void chrome.tabs.update(background.id, { active: true });
			});
			const activationMessages = globalThis.messages.length;
			globalThis.phase = "other window";
			globalThis.messages = [];
			await new Promise((resolveEvent) => {
				const target = dataPage("other-window");
				const listener = (_id, change, tab) => {
					if (change.status === "complete" && tab.url === target) {
						chrome.tabs.onUpdated.removeListener(listener);
						resolveEvent();
					}
				};
				chrome.tabs.onUpdated.addListener(listener);
				void chrome.windows.create({ url: target, focused: false });
			});
			return {
				backgroundMutedMessages,
				activeMutedMessages,
				navigationMessages,
				activationMessages,
				otherWindowMessages: globalThis.messages.length,
			};
		}),
		new Promise((_, reject) => {
			timeout = setTimeout(async () => {
				const phase = await worker.evaluate(async () => ({
					phase: globalThis.phase,
					tabs: await chrome.tabs.query({}),
					events: globalThis.events,
				}));
				reject(new Error(`browser smoke timeout at ${JSON.stringify(phase)}`));
			}, 20000);
		}),
	]).finally(() => clearTimeout(timeout));
	writeFileSync(
		output,
		`${JSON.stringify(
			{
				harness:
					"source-linked tab listener smoke with native Chromium events and mocked bridge; not full extension E2E",
				browserVersion: context.browser()?.version(),
				observations,
			},
			null,
			2,
		)}\n`,
		{ flag: "wx" },
	);
	assert.equal(observations.backgroundMutedMessages, 0);
	assert.equal(observations.activeMutedMessages, 0);
	assert.ok(observations.navigationMessages > 0);
	assert.ok(observations.activationMessages > 0);
	assert.ok(observations.otherWindowMessages > 0);
	console.log(JSON.stringify(observations));
} finally {
	await context?.close();
	rmSync(temporary, { recursive: true, force: true });
}
