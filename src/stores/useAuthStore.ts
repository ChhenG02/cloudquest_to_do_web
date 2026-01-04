import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";

interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {

          const response = await axiosInstance.post("auth/login", {
            email,
            password,
          });

          const { accessToken, user } = response.data;

          if (!accessToken || !user) {
            console.error("Invalid login response:", response.data);
            throw new Error("Invalid response from server");
          }

          // Store in localStorage
          localStorage.setItem("token", accessToken);
          localStorage.setItem("user", JSON.stringify(user));

          // Update Zustand store
          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success(`Welcome back, ${user.username}!`);
        } catch (error: any) {
          console.error(
            "Login error details:",
            error.response?.data || error.message
          );

          const errorMessage = error.response?.data?.message || "Login failed";
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {

          const response = await axiosInstance.post("auth/signup", {
            username,
            email,
            password,
          });

          const { accessToken, user } = response.data;

          if (!accessToken || !user) {
            console.error("Invalid registration response:", response.data);
            throw new Error("Invalid response from server");
          }

          // Store in localStorage
          localStorage.setItem("token", accessToken);
          localStorage.setItem("user", JSON.stringify(user));

          // Update Zustand store
          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success("Account created successfully 🎉");
        } catch (error: any) {
          console.error(
            "Registration error:",
            error.response?.data || error.message
          );

          const errorMessage =
            error.response?.data?.message || "Registration failed";
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("auth-storage");

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });

        toast.success("Logged out successfully");
        window.location.href = "/login";
      },

      checkAuth: async () => {
        const token = localStorage.getItem("token");

        if (!token) {
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
          });
          return;
        }

        set({ isLoading: true });
        try {
          // Make request to checkauth endpoint
          const response = await axiosInstance.get("auth/checkauth");

          // Extract new token from response if provided
          const newToken = response.data.accessToken || token;

          // Extract user info from payload
          const payload = response.data.payload;
          let user = get().user; // Keep existing user by default

          if (payload) {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              user = {
                ...parsedUser,
                id: payload.sub || parsedUser.id,
                email: payload.email || parsedUser.email,
              };
            } else {
              // Create user from payload
              user = {
                id: payload.sub,
                email: payload.email,
                username: payload.email.split("@")[0],
                name: payload.email.split("@")[0],
              };
            }
          }

          // Update storage with new token if different
          if (newToken !== token) {
            localStorage.setItem("token", newToken);
          }

          if (user) {
            localStorage.setItem("user", JSON.stringify(user));
          }

          set({
            user,
            token: newToken,
            isAuthenticated: true,
            isLoading: false,
          });

        } catch (error: any) {
          console.error(
            "Checkauth error:",
            error.response?.data || error.message
          );

          // Token is invalid or expired
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });

          // Optional: Redirect to login if we're on a protected page
          if (
            window.location.pathname !== "/login" &&
            window.location.pathname !== "/register"
          ) {
            window.location.href = "/login";
          }
        }
      },

      clearError: () => set({ error: null }),

      setToken: (token: string) => {
        localStorage.setItem("token", token);
        set({ token });
      },

      setUser: (user: User) => {
        localStorage.setItem("user", JSON.stringify(user));
        set({ user });
      },
    }),
    {
      name: "auth-storage",
      // Only persist these fields
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
