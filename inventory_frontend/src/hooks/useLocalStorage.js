import { useEffect, useState } from "react";

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? item : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, storedValue);
    } catch {
      // Ignore storage write errors in demo UI.
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
