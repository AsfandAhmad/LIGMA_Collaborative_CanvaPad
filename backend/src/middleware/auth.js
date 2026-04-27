// Express middleware
// 1. Read Authorization: Bearer <token> header
// 2. jwt.verify(token, JWT_SECRET) → req.user = { id, role }
// 3. If invalid → 401