# Mini Operations ERP

A production-oriented full-stack Operations ERP built with **Node.js, TypeScript, Express, PostgreSQL, Prisma ORM, React, and Tailwind CSS**.

The system manages multi-location inventory, work order shortage checks, 2-phase internal stock transfers, and concurrency-safe customer order reservations.

---

## Business Scenario & Core Flow

```text
Inventory  -->  Work Order  -->  Stock Check  -->  Internal Transfer / Shortage  -->  Customer Reservation
```

---

## Tech Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Authentication**: JWT & Role-Based Access Control (RBAC) middleware
- **API Documentation**: Interactive Swagger / OpenAPI UI at `/api/docs`
- **Testing**: Jest, Supertest (25 passing tests including the 5 mandatory scenarios)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios

---

## Role-Based Access Control (RBAC) Matrix

| Feature / Action | Admin | Operations User | Sales User |
| :--- | :---: | :---: | :---: |
| **View Multi-Location Inventory** | ✅ | ✅ | ✅ |
| **View Work Orders** | ✅ | ✅ | ❌ |
| **Create Work Order** | ✅ | ❌ | ❌ |
| **Update Work Order Status** | ✅ | ✅ | ❌ |
| **View Internal Transfers** | ✅ | ✅ | ❌ |
| **Request / Dispatch / Receive Transfer** | ✅ | ✅ | ❌ |
| **View Customer Orders** | ✅ | ❌ | ✅ |
| **Create Customer Order & Reserve Stock** | ✅ | ❌ | ✅ |

---

## Database Schema & ER Diagram

The full Entity-Relationship diagram is documented in [`docs/er-diagram.md`](docs/er-diagram.md).

### Core Invariants Maintained:
- $\text{Physical Quantity} \ge 0$
- $\text{Reserved Quantity} \ge 0$
- $\text{Reserved Quantity} \le \text{Physical Quantity}$
- $\text{Available Quantity} = \text{Physical Quantity} - \text{Reserved Quantity} \ge 0$
- Row-level pessimistic locking (`SELECT ... FOR UPDATE`) in `prisma.$transaction` prevents concurrency race conditions.

---

## Getting Started / Setup Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v22)
- **PostgreSQL**: v14+ running on port 5432

### 2. Environment Configuration
Create `.env` file in `backend/`:
```bash
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mini_operations_erp?schema=public"
JWT_SECRET="mini-operations-erp-jwt-secret-key-2026"
JWT_EXPIRES_IN="24h"
NODE_ENV="development"
```

### 3. Database Migration & Seeding
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

### 4. Running the Application

#### Start Backend API (Port 5000):
```bash
cd backend
npm run dev
```

#### Start Frontend (Port 3000):
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Interactive API Documentation (Swagger)

When the backend is running, access Swagger UI at:
**`http://localhost:5000/api/docs`**

---

## Pre-Seeded Test Credentials

| Role | Email | Password | Allowed Modules |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@erp.com` | `admin123` | Full access, Work Order creation |
| **Operations** | `ops@erp.com` | `ops123` | Inventory, Work Orders, Stock Transfers |
| **Sales** | `sales@erp.com` | `sales123` | Inventory, Customer Orders & Reservations |

---

## Automated Test Suite

To run all 7 test suites (25 tests total):
```bash
cd backend
npm test
```

### The 5 Mandatory Tests Covered:
1. **Test 1**: Cannot reserve more than available inventory (`tests/mandatory-suite.test.ts`)
2. **Test 2**: Cannot transfer more than available inventory (`tests/mandatory-suite.test.ts`)
3. **Test 3**: Destination stock increases only after transfer receipt (`tests/mandatory-suite.test.ts`)
4. **Test 4**: Same transfer cannot be received twice / single-receipt idempotency (`tests/mandatory-suite.test.ts`)
5. **Test 5**: Unauthorized user cannot perform restricted operation (`tests/mandatory-suite.test.ts`)

---

## Demo Walkthrough Guide (5–7 Minutes)

1. **Login Screen**:
   - Log in as **Admin** (`admin@erp.com` / `admin123`) using the quick role switcher.
2. **Inventory Screen**:
   - Observe multi-location items with live Physical, Reserved, and Available columns (`Available = Physical - Reserved`).
   - Filter by location (e.g., `LOC-A`).
3. **Work Orders Screen**:
   - Create a Work Order for `SKU-STEEL-01` at `LOC-A` requiring `100` units.
   - Notice the system computes: `Available at Location = 70`, `Shortage = 30` automatically.
4. **Internal Transfers Screen**:
   - Switch to **Operations User** (`ops@erp.com` / `ops123`).
   - View transfer `TRF-2026-001` (`LOC-B` $\rightarrow$ `LOC-A`, qty: 30).
   - Click **Dispatch**: Notice source physical inventory reduces at `LOC-B`, while destination `LOC-A` remains unchanged.
   - Click **Receive**: Notice destination inventory at `LOC-A` increments by 30.
   - Attempting to receive again is safely rejected.
5. **Customer Orders Screen**:
   - Switch to **Sales User** (`sales@erp.com` / `sales123`).
   - Create a customer order and reserve stock.
   - Enter quantity greater than available stock $\rightarrow$ receive real-time validation error.
   - Enter valid quantity $\rightarrow$ stock is atomically reserved and inventory `Available` quantity decreases.