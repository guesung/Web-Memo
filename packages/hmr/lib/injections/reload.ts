import initClient from "../initClient";

function addReload() {
	const reload = () => {
		chrome.runtime.reload();
	};

	initClient({
		// @ts-ignore
		id: __HMR_ID,
		onUpdate: reload,
	});
}

addReload();
