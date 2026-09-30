<?php
session_start();

// 1. MUST INCLUDE YOUR DATABASE CONNECTION
require_once '../db.php'; 

// 2. Generate CSRF Token
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$error_message = '';
$max_attempts = 5;
$lockout_time = 900; // 15 minutes in seconds

// 3. Check for Brute Force Lockout
if (isset($_SESSION['locked_out_until'])) {
    if (time() < $_SESSION['locked_out_until']) {
        $remaining = ceil(($_SESSION['locked_out_until'] - time()) / 60);
        $error_message = "Too many failed attempts. Please try again in $remaining minute(s).";
    } else {
        // Lockout expired, reset counters
        unset($_SESSION['locked_out_until']);
        $_SESSION['login_attempts'] = 0;
    }
}

// 4. Process Login Form
if ($_SERVER["REQUEST_METHOD"] == "POST" && empty($error_message)) {
    
    // Validate CSRF Token
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        die("Security validation failed. Invalid CSRF token.");
    }

    // Sanitize Inputs
    $admin_id = htmlspecialchars(trim($_POST['admin_id'] ?? ''), ENT_QUOTES, 'UTF-8');
    $password = $_POST['password'] ?? ''; 

    if (empty($admin_id) || empty($password)) {
        $error_message = "Please enter both Admin ID and Password.";
    } else {
        
        // Track attempts
        if (!isset($_SESSION['login_attempts'])) {
            $_SESSION['login_attempts'] = 0;
        }

        try {
            // REAL DATABASE AUTHENTICATION (Updated for Unified Users Table)
            $stmt = $pdo->prepare("SELECT id, password FROM users WHERE username = :admin_id AND role = 'admin' LIMIT 1");
            $stmt->execute(['admin_id' => $admin_id]);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);

            // Verify if user exists AND password matches the hash
            if ($admin && password_verify($password, $admin['password'])) {
                
                // Login Success
                session_regenerate_id(true); // Prevent Session Fixation
                $_SESSION['admin_logged_in'] = true;
                $_SESSION['admin_id'] = $admin['id'];
                $_SESSION['login_attempts'] = 0; // Reset attempts on success
                
                // Redirect to the dashboard
                header("Location: dashboard.php");
                exit;

            } else {
                
                // Login Failed
                $_SESSION['login_attempts']++;
                $error_message = "Invalid Admin ID or Password. (Attempt " . $_SESSION['login_attempts'] . " of $max_attempts)";
                
                // Trigger Lockout if max attempts reached
                if ($_SESSION['login_attempts'] >= $max_attempts) {
                    $_SESSION['locked_out_until'] = time() + $lockout_time;
                    $error_message = "Too many failed attempts. Account locked for 15 minutes.";
                }
            }
        } catch (PDOException $e) {
            $error_message = "System Error. Please contact support.";
            // In a real environment, log $e->getMessage() to a file, don't show it to the user.
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Portal | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <style>
        body {
            background-color: #0A192F; /* Midnight Navy */
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
        }

        .text-navy { color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }
        
        .form-control:focus {
            border-color: #0A192F;
            box-shadow: 0 0 0 0.25rem rgba(10, 25, 47, 0.15);
        }

        .btn-amber { 
            background-color: #FFBF00; 
            color: #0A192F; 
            border: 2px solid #FFBF00;
            font-weight: 700;
            transition: all 0.3s ease;
        }
        .btn-amber:hover { 
            background-color: #e6ac00; 
            color: #0A192F; 
            border-color: #e6ac00;
            transform: translateY(-2px);
        }

        /* Distinctive Admin Card */
        .login-card {
            background-color: #FFFFFF;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-top: 4px solid #FFBF00; /* Amber accent */
            border-radius: 12px;
            box-shadow: 0 15px 50px rgba(0,0,0,0.7);
        }
    </style>
</head>
<body>

    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-5 col-lg-4">
                
                <div class="text-center mb-4">
                    <h2 class="fw-bolder text-white mb-0">ASTS</h2>
                    <p class="text-amber fw-bold small text-uppercase tracking-wider">Apayao State College</p>
                </div>

                <div class="card login-card p-4">
                    <div class="card-body">
                        
                        <h4 class="text-navy fw-bold mb-4 text-center">System Administrator</h4>
                        
                        <?php if(!empty($error_message)): ?>
                            <div class="alert alert-danger py-2 text-center small fw-semibold">
                                <?= $error_message ?>
                            </div>
                        <?php endif; ?>

                        <form action="adminlogin.php" method="POST" <?= isset($_SESSION['locked_out_until']) ? 'style="opacity: 0.5; pointer-events: none;"' : '' ?>>
                            
                            <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">

                            <div class="mb-3">
                                <label for="admin_id" class="form-label text-navy fw-semibold small">Admin ID</label>
                                <input type="text" class="form-control form-control-lg fs-6" id="admin_id" name="admin_id" required placeholder="Enter Admin ID">
                            </div>

                            <div class="mb-4">
                                <label for="password" class="form-label text-navy fw-semibold small">Secure Password</label>
                                <input type="password" class="form-control form-control-lg fs-6" id="password" name="password" required placeholder="••••••••">
                            </div>

                            <button type="submit" class="btn btn-amber w-100 btn-lg fs-6 py-2 shadow-sm">Authorize Access</button>
                        </form>
                        
                        <div class="text-center mt-4">
                            <a href="../index.php" class="text-muted text-decoration-none small hover-amber">← Return to Public Portal</a>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>

</body>
</html>