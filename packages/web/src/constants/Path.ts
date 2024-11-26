export const PATHS = {
  root: '/',
  error: '/error',
  login: '/login',
  memos: '/memos',
  auth: '/auth',
  memosWish: '/memos?wish=true',
  memosSetting: '/memos/setting',
  callbackOAuth: '/auth/callback',
  callbackEmail: '/auth/callback-email',
};

export const NEED_AUTH_PAGES = [PATHS.memos, PATHS.memosSetting];
