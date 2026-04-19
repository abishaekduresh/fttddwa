import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createMember, getMembers, deleteMember, getMemberById } from "../src/lib/services/member.service";
import { createUser, getUsers, deleteUser, getUserById } from "../src/lib/services/user.service";
import { prisma } from "../src/lib/prisma";

async function verifySoftDelete() {
  console.log("--- Starting Soft Delete Verification ---");

  // 1. Member Test
  console.log("\n[Member Test]");
  const member = await createMember({
    name: "Soft Delete Test Member",
    address: "123 Test Street, Chennai",
    district: "Chennai",
    taluk: "Chennai South",
    phone: "9111111111"
  });
  console.log(`Created member ID: ${member.id}`);

  await deleteMember(member.id);
  console.log(`Soft-deleted member ID: ${member.id}`);

  const members = await getMembers({ search: "Soft Delete Test Member" });
  const foundInList = members.members.some(m => m.id === member.id);
  console.log(`Found in list after delete: ${foundInList}`);

  const fetched = await getMemberById(member.id);
  console.log(`Fetched by ID after delete: ${fetched ? "Found" : "Not Found"}`);

  // 2. User Test
  console.log("\n[User Test]");
  // Need a role first
  const role = await prisma.role.findFirst();
  if (!role) throw new Error("No roles found in DB");

  const testEmail = `softdelete_${Date.now()}@test.com`;
  const user = await createUser({
    name: "Soft Delete Test User",
    email: testEmail,
    password: "Password@123",
    roleId: role.id
  });
  console.log(`Created user ID: ${user.id}`);

  // Use a fake admin ID (non-existent or self) for deleteUser check
  await deleteUser(user.id, user.id + 1); 
  console.log(`Soft-deleted user ID: ${user.id}`);

  const users = await getUsers();
  const userFoundInList = users.users.some(u => u.id === user.id);
  console.log(`Found in list after delete: ${userFoundInList}`);

  const fetchedUser = await getUserById(user.id);
  console.log(`Fetched by ID after delete: ${fetchedUser ? "Found" : "Not Found"}`);

  // Clean up: Truly delete these test records from the DB to avoid cluttering unique fields
  // (In real life we don't, but for tests it's better)
  await prisma.member.delete({ where: { id: member.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("\nCleaned up test records.");
}

verifySoftDelete().catch(console.error).finally(() => prisma.$disconnect());
