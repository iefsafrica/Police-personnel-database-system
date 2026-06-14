# Police Personnel Database — Frontend Integration Guide

> **Base URL (dev):** `http://localhost:8000`  
> **Base URL (prod):** `https://nigeria-police-personnel-database.vercel.app` *(or your deployed URL)*  
> **Auth mechanism:** JWT token stored client-side, passed in `Authorization: Bearer <token>` header.  
> **Note:** The `/api/admin/auth/me` (Verify Session) endpoint additionally requires an `x-user-id` header alongside the token.

---

## 1. Folder structure to create in your frontend

```
src/
├── api/
│   ├── client.ts           ← axios base instance + interceptors
│   ├── authApi.ts          ← raw fetch functions for Auth module
│   ├── employeesApi.ts     ← raw fetch functions for Personnel Management
│   ├── verificationApi.ts  ← raw fetch functions for Verification module
│   └── importApi.ts        ← raw fetch functions for Import module
│
├── hooks/
│   ├── useAuth.ts          ← React Query hooks for Auth
│   ├── useEmployees.ts     ← React Query hooks for Personnel Management
│   ├── useVerification.ts  ← React Query hook for NIN verification
│   └── useImport.ts        ← React Query hook for bulk import
│
└── types/
    └── api.types.ts        ← All shared TypeScript types
```

---

## 2. TypeScript Types (`src/types/api.types.ts`)

