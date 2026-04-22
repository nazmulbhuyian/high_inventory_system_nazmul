import { useEffect, useState } from "react";

export function useSessionStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item !== null ? item : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, storedValue);
    } catch {
      // Ignore storage write errors in demo UI.
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}