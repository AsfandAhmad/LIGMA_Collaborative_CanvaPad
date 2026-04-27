// POST /api/auth/register → create user, hash password, return JWT
// POST /api/auth/login    → verify password, return JWT + role
// Roles: "Lead", "Contributor", "Viewer"