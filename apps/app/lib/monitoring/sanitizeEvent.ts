import type { Breadcrumb, ErrorEvent } from "@sentry/react-native";

export function filterAppBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
	return breadcrumb.category === "app.entry" ? breadcrumb : null;
}

export function sanitizeAppEvent(event: ErrorEvent): ErrorEvent {
	delete event.request;
	delete event.user;
	delete event.extra;
	if (event.message) event.message = redactUrls(event.message);
	for (const exception of event.exception?.values ?? []) {
		if (exception.value) exception.value = redactUrls(exception.value);
		for (const frame of exception.stacktrace?.frames ?? []) delete frame.vars;
	}
	if (event.breadcrumbs) {
		event.breadcrumbs = event.breadcrumbs.filter(
			(breadcrumb) => filterAppBreadcrumb(breadcrumb) !== null,
		);
	}
	return event;
}

function redactUrls(value: string): string {
	return value.replace(
		/(?:https?:\/\/|webmemo:\/\/|https?%3A%2F%2F)[^\s<>"']+/gi,
		"[URL]",
	);
}
