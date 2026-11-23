const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-z]{2,}/gi;

const LINK_TOKEN = /(\/|%2F)(s|b|shared|shared-boards)(\/|%2F)[\w-]{16,}/gi;

const LINK_KEY = /#[\w-]{16,}/g;

const ADDRESS_TAIL = /((?:https?:\/\/|"\/)[^\s"'\\?#]*)[?#][^\s"'\\]*/gi;

export function hideSecrets(text: string) {
  return text
    .replaceAll(ADDRESS_TAIL, "$1")
    .replaceAll(EMAIL, "[email]")
    .replaceAll(LINK_TOKEN, "$1$2$3:token")
    .replaceAll(LINK_KEY, "#:key");
}

export function scrubJson<T>(value: T): T {
  return JSON.parse(hideSecrets(JSON.stringify(value)));
}

export const collectNothing = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
  genAI: { inputs: false, outputs: false },
};
