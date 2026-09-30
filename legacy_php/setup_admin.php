<?php
// Include your database connection
require_once 'db.php';

// Your requested credentials
$admin_id = 'ASTS-ADMIN';
$plain_password = 'asts2026_admin';

// Securely hash the password
$hashed_password = password_hash($plain_password, PASSWORD_DEFAULT);

try {
    // Check if the admin already exists in the users table to prevent duplicate errors
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :username");
    $stmt->execute(['username' => $admin_id]);
    
    if ($stmt->fetch()) {
        echo "<h3>Error: Admin account '{$admin_id}' already exists!</h3>";
    } else {
        // Insert the new admin into the unified users table
        $insertStmt = $pdo->prepare("
            INSERT INTO users (full_name, username, password, role, approval_status) 
            VALUES ('System Administrator', :username, :password, 'admin', 'approved')
        ");
        
        $insertStmt->execute([
            'username' => $admin_id,
            'password' => $hashed_password
        ]);
        
        echo "<h3 style='color: green;'>Success! Admin account created.</h3>";
        echo "<p><strong>User ID:</strong> {$admin_id}</p>";
        echo "<p>You can now log in at <a href='admin/adminlogin.php'>adminlogin.php</a>.</p>";
        echo "<p style='color: red;'><strong>Important:</strong> Please delete this setup_admin.php file now for security.</p>";
    }
} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage();
}
?>