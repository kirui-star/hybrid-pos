<?php

header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

try {
    $sql = "
        SELECT
            id,
            store_id,
            category_id,
            barcode,
            sku,
            name,
            description,
            selling_price_cents,
            cost_price_cents,
            tax_rate_basis_points,
            is_taxable,
            track_inventory,
            is_active,
            created_at,
            updated_at,
            sync_status
        FROM products
        WHERE is_active = 1
        ORDER BY name ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();

    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'count' => count($products),
        'products' => $products
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to load products'
    ]);
}