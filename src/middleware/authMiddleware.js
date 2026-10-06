import { fromNodeHeaders } from "better-auth/node";

let authInstance = null;

export function configureAuthMiddleware(auth) {
  authInstance = auth;
}

export async function requireAuth(
  req,
  res,
  next
) {
  try {
    if (!authInstance) {
      return res.status(500).json({
        success: false,
        message:
          "Authentication service is not initialized.",
      });
    }

    const session =
      await authInstance.api.getSession({
        headers: fromNodeHeaders(
          req.headers
        ),
      });

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    req.auth = session;

    next();
  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired session.",
    });
  }
}

export function requireRole(
  ...allowedRoles
) {
  return (req, res, next) => {
    const user =
      req.auth?.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const role =
      user.role || "user";

    if (
      !allowedRoles.includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action.",
      });
    }

    next();
  };
}