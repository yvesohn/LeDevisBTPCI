import { drizzle } from "drizzle-orm/netlify-db";

// Connexion gérée automatiquement par Netlify Database (aucune URL à configurer).
export const db = drizzle();
