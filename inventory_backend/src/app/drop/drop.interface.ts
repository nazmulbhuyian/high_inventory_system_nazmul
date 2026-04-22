export interface IDropCreateInput {
  name: string;
  price: number;
  total_stock: number;
  start_time: string;
}

export interface IDropResponse {
  id: number;
  name: string;
  price: number;
  total_stock: number;
  available_stock: number;
  start_time: Date;
  created_at: Date;
  latest_purchasers: string[];
}
