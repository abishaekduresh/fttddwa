import path from "path";

/**
 * Returns the absolute path to the directory where files should be stored.
 * 
 * - In Production: Defaults to '/app/persist/uploads' (standard for persistent volumes).
 * - In Development: Defaults to 'uploads' in the project root.
 * - If UPLOAD_DIR is set in environment, it is used (absolute or relative to process.cwd()).
 */
export function getUploadsDir() {
  const isProd = process.env.NODE_ENV === "production";
  const envUploadDir = process.env.UPLOAD_DIR;

  if (envUploadDir) {
    return path.isAbsolute(envUploadDir) 
      ? envUploadDir 
      : path.resolve(process.cwd(), envUploadDir);
  }

  // Default behavior
  if (isProd) {
    // Standard persistent path for Coolify/Docker volumes
    // Users should mount their persistent volume to this path.
    return "/app/persist/uploads";
  }

  // Development: Use 'uploads' folder in the project root
  return path.resolve(process.cwd(), "uploads");
}
