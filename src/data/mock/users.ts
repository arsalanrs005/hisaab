import type { User } from "@/types";

export const users: User[] = [
  {
    id: "arsalan",
    name: "Arsalan",
    email: "arsalanrs005@gmail.com",
    initials: "AR",
    avatarColor: "#3730a3",
  },
  {
    id: "ali",
    name: "Ali",
    email: "alirashidd.232@gmail.com",
    initials: "AL",
    avatarColor: "#0f766e",
  },
];

export function getUser(id: string): User {
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error(`User not found: ${id}`);
  return user;
}