```ts
// ─── SHARED ────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  data?: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── AUTH ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: "admin" | "superadmin" | "commander" | "officer";
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPermission {
  resource: string;
  action: string;
  is_allowed: boolean;
}

// POST /api/admin/auth/login
export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  requiresOTP: boolean; // always true on success — OTP is sent to email
}

// POST /api/admin/auth/login/verify-otp
export interface VerifyOtpRequest {
  username?: string;
  email?: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  token: string; // JWT — store this for all subsequent requests
}

// GET /api/admin/auth/me
export interface SessionResponse {
  success: boolean;
  data: {
    user: AdminUser;
    permissions: AdminPermission[];
  };
}

// POST /api/admin/init
export interface InitAdminResponse {
  success: boolean;
  message: string;
  data: {
    superAdmin: AdminUser;
    permissionsCount: number;
  };
}

// ─── VERIFICATION ────────────────────────────────────────────────────────────

// POST /api/verify/nin
export interface VerifyNinRequest {
  nin: string; // must be exactly 11 digits
}

export interface NinData {
  firstname?: string;
  surname?: string;
  middlename?: string;
  gender?: string;
  telephoneno?: string;
  birthdate?: string;
  state_of_origin?: string;
  residence_address?: string;
  residence_state?: string;
  residence_lga?: string;
  profession?: string;
  maritalstatus?: string;
  [key: string]: unknown; // extra fields from NIMC API
}

export interface VerifyNinResponse {
  success: boolean;
  verified: boolean;
  registration_id: string; // use this in subsequent registration steps
  message: string;
  data: NinData | null; // null if NIN could not be verified
}

// ─── IMPORT ─────────────────────────────────────────────────────────────────

// POST /api/admin/import  (multipart/form-data, field name = "file")
export interface ImportValidationStatus {
  profileCompleteness: number;       // 0–100
  profileCompletenessMessage: string;
  missingFields: string[];
  ninSubmitted: boolean;
  ninVerified: boolean;
  ninStatus: string;
  bvnSubmitted: boolean;
  bvnStatus: string;
  nameTallyStatus: string;
  validationSummary: string;
}

export interface ImportedEmployee {
  rowNumber: number;
  registrationId: string;
  name: string;
  email: string;
  employee: Record<string, unknown>; // raw DB row
  validationStatus: ImportValidationStatus;
}

export interface FailedImportRow {
  rowNumber: number;
  email: string;
  error: string;
  debugRowKeys: string[];
  debugRowSample: string;
}

export interface BulkImportResponse {
  success: boolean;
  message: string;
  summary: {
    totalRows: number;
    successful: number;
    failed: number;
  };
  data: ImportedEmployee[];
  errors: FailedImportRow[];
}

// ─── EMPLOYEES ───────────────────────────────────────────────────────────────

export interface Employee {
  id: string;                         // e.g. "NPF123456"
  name: string;
  email: string;
  department: string;
  position: string;
  status: "active" | "inactive";
  join_date: string;
  hire_date?: string;
  date_of_birth?: string;
  marital_status?: string;
  gender?: string;
  state_of_origin?: string;
  lga_origin?: string;
  job_title?: string;
  assignment_status?: string;
  location?: string;
  zone?: string;
  supervisor?: string;
  command?: string;
  grade_category?: string;
  grade?: string;
  step?: string;
  salary?: number;
  residence_address?: string;
  contact_address?: string;
  telephone_number?: string;
  nationality?: string;
  bank_name?: string;
  sort_code?: string;
  account_number?: string;
  pfa_name?: string;
  pin_number?: string;
  payroll_group?: string;
  staff_category?: string;
  date_terminated?: string;
  legacy_id?: string;
  assignment_start_date?: string;
  person_start_date?: string;
  date_of_last_promotion?: string;
  unit?: string;
  organization_name?: string;
  employee_type?: string;
  bvn?: string;
  tax_id?: string;
  registration_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// GET /api/admin/employees
export interface GetEmployeesResponse {
  success: boolean;
  data: {
    employees: Employee[];
    pagination: PaginationMeta;
  };
}

// GET /api/admin/employees/:id
export interface GetEmployeeByIdResponse {
  success: boolean;
  data: Employee;
}

// PATCH /api/admin/employees/:id
// Body: any subset of Employee fields (except id, created_at, updated_at)
export type UpdateEmployeeRequest = Partial<Omit<Employee, "id" | "created_at" | "updated_at">>;

export interface UpdateEmployeeResponse {
  success: boolean;
  message: string;
  data: Employee;
}

// DELETE /api/admin/employees/:id
export interface DeleteEmployeeResponse {
  success: boolean;
  message: string;
}

// ─── PENDING EMPLOYEES ───────────────────────────────────────────────────────

export interface PendingEmployee {
  id: number;
  registration_id: string;
  surname: string;
  firstname: string;
  email: string;
  department?: string;
  position?: string;
  status: "pending_approval";
  source: "form" | "import";
  hire_date?: string;
  date_of_birth?: string;
  marital_status?: string;
  gender?: string;
  state_of_origin?: string;
  lga_origin?: string;
  job_title?: string;
  assignment_status?: string;
  location?: string;
  zone?: string;
  supervisor?: string;
  command?: string;
  grade_category?: string;
  grade?: string;
  step?: string;
  salary?: number;
  residence_address?: string;
  contact_address?: string;
  telephone_number?: string;
  nationality?: string;
  bank_name?: string;
  sort_code?: string;
  account_number?: string;
  pfa_name?: string;
  pin_number?: string;
  payroll_group?: string;
  staff_category?: string;
  bvn?: string;
  tax_id?: string;
  missing_fields?: ImportValidationStatus; // validation snapshot from import
  metadata?: Record<string, unknown>;
  submission_date?: string;
  created_at: string;
  updated_at: string;
}

// GET /api/admin/pending
export interface GetPendingEmployeesResponse {
  success: boolean;
  data: {
    employees: PendingEmployee[];
    pagination: PaginationMeta;
  };
}

// PATCH /api/admin/pending/:registration_id/approve
export interface ApprovePendingEmployeeResponse {
  success: boolean;
  message: string;
  data: Employee; // the newly created active employee record
}
```

---

## 3. Axios Client (`src/api/client.ts`)

