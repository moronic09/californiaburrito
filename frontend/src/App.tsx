import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  IndianRupee,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import "./App.css";

const API_BASE = (
  import.meta.env.VITE_API_URL?.trim() || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

type Summary = {
  total_records: number;
  total_orders: number;
  total_revenue: number;
  total_quantity_sold: number;
  average_order_value: number;
};

type Filters = {
  outlets: string[];
  order_types: string[];
  categories: string[];
};

type RevenuePoint = { revenue: number };
type TrendPoint = RevenuePoint & { month: string };
type OutletPoint = RevenuePoint & { outlet: string };
type CategoryPoint = RevenuePoint & { category: string };
type OrderTypePoint = RevenuePoint & { order_type: string };
type ItemPoint = RevenuePoint & { item: string; quantity_sold: number };

type DashboardData = {
  summary: Summary;
  filters: Filters;
  revenue_trend: TrendPoint[];
  outlet_sales: OutletPoint[];
  category_sales: CategoryPoint[];
  order_type_sales: OrderTypePoint[];
  top_items: ItemPoint[];
};

type ActiveFilters = {
  outlet: string;
  order_type: string;
  category: string;
};

const numberFormat = new Intl.NumberFormat("en-IN");
const currencyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const compactCurrencyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

function money(value: number): string {
  return currencyFormat.format(value);
}

function compactMoney(value: number): string {
  return compactCurrencyFormat.format(value);
}

function ChartEmpty() {
  return <div className="chart-empty">No data for these filters</div>;
}

function App() {
  const [filters, setFilters] = useState<Filters>({
    outlets: [],
    order_types: [],
    categories: [],
  });
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    outlet: "",
    order_type: "",
    category: "",
  });
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (activeFilters.outlet) params.set("outlet", activeFilters.outlet);
    if (activeFilters.order_type) {
      params.set("order_type", activeFilters.order_type);
    }
    if (activeFilters.category) params.set("category", activeFilters.category);
    const query = params.toString();

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE}/api/dashboard${query ? `?${query}` : ""}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`The API returned HTTP ${response.status}.`);
        }

        const result = (await response.json()) as DashboardData;
        setDashboard(result);
        setFilters(result.filters);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        const detail =
          requestError instanceof Error ? ` ${requestError.message}` : "";
        setError(
          `Unable to load dashboard data. Check that the backend is running at ${API_BASE}.${detail}`,
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [activeFilters, retryCount]);

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);
  const connectionLabel = error
    ? "Connection issue"
    : loading
      ? dashboard
        ? "Updating"
        : "Connecting"
      : "Live data";

  const updateFilter = (key: keyof ActiveFilters, value: string) => {
    setActiveFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setActiveFilters({ outlet: "", order_type: "", category: "" });
  };

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <UtensilsCrossed size={21} />
          </div>
          <div>
            <p className="eyebrow">CALIFORNIA BURRITO · BUSINESS INTELLIGENCE</p>
            <h1>Sales Dashboard</h1>
            <p className="subtitle">
              A clear view of sales, orders and product performance.
            </p>
          </div>
        </div>
        <div className={`status ${error ? "status-error" : ""}`}>
          <span className="status-dot" />
          {connectionLabel}
        </div>
      </header>

      <section className="filter-panel" aria-labelledby="filters-title">
        <div className="filter-heading">
          <div>
            <h2 id="filters-title">Explore your sales</h2>
            <p>Refine every metric and chart with the same set of filters.</p>
          </div>
          <button
            className="reset-button"
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Reset filters
          </button>
        </div>

        <div className="filter-controls">
          <label>
            <span>Outlet</span>
            <select
              value={activeFilters.outlet}
              onChange={(event) => updateFilter("outlet", event.target.value)}
            >
              <option value="">All outlets</option>
              {filters.outlets.map((outlet) => (
                <option key={outlet} value={outlet}>
                  {outlet}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Order type</span>
            <select
              value={activeFilters.order_type}
              onChange={(event) => updateFilter("order_type", event.target.value)}
            >
              <option value="">All order types</option>
              {filters.order_types.map((orderType) => (
                <option key={orderType} value={orderType}>
                  {orderType}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select
              value={activeFilters.category}
              onChange={(event) => updateFilter("category", event.target.value)}
            >
              <option value="">All categories</option>
              {filters.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error && (
        <div className="error-message" role="alert">
          <div>
            <strong>Dashboard data is unavailable.</strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="retry-button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Retry
          </button>
        </div>
      )}

      {loading && !dashboard ? (
        <div className="loading" role="status">
          <span className="loading-spinner" />
          Loading dashboard data…
        </div>
      ) : dashboard ? (
        <>
          <section className="kpi-grid" aria-label="Sales summary">
            <article className="kpi-card">
              <div className="kpi-topline">
                <div className="kpi-icon blue">
                  <IndianRupee aria-hidden="true" />
                </div>
                <span className="kpi-period">Filtered total</span>
              </div>
              <p>Total revenue</p>
              <h2>{money(dashboard.summary.total_revenue)}</h2>
              <span className="kpi-caption">Price × quantity</span>
            </article>
            <article className="kpi-card">
              <div className="kpi-topline">
                <div className="kpi-icon purple">
                  <ShoppingBag aria-hidden="true" />
                </div>
                <span className="kpi-period">Distinct bills</span>
              </div>
              <p>Total orders</p>
              <h2>{numberFormat.format(dashboard.summary.total_orders)}</h2>
              <span className="kpi-caption">Counted by unique bill number</span>
            </article>
            <article className="kpi-card">
              <div className="kpi-topline">
                <div className="kpi-icon green">
                  <Package aria-hidden="true" />
                </div>
                <span className="kpi-period">All line items</span>
              </div>
              <p>Quantity sold</p>
              <h2>{numberFormat.format(dashboard.summary.total_quantity_sold)}</h2>
              <span className="kpi-caption">Total units across orders</span>
            </article>
            <article className="kpi-card">
              <div className="kpi-topline">
                <div className="kpi-icon orange">
                  <TrendingUp aria-hidden="true" />
                </div>
                <span className="kpi-period">Per distinct bill</span>
              </div>
              <p>Average order value</p>
              <h2>{money(dashboard.summary.average_order_value)}</h2>
              <span className="kpi-caption">Revenue ÷ unique bill numbers</span>
            </article>
          </section>

          <section className="chart-grid" aria-label="Sales charts">
            <article className="chart-card full-width">
              <div className="chart-heading">
                <div>
                  <span className="chart-kicker">OVER TIME</span>
                  <h3>Revenue trend</h3>
                </div>
                <span className="chart-description">Monthly revenue · INR</span>
              </div>
              {dashboard.revenue_trend.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={dashboard.revenue_trend}
                    margin={{ top: 8, right: 12, bottom: 4, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 5"
                      stroke="#e5dfd2"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#66645e", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tickFormatter={compactMoney}
                      tick={{ fill: "#66645e", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fffefa",
                        border: "1px solid #e5dfd2",
                        borderRadius: 10,
                        color: "#171717",
                      }}
                      labelStyle={{ color: "#171717" }}
                      formatter={(value) => [money(Number(value)), "Revenue"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#687653"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, fill: "#687653", stroke: "#fffefa" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty />
              )}
            </article>

            <article className="chart-card">
              <div className="chart-heading">
                <div>
                  <span className="chart-kicker">LOCATIONS</span>
                  <h3>Revenue by outlet</h3>
                </div>
                <Store size={18} aria-hidden="true" />
              </div>
              {dashboard.outlet_sales.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dashboard.outlet_sales}
                    layout="vertical"
                    margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 5"
                      stroke="#e5dfd2"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={compactMoney}
                      tick={{ fill: "#66645e", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="outlet"
                      width={110}
                      tick={{ fill: "#66645e", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fffefa",
                        border: "1px solid #e5dfd2",
                        borderRadius: 10,
                        color: "#171717",
                      }}
                      formatter={(value) => [money(Number(value)), "Revenue"]}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#687653"
                      radius={[0, 5, 5, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty />
              )}
            </article>

            <article className="chart-card">
              <div className="chart-heading">
                <div>
                  <span className="chart-kicker">PRODUCT MIX</span>
                  <h3>Revenue by category</h3>
                </div>
                <Package size={18} aria-hidden="true" />
              </div>
              {dashboard.category_sales.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dashboard.category_sales}
                    margin={{ top: 8, right: 8, bottom: 20, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 5"
                      stroke="#e5dfd2"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="category"
                      interval={0}
                      angle={-22}
                      textAnchor="end"
                      height={62}
                      tick={{ fill: "#66645e", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={compactMoney}
                      tick={{ fill: "#66645e", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={68}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fffefa",
                        border: "1px solid #e5dfd2",
                        borderRadius: 10,
                        color: "#171717",
                      }}
                      formatter={(value) => [money(Number(value)), "Revenue"]}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#b18a4a"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={42}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty />
              )}
            </article>

            <article className="chart-card">
              <div className="chart-heading">
                <div>
                  <span className="chart-kicker">FULFILMENT</span>
                  <h3>Revenue by order type</h3>
                </div>
                <UtensilsCrossed size={18} aria-hidden="true" />
              </div>
              {dashboard.order_type_sales.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dashboard.order_type_sales}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 5"
                      stroke="#e5dfd2"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="order_type"
                      tick={{ fill: "#66645e", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={compactMoney}
                      tick={{ fill: "#66645e", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={68}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fffefa",
                        border: "1px solid #e5dfd2",
                        borderRadius: 10,
                        color: "#171717",
                      }}
                      formatter={(value) => [money(Number(value)), "Revenue"]}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#8a7752"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={56}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty />
              )}
            </article>

            <article className="chart-card">
              <div className="chart-heading">
                <div>
                  <span className="chart-kicker">BEST SELLERS</span>
                  <h3>Top 10 best-selling items</h3>
                </div>
                <TrendingUp size={18} aria-hidden="true" />
              </div>
              {dashboard.top_items.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dashboard.top_items}
                    layout="vertical"
                    margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 5"
                      stroke="#e5dfd2"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => numberFormat.format(Number(value))}
                      tick={{ fill: "#66645e", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="item"
                      width={142}
                      tick={{ fill: "#66645e", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fffefa",
                        border: "1px solid #e5dfd2",
                        borderRadius: 10,
                        color: "#171717",
                      }}
                      formatter={(value) => [
                        numberFormat.format(Number(value)),
                        "Units sold",
                      ]}
                    />
                    <Bar
                      dataKey="quantity_sold"
                      name="Units sold"
                      fill="#687653"
                      radius={[0, 5, 5, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty />
              )}
            </article>
          </section>
          <p className="data-note">
            Revenue is calculated from item price × quantity. Order counts use
            distinct bill numbers.
          </p>
        </>
      ) : error ? null : (
        <div className="loading" role="status">
          Loading dashboard data…
        </div>
      )}

      <footer>
        <span className="footer-mark">
          <UtensilsCrossed size={14} aria-hidden="true" />
        </span>
        Business Analytics Dashboard
        <span className="footer-divider">·</span>
        Powered by FastAPI, Pandas &amp; Recharts
        {dashboard && (
          <span className="record-count">
            {numberFormat.format(dashboard.summary.total_records)} line items
          </span>
        )}
      </footer>
    </main>
  );
}

export default App;
