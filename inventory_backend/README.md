# Sneaker Drop Backend

Real-time inventory backend for the limited-edition sneaker drop assessment.

## Stack
- Node.js + Express
- PostgreSQL
- Prisma ORM
- Socket.io
- Zod validation

## Features
- Create merch drops with initial stock
- Fetch active drops with latest 3 purchasers
- Atomic reservation with row-level locking
- 60-second reservation expiry recovery job
- Purchase completion from active reservation only
- Realtime `stock_update` socket events

## Setup

1. Install dependencies
```bash
npm install
```

2. Create `.env`
```env
DATABASE_URL="postgresql://username:password@localhost:5432/sneaker_drop"
PORT=5000
```

3. Run migrations
```bash
npx prisma migrate dev
```

4. Seed initial data
```bash
npm run seed
```

5. Start development server
```bash
npm run dev
```

## Build
```bash
npm run build
npm start
```

## API
- `GET /api/drops`
- `POST /api/drops`
- `POST /api/reserve`
- `POST /api/purchase`

## Realtime
- Socket event: `stock_update`
- Payload: `{ dropId, available_stock }`

## Architecture Notes
- Reservation uses a PostgreSQL transaction and `SELECT ... FOR UPDATE` to prevent overselling.
- Expired reservations are reaped every 5 seconds and stock is restored in batch.
- Purchase requires an active, non-expired reservation and marks it as completed.

## Prisma Models
- `User`
- `Drop`
- `Reservation`
- `Purchase`

### Option 2: Docker Setup (Recommended) 🚀

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd grocery-booking-system
   ```

2. **Environment Variables**
   Create a `.env` file with:
   ```env
   DATABASE_URL="postgresql://user:password@db:5432/grocery_db"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   PORT=8080
   ```

3. **Build & Run with Docker**
   ```bash
   # Build the containers
   docker-compose build

   # Run the application
   docker-compose up -d

   # Check logs
   docker-compose logs -f

  #এখন আর প্রতিবার build করতে হবে না ছোট কোড চেঞ্জের জন্য
   docker-compose up -d --build
  #docker-compose up -d চালিয়ে রাখুন, কোড চেঞ্জ হলে browser/Server reload দেখতে পারবেন।
   ```

4. **Database Migration**
   ```bash
   # Run migration inside container
   docker-compose exec app npx prisma migrate dev --name init
   docker-compose exec app npx prisma generate
   ```

5. **Access the application**
   - API: http://localhost:8080
   - Database: localhost:5432

**That's it!** Your app is now containerized and running. 🎉

## Usage Examples

### Register Admin
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "password123",
    "role": "ADMIN"
  }'
```

### Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Add Grocery Item (Admin)
```bash
curl -X POST http://localhost:8080/api/v1/grocery \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Apple",
    "description": "Fresh red apples",
    "price": 2.50,
    "inventory": 100
  }'
```

### Create Order (User)
```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "groceryItemId": "item-id-1",
        "quantity": 5
      },
      {
        "groceryItemId": "item-id-2",
        "quantity": 2
      }
    ]
  }'
```

## Project Structure
```
src/
├── app/
│   ├── auth/
│   ├── grocery/
│   ├── order/
│   ├── category/
│   └── subcategory/
├── errors/
├── helpers/
├── lib/
├── middlewares/
├── routes/
└── shared/
prisma/
├── schema.prisma
```

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License
ISC



🚀 How to Run
🔹 DEV (hot reload 🔥)
docker-compose -f docker-compose.dev.yml up --build

👉 code change = auto reload

🔹 PROD (optimized 🚀)
docker-compose -f docker-compose.prod.yml up --build -d
🧠 Extra PRO Tips
👉 New model add করলে
👉 Migration run
docker-compose exec app npx prisma migrate dev --name add-product
👉 Prisma generate (optional)
docker-compose exec app npx prisma generate
📦 3. New package install
❌ এটা করো না:
npm install axios
✅ এটা করো:
docker-compose exec app npm install axios

👉 কারণ:
container + local sync রাখতে হবে

🛠️ 4. Container এর ভিতরে ঢোকা
docker-compose exec app sh

👉 useful for:

debugging
prisma
logs check
🔍 5. Logs check
docker-compose logs -f app
🧪 6. API test

👉 Postman / Thunder Client use করো:

http://localhost:5000/api/...
📁 7. File Upload (important)

তুমি already করছো:

- ./uploads:/app/uploads

👉 এর মানে:

container এ upload করলে
local এও file থাকবে ✅
⚡ 8. Reset database (when needed)
docker-compose down -v
docker-compose up --build

👉 ⚠️ সব data delete হয়ে যাবে

🧠 9. Common mistakes (avoid these)
❌ node_modules delete কোরো না
❌ container এর বাইরে prisma migrate দিও না
❌ dev এ npm run build দরকার নাই
🧩 10. Recommended Dev Flow (Real Life)

👉 Typical day:

docker up
feature develop
API test
prisma migrate
git commit
🔥 11. Pro Tips (very useful)
✅ Auto format
npm install -D prettier
✅ Env file use করো

.env

DATABASE_URL=...
JWT_SECRET=...

docker-compose:

env_file:
  - .env
✅ Separate dev/prod env
.env.dev
.env.prod



🔥 3. Docker ব্যবহার করলে

container এর ভিতরে বা compose দিয়ে:

docker exec -it grocery-app-dev npx prisma migrate dev
💥 Production / VPS এ কী করবে?

Production এ কখনো migrate dev ব্যবহার করবে না ❌

👉 Use:

npx prisma migrate deploy
⚠️ Field remove করলে কি হবে?

ধরো তুমি এটা delete করলা:

phone String?

তাহলে:

npx prisma migrate dev --name remove_phone

👉 Prisma করবে:

DB column drop
migration file create
⚠️ Model add করলে
model Product {
  id String @id @default(uuid())
  name String
}

Run:

npx prisma migrate dev --name add_product_model
💣 IMPORTANT (Docker warning)

যদি তুমি volume use করো:

- postgres_data:/var/lib/postgresql/data

👉 DB data persist থাকে

কিন্তু schema mismatch হলে:

docker compose down -v

⚠️ এটা সব delete করবে (dev only)