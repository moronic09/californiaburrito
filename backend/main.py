import os
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware


DATA_FILE = Path(
    os.environ.get("DASHBOARD_DATA_FILE", Path(__file__).with_name("data.xlsx"))
)
REQUIRED_COLUMNS = [
    "BillNo",
    "Outlet_Name",
    "Order_Datetime",
    "Group",
    "Order_Type",
    "Item",
    "Price",
    "Quantity",
]


def load_dataset() -> pd.DataFrame:
    if not DATA_FILE.is_file():
        raise FileNotFoundError(
            f"Dashboard dataset was not found at {DATA_FILE}. "
            "Place data.xlsx in the backend directory or set DASHBOARD_DATA_FILE."
        )

    data = pd.read_excel(
        DATA_FILE, usecols=REQUIRED_COLUMNS, engine="calamine"
    )
    missing_columns = sorted(set(REQUIRED_COLUMNS) - set(data.columns))
    if missing_columns:
        raise ValueError(
            "Dataset is missing required columns: " + ", ".join(missing_columns)
        )

    for column in ("Outlet_Name", "Group", "Order_Type", "Item"):
        data[column] = data[column].astype("string").str.strip()
        data[column] = data[column].replace("", pd.NA)

    data["Order_Datetime"] = pd.to_datetime(
        data["Order_Datetime"], errors="coerce"
    )
    data["Price"] = pd.to_numeric(data["Price"], errors="coerce")
    data["Quantity"] = pd.to_numeric(data["Quantity"], errors="coerce")
    numeric_columns = ["Price", "Quantity"]
    data[numeric_columns] = data[numeric_columns].replace(
        [float("inf"), float("-inf")], float("nan")
    ).fillna(0)
    data["Revenue"] = (
        data["Price"] * data["Quantity"]
    ).replace([float("inf"), float("-inf")], float("nan")).fillna(0)
    return data


df = load_dataset()

app = FastAPI(title="Business Analytics Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def filter_data(
    outlet: Optional[str] = None,
    order_type: Optional[str] = None,
    category: Optional[str] = None,
) -> pd.DataFrame:
    data = df
    if outlet:
        data = data[data["Outlet_Name"] == outlet]
    if order_type:
        data = data[data["Order_Type"] == order_type]
    if category:
        data = data[data["Group"] == category]
    return data


def get_summary(data: pd.DataFrame) -> dict:
    revenue = float(data["Revenue"].sum())
    orders = int(data["BillNo"].nunique())
    quantity = float(data["Quantity"].sum())
    return {
        "total_records": int(len(data)),
        "total_orders": orders,
        "total_revenue": round(revenue, 2),
        "total_quantity_sold": round(quantity, 2),
        "total_items_sold": round(quantity, 2),
        "average_order_value": round(revenue / orders, 2) if orders else 0,
    }


def get_filter_options() -> dict:
    return {
        "outlets": sorted(df["Outlet_Name"].dropna().unique().tolist()),
        "order_types": sorted(df["Order_Type"].dropna().unique().tolist()),
        "categories": sorted(df["Group"].dropna().unique().tolist()),
    }


def get_revenue_breakdown(
    data: pd.DataFrame, column: str, label: str
) -> list[dict]:
    grouped = (
        data.groupby(column, dropna=True, observed=True)["Revenue"]
        .sum()
        .reset_index()
        .sort_values("Revenue", ascending=False, kind="stable")
    )
    return [
        {label: str(row[column]), "revenue": round(float(row["Revenue"]), 2)}
        for _, row in grouped.iterrows()
    ]


def get_revenue_trend(data: pd.DataFrame) -> list[dict]:
    dated_data = data.loc[data["Order_Datetime"].notna()].copy()
    dated_data["month"] = dated_data["Order_Datetime"].dt.to_period("M").astype(str)
    grouped = dated_data.groupby("month", observed=True)["Revenue"].sum().sort_index()
    return [
        {"month": month, "revenue": round(float(revenue), 2)}
        for month, revenue in grouped.items()
    ]


def get_top_selling_items(data: pd.DataFrame) -> list[dict]:
    grouped = (
        data.groupby("Item", dropna=True, observed=True)
        .agg(quantity_sold=("Quantity", "sum"), revenue=("Revenue", "sum"))
        .sort_values("quantity_sold", ascending=False, kind="stable")
        .head(10)
        .reset_index()
    )
    return [
        {
            "item": str(row["Item"]),
            "quantity_sold": round(float(row["quantity_sold"]), 2),
            "revenue": round(float(row["revenue"]), 2),
        }
        for _, row in grouped.iterrows()
    ]


def build_dashboard(data: pd.DataFrame) -> dict:
    return {
        "summary": get_summary(data),
        "filters": get_filter_options(),
        "revenue_trend": get_revenue_trend(data),
        "outlet_sales": get_revenue_breakdown(data, "Outlet_Name", "outlet"),
        "category_sales": get_revenue_breakdown(data, "Group", "category"),
        "order_type_sales": get_revenue_breakdown(
            data, "Order_Type", "order_type"
        ),
        "top_items": get_top_selling_items(data),
    }


@app.get("/")
def home() -> dict:
    return {"message": "Business Analytics Dashboard API is running!"}


@app.get("/api/filters")
def filters() -> dict:
    return get_filter_options()


@app.get("/api/dashboard")
def dashboard(
    outlet: Optional[str] = Query(default=None),
    order_type: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
) -> dict:
    return build_dashboard(filter_data(outlet, order_type, category))


@app.get("/api/summary")
def summary(
    outlet: Optional[str] = Query(default=None),
    order_type: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
) -> dict:
    return get_summary(filter_data(outlet, order_type, category))


@app.get("/api/revenue-trend")
def revenue_trend(
    outlet: Optional[str] = Query(default=None),
    order_type: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
) -> list[dict]:
    return get_revenue_trend(filter_data(outlet, order_type, category))


@app.get("/api/revenue-by-outlet")
@app.get("/api/outlet-sales", include_in_schema=False)
def outlet_sales(
    outlet: Optional[str] = Query(default=None),
    order_type: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
) -> list[dict]:
    return get_revenue_breakdown(
        filter_data(outlet, order_type, category), "Outlet_Name", "outlet"
    )


@app.get("/api/revenue-by-category")
@app.get("/api/category-sales", include_in_schema=False)
def category_sales(
    outlet: Optional[str] = Query(default=None),
    order_type: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
) -> list[dict]:
    return get_revenue_breakdown(
        filter_data(outlet, order_type, category), "Group", "category"
    )


@app.get("/api/revenue-by-order-type")
def order_type_sales(
    outlet: Optional[str] = Query(default=None),
    order_type: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
) -> list[dict]:
    return get_revenue_breakdown(
        filter_data(outlet, order_type, category), "Order_Type", "order_type"
    )


@app.get("/api/top-selling-items")
def top_selling_items(
    outlet: Optional[str] = Query(default=None),
    order_type: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
) -> list[dict]:
    return get_top_selling_items(filter_data(outlet, order_type, category))
