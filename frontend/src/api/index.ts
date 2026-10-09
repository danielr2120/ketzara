import type {
  Customer,
  DashboardSummary,
  LoginResponse,
  Meta,
  Order,
  OrderFilters,
  OrderInput,
  OrderPage,
  Product,
  ProductInput,
  PublicOrder,
  PublicOrderCreated,
  PublicOrderInput,
  PublicProduct,
} from "../types";
import { request, requestFile } from "./client";

export const authApi = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: { username, password } }),
};

export const publicApi = {
  trackOrder: (code: string) => request<PublicOrder>(`/public/orders/${encodeURIComponent(code)}`),
  products: () => request<PublicProduct[]>("/public/products"),
  createOrder: (data: PublicOrderInput) =>
    request<PublicOrderCreated>("/public/orders", { method: "POST", body: data }),
};

export const metaApi = {
  get: () => request<Meta>("/meta"),
};

export const dashboardApi = {
  summary: () => request<DashboardSummary>("/dashboard/summary"),
};

export const customersApi = {
  search: (search: string) => request<Customer[]>("/customers", { query: { search } }),
};

export const productsApi = {
  list: (active?: boolean) => request<Product[]>("/products", { query: { active } }),
  create: (data: ProductInput) => request<Product>("/products", { method: "POST", body: data }),
  update: (id: number, data: ProductInput) =>
    request<Product>(`/products/${id}`, { method: "PUT", body: data }),
};

export const ordersApi = {
  list: (filters: OrderFilters) => request<OrderPage>("/orders", { query: { ...filters } }),
  exportExcel: (filters: OrderFilters) => requestFile("/orders/export", { ...filters }),
  get: (id: number) => request<Order>(`/orders/${id}`),
  getByNumber: (number: string) => request<Order>(`/orders/number/${encodeURIComponent(number)}`),
  create: (data: OrderInput) => request<Order>("/orders", { method: "POST", body: data }),
  update: (id: number, data: OrderInput) =>
    request<Order>(`/orders/${id}`, { method: "PUT", body: data }),
  changeStatus: (id: number, status: string) =>
    request<Order>(`/orders/${id}/status`, { method: "PATCH", body: { status } }),
};
