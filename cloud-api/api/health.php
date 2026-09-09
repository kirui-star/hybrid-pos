<?php

header('Content-Type: application/json');

echo json_encode([
    'success' => true,
    'service' => 'Inventra Cloud API',
    'status' => 'online'
]);