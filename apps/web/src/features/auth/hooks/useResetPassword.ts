import { useMutation } from "@tanstack/react-query";

import { resetPassword } from "@/features/auth/services/auth-api";
import type { ResetPasswordInput } from "@/features/auth/types";

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  });
}
