import { Suspense } from "react";

import { TransferenciaEnviadoContent } from "./TransferenciaEnviadoContent";

export default function TransferenciaEnviadoPage() {
  return (
    <Suspense fallback={null}>
      <TransferenciaEnviadoContent />
    </Suspense>
  );
}
