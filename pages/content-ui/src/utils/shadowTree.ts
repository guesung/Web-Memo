import { createRoot } from 'react-dom/client';
// eslint-disable-next-line
// @ts-ignore
import tailwindcssOutput from '@src/tailwind-output.css?inline';

interface AttachShadowTree {
  shadowHostElement?: HTMLElement;
  shadowTree: JSX.Element;
  shadowHostId: string;
}

export const attachShadowTree = ({ shadowHostElement, shadowTree, shadowHostId }: AttachShadowTree) => {
  const shadowHost = shadowHostElement ?? document.createElement('div');
  if (!shadowHostElement) {
    shadowHost.id = shadowHostId;
    document.body.appendChild(shadowHost);
  }

  const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  const globalStyleSheet = new CSSStyleSheet();
  globalStyleSheet.replaceSync(tailwindcssOutput);
  shadowRoot.adoptedStyleSheets = [globalStyleSheet];

  createRoot(shadowRoot).render(shadowTree);
  return shadowRoot;
};