```ts
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ── Request interceptor: attach JWT + x-user-id on every request ───────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  const userId = localStorage.getItem("admin_user_id");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (userId) {
    config.headers["x-user-id"] = userId;
  }

  return config;
});

// ── Response interceptor: auto-redirect on 401 ────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user_id");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

> **Tip for Cursor:** When generating API calls, always import `apiClient` from `@/api/client`. Never create new axios instances.

---

## 4. Auth API Service (`src/api/authApi.ts`)

```ts
import { apiClient } from "./client";
import type {
  LoginRequest, LoginResponse,
  VerifyOtpRequest, VerifyOtpResponse,
  SessionResponse, InitAdminResponse,
} from "@/types/api.types";

// ── STEP 1 ──────────────────────────────────────────────────────────────────
// POST /api/admin/auth/login
// Validates credentials + triggers OTP email. Does NOT return a token yet.
// On success: requiresOTP === true  → show the OTP input screen.
export async function loginAdmin(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(
    "/api/admin/auth/login",
    body
  );
  return data;
}

// ── STEP 2 ──────────────────────────────────────────────────────────────────
// POST /api/admin/auth/login/verify-otp
// Submits the OTP from the user's email. Returns JWT token on success.
// After success: store token + user id in localStorage.
export async function verifyOtp(body: VerifyOtpRequest): Promise<VerifyOtpResponse> {
  const { data } = await apiClient.post<VerifyOtpResponse>(
    "/api/admin/auth/login/verify-otp",
    body
  );
  return data;
}

// ── SESSION CHECK ────────────────────────────────────────────────────────────
// GET /api/admin/auth/me
// Requires: Authorization header (auto-attached by interceptor)
//           x-user-id header (auto-attached by interceptor)
// Returns the logged-in admin's profile + their permissions array.
export async function getSession(): Promise<SessionResponse> {
  const { data } = await apiClient.get<SessionResponse>("/api/admin/auth/me");
  return data;
}

// ── LOGOUT (client-side only) ─────────────────────────────────────────────
// There is no server-side logout endpoint in the current scope.
// Call this function and then redirect to /login.
export function logoutAdmin(): void {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user_id");
}

// ── SETUP (run once on first deploy) ─────────────────────────────────────────
// POST /api/admin/init
// Seeds the default superadmin account + role permissions.
// Should only be called once. Safe to call multiple times (idempotent).
export async function initAdmin(): Promise<InitAdminResponse> {
  const { data } = await apiClient.post<InitAdminResponse>("/api/admin/init");
  return data;
}
```

---

## 5. Verification API Service (`src/api/verificationApi.ts`)

```ts
import { apiClient } from "./client";
import type { VerifyNinRequest, VerifyNinResponse } from "@/types/api.types";

// POST /api/verify/nin
// Called at the START of the registration flow.
// Returns registration_id — save this; it is required for all subsequent
// registration steps (personal info, employment info, documents).
//
// Two possible outcomes:
//   verified === true  → NIN found in NIMC; data pre-filled automatically.
//   verified === false → NIN not found; user must fill the form manually.
//                        The registration_id is still returned so the flow can continue.
export async function verifyNin(
  body: VerifyNinRequest
): Promise<VerifyNinResponse> {
  const { data } = await apiClient.post<VerifyNinResponse>(
    "/api/verify/nin",
    body
  );
  return data;
}
```

---

## 6. Import API Service (`src/api/importApi.ts`)

```ts
import { apiClient } from "./client";
import type { BulkImportResponse } from "@/types/api.types";

