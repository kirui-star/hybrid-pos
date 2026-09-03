
# HybridPOS

HybridPOS is an offline-first retail point-of-sale desktop application built with React, Electron, JavaScript, and SQLite.

It is designed to support day-to-day retail operations while continuing to work locally even when internet connectivity is limited.

The project combines sales processing, inventory control, purchases, operating expenses, reporting, receipt printing, M-Pesa payment workflows, and transaction history in one desktop application.

---

## Project Summary

HybridPOS was built to provide a practical retail management system for small and medium-sized stores.

The application is designed around real business workflows, including:

- Product and inventory management
- Barcode-based sales processing
- Cash payments
- M-Pesa payments
- Split payments
- Held sales
- Stock receiving
- Inventory adjustments
- Purchases
- Operating expense tracking
- Transaction history
- Financial reporting
- Receipt printing
- Local offline data storage

---

## Technology Stack

### Frontend

- React
- JavaScript
- HTML
- CSS
- Vite

### Desktop Runtime

- Electron

### Backend

- Electron main process
- IPC communication
- Node.js

### Database

- SQLite
- better-sqlite3

### Integrations

- Safaricom M-Pesa
- Receipt printing

### Development Tools

- Git
- GitHub
- npm
- ESLint

---

## Application Architecture

HybridPOS uses a layered desktop architecture.

```text
┌──────────────────────────────┐
│        React Frontend        │
│                              │
│ Dashboard                    │
│ POS                          │
│ Products                     │
│ Reports                      │
│ Expenses                     │
│ Transaction History          │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│      Frontend Services       │
│                              │
│ saleService                  │
│ productService               │
│ inventoryService             │
│ mpesaService                 │
│ dashboardService             │
│ settingsService              │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│     Electron Preload API     │
│          window.api          │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│         IPC Handlers         │
│                              │
│ sales                        │
│ products                     │
│ purchases                    │
│ expenses                     │
│ reports                      │
│ transactions                 │
│ settings                     │
│ mpesa                        │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│      Backend Services        │
│                              │
│ Financial reporting          │
│ Transaction history          │
│ Dashboard calculations       │
│ M-Pesa integration           │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│       SQLite Database        │
│                              │
│ Products                     │
│ Inventory                    │
│ Sales                        │
│ Payments                     │
│ Purchases                    │
│ Expenses                     │
│ Held Sales                   │
│ Settings                     │
└──────────────────────────────┘