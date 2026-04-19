# FTTDDWA API Documentation

Base URL: `http://localhost:3000/api`

All authenticated endpoints require either:
- Cookie: `access_token` (set automatically on login)
- Header: `Authorization: Bearer <token>`

---

## Authentication

### POST /auth/login
Login and receive tokens.

**Request:**
```json
{
  "email": "admin@fttddwa.org",
  "password": "Admin@123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Super Admin",
      "email": "admin@fttddwa.org",
      "role": "SUPER_ADMIN",
      "roleId": 1
    }
  },
  "message": "Login successful"
}
```
Sets HttpOnly cookies: `access_token` (15 min), `refresh_token` (7 days).

**Errors:** `401` Invalid credentials, `429` Too many attempts

---

### POST /auth/refresh
Refresh access token using refresh token cookie.

**Response (200):** Sets new `access_token` cookie.

---

### POST /auth/logout
Revoke session.

**Response (200):** Clears auth cookies.

---

### GET /auth/me
Get current user with permissions.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Super Admin",
    "email": "admin@fttddwa.org",
    "role": { "name": "SUPER_ADMIN", "displayName": "Super Admin" },
    "permissions": ["members:read", "members:create", ...]
  }
}
```

---

## Members

### GET /members
List members with pagination and filters.

**Query params:**
- `page` (default: 1)
- `pageSize` (default: 20, max: 100)
- `search` - search by name, ID, phone
- `district` - filter by district
- `taluk` - filter by taluk
- `status` - ACTIVE | INACTIVE | SUSPENDED | EXPIRED

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### POST /members
Create a new member.

**Request:**
```json
{
  "name": "Ravi Kumar",
  "nameTamil": "ரவி குமார்",
  "position": "Member",
  "aadhaar": "123456789012",
  "address": "123 Main Street, Chennai",
  "district": "Chennai",
  "taluk": "Chennai North",
  "industry": "Tent & Decoration",
  "dateOfBirth": "1985-06-15",
  "phone": "9876543210",
  "email": "ravi@example.com",
  "photoUrl": "/uploads/members/photo.jpg"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "membershipId": "FTTD260001",
    "name": "Ravi Kumar",
    ...
  }
}
```

---

### GET /members/:id
Get member by ID.

---

### PATCH /members/:id
Update member (partial update).

---

### DELETE /members/:id
Delete member. Requires `members:delete` permission.

---

### GET /members/stats
Get member statistics.

**Query params:**
- `type=districts` - returns list of distinct districts
- `type=taluks&district=Chennai` - returns taluks for a district
- (no type) - returns full stats object

---

### GET /members/export?format=excel
Download member data as Excel file.

**Query params:** Same filters as GET /members

---

## Users

### GET /users
List all users. Requires `users:read`.

### POST /users
Create user. Requires `users:create`.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@fttddwa.org",
  "password": "SecurePass@1",
  "roleId": 2
}
```

### GET /users/:id
Get user by ID.

### PATCH /users/:id
Update user. Requires `users:update`.

### DELETE /users/:id
Delete user. Requires SUPER_ADMIN role.

---

## Roles

### GET /roles
List all roles with permissions. Requires authentication.

---

## Audit Logs

### GET /audit-logs
List audit logs. Requires `audit:read`.

**Query params:** `page`, `pageSize`, `resource`, `action`

---

## Dashboard

### GET /dashboard/stats
Get dashboard statistics. Requires `dashboard:read`.

---

## Upload

### POST /upload
Upload a member photo.

**Content-Type:** `multipart/form-data`
**Body:** `file` (image/jpeg, image/png, image/webp, max 5MB)

**Response (200):**
```json
{
  "success": true,
  "data": { "url": "/uploads/members/filename.jpg" }
}
```

---

## Health

### GET /health
Health check (no auth required).

**Response (200):**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-04-17T10:00:00.000Z"
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": { "fieldName": ["Validation error"] }
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 409 | Conflict (e.g. duplicate email) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
