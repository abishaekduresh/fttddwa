import http from "http";

function test() {
  const uuid = "019df995-4f45-778e-a107-a90bdd56c2e1";
  const url = `http://localhost:3000/api/members/card/${uuid}/image`;
  
  http.get(url, (res) => {
    console.log("Status:", res.statusCode);
    let data = "";
    res.on("data", (chunk) => { data += chunk; });
    res.on("end", () => {
      console.log("Body length:", data.length);
      if (res.statusCode !== 200) {
        console.log("Error Body:", data);
      }
    });
  }).on("error", (err) => {
    console.error("Request failed:", err.message);
  });
}

test();
