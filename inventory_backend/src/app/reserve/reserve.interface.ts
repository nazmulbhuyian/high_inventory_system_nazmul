export interface IReserveInput {
  userId: number;
  dropId: number;
}

export interface IReservationRow {
  id: number;
  user_id: number;
  drop_id: number;
  status: "ACTIVE" | "EXPIRED" | "COMPLETED";
  expires_at: Date;
  created_at: Date;
}
