export async function fetchCloudProducts() {
  const response = await fetch(
    "https://hybridsystem.co.ke/api/products.php"
  );

  if (!response.ok) {
    throw new Error(`Cloud request failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Unable to load cloud products");
  }

  return data.products;
}