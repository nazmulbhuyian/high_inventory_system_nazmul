# Sneaker Drop Frontend

Clean React dashboard for the real-time sneaker drop assessment.

## Stack
- React
- Vite
- Tailwind CSS
- React Query
- Socket.io client

## Setup

1. Install dependencies
```bash
npm install
```

2. Create `.env`
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

3. Start the app
```bash
npm run dev
```

If PowerShell blocks `npm run dev`, use:
```bash
npm.cmd run dev
```

## What it does
- Loads active drops from the backend
- Shows live stock count
- Updates stock across tabs in real time
- Supports reserve and purchase actions
- Shows toast feedback and button loading states

## Notes
- Backend should be running before opening the dashboard.
- Demo user ID can be entered in the dashboard to test reserve and purchase flows.