// POST /api/admin/import
// Accepts a CSV or Excel (.xlsx / .xls) file.
// Must be sent as multipart/form-data with the file under the key "file".
//
// Required columns (at least one name column + email):
//   FirstName / First Name / first_name
//   Surname / Last Name / last_name
//   Email / Email Address / email_address
//   (or a combined "Employee Name" / "Full Name" column)
//
// Optional but recommended columns:
//   Staff ID / EmploymentIdNo    → used as Registration ID (auto-generated if missing)
//   Department, Position, Grade, Step, Command, Zone, Location,
//   Hire Date, Date of Birth, Gender, Marital Status, State of Origin,
//   LGA, Bank Name, Account Number, PFA Name, BVN, NIN, Salary, etc.
//
// Returns per-row success/failure summary.
export async function bulkImportEmployees(
  file: File,
  onUploadProgress?: (percent: number) => void
): Promise<BulkImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<BulkImportResponse>(
    "/api/admin/import",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (onUploadProgress && event.total) {
          onUploadProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    }
  );
  return data;
}
```

---

## 7. Employees API Service (`src/api/employeesApi.ts`)

```ts
import { apiClient } from "./client";
import type {
  GetEmployeesResponse,
  GetEmployeeByIdResponse,
  UpdateEmployeeRequest,
  UpdateEmployeeResponse,
  DeleteEmployeeResponse,
  GetPendingEmployeesResponse,
  ApprovePendingEmployeeResponse,
} from "@/types/api.types";

// ── ACTIVE EMPLOYEES ─────────────────────────────────────────────────────────

// GET /api/admin/employees?page=1&limit=10
// Returns paginated list of employees with status = "active".
export async function getAllEmployees(
  page = 1,
  limit = 10
): Promise<GetEmployeesResponse> {
  const { data } = await apiClient.get<GetEmployeesResponse>(
    "/api/admin/employees",
    { params: { page, limit } }
  );
  return data;
}

// GET /api/admin/employees/:id
// Returns full profile of a single employee by their ID (e.g. "NPF123456").
export async function getEmployeeById(
  id: string
): Promise<GetEmployeeByIdResponse> {
  const { data } = await apiClient.get<GetEmployeeByIdResponse>(
    `/api/admin/employees/${id}`
  );
  return data;
}

// PATCH /api/admin/employees/:id
// Updates any writable fields on the employee.
// Fields NOT allowed: id, created_at, updated_at (ignored server-side).
// Date fields (hire_date, date_of_birth, etc.) should be ISO strings: "2024-01-15".
export async function updateEmployee(
  id: string,
  updates: UpdateEmployeeRequest
): Promise<UpdateEmployeeResponse> {
  const { data } = await apiClient.patch<UpdateEmployeeResponse>(
    `/api/admin/employees/${id}`,
    updates
  );
  return data;
}

// DELETE /api/admin/employees/:id
// Hard-deletes the employee record. This is irreversible.
export async function deleteEmployee(
  id: string
): Promise<DeleteEmployeeResponse> {
  const { data } = await apiClient.delete<DeleteEmployeeResponse>(
    `/api/admin/employees/${id}`
  );
  return data;
}

// ── PENDING EMPLOYEES ─────────────────────────────────────────────────────────

// GET /api/admin/pending?page=1&limit=10
// Returns paginated list of employees awaiting admin approval.
// These come from either the self-registration form or bulk import.
export async function getPendingEmployees(
  page = 1,
  limit = 10
): Promise<GetPendingEmployeesResponse> {
  const { data } = await apiClient.get<GetPendingEmployeesResponse>(
    "/api/admin/pending",
    { params: { page, limit } }
  );
  return data;
}

