import { useMutation } from "@tanstack/react-query";

import { forgotPassword } from "@/features/auth/services/auth-api";
import type { ForgotPasswordInput } from "@/features/auth/types";

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => forgotPassword(input),
  });
}
