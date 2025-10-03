import { URL } from "url";

export function isValidUrl(url_string: string) {
  try {
    new URL(url_string);
    return true;
  } catch (error) {
    return false;
  }
}