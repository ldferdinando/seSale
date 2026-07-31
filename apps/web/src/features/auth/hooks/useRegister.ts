import { useMutation } from "@tanstack/react-query";

import { registerUser } from "@/features/auth/services/auth-api";
import type { RegisterInput } from "@/features/auth/types";

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => registerUser(input),
  });
}
