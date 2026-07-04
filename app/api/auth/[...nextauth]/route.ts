// app/api/auth/[...nextauth]/route.ts — Route handler de Auth.js
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
