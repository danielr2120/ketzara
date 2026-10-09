export interface Option {
  value: string;
  label: string;
}

export interface Meta {
  payment_methods: Option[];
  order_statuses: Option[];
}

export interface LoginResponse {
  access_token: string;
  username: string;
  expires_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  address: string;
  city: string | null;
  notes: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  active: boolean;
}

export interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number: string;
  tracking_code: string;
  created_at: string;
  updated_at: string;
  customer: Customer;
  payment_method: string;
  status: string;
  shipping_address: string;
  shipping_city: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  notes: string | null;
  items: OrderItem[];
}

export interface PublicOrder {
  order_number: string;
  created_at: string;
  updated_at: string;
  status: string;
  status_label: string;
  steps: Option[];
  items: { product_name: string; quantity: number; subtotal: number }[];
  shipping_cost: number;
  total: number;
}

export interface PublicOrderCreated extends PublicOrder {
  tracking_code: string;
}

export interface PublicProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
}

export interface PublicOrderInput {
  customer: CustomerInput;
  items: { product_id: number; quantity: number }[];
  payment_method: string;
  notes: string | null;
}

export interface OrderItemInput {
  product_id: number | null;
  product_name: string | null;
  quantity: number;
  unit_price: number;
}

export interface OrderInput {
  customer: CustomerInput;
  items: OrderItemInput[];
  payment_method: string;
  shipping_cost: number;
  notes: string | null;
}

export interface OrderSummary {
  id: number;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  payment_method: string;
  status: string;
  total: number;
}

export interface OrderPage {
  items: OrderSummary[];
  total: number;
  page: number;
  page_size: number;
  sales_total: number;
}

export interface OrderFilters {
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface DashboardSummary {
  orders_today: number;
  pending_orders: number;
  delivered_this_month: number;
  sales_today: number;
  sales_this_month: number;
  recent_orders: OrderSummary[];
}
