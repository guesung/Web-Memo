import { createRoot } from 'react-dom/client';
// eslint-disable-next-line
// @ts-ignore
import tailwindcssOutput from '@src/tailwind-output.css?inline';

interface AttachShadowTree {
  shadowTreeWrapper?: HTMLElement;
  shadowTree: JSX.Element;
  shadowHostId: string;
}

export const attachShadowTree = ({ shadowTreeWrapper, shadowTree, shadowHostId }: AttachShadowTree) => {
  if (!shadowTreeWrapper) {
    shadowTreeWrapper = document.createElement('div');
    shadowTreeWrapper.id = shadowHostId;
    document.body.appendChild(shadowTreeWrapper);
  }

  const shadowRoot = shadowTreeWrapper.attachShadow({ mode: 'open' });

  const globalStyleSheet = new CSSStyleSheet();
  globalStyleSheet.replaceSync(tailwindcssOutput);
  shadowRoot.adoptedStyleSheets = [globalStyleSheet];

  createRoot(shadowRoot).render(shadowTree);
  return shadowRoot;
};
