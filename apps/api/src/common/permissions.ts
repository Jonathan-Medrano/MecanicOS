export const Permission = {
  VIEW_CLIENTS:        "VIEW_CLIENTS",
  EDIT_CLIENTS:        "EDIT_CLIENTS",
  DELETE_CLIENTS:      "DELETE_CLIENTS",
  VIEW_VEHICLES:       "VIEW_VEHICLES",
  EDIT_VEHICLES:       "EDIT_VEHICLES",
  VIEW_ORDERS:         "VIEW_ORDERS",
  EDIT_ORDERS:         "EDIT_ORDERS",
  CHANGE_ORDER_STATUS: "CHANGE_ORDER_STATUS",
  VIEW_WHATSAPP:       "VIEW_WHATSAPP",
  SEND_WHATSAPP:       "SEND_WHATSAPP",
  MANAGE_EMPLOYEES:    "MANAGE_EMPLOYEES",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

export const MECHANIC_PERMISSIONS: Permission[] = [
  Permission.VIEW_CLIENTS,
  Permission.VIEW_VEHICLES,
  Permission.VIEW_ORDERS,
  Permission.CHANGE_ORDER_STATUS,
];

export const RECEPTIONIST_PERMISSIONS: Permission[] = [
  Permission.VIEW_CLIENTS,
  Permission.EDIT_CLIENTS,
  Permission.VIEW_VEHICLES,
  Permission.EDIT_VEHICLES,
  Permission.VIEW_ORDERS,
  Permission.EDIT_ORDERS,
  Permission.CHANGE_ORDER_STATUS,
  Permission.VIEW_WHATSAPP,
  Permission.SEND_WHATSAPP,
];
