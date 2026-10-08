import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";

import { setRestoringSession } from "./src/features/auth/lib/session-restore-store";
import { server } from "./tests/unit/mocks/server";

// jsdom no implementa estas APIs, requeridas por Radix UI (Select, etc.) para
// manejar interacciones de puntero en tests.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
// En la app real AuthProvider marca el fin de la restauración de sesión al
// montar; los tests renderizan componentes sueltos sin AuthProvider, así que
// arrancan con la restauración ya resuelta (useAuthStatus). Los tests que
// necesitan el estado "restaurando" lo setean explícitamente.
beforeEach(() => setRestoringSession(false));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
