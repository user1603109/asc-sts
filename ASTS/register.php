<?php
// Include your database connection
require_once 'db.php';

$error_message = '';
$success_message = '';

// Process the Registration Form
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $full_name = htmlspecialchars(trim($_POST['full_name'] ?? ''), ENT_QUOTES, 'UTF-8');
    $username = htmlspecialchars(trim($_POST['username'] ?? ''), ENT_QUOTES, 'UTF-8');
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';
    
    // Hardcoded role for this specific registration portal
    $role = 'judge'; 

    // Basic Validation
    if (empty($full_name) || empty($username) || empty($password) || empty($confirm_password)) {
        $error_message = "All fields are required.";
    } elseif ($password !== $confirm_password) {
        $error_message = "Passwords do not match. Please try again.";
    } elseif (strlen($password) < 8) {
        $error_message = "Password must be at least 8 characters long.";
    } else {
        
        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :username LIMIT 1");
            $stmt->execute(['username' => $username]);
            
            if ($stmt->fetch()) {
                $error_message = "Username is already taken.";
            } else {
                // Insert new judge with 'pending' approval status
                $stmt = $pdo->prepare("INSERT INTO users (full_name, username, password, role, approval_status) VALUES (:full_name, :username, :password, :role, 'pending')");
                $stmt->execute([
                    'full_name' => $full_name,
                    'username' => $username,
                    'password' => $password_hash,
                    'role' => $role
                ]);
                
                $success_message = "Registration successful! Your account is currently pending admin approval.";
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
    <title>Judge Registration | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        body {
            background-color: #0A192F; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            padding: 2rem 0;
            -webkit-user-select: none; 
            -moz-user-select: none; 
            -ms-user-select: none; 
            user-select: none;
        }

        .text-navy { color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }
        
        .form-control {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
        }

        .form-control:focus {
            border-color: #0A192F;
            box-shadow: 0 0 0 0.25rem rgba(10, 25, 47, 0.15);
        }
        
        .input-group-text {
            background-color: transparent;
            border-left: none;
            cursor: pointer;
            color: #0A192F;
            transition: color 0.2s ease;
        }
        
        .input-group-text:hover { color: #FFBF00; }
        .form-control.password-field { border-right: none; }

        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none !important; }
        input[type="password"]::-webkit-reveal { display: none !important; }

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

        .register-card {
            background-color: #FFFFFF;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-top: 4px solid #FFBF00; 
            border-radius: 12px;
            box-shadow: 0 15px 50px rgba(0,0,0,0.5);
        }
    </style>
</head>
<body>

    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-5">
                
                <div class="text-center mb-4">
                    <h2 class="fw-bolder text-white mb-0">ASTS</h2>
                    <p class="text-amber fw-bold small text-uppercase tracking-wider">Apayao State College</p>
                </div>

                <div class="card register-card p-4">
                    <div class="card-body">
                        
                        <h4 class="text-navy fw-bold mb-1 text-center">Judge Registration</h4>
                        <p class="text-muted text-center small mb-4">Create your official evaluator account.</p>
                        
                        <?php if(!empty($error_message)): ?>
                            <div class="alert alert-danger py-2 text-center small fw-semibold">
                                <?= $error_message ?>
                            </div>
                        <?php endif; ?>

                        <?php if(!empty($success_message)): ?>
                            <div class="alert alert-success py-2 text-center small fw-semibold">
                                <?= $success_message ?>
                            </div>
                        <?php endif; ?>

                        <form action="register.php" method="POST" <?= !empty($success_message) ? 'style="display:none;"' : '' ?>>
                            
                            <div class="mb-3">
                                <label for="full_name" class="form-label text-navy fw-semibold small">Full Name</label>
                                <input type="text" class="form-control form-control-lg fs-6" id="full_name" name="full_name" required placeholder="e.g. Jane Doe">
                            </div>

                            <div class="mb-3">
                                <label for="username" class="form-label text-navy fw-semibold small">Desired Username / Judge ID</label>
                                <input type="text" class="form-control form-control-lg fs-6" id="username" name="username" required placeholder="Choose a username">
                            </div>

                            <div class="mb-3">
                                <label for="password" class="form-label text-navy fw-semibold small">Password</label>
                                <div class="input-group">
                                    <input type="password" class="form-control form-control-lg fs-6 password-field" id="password" name="password" required placeholder="Min. 8 characters">
                                    <span class="input-group-text toggle-password" data-target="password">
                                        <i class="fa-regular fa-eye eyeIcon"></i>
                                    </span>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label for="confirm_password" class="form-label text-navy fw-semibold small">Confirm Password</label>
                                <div class="input-group">
                                    <input type="password" class="form-control form-control-lg fs-6 password-field" id="confirm_password" name="confirm_password" required placeholder="Retype password">
                                    <span class="input-group-text toggle-password" data-target="confirm_password">
                                        <i class="fa-regular fa-eye eyeIcon"></i>
                                    </span>
                                </div>
                            </div>

                            <button type="submit" class="btn btn-amber w-100 btn-lg fs-6 py-2 shadow-sm">Register Account</button>
                        </form>
                        
                        <div class="text-center mt-4">
                            <span class="text-muted small">Already registered?</span> 
                            <a href="login.php" class="text-navy fw-bold text-decoration-none small">Sign in here</a>
                        </div>
                        
                        <div class="text-center mt-3">
                            <a href="index.php" class="text-muted text-decoration-none small">← Back to Home</a>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <script>
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', function () {
                const targetId = this.getAttribute('data-target');
                const passwordInput = document.getElementById(targetId);
                const eyeIcon = this.querySelector('.eyeIcon');

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
        });
    </script>
</body>
</html>