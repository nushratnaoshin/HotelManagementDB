<?php
$host = "localhost";
$user = "root";
$pass = "";
$db = "hotel_management";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode(["error" => "Database connection failed: " . $conn->connect_error]));
}

// Ensure proper character set
$conn->set_charset("utf8mb4");
?>
