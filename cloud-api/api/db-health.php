<?php

header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    echo json_encode([
        'success' => true,
        'database' => 'connected'
    ]);
} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'database' => 'connection_failed'
    ]);
}