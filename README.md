# California Burrito Business Analytics Dashboard

A restaurant sales dashboard that turns item-level Excel sales data into an
interactive view of revenue, orders, quantity sold, and product performance.
The project is built as a Software Engineering Intern assessment.

## Features

- KPI cards for total revenue, distinct orders, total quantity sold, and
  average order value.
- Interactive outlet, order type, and category filters with a reset option.
- Five charts for monthly revenue, outlet revenue, category revenue, order type
  revenue, and the ten best-selling items by quantity.
- Revenue calculated from item price multiplied by quantity; orders counted by
  distinct bill number so multi-item bills count once.
- Indian Rupee formatting, responsive layout, and clear loading and error
  states.

## Technologies

- **Backend:** Python, FastAPI, Pandas, python-calamine
- **Frontend:** React, TypeScript, Vite
- **Charts and icons:** Recharts, Lucide React
- **Dataset format:** Excel (`.xlsx`)

## Dataset

The assessment workbook is intentionally not tracked or uploaded. It may contain
assessment or business data, and the dashboard owner should decide separately
whether it is appropriate to share. To run the application, place the
authorized workbook at `backend/data.xlsx`. The backend also supports setting
the `DASHBOARD_DATA_FILE` environment variable to a different local workbook
path.

## Requirements

- Python 3.10 or newer
- Node.js 20.19+ or 22.12+ (required by the installed Vite 8 release)
- An authorized `backend/data.xlsx` workbook

## Setup on Windows PowerShell

Open two PowerShell terminals in the project directory.

### Backend

```powershell
cd .\backend
python -m venv .\venv
.\venv\Scripts\Activate.ps1
python -m pip install -r .\requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at `http://127.0.0.1:8000`; interactive API
documentation is available at `http://127.0.0.1:8000/docs`.

### Frontend

```powershell
cd .\frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally
`http://localhost:5173`). The frontend defaults to the API at
`http://127.0.0.1:8000`. To use another API address, set
`VITE_API_BASE_URL` before starting Vite.

To create a production build:

```powershell
cd .\frontend
npm run build
```

## Architecture

- `backend/main.py` reads and validates the workbook once at API startup,
  cleans invalid dates and numeric values, calculates line-item revenue, and
  applies the same filters to each summary and chart aggregation.
- `GET /api/dashboard` returns the filter options, KPIs, and all chart datasets
  together, avoiding separate frontend requests for each chart.
- `frontend/src/App.tsx` owns the interactive filter state and requests updated
  dashboard data when the filters change. Recharts renders the API data; the
  frontend is responsible for display, formatting, and responsive styling.
- Total orders use the distinct `BillNo` count. Average order value is revenue
  divided by that distinct bill count.

## API Endpoints

The dashboard endpoints accept optional `outlet`, `order_type`, and `category`
query parameters.

| Endpoint | Response |
| --- | --- |
| `GET /` | API health message |
| `GET /api/filters` | Available outlet, order type, and category values |
| `GET /api/dashboard` | Filter options, KPIs, and all five chart datasets |
| `GET /api/summary` | Revenue, distinct orders, quantity, and average order value |
| `GET /api/revenue-trend` | Monthly revenue series |
| `GET /api/revenue-by-outlet` | Revenue grouped by outlet |
| `GET /api/revenue-by-category` | Revenue grouped by category |
| `GET /api/revenue-by-order-type` | Revenue grouped by order type |
| `GET /api/top-selling-items` | Top ten items ranked by quantity sold |

The legacy `/api/outlet-sales` and `/api/category-sales` paths remain available
as aliases for the corresponding revenue breakdowns.
