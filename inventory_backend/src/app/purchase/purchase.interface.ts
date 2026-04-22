export interface IPurchaseInput {
  userId: number;
  dropId: number;
}

export interface IPurchaseRow {
  id: number;
  user_id: number;
  drop_id: number;
  created_at: Date;
}
