<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate'); // Prevent caching
header('Pragma: no-cache');
header('Expires: 0');
date_default_timezone_set('Asia/Dhaka'); // Specific to Dhaka per footer
require_once 'db.php';

$action = $_GET['action'] ?? '';

if ($action == 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $role = $data['role'] ?? '';
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if ($role === 'admin') {
        $stmt = $conn->prepare("SELECT * FROM admin WHERE Name = ? AND Password = ?");
        $stmt->bind_param("ss", $username, $password);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $_SESSION['userRole'] = 'admin';
            echo json_encode(["status" => "success", "role" => "admin"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
        }
    } else {
        $stmt = $conn->prepare("SELECT * FROM customer WHERE Email = ? AND Password = ?");
        $stmt->bind_param("ss", $username, $password);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $_SESSION['userRole'] = 'guest';
            $_SESSION['customerId'] = $row['Customer_ID'];
            $_SESSION['customerEmail'] = $row['Email']; // Keep it simple
            echo json_encode(["status" => "success", "role" => "guest", "customerId" => $row['Customer_ID']]);
        } else {
            echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
        }
    }
}
elseif ($action == 'register') {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $phone = $data['phone'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode(["status" => "error", "message" => "Name, Email, and Password are required"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT Customer_ID FROM customer WHERE Email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "Email already registered"]);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO customer (Name, Email, Phone, Password) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $name, $email, $phone, $password);
    
    if ($stmt->execute()) {
        $newId = $conn->insert_id;
        $_SESSION['userRole'] = 'guest';
        $_SESSION['customerId'] = $newId;
        $_SESSION['customerEmail'] = $email;
        echo json_encode(["status" => "success", "customerId" => $newId]);
    } else {
        echo json_encode(["status" => "error", "message" => "Registration failed"]);
    }
}
elseif ($action == 'logout') {
    session_destroy();
    echo json_encode(["status" => "success"]);
}
elseif ($action == 'setup_test_data') {
    // Force insert Saiki K
    $conn->query("INSERT IGNORE INTO admin (Name, Phone, Password) VALUES ('Saiki K', '0111', 'k')");
    // Force insert Anya Forger
    $conn->query("INSERT IGNORE INTO customer (Name, Email, Phone, Password) VALUES ('Anya Forger', 'anya@telepath.com', '0123', 'wakuwaku')");
    
    echo json_encode(["status" => "success", "message" => "Saiki K and Anya Forger have been manually added to the LIVE database."]);
}
elseif ($action == 'debug_db') {
    $data = [];
    $data['current_database'] = $db;
    $data['mysql_user'] = $user;
    
    // Check if table exists
    $check = $conn->query("SHOW TABLES LIKE 'admin'");
    $data['admin_table_exists'] = ($check->num_rows > 0);
    
    // Count Admin
    $res = $conn->query("SELECT Name FROM admin");
    $admins = [];
    if($res) while($r = $res->fetch_assoc()) $admins[] = $r['Name'];
    $data['admins_in_db'] = $admins;
    
    // Count Customers
    $res = $conn->query("SELECT COUNT(*) as total FROM customer");
    if($res) {
        $row = $res->fetch_assoc();
        $data['customer_count'] = $row['total'];
    }
    
    $data['server_file_path'] = __FILE__;
    
    echo json_encode($data);
}
elseif ($action == 'get_initial_data') {
    error_reporting(0); // Prevent PHP notices from breaking JSON response
    $data = [];
    
    // 1. Rooms
    $res = $conn->query("SELECT * FROM room");
    $rooms = [];
    $defaultImages = ["room1.avif", "room2.jpg", "room3.jpg"];
    $idx = 0;
    while ($res && $r = $res->fetch_assoc()) {
        $rid = $r['Room_ID'];
        // Finding current occupant info
        $occRes = $conn->query("SELECT c.Name, c.Customer_ID FROM booking b JOIN customer c ON b.Customer_ID = c.Customer_ID WHERE b.Room_ID = $rid AND b.Booking_Status = 'Confirmed' LIMIT 1");
        $occData = $occRes->fetch_assoc();
        
        $status = $r['Availability_Status'];
        // AUTO-FIX: If Occupied but no active booking found, reset to Available
        if ($status === 'Occupied' && !$occData) {
            $conn->query("UPDATE room SET Availability_Status = 'Available' WHERE Room_ID = $rid");
            $status = 'Available';
        }

        $rooms[] = [
            'id' => $rid,
            'name' => $r['Room_Type'],
            'price' => floatval($r['Price']),
            'status' => $status,
            'img' => $defaultImages[$idx % 3],
            'occupantId' => $occData ? $occData['Customer_ID'] : null,
            'occupantName' => $occData ? $occData['Name'] : 'Unknown'
        ];
        $idx++;
    }
    $data['rooms'] = $rooms;

    // 2. Services
    $res = $conn->query("SELECT * FROM service");
    $services = [];
    while ($res && $r = $res->fetch_assoc()) {
        $services[] = [
            'id' => $r['Service_ID'],
            'name' => $r['Service_Name'],
            'price' => floatval($r['Price'])
        ];
    }
    $data['services'] = $services;

    // 3. User & Role
    $role = $_SESSION['userRole'] ?? 'guest';
    $userId = intval($_SESSION['customerId'] ?? 0);

    // 4. Guest Database (RECORDS): All customers (grouped single row)
    // DATABASE RECORDS: Show each individual booking (or customer if no booking)
    $dbSql = "SELECT c.Customer_ID, b.Booking_ID, 
                     c.Name as guestName, 
                     c.Phone as phone, 
                     IFNULL(r.Room_Type, 'None') as suite, 
                     COALESCE(DATEDIFF(b.Check_Out_Date, b.Check_In_Date), 0) as nights, 
                     IFNULL(i.Total_Amount, 0) as totalAmount, 
                     IFNULL(b.Check_In_Date, 'N/A') as date,
                     IFNULL(p.Status, 'Unpaid') as paymentStatus
              FROM customer c 
              LEFT JOIN booking b ON c.Customer_ID = b.Customer_ID AND b.Booking_Status != 'Archived'
              LEFT JOIN room r ON b.Room_ID = r.Room_ID 
              LEFT JOIN invoice i ON b.Booking_ID = i.Booking_ID 
              LEFT JOIN payment p ON i.Invoice_ID = p.Invoice_ID
              WHERE ('$role' = 'admin' OR c.Customer_ID = $userId)
              ORDER BY b.Booking_ID DESC, c.Customer_ID DESC";
    $res = $conn->query($dbSql);
    $records = [];
    while ($res && $r = $res->fetch_assoc()) {
        $records[] = [
            'id' => $r['Booking_ID'] ?: 'G-'.$r['Customer_ID'], // Use Booking_ID or a guest marker
            'recordId' => $r['Booking_ID'],
            'customerId' => $r['Customer_ID'],
            'guestName' => $r['guestName'],
            'phone' => $r['phone'],
            'suite' => $r['suite'],
            'nights' => intval($r['nights']), 
            'totalAmount' => floatval($r['totalAmount']),
            'date' => $r['date'],
            'paymentStatus' => $r['paymentStatus']
        ];
    }
    $data['records'] = $records;
    $data['adminRecords'] = $records; // Maintain compatibility

    // 5. Payment Records (paymentRecords): Only bookings with non-zero payments
    $payRecords = [];
    $res = $conn->query("SELECT b.Booking_ID, c.Customer_ID, c.Name as guestName, r.Room_Type as suite, 
                                DATEDIFF(b.Check_Out_Date, b.Check_In_Date) as nights, b.Check_In_Date as date,
                                i.Total_Amount, p.Status as paymentStatus
                         FROM booking b
                         INNER JOIN customer c ON b.Customer_ID = c.Customer_ID
                         INNER JOIN room r ON b.Room_ID = r.Room_ID
                         INNER JOIN invoice i ON b.Booking_ID = i.Booking_ID
                         LEFT JOIN payment p ON i.Invoice_ID = p.Invoice_ID
                         WHERE b.Booking_Status != 'Archived' AND i.Total_Amount > 0
                         AND ('$role' = 'admin' OR c.Customer_ID = $userId)
                         ORDER BY b.Booking_ID DESC");
    while ($res && $r = $res->fetch_assoc()) {
        $payRecords[] = [
            'id' => $r['Booking_ID'],
            'customerId' => $r['Customer_ID'],
            'guestName' => $r['guestName'],
            'suite' => $r['suite'],
            'nights' => intval($r['nights']) ?: 0,
            'date' => $r['date'],
            'totalAmount' => floatval($r['Total_Amount']),
            'paymentStatus' => $r['paymentStatus'] ?: 'Unpaid'
        ];
    }
    $data['paymentRecords'] = $payRecords;

    // 6. Reviews
    $res = $conn->query("SELECT rev.*, r.Room_Type as suite FROM review rev JOIN room r ON rev.Room_ID = r.Room_ID ORDER BY rev.Review_ID DESC");
    $reviews = [];
    while ($res && $r = $res->fetch_assoc()) {
        $reviews[] = [
            'id' => $r['Review_ID'],
            'customerId' => $r['Customer_ID'],
            'roomId' => $r['Room_ID'],
            'suite' => $r['suite'],
            'rating' => intval($r['Rating']),
            'comment' => $r['Comment']
        ];
    }
    $data['reviews'] = $reviews;

    // 7. Current User Info
    if ($role === 'guest' && $userId > 0) {
        $res = $conn->query("SELECT Name, Phone, Email FROM customer WHERE Customer_ID = $userId");
        if ($res && $row = $res->fetch_assoc()) {
            $data['currentUser'] = [ 'id' => $userId, 'name' => $row['Name'], 'phone' => $row['Phone'], 'email' => $row['Email'] ];
        }
    }

    echo json_encode($data);
}
elseif ($action == 'add_room') {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = $data['name'];
    $price = $data['price'];
    
    $stmt = $conn->prepare("INSERT INTO room (Room_Type, Price, Availability_Status) VALUES (?, ?, 'Available')");
    $stmt->bind_param("sd", $name, $price);
    if($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error"]);
    }
}
elseif ($action == 'delete_room') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'];
    
    $stmt = $conn->prepare("DELETE FROM room WHERE Room_ID = ?");
    $stmt->bind_param("i", $id);
    if($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error"]);
    }
}
elseif ($action == 'toggle_room') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'];
    
    $res = $conn->query("SELECT Availability_Status FROM room WHERE Room_ID = " . intval($id));
    if($row = $res->fetch_assoc()){
        $newStatus = ($row['Availability_Status'] == 'Available') ? 'Occupied' : 'Available';
        $stmt = $conn->prepare("UPDATE room SET Availability_Status = ? WHERE Room_ID = ?");
        $stmt->bind_param("si", $newStatus, $id);
        $stmt->execute();
        echo json_encode(["status" => "success"]);
    }
}
elseif ($action == 'add_service') {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = $data['name'];
    $price = $data['price'];
    
    $stmt = $conn->prepare("INSERT INTO service (Service_Name, Price) VALUES (?, ?)");
    $stmt->bind_param("sd", $name, $price);
    $stmt->execute();
    echo json_encode(["status" => "success"]);
}
elseif ($action == 'delete_service') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'];
    
    $stmt = $conn->prepare("DELETE FROM service WHERE Service_ID = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(["status" => "success"]);
}
elseif ($action == 'book_room') {
    $data = json_decode(file_get_contents('php://input'), true);
    $roomId = $data['roomId'];
    $name = $data['name'];
    $phone = $data['phone'];
    $days = $data['nights'];
    $total = $data['totalAmount'];
    $date = $data['date'];
    
    $checkout = date('Y-m-d', strtotime($date . " + $days days"));
    
    // Check if user is logged in first
    $customerId = $_SESSION['customerId'] ?? 0;
    
    if ($customerId == 0) {
        // Fallback to phone lookup if not logged in (e.g. walk-in via admin or public booking if enabled)
        $stmt = $conn->prepare("SELECT Customer_ID FROM customer WHERE Phone = ?");
        $stmt->bind_param("s", $phone);
        $stmt->execute();
        $res = $stmt->get_result();
        if($row = $res->fetch_assoc()){
            $customerId = $row['Customer_ID'];
        } else {
            // Create new customer
            $dummyEmail = preg_replace("/[^A-Za-z0-9]/", "", $name) . rand(100,999) . "@guest.com";
            $dummyPassword = "guest";
            $stmt = $conn->prepare("INSERT INTO customer (Name, Email, Phone, Password) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $name, $dummyEmail, $phone, $dummyPassword);
            $stmt->execute();
            $customerId = $conn->insert_id;
        }
    }
    
    // Booking
    $stmt = $conn->prepare("INSERT INTO booking (Customer_ID, Room_ID, Check_In_Date, Check_Out_Date, Booking_Status) VALUES (?, ?, ?, ?, 'Confirmed')");
    $stmt->bind_param("iiss", $customerId, $roomId, $date, $checkout);
    $stmt->execute();
    $bookingId = $conn->insert_id;
    
    // Update room status
    $conn->query("UPDATE room SET Availability_Status = 'Occupied' WHERE Room_ID = " . intval($roomId));
    
    // Invoice (Just picking service 1 for schema compatibility if needed, or null)
    $stmt = $conn->prepare("INSERT INTO invoice (Customer_ID, Booking_ID, Total_Amount, Date) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iids", $customerId, $bookingId, $total, $date);
    $stmt->execute();
    $invoiceId = $conn->insert_id;

    // Payment (Initial Status: Pending)
    $stmt = $conn->prepare("INSERT INTO payment (Invoice_ID, Payment_Date, Amount, Status) VALUES (?, ?, ?, 'Pending')");
    $stmt->bind_param("isd", $invoiceId, $date, $total);
    $stmt->execute();
    
    echo json_encode(["status" => "success"]);
}
elseif ($action == 'checkout') {
    $data = json_decode(file_get_contents('php://input'), true);
    $roomId = $data['roomId'];
    $conn->query("UPDATE room SET Availability_Status = 'Available' WHERE Room_ID = " . intval($roomId));
    // Also mark booking complete
    $conn->query("UPDATE booking SET Booking_Status = 'Completed' WHERE Room_ID = " . intval($roomId) . " AND Booking_Status = 'Confirmed'");
    echo json_encode(["status" => "success"]);
}
elseif ($action == 'archive_record') {
    $data = json_decode(file_get_contents('php://input'), true);
    $ids = $data['id']; // Can be single ID or comma-separated list
    
    $idArray = explode(',', $ids);
    foreach ($idArray as $id) {
        if (trim($id)) {
            $stmt = $conn->prepare("UPDATE booking SET Booking_Status = 'Archived' WHERE Booking_ID = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
        }
    }
    echo json_encode(["status" => "success"]);
}
elseif ($action == 'add_review') {
    $data = json_decode(file_get_contents('php://input'), true);
    $roomId = $data['roomId'];
    $rating = $data['rating'];
    $comment = $data['comment'];
    
    // For anonymity, we can just pick customer 1 if not logged in
    $customerId = $_SESSION['customerId'] ?? 1;
    
    $stmt = $conn->prepare("INSERT INTO review (Customer_ID, Room_ID, Rating, Comment) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iiis", $customerId, $roomId, $rating, $comment);
    $stmt->execute();
    echo json_encode(["status" => "success"]);
}
elseif ($action == 'approve_payment') {
    $data = json_decode(file_get_contents('php://input'), true);
    $ids = $data['id']; // Can be single ID or comma-separated list
    
    $idArray = explode(',', $ids);
    foreach ($idArray as $id) {
        if (!trim($id)) continue;
        
        $res = $conn->query("SELECT Invoice_ID, Total_Amount, Date FROM invoice WHERE Booking_ID = " . intval($id));
        if ($row = $res->fetch_assoc()) {
            $invoiceId = $row['Invoice_ID'];
            $amount = $row['Total_Amount'];
            $date = $row['Date'];
            
            $check = $conn->query("SELECT Payment_ID FROM payment WHERE Invoice_ID = " . intval($invoiceId));
            if ($check->num_rows > 0) {
                $stmt = $conn->prepare("UPDATE payment SET Status = 'Paid' WHERE Invoice_ID = ?");
                $stmt->bind_param("i", $invoiceId);
            } else {
                $stmt = $conn->prepare("INSERT INTO payment (Invoice_ID, Payment_Date, Amount, Status) VALUES (?, ?, ?, 'Paid')");
                $stmt->bind_param("isd", $invoiceId, $date, $amount);
            }
            $stmt->execute();
        }
    }
    echo json_encode(["status" => "success"]);
}
?>
