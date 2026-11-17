import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../core/api/client";
import { useAuthStore, UserProfile } from "../../stores/authStore";
import { PassengerInput, SavedPassenger } from "./passengerModel";
import { useRef } from "react";

export const passengersKey = (owner?: string) => ["passengers", owner] as const;
export const profileKey = (owner?: string) =>
  ["passenger-profile", owner] as const;
export function usePassengers() {
  const owner = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: passengersKey(owner),
    enabled: Boolean(owner),
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<SavedPassenger[]> => {
      const res = await apiClient.get("/users/passengers", { signal });
      return res.data.data;
    },
  });
}
export function usePassengerProfile() {
  const owner = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: profileKey(owner),
    enabled: Boolean(owner),
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<UserProfile> => {
      const res = await apiClient.get("/users/profile", { signal });
      return res.data.data;
    },
  });
}
export function useSavePassenger(id?: string) {
  const owner = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();
  const lastRequest = useRef({ body: "", key: "" });
  return useMutation({
    mutationFn: async (input: PassengerInput): Promise<SavedPassenger> => {
      const body = JSON.stringify(input);
      if (lastRequest.current.body !== body) {
        lastRequest.current = {
          body,
          key: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const random = Math.floor(Math.random() * 16);
            return (c === "x" ? random : (random & 3) | 8).toString(16);
          }),
        };
      }
      const response = id
        ? await apiClient.patch(`/users/passengers/${id}`, input)
        : await apiClient.post("/users/passengers", input, {
            headers: { "Idempotency-Key": lastRequest.current.key },
          });
      return response.data.data;
    },
    onSuccess: async (saved) => {
      if (useAuthStore.getState().user?.id !== owner) return;
      client.setQueryData<SavedPassenger[]>(passengersKey(owner), (current) =>
        current
          ? [...current.filter((p) => p.id !== saved.id), saved]
          : [saved],
      );
      await client.invalidateQueries({ queryKey: passengersKey(owner) });
    },
  });
}
export type PersonalInput = Pick<
  UserProfile,
  | "firstName"
  | "lastName"
  | "dateOfBirth"
  | "gender"
  | "state"
  | "personalPhone"
  | "contactEmail"
>;
export function useSavePersonalProfile() {
  const owner = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: PersonalInput): Promise<UserProfile> =>
      (await apiClient.patch("/users/profile", input)).data.data,
    onSuccess: (profile) => {
      if (useAuthStore.getState().user?.id !== owner) return;
      client.setQueryData(profileKey(owner), profile);
      useAuthStore.getState().updateUser(profile);
    },
  });
}