// PATCH /api/admin/pending/:registration_id/approve
// Promotes a pending employee to the active employees table.
// Generates a new NPF###### employee ID.
// Sends an approval email to the employee.
// Deletes the record from pending_employees.
// Returns the newly created active employee record.
export async function approvePendingEmployee(
  registrationId: string
): Promise<ApprovePendingEmployeeResponse> {
  const { data } = await apiClient.patch<ApprovePendingEmployeeResponse>(
    `/api/admin/pending/${encodeURIComponent(registrationId)}/approve`
  );
  return data;
}
```

---

## 8. React Query Hooks

### `src/hooks/useAuth.ts`

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation"; // or "next/router" for pages router
import {
  loginAdmin,
  verifyOtp,
  getSession,
  logoutAdmin,
  initAdmin,
} from "@/api/authApi";
import type { LoginRequest, VerifyOtpRequest } from "@/types/api.types";

// Query key constants
export const AUTH_KEYS = {
  session: ["auth", "session"] as const,
};

// ── Verify active session ─────────────────────────────────────────────────────
// Use this in your layout/protected routes to gate access.
// Automatically disabled when no token is present.
export function useSession() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("admin_token")
      : null;

  return useQuery({
    queryKey: AUTH_KEYS.session,
    queryFn: getSession,
    enabled: Boolean(token),         // only runs if logged in
    retry: false,                    // don't retry on 401
    staleTime: 5 * 60 * 1000,       // consider fresh for 5 minutes
  });
}

// ── Step 1: Submit username/email + password ──────────────────────────────────
// On success, an OTP is emailed to the user.
// Show an OTP input field after this mutation succeeds.
export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginRequest) => loginAdmin(body),
  });
}

// ── Step 2: Submit OTP ────────────────────────────────────────────────────────
// On success, persist the JWT token + user id, then redirect to dashboard.
export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (body: VerifyOtpRequest) => verifyOtp(body),
    onSuccess: async (response) => {
      if (response.success && response.token) {
        // Decode the JWT payload to get the user ID
        const payload = JSON.parse(atob(response.token.split(".")[1]!));

        localStorage.setItem("admin_token", response.token);
        localStorage.setItem("admin_user_id", String(payload.id));

        // Pre-fill session cache so useSession doesn't refetch immediately
        await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.session });

        router.push("/dashboard");
      }
    },
  });
}

// ── Logout ────────────────────────────────────────────────────────────────────
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const logout = () => {
    logoutAdmin();
    queryClient.clear();
    router.push("/login");
  };

  return { logout };
}

// ── One-time DB seed (run from a setup page) ──────────────────────────────────
export function useInitAdmin() {
  return useMutation({
    mutationFn: initAdmin,
  });
}
```

---

### `src/hooks/useVerification.ts`

```ts
import { useMutation } from "@tanstack/react-query";
import { verifyNin } from "@/api/verificationApi";
import type { VerifyNinRequest } from "@/types/api.types";

// Use this at the first step of the employee registration form.
//
// Usage pattern:
//   const { mutate, isPending, data, isError } = useVerifyNin();
//   mutate({ nin: "12345678901" });
//
//   After success:
//     data.registration_id  ← store this in component state / context
//     data.verified         ← if true, pre-fill form fields from data.data
//     data.verified === false → still proceed, let user fill manually
export function useVerifyNin() {
  return useMutation({
    mutationFn: (body: VerifyNinRequest) => verifyNin(body),
  });
}
```

---

### `src/hooks/useImport.ts`

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkImportEmployees } from "@/api/importApi";

