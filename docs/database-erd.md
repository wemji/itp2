# ONEQUEUE Database ERD

The database stores accounts, services, counters, active queues, notifications, completed queue history, and security audit records.

```mermaid
erDiagram
    USERS ||--o{ QUEUES : joins
    USERS o|--o{ COUNTERS : operates
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ QUEUE_HISTORY : owns
    USERS o|--o{ AUDIT_LOGS : performs
    SERVICES ||--o{ COUNTERS : has
    SERVICES ||--o{ QUEUES : contains
    SERVICES ||--o{ QUEUE_HISTORY : records
    COUNTERS o|--o{ QUEUES : handles
    QUEUES o|--o{ NOTIFICATIONS : triggers
    QUEUES ||--o| QUEUE_HISTORY : archives

    USERS {
        uuid id PK
        text name
        text email
        user_role role
        boolean is_active
    }
    SERVICES {
        uuid id PK
        text name
        text location
        text operating_hours
        integer average_service_time
        service_status status
    }
    COUNTERS {
        uuid id PK
        uuid service_id FK
        uuid staff_id FK
        text counter_name
        counter_status status
    }
    QUEUES {
        uuid id PK
        uuid user_id FK
        uuid service_id FK
        uuid counter_id FK
        text queue_number
        queue_status status
        timestamptz joined_at
    }
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid queue_id FK
        text title
        boolean is_read
        timestamptz created_at
    }
    QUEUE_HISTORY {
        uuid id PK
        uuid queue_id FK
        uuid user_id FK
        uuid service_id FK
        queue_status status
        integer waiting_time
        integer service_time
    }
    AUDIT_LOGS {
        uuid id PK
        uuid actor_id FK
        text action
        text target_type
        uuid target_id
        timestamptz created_at
    }
```

## Main Relationships

- A user can join many queues and receive many notifications.
- A service can have many counters and queues.
- A counter may be assigned to a staff member and can handle many queues.
- A completed or ended queue has at most one queue-history record.
- Privileged staff and administrator actions are recorded in the audit log.

