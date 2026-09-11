# Mini Operations ERP - Entity Relationship (ER) Diagram

```mermaid
erDiagram
    users ||--o{ work_orders : "assigned to"
    users ||--o{ stock_transfers : "requested by"
    users ||--o{ customer_orders : "created by"

    locations ||--o{ inventories : "stores"
    locations ||--o{ work_orders : "target location"
    locations ||--o{ stock_transfers : "source / destination"
    locations ||--o{ customer_orders : "fulfilled at"

    items ||--o{ inventories : "inventory records"
    items ||--o{ work_orders : "required item"
    items ||--o{ stock_transfers : "transferred item"
    items ||--o{ customer_orders : "ordered item"

    users {
        string id PK "UUID"
        string email UK "unique email"
        string password "bcrypt hash"
        string name "full name"
        enum role "ADMIN | OPERATIONS | SALES"
        datetime created_at
        datetime updated_at
    }

    locations {
        string id PK "UUID"
        string code UK "e.g. LOC-A"
        string name "Warehouse North"
        string address
        datetime created_at
        datetime updated_at
    }

    items {
        string id PK "UUID"
        string sku UK "e.g. SKU-STEEL-01"
        string name "Steel Plate 10mm"
        string category "Raw Materials"
        string unit "sheets"
        datetime created_at
        datetime updated_at
    }

    inventories {
        string id PK "UUID"
        string item_id FK
        string location_id FK
        string batch_number "e.g. BATCH-2026-S1"
        int physical_quantity "Physical stock >= 0"
        int reserved_quantity "Allocated stock >= 0"
        datetime created_at
        datetime updated_at
    }

    work_orders {
        string id PK "UUID"
        string work_order_number UK
        string location_id FK
        string item_id FK
        int required_quantity "> 0"
        string assigned_user_id FK
        enum status "ASSIGNED | IN_PROGRESS | COMPLETED"
        datetime created_at
        datetime updated_at
    }

    stock_transfers {
        string id PK "UUID"
        string transfer_number UK
        string source_location_id FK
        string destination_location_id FK
        string item_id FK
        string batch_number
        int quantity "> 0"
        enum status "REQUESTED | DISPATCHED | RECEIVED"
        string requested_by_id FK
        datetime dispatched_at
        datetime received_at
        datetime created_at
        datetime updated_at
    }

    customer_orders {
        string id PK "UUID"
        string order_number UK
        string customer_name
        string location_id FK
        string item_id FK
        string batch_number
        int quantity "> 0"
        enum status "RESERVED | COMPLETED"
        string created_by_id FK
        datetime created_at
        datetime updated_at
    }
```

## Inventory Invariants & Business Logic

1. **Available Quantity Formula**:
   $$\text{Available Quantity} = \text{Physical Quantity} - \text{Reserved Quantity}$$

2. **Integrity Constraints**:
   - $\text{Physical Quantity} \ge 0$
   - $\text{Reserved Quantity} \ge 0$
   - $\text{Reserved Quantity} \le \text{Physical Quantity}$
   - $\text{Available Quantity} \ge 0$
   - `@@unique([itemId, locationId, batchNumber])` prevents duplicate batch entries.

3. **Concurrency & Locking**:
   - Stock reservations and internal transfers use PostgreSQL `SELECT ... FOR UPDATE` inside atomic `prisma.$transaction`.
   - Prevents simultaneous overselling race conditions.