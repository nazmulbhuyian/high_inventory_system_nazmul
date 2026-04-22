const normalizeUrl = (value, fallback) => {
	const rawValue = (value || fallback || "").trim();
	return rawValue.replace(/\/$/, "");
};

export const BASE_URL = normalizeUrl(
	import.meta.env.VITE_API_BASE_URL,
	"http://localhost:5000/api"
);

export const SOCKET_URL = normalizeUrl(
	import.meta.env.VITE_SOCKET_URL,
	"http://localhost:5000"
);