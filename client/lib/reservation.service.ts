//reservations.service
import api from "./api";


export const createReservation = async (data: {
  fullName: string;
  phoneNumber: string;
  voyageId: string;
  nbPlaces: number; // Modifié ici aussi
}) => {
  const res = await api.post("/reservations", data);
  return res.data;
};
export const getMyReservations = async () => {
  const res = await api.get("/reservations/me");
  return res.data;
};

export const cancelReservation = async (id: string) => {
  const res = await api.patch(`/reservations/${id}/cancel`);
  return res.data;
};