// Use this on the bulk import page.
//
// Usage pattern:
//   const { mutate, isPending, data } = useBulkImport();
//   mutate({ file: selectedFile, onProgress: setPercent });
//
//   data.summary.successful  ← how many were imported
//   data.summary.failed      ← how many rows had errors
//   data.errors              ← array of per-row error messages
//   data.data                ← array of successfully imported employees
export function useBulkImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => bulkImportEmployees(file, onProgress),

    onSuccess: () => {
      // Imported employees land in pending_employees, so invalidate that list
      queryClient.invalidateQueries({ queryKey: ["employees", "pending"] });
    },
  });
}
```

---

### `src/hooks/useEmployees.ts`

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getPendingEmployees,
  approvePendingEmployee,
} from "@/api/employeesApi";
import type { UpdateEmployeeRequest } from "@/types/api.types";

// Query key factory
export const EMPLOYEE_KEYS = {
  all: ["employees"] as const,
  lists: () => [...EMPLOYEE_KEYS.all, "list"] as const,
  list: (page: number, limit: number) =>
    [...EMPLOYEE_KEYS.lists(), { page, limit }] as const,
  details: () => [...EMPLOYEE_KEYS.all, "detail"] as const,
  detail: (id: string) => [...EMPLOYEE_KEYS.details(), id] as const,
  pending: (page: number, limit: number) =>
    ["employees", "pending", { page, limit }] as const,
};

// ── GET all active employees (paginated) ─────────────────────────────────────
export function useEmployees(page = 1, limit = 10) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.list(page, limit),
    queryFn: () => getAllEmployees(page, limit),
    placeholderData: (prev) => prev, // keep showing previous page while loading
  });
}

// ── GET single employee ───────────────────────────────────────────────────────
export function useEmployee(id: string) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.detail(id),
    queryFn: () => getEmployeeById(id),
    enabled: Boolean(id),
  });
}

// ── UPDATE employee ───────────────────────────────────────────────────────────
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateEmployeeRequest;
    }) => updateEmployee(id, updates),

    onSuccess: (_, { id }) => {
      // Invalidate the individual employee cache + the list
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() });
    },
  });
}

// ── DELETE employee ───────────────────────────────────────────────────────────
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() });
    },
  });
}

// ── GET pending employees (paginated) ─────────────────────────────────────────
export function usePendingEmployees(page = 1, limit = 10) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.pending(page, limit),
    queryFn: () => getPendingEmployees(page, limit),
    placeholderData: (prev) => prev,
  });
}

// ── APPROVE pending employee ──────────────────────────────────────────────────
export function useApprovePendingEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (registrationId: string) =>
      approvePendingEmployee(registrationId),

    onSuccess: () => {
      // Refresh both pending list and active employees list
      queryClient.invalidateQueries({ queryKey: ["employees", "pending"] });
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() });
    },
  });
}
```

---

## 9. Complete Login Flow (step-by-step)

```
User enters username + password
        │
        ▼
useLogin().mutate({ username, password })
        │
        │ POST /api/admin/auth/login
        │ ← success: { requiresOTP: true }
        │
        ▼
Show OTP input (user checks their email)
        │
        ▼
useVerifyOtp().mutate({ username, otp })
        │
        │ POST /api/admin/auth/login/verify-otp
        │ ← success: { token: "eyJ..." }
        │
        ▼
Store token in localStorage  ← apiClient interceptor will pick this up
Store user id in localStorage
        │
        ▼
Redirect to /dashboard
useSession() now works — loads user profile + permissions
```

---

## 10. Environment variable

Add to your frontend `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production:
```
NEXT_PUBLIC_API_URL=https://nigeria-police-personnel-database.vercel.app
```

---

## 11. Required npm packages

If not already installed in your frontend:

```bash
npm install @tanstack/react-query axios
# or
pnpm add @tanstack/react-query axios
```

Make sure `QueryClientProvider` wraps your app:

```tsx
// src/app/layout.tsx or src/main.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

## 12. Quick endpoint reference card

| Module | Method | Path | Hook | Auth required |
|---|---|---|---|---|
| Auth | POST | `/api/admin/init` | `useInitAdmin()` | No |
| Auth | POST | `/api/admin/auth/login` | `useLogin()` | No |
| Auth | POST | `/api/admin/auth/login/verify-otp` | `useVerifyOtp()` | No |
| Auth | GET | `/api/admin/auth/me` | `useSession()` | Yes (JWT + x-user-id) |
| Verification | POST | `/api/verify/nin` | `useVerifyNin()` | No |
| Import | POST | `/api/admin/import` | `useBulkImport()` | Yes |
| Personnel | GET | `/api/admin/employees?page=&limit=` | `useEmployees(page, limit)` | Yes |
| Personnel | GET | `/api/admin/employees/:id` | `useEmployee(id)` | Yes |
| Personnel | PATCH | `/api/admin/employees/:id` | `useUpdateEmployee()` | Yes |
| Personnel | DELETE | `/api/admin/employees/:id` | `useDeleteEmployee()` | Yes |
| Personnel | GET | `/api/admin/pending?page=&limit=` | `usePendingEmployees(page, limit)` | Yes |
| Personnel | PATCH | `/api/admin/pending/:registration_id/approve` | `useApprovePendingEmployee()` | Yes |
