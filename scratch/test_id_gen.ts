import { generateMembershipId } from "../src/lib/utils/membership-id";

async function runTests() {
  console.log("--- Testing ID Generation ---");
  
  const id1 = await generateMembershipId("Tirunelveli");
  console.log(`Tirunelveli: ${id1}`);
  
  const id2 = await generateMembershipId("Chennai");
  console.log(`Chennai: ${id2}`);
  
  const id3 = await generateMembershipId("Coimbatore");
  console.log(`Coimbatore: ${id3}`);
  
  const id4 = await generateMembershipId("Invalid District");
  console.log(`Invalid District (fallback): ${id4}`);
}

runTests().catch(console.error);
