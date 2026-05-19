import "react-native-url-polyfill/auto";

import { decode as atob, encode as btoa } from "base-64";

const globalScope = globalThis as typeof globalThis & {
  atob?: (input: string) => string;
  btoa?: (input: string) => string;
};

if (!globalScope.atob) {
  globalScope.atob = atob;
}

if (!globalScope.btoa) {
  globalScope.btoa = btoa;
}
