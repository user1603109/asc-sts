<?php
session_start();
require_once '../db.php'; 

// Require authentication check in production
// if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header("Location: adminlogin.php"); exit; }

// Dummy admin ID for testing if session isn't set
$admin_id = $_SESSION['user_id'] ?? 1;

$success_msg = '';
$error_msg = '';

// --- HANDLE FORM SUBMISSIONS ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action'])) {
    
    // 1. Update General System Settings
    if ($_POST['action'] == 'update_general') {
        try {
            $pdo->beginTransaction();
            $update_stmt = $pdo->prepare("UPDATE system_settings SET setting_value = :val WHERE setting_key = :key");
            
            // Loop through expected keys
            $keys = ['system_name', 'organization', 'academic_year'];
            foreach ($keys as $key) {
                if (isset($_POST[$key])) {
                    $update_stmt->execute(['val' => trim($_POST[$key]), 'key' => $key]);
                }
            }
            $pdo->commit();
            $success_msg = "General settings updated successfully!";
        } catch (PDOException $e) {
            $pdo->rollBack();
            $error_msg = "Error updating settings: " . $e->getMessage();
        }
    }

    // 2. Update Admin Security/Profile
    if ($_POST['action'] == 'update_security') {
        $full_name = trim($_POST['full_name']);
        $username = trim($_POST['username']);
        $new_pass = $_POST['new_password'];
        $confirm_pass = $_POST['confirm_password'];

        try {
            // Check if username is taken by someone else
            $check = $pdo->prepare("SELECT id FROM users WHERE username = :username AND id != :id");
            $check->execute(['username' => $username, 'id' => $admin_id]);
            
            if ($check->fetch()) {
                $error_msg = "Username is already taken by another account.";
            } else {
                if (!empty($new_pass)) {
                    if ($new_pass !== $confirm_pass) {
                        $error_msg = "New passwords do not match.";
                    } elseif (strlen($new_pass) < 8) {
                        $error_msg = "Password must be at least 8 characters long.";
                    } else {
                        $hashed = password_hash($new_pass, PASSWORD_DEFAULT);
                        $stmt = $pdo->prepare("UPDATE users SET full_name = :full_name, username = :username, password = :pass WHERE id = :id");
                        $stmt->execute(['full_name' => $full_name, 'username' => $username, 'pass' => $hashed, 'id' => $admin_id]);
                        $success_msg = "Profile and password updated successfully!";
                    }
                } else {
                    // Update without changing password
                    $stmt = $pdo->prepare("UPDATE users SET full_name = :full_name, username = :username WHERE id = :id");
                    $stmt->execute(['full_name' => $full_name, 'username' => $username, 'id' => $admin_id]);
                    $success_msg = "Admin profile updated successfully!";
                }
            }
        } catch (PDOException $e) {
            $error_msg = "Error updating security settings: " . $e->getMessage();
        }
    }
}

// --- FETCH CURRENT SETTINGS ---
$settings = [];
try {
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
} catch (PDOException $e) {
    // Failsafe empty values if table is missing
    $settings = ['system_name' => '', 'organization' => '', 'academic_year' => ''];
}

