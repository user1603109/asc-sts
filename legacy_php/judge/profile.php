<?php
session_start();
require_once '../db.php'; 

// For testing purposes, assign a dummy judge ID if not logged in
$judge_id = $_SESSION['user_id'] ?? 1; 

$success_msg = '';
$error_msg = '';

// Fetch current user info
try {
    $stmt = $pdo->prepare("SELECT username, full_name FROM users WHERE id = :id");
    $stmt->execute(['id' => $judge_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $user = ['username' => '', 'full_name' => ''];
}

// Handle Form Submissions
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action'])) {
    
    // Update Personal Info
    if ($_POST['action'] == 'update_profile') {
        $new_name = trim($_POST['full_name']);
        if (empty($new_name)) {
            $error_msg = "Full name cannot be empty.";
        } else {
            try {
                $stmt = $pdo->prepare("UPDATE users SET full_name = :name WHERE id = :id");
                $stmt->execute(['name' => $new_name, 'id' => $judge_id]);
                $_SESSION['full_name'] = $new_name; 
                $user['full_name'] = $new_name; 
                $success_msg = "Profile updated successfully!";
            } catch (PDOException $e) {
                $error_msg = "Error updating profile.";
            }
        }
    }

    // Change Password
    if ($_POST['action'] == 'change_password') {
        $new_pass = $_POST['new_password'];
        $confirm_pass = $_POST['confirm_password'];

        if (empty($new_pass) || empty($confirm_pass)) {
            $error_msg = "Please fill out both password fields.";
        } elseif ($new_pass !== $confirm_pass) {
            $error_msg = "New passwords do not match.";
        } elseif (strlen($new_pass) < 8) {
            $error_msg = "Password must be at least 8 characters long.";
        } else {
            $hashed = password_hash($new_pass, PASSWORD_DEFAULT);
            try {
                $stmt = $pdo->prepare("UPDATE users SET password = :pass WHERE id = :id");
                $stmt->execute(['pass' => $hashed, 'id' => $judge_id]);
                $success_msg = "Password changed successfully!";
            } catch (PDOException $e) {
                $error_msg = "Error changing password.";
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>My Profile | ASTS Judge Portal</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <style>
        /* Global Reset */
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; }
        a, button, .btn, label, .input-group-text, .page-link, select, option { cursor: pointer; }

        body { background-color: #F4F7F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default; }
        .main-content { min-height: 100vh; background-color: #F8F9FA; width: calc(100% - 280px); transition: all 0.3s ease; }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }

        .btn-amber { background-color: #FFBF00; color: #0A192F; border: 2px solid #FFBF00; font-weight: 700; transition: all 0.3s ease; }
        .btn-amber:hover { background-color: #e6ac00; color: #0A192F; border-color: #e6ac00; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        
        .btn-midnight { background-color: #0A192F; color: #FFFFFF; font-weight: 600; border: none; transition: all 0.2s ease; }
        .btn-midnight:hover { background-color: #0d274c; color: white; transform: translateY(-2px); }

        .form-control:focus { border-color: #0A192F; box-shadow: 0 0 0 0.25rem rgba(10, 25, 47, 0.15); }
        .card-custom { border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden; }
        
        .profile-header { background: linear-gradient(135deg, #0A192F 0%, #1b3869 100%); color: white; padding: 3rem 2rem; border-bottom: 4px solid #FFBF00; }
        .profile-avatar { width: 100px; height: 100px; background-color: #FFBF00; color: #0A192F; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: bold; margin-bottom: 1rem; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }

        /* Mobile Responsiveness */
        @media (max-width: 991.98px) {
            body { flex-direction: column !important; }
            .judge-sidebar { width: 100% !important; height: auto !important; position: relative !important; z-index: 1050; }
            .judge-sidebar .sidebar-scrollable { display: none; }
            .judge-sidebar .brand-text-container { display: block !important; }
            .judge-sidebar.minimized .sidebar-scrollable { display: block; }
            .judge-sidebar.minimized .nav-text { display: inline-block !important; }
            .judge-sidebar.minimized .sidebar-icon { margin-right: 12px !important; }
            .judge-sidebar.minimized .nav-link { justify-content: flex-start !important; padding: 0.85rem 1.5rem !important; }
            
            .main-content { width: 100% !important; padding: 1.5rem 1rem !important; margin-left: 0 !important; }
            .responsive-stack { flex-direction: column !important; align-items: stretch !important; gap: 1rem; }
        }
    </style>
</head>
<body class="d-flex align-items-start">

    <?php include '../includes/judge_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-end mb-4 pb-3 border-bottom responsive-stack">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">My Profile</h2>
            </div>
        </div>

        <?php if($success_msg): ?>
            <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
                <i class="bi bi-check-circle-fill me-2"></i> <?= htmlspecialchars($success_msg) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>
        <?php if($error_msg): ?>
            <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i> <?= htmlspecialchars($error_msg) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <div class="row g-4">
            
            <div class="col-lg-5 col-xl-4">
                <div class="card card-custom text-center h-100">
                    <div class="profile-header d-flex flex-column align-items-center">
                        <div class="profile-avatar">
                            <i class="bi bi-person-fill"></i>
                        </div>
                        <h4 class="fw-bold mb-0"><?= htmlspecialchars($user['full_name']) ?></h4>
                        <span class="badge bg-light text-dark mt-2 px-3 py-1 rounded-pill fw-semibold">Official Judge</span>
                    </div>
                    <div class="card-body p-4 bg-white text-start">
                        <div class="mb-3">
                            <small class="text-muted fw-bold text-uppercase d-block mb-1">User ID / Username</small>
                            <p class="fw-semibold text-midnight mb-0 fs-5"><i class="bi bi-fingerprint me-2 text-amber"></i><?= htmlspecialchars($user['username']) ?></p>
                        </div>
                        <hr class="text-muted">
                        <div>
                            <small class="text-muted fw-bold text-uppercase d-block mb-1">Account Status</small>
                            <p class="fw-semibold text-success mb-0"><i class="bi bi-check-circle-fill me-2"></i>Active & Verified</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-7 col-xl-8">
                
                <div class="card card-custom bg-white mb-4">
                    <div class="card-header bg-white border-bottom pt-4 pb-3 px-4">
                        <h5 class="fw-bold text-midnight mb-0"><i class="bi bi-person-gear text-amber me-2"></i> Personal Information</h5>
                    </div>
                    <div class="card-body p-4">
                        <form action="profile.php" method="POST">
                            <input type="hidden" name="action" value="update_profile">
                            <div class="mb-4">
                                <label class="form-label text-midnight fw-semibold">Display Full Name</label>
                                <input type="text" class="form-control form-control-lg fs-6" name="full_name" value="<?= htmlspecialchars($user['full_name']) ?>" required>
                                <div class="form-text">This name appears on score sheets and reports.</div>
                            </div>
                            <button type="submit" class="btn btn-midnight rounded-pill px-4 w-100 w-md-auto">Save Changes</button>
                        </form>
                    </div>
                </div>

                <div class="card card-custom bg-white">
                    <div class="card-header bg-white border-bottom pt-4 pb-3 px-4">
                        <h5 class="fw-bold text-midnight mb-0"><i class="bi bi-shield-lock text-amber me-2"></i> Security Settings</h5>
                    </div>
                    <div class="card-body p-4">
                        <form action="profile.php" method="POST">
                            <input type="hidden" name="action" value="change_password">
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label text-midnight fw-semibold">New Password</label>
                                    <input type="password" class="form-control" name="new_password" required minlength="8" placeholder="Enter new password">
                                </div>
                                <div class="col-md-6 mb-4">
                                    <label class="form-label text-midnight fw-semibold">Confirm New Password</label>
                                    <input type="password" class="form-control" name="confirm_password" required minlength="8" placeholder="Retype new password">
                                </div>
                            </div>
                            
                            <button type="submit" class="btn btn-danger rounded-pill px-4 fw-bold shadow-sm w-100 w-md-auto">
                                <i class="bi bi-key-fill me-1"></i> Update Password
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>

    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>