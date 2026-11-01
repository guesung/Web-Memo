export class Commands {
	/**
	 * `_execute_action` 명령에 등록된 단축키 문자열을 읽는다.
	 * @description 단축키가 지정되어 있지 않으면 빈 문자열을 돌려준다.
	 */
	static async getActionShortcut() {
		const commands = await chrome.commands.getAll();
		const actionCommand = commands.find(
			(command) => command.name === "_execute_action",
		);
		return actionCommand?.shortcut ?? "";
	}
}
