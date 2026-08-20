"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import type { LoginRequest, SignupRequest } from "@/types";

export function useLogin() {
  const loginWithCredentials = useAuthStore((s) => s.loginWithCredentials);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => loginWithCredentials(data.email, data.password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useSignup() {
  const register = useAuthStore((s) => s.register);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignupRequest) =>
      register(data.name, data.password, data.token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      queryClient.clear();
      router.push("/login");
    },
  });
}

export function useProfile() {
  const { setUser, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const user = await authService.getProfile();
      setUser(user);
      return user;
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
    initialData: undefined,
  });
}
