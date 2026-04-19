async function testTranslation() {
  const text = "Ibrahim";
  const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ta-t-i0-und&num=1`;
  
  try {
    console.log("Fetching:", url);
    const res = await fetch(url);
    const data = await res.json();
    console.log("Raw Data:", JSON.stringify(data, null, 2));

    if (data[0] === "SUCCESS" && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
      console.log("Result:", data[1][0][1][0]);
    } else {
      console.log("Failed to parse response structure.");
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testTranslation();
