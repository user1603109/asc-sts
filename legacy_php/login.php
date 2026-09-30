<?php
session_start();
require_once 'db.php';

$error_message = '';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user_id = trim($_POST['user_id'] ?? ''); 
    $password = $_POST['password'] ?? '';

    if (empty($user_id) || empty($password)) {
        $error_message = "Please enter both User ID and Password.";
    } else {
        try {
            $num_id = (is_numeric($user_id) && (int)$user_id > 0) ? (int)$user_id : 0;
            $stmt = $pdo->prepare("
                SELECT id, full_name, username, password, role, approval_status 
                FROM users 
                WHERE (LOWER(username) = LOWER(:username) OR (id = :num_id AND :num_id > 0)) 
                AND role = 'judge' 
                LIMIT 1
            ");
            $stmt->execute([
                'username' => $user_id,
                'num_id' => $num_id
            ]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($password, $user['password'])) {
                $status = strtolower(trim($user['approval_status'] ?? 'approved'));
                if ($status === 'pending') {
                    $error_message = "Access Denied: Your account is currently pending Admin approval.";
                } elseif ($status === 'rejected') {
                    $error_message = "Access Denied: Your registration was declined by the Admin.";
                } elseif ($status === 'suspended') {
                    $error_message = "Access Denied: Your account is currently suspended. Please contact the Admin.";
                } else {
                    $_SESSION['user_id'] = (int)$user['id'];
                    $_SESSION['full_name'] = $user['full_name'];
                    $_SESSION['username'] = $user['username'];
                    $_SESSION['role'] = $user['role'];
                    
                    header("Location: judge/judgedashboard.php");
                    exit;
                }
            } else {
                $error_message = "Invalid User ID or Password. Please verify your credentials.";
            }
        } catch(PDOException $e) {
            $error_message = "Database error: " . $e->getMessage();
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        /* Global Reset for Tap Highlights and Outlines */
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { 
            -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; 
        }
        a, button, .btn, label, .input-group-text, .page-link, select, option { cursor: pointer; }

        body {
            background-color: #0A192F; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center; /* Centers the container perfectly */
            -webkit-user-select: none; 
            -moz-user-select: none; 
            -ms-user-select: none; 
            user-select: none;
            cursor: default;
            margin: 0;
        }

        .text-navy { color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }
        .bg-navy { background-color: #0A192F !important; }

        .form-control:focus {
            border-color: #0A192F;
            box-shadow: 0 0 0 0.25rem rgba(10, 25, 47, 0.15);
        }
        
        .input-group-text {
            background-color: transparent;
            border-left: none;
            color: #0A192F;
            transition: color 0.2s ease;
        }
        
        .input-group-text:hover { color: #FFBF00; }
        .form-control.password-field { border-right: none; }

        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none !important; }
        input[type="password"]::-webkit-reveal { display: none !important; }

        .btn-navy { 
            background-color: #0A192F; 
            color: #FFFFFF; 
            border: 2px solid #0A192F;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-navy:hover { 
            background-color: #0d274c; 
            color: #FFFFFF; 
            border-color: #0d274c;
            transform: translateY(-2px);
        }

        .login-card {
            background-color: #FFFFFF;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-top: 4px solid #FFBF00;
            border-radius: 12px;
            box-shadow: 0 15px 50px rgba(0,0,0,0.4); 
            max-width: 400px; /* Prevents the card from stretching */
        }

        .tracking-wider { letter-spacing: 0.1em; }
        
        /* Floating animation for the logo */
        .logo-float {
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
        }
    </style>
</head>
<body>

    <div class="container w-100">
        <!-- Using justify-content-center forces the columns to the mathematical center -->
        <div class="row align-items-center justify-content-center w-100 mx-0">
            
            <!-- Left Side: Logo and Branding -->
            <!-- Adjusted to col-md-6 col-lg-5 for equal visual weighting -->
            <div class="col-md-6 col-lg-5 text-center text-md-end pe-md-5 mb-5 mb-md-0">
                <img src="assets/img/astslogo.png" alt="ASTS Logo" class="img-fluid mb-4 logo-float" style="max-width: 180px; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));">
                <h1 class="fw-bolder text-white mb-0 display-4" style="letter-spacing: 2px;">ASTS</h1>
                <p class="text-amber fw-bold fs-6 text-uppercase tracking-wider">Apayao State College</p>
                <p class="text-white opacity-75 small mt-3 mx-auto ms-md-auto me-md-0" style="max-width: 280px;">
                    Automated Scoring & Tabulation System for secure and real-time event evaluations.
                </p>
            </div>

            <!-- Right Side: Login Card -->
            <!-- Adjusted to col-md-6 col-lg-5 to match the left side exactly -->
            <div class="col-md-6 col-lg-5 ps-md-5 border-md-start border-secondary border-opacity-25">
                <div class="card login-card p-4 mx-auto mx-md-0">
                    <div class="card-body p-2">
                        <h4 class="text-navy fw-bold mb-4 text-center">Welcome Back</h4>
                        
                        <?php if(!empty($error_message)): ?>
                            <div class="alert alert-danger py-2 text-center small fw-semibold"><?= $error_message ?></div>
                        <?php endif; ?>

                        <form action="login.php" method="POST">
                            
                            <div class="mb-3">
                                <label for="user_id" class="form-label text-navy fw-semibold small">User ID / Username</label>
                                <input type="text" class="form-control form-control-lg fs-6" id="user_id" name="user_id" required placeholder="Enter your ID">
                            </div>

                            <div class="mb-4">
                                <label for="password" class="form-label text-navy fw-semibold small">Password</label>
                                <div class="input-group">
                                    <input type="password" class="form-control form-control-lg fs-6 password-field" id="password" name="password" required placeholder="••••••••">
                                    <span class="input-group-text" id="togglePassword">
                                        <i class="fa-regular fa-eye" id="eyeIcon"></i>
                                    </span>
                                </div>
                            </div>

                            <button type="submit" class="btn btn-navy w-100 btn-lg fs-6 py-2 shadow-sm">Sign In</button>
                        </form>
                        
                        <div class="text-center mt-4 pt-2 border-top">
                            <a href="index.php" class="text-muted text-decoration-none small hover-amber fw-semibold">← Back to Homepage</a>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <script>
        const togglePassword = document.querySelector('#togglePassword');
        const passwordInput = document.querySelector('#password');
        const eyeIcon = document.querySelector('#eyeIcon');

        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            if (type === 'text') {
                eyeIcon.classList.remove('fa-eye');
                eyeIcon.classList.add('fa-eye-slash');
            } else {
                eyeIcon.classList.remove('fa-eye-slash');
                eyeIcon.classList.add('fa-eye');
            }
        });
    </script>
</body>
</html>