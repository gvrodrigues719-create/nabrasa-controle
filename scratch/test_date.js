try {
  const date = new Date("");
  console.log("Date:", date);
  console.log("ISO:", date.toISOString());
} catch (e) {
  console.error("Error:", e.name, e.message);
}
