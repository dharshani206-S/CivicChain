import axios from "axios";
import type { Issue } from "@/types/issue";

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as unknown;
    if (data && typeof data === "object") {
      const maybeMessage = (data as { message?: unknown }).message;
      if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;

      const maybeError = (data as { error?: unknown }).error;
      if (typeof maybeError === "string" && maybeError.trim()) return maybeError;
    }

    if (typeof error.message === "string" && error.message.trim()) return error.message;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

export const toIssueArray = (data: unknown): Issue[] => {
  if (Array.isArray(data)) return data as Issue[];

  if (data && typeof data === "object") {
    const issues = (data as { issues?: unknown }).issues;
    if (Array.isArray(issues)) return issues as Issue[];
  }

  return [];
};

