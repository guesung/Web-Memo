// ref : https://developer.chrome.com/docs/extensions/reference/api/sidePanel
export class SidePanel {
  static async open(tabId: number | undefined, windowId: number) {
    await chrome.sidePanel.open({ tabId, windowId });
  }
}