// --- FETCH CURRENT ADMIN INFO ---
try {
    $admin_stmt = $pdo->prepare("SELECT full_name, username FROM users WHERE id = :id");
    $admin_stmt->execute(['id' => $admin_id]);
    $admin_info = $admin_stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $admin_info = ['full_name' => '', 'username' => ''];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Settings | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <style>
        /* Global Reset for Tap Highlights and Outlines */
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; }
        a, button, .btn, label, .input-group-text, .nav-link { cursor: pointer; }

        body { background-color: #F4F7F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default;}
        .main-content { min-height: 100vh; background-color: #F8F9FA; }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }

        .btn-amber { background-color: #FFBF00; color: #0A192F; border: 2px solid #FFBF00; font-weight: 700; transition: all 0.3s ease; }
        .btn-amber:hover { background-color: #e6ac00; color: #0A192F; border-color: #e6ac00; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        
        .btn-midnight { background-color: #0A192F; color: #FFFFFF; font-weight: 600; border: none; transition: all 0.2s ease; }
        .btn-midnight:hover { background-color: #0d274c; color: white; transform: translateY(-2px); }

        .form-control:focus { border-color: #0A192F; box-shadow: 0 0 0 0.25rem rgba(10, 25, 47, 0.15); }
        .card-custom { border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden; background: white; }

        /* Custom Tabs Styling */
        .nav-pills .nav-link { color: #6c757d; font-weight: 600; border-radius: 10px; padding: 0.8rem 1.5rem; margin-right: 0.5rem; transition: all 0.2s ease; }
        .nav-pills .nav-link:hover { background-color: rgba(10, 25, 47, 0.05); color: #0A192F; }
        .nav-pills .nav-link.active { background-color: #0A192F; color: #FFBF00; box-shadow: 0 4px 10px rgba(10,25,47,0.2); }
    </style>
</head>
<body class="d-flex">

    <?php include '../includes/admin_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-end mb-4 pb-3 border-bottom">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">System Settings</h2>
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb mb-0 small">
                        <li class="breadcrumb-item"><a href="dashboard.php" class="text-decoration-none">Dashboard</a></li>
                        <li class="breadcrumb-item active" aria-current="page">Global Configurations</li>
                    </ol>
                </nav>
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
            
            <div class="col-lg-3 col-xl-3">
                <div class="card card-custom p-3">
                    <ul class="nav nav-pills flex-column" id="settingsTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active w-100 text-start" id="general-tab" data-bs-toggle="pill" data-bs-target="#general" type="button" role="tab" aria-controls="general" aria-selected="true">
                                <i class="bi bi-sliders me-2"></i> General Settings
                            </button>
                        </li>
                        <li class="nav-item mt-2" role="presentation">
                            <button class="nav-link w-100 text-start" id="security-tab" data-bs-toggle="pill" data-bs-target="#security" type="button" role="tab" aria-controls="security" aria-selected="false">
                                <i class="bi bi-shield-lock me-2"></i> Admin Profile & Security
                            </button>
                        </li>
                        <li class="nav-item mt-2" role="presentation">
                            <button class="nav-link w-100 text-start" id="database-tab" data-bs-toggle="pill" data-bs-target="#database" type="button" role="tab" aria-controls="database" aria-selected="false">
                                <i class="bi bi-database me-2"></i> Data Maintenance
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="col-lg-9 col-xl-9">
                <div class="tab-content" id="settingsTabsContent">
                    
                    <!-- Tab 1: General Settings -->
                    <div class="tab-pane fade show active" id="general" role="tabpanel" aria-labelledby="general-tab">
                        <div class="card card-custom">
                            <div class="card-header bg-white border-bottom pt-4 pb-3 px-4">
                                <h5 class="fw-bold text-midnight mb-0"><i class="bi bi-sliders text-amber me-2"></i> Global Configuration</h5>
                            </div>
                            <div class="card-body p-4 p-md-5">
                                <form action="settings.php" method="POST">
                                    <input type="hidden" name="action" value="update_general">
                                    
                                    <div class="mb-4">
                                        <label class="form-label text-midnight fw-semibold">Platform Name</label>
                                        <input type="text" class="form-control form-control-lg fs-6" name="system_name" value="<?= htmlspecialchars($settings['system_name'] ?? '') ?>" required>
                                        <div class="form-text">This name appears in headers, footers, and official PDF printouts.</div>
                                    </div>

                                    <div class="mb-4">
                                        <label class="form-label text-midnight fw-semibold">Organization / School Name</label>
                                        <input type="text" class="form-control form-control-lg fs-6" name="organization" value="<?= htmlspecialchars($settings['organization'] ?? '') ?>" required>
                                    </div>

                                    <div class="mb-5">
                                        <label class="form-label text-midnight fw-semibold">Current Academic Year</label>
                                        <input type="text" class="form-control form-control-lg fs-6" name="academic_year" value="<?= htmlspecialchars($settings['academic_year'] ?? '') ?>" placeholder="e.g. 2025-2026" required>
                                    </div>

                                    <div class="text-end border-top pt-4">
                                        <button type="submit" class="btn btn-amber rounded-pill px-5 py-2 fw-bold shadow-sm">
                                            <i class="bi bi-save me-2"></i> Save Configurations
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 2: Admin Profile & Security -->
                    <div class="tab-pane fade" id="security" role="tabpanel" aria-labelledby="security-tab">
                        <div class="card card-custom">
                            <div class="card-header bg-white border-bottom pt-4 pb-3 px-4">
                                <h5 class="fw-bold text-midnight mb-0"><i class="bi bi-shield-lock text-amber me-2"></i> Administrator Credentials</h5>
                            </div>
                            <div class="card-body p-4 p-md-5">
                                <form action="settings.php" method="POST">
                                    <input type="hidden" name="action" value="update_security">
                                    
                                    <div class="row mb-4">
                                        <div class="col-md-6 mb-3 mb-md-0">
                                            <label class="form-label text-midnight fw-semibold">Admin Full Name</label>
                                            <input type="text" class="form-control form-control-lg fs-6" name="full_name" value="<?= htmlspecialchars($admin_info['full_name'] ?? '') ?>" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label text-midnight fw-semibold">Admin Login Username</label>
                                            <input type="text" class="form-control form-control-lg fs-6" name="username" value="<?= htmlspecialchars($admin_info['username'] ?? '') ?>" required>
                                        </div>
                                    </div>

                                    <hr class="text-muted my-4">
                                    
                                    <h6 class="fw-bold text-midnight mb-3">Update Password</h6>
                                    <div class="row mb-5">
                                        <div class="col-md-6 mb-3 mb-md-0">
                                            <label class="form-label text-midnight fw-semibold">New Password</label>
                                            <input type="password" class="form-control form-control-lg fs-6" name="new_password" minlength="8" placeholder="Leave blank to keep current">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label text-midnight fw-semibold">Confirm New Password</label>
                                            <input type="password" class="form-control form-control-lg fs-6" name="confirm_password" minlength="8" placeholder="Retype new password">
                                        </div>
                                    </div>

                                    <div class="text-end border-top pt-4">
                                        <button type="submit" class="btn btn-midnight rounded-pill px-5 py-2 fw-bold shadow-sm">
                                            <i class="bi bi-person-check-fill me-2"></i> Update Profile
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 3: Data Maintenance (Placeholder for future destructive operations) -->
                    <div class="tab-pane fade" id="database" role="tabpanel" aria-labelledby="database-tab">
                        <div class="card card-custom border border-danger border-opacity-25">
                            <div class="card-header bg-white border-bottom pt-4 pb-3 px-4">
                                <h5 class="fw-bold text-danger mb-0"><i class="bi bi-exclamation-triangle-fill me-2"></i> System Reset & Maintenance</h5>
                            </div>
                            <div class="card-body p-4 p-md-5 text-center">
                                <i class="bi bi-database-exclamation text-danger opacity-75 mb-3 d-block" style="font-size: 4rem;"></i>
                                <h4 class="fw-bold text-midnight">Danger Zone</h4>
                                <p class="text-muted mb-4 mx-auto" style="max-width: 500px;">
                                    This area is reserved for deep system clears, such as wiping all events, candidates, and score records to prepare for a new academic year. Features here are intentionally locked to prevent accidental data loss.
                                </p>
                                <button class="btn btn-outline-danger fw-bold rounded-pill px-4" disabled>
                                    <i class="bi bi-trash-fill me-2"></i> Factory Reset Locked
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>