<?php
session_start();
require_once '../db.php'; 

$success_msg = '';
$error_msg = '';

// --- HANDLE CRUD OPERATIONS ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action'])) {
    
    // Add New Judge
    if ($_POST['action'] == 'add') {
        $username = trim($_POST['username'] ?? '');
        $full_name = trim($_POST['full_name'] ?? '');
        $password = !empty($_POST['password']) ? trim($_POST['password']) : 'ASTS_JUDGE2026';
        
        if (empty($username) || empty($full_name)) {
            $error_msg = "Please provide both Full Name and Username.";
        } elseif (strlen($password) < 6) {
            $error_msg = "Password must be at least 6 characters long.";
        } else {
            try {
                // Check if username already exists (case-insensitive)
                $check = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(:username)");
                $check->execute(['username' => $username]);
                
                if ($check->fetch()) {
                    $error_msg = "Username '$username' is already taken. Please choose another username.";
                } else {
                    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                    // Newly created judges by admin are auto-approved
                    $stmt = $pdo->prepare("INSERT INTO users (full_name, username, password, role, approval_status) VALUES (:full_name, :username, :password, 'judge', 'approved')");
                    $stmt->execute([
                        'full_name' => $full_name,
                        'username' => $username,
                        'password' => $hashed_password
                    ]);
                    $success_msg = "Judge account created successfully!";
                }
            } catch (PDOException $e) {
                $error_msg = "Error adding judge: " . $e->getMessage();
            }
        }
    }
    
    // Edit Existing Judge
    if ($_POST['action'] == 'edit') {
        $id = (int)($_POST['judge_id'] ?? 0);
        $username = trim($_POST['edit_username'] ?? '');
        $full_name = trim($_POST['edit_full_name'] ?? '');
        $new_password = trim($_POST['edit_password'] ?? '');
        $edit_status = $_POST['edit_status'] ?? 'approved';
        
        if (empty($username) || empty($full_name) || $id <= 0) {
            $error_msg = "Please provide both Full Name and Username.";
        } else {
            try {
                $check = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(:username) AND id != :id");
                $check->execute(['username' => $username, 'id' => $id]);
                
                if ($check->fetch()) {
                    $error_msg = "Username '$username' is already taken by another user.";
                } else {
                    if (!empty($new_password)) {
                        if (strlen($new_password) < 6) {
                            $error_msg = "Password must be at least 6 characters long.";
                        } else {
                            $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
                            $stmt = $pdo->prepare("UPDATE users SET full_name = :full_name, username = :username, password = :password, approval_status = :status WHERE id = :id AND role = 'judge'");
                            $stmt->execute(['full_name' => $full_name, 'username' => $username, 'password' => $hashed_password, 'status' => $edit_status, 'id' => $id]);
                            $success_msg = "Judge profile and password updated successfully!";
                        }
                    } else {
                        $stmt = $pdo->prepare("UPDATE users SET full_name = :full_name, username = :username, approval_status = :status WHERE id = :id AND role = 'judge'");
                        $stmt->execute(['full_name' => $full_name, 'username' => $username, 'status' => $edit_status, 'id' => $id]);
                        $success_msg = "Judge profile updated successfully!";
                    }
                }
            } catch (PDOException $e) {
                $error_msg = "Error updating judge: " . $e->getMessage();
            }
        }
    }

    // Reset Password Action
    if ($_POST['action'] == 'reset_password') {
        $id = (int)($_POST['target_id'] ?? 0);
        $custom_pass = trim($_POST['reset_password_val'] ?? '');
        $new_pass = !empty($custom_pass) ? $custom_pass : 'ASTS_JUDGE2026';
        
        if (strlen($new_pass) < 6) {
            $error_msg = "Password must be at least 6 characters long.";
        } else {
            try {
                $hashed = password_hash($new_pass, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("UPDATE users SET password = :password, approval_status = 'approved' WHERE id = :id AND role = 'judge'");
                $stmt->execute(['password' => $hashed, 'id' => $id]);
                $success_msg = "Judge password reset successfully!";
            } catch (PDOException $e) {
                $error_msg = "Error resetting password: " . $e->getMessage();
            }
        }
    }

    // Change Account Approval Status
    if ($_POST['action'] == 'update_status') {
        try {
            $stmt = $pdo->prepare("UPDATE users SET approval_status = :status WHERE id = :id AND role = 'judge'");
            $stmt->execute(['status' => $_POST['new_status'], 'id' => $_POST['target_id']]);
            $success_msg = "Judge account status has been updated to " . ucfirst($_POST['new_status']) . ".";
        } catch (PDOException $e) {
            $error_msg = "Error updating status: " . $e->getMessage();
        }
    }
}

// --- HANDLE DELETION ---
if (isset($_GET['delete_id'])) {
    try {
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = :id AND role = 'judge'");
        $stmt->execute(['id' => $_GET['delete_id']]);
        $success_msg = "Judge account deleted successfully!";
    } catch (PDOException $e) {
        $error_msg = "Error deleting judge: " . $e->getMessage();
    }
}

// --- HANDLE SEARCH, PAGINATION & FETCHING ---
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$search_param = "%$search%";

$limit = 7;
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

// Get total records for pagination
$total_stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'judge' AND (full_name LIKE :search OR username LIKE :search)");
$total_stmt->execute(['search' => $search_param]);
$total_judges = $total_stmt->fetchColumn();
$total_pages = ceil($total_judges / $limit);

// Fetch current page data, sorting pending accounts to the top for immediate admin attention
try {
    $stmt = $pdo->prepare("
        SELECT id, full_name, username, approval_status
        FROM users 
        WHERE role = 'judge' AND (full_name LIKE :search OR username LIKE :search)
        ORDER BY FIELD(approval_status, 'pending', 'approved', 'rejected', 'suspended'), full_name ASC 
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindValue(':search', $search_param, PDO::PARAM_STR);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $judges = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $judges = [];
}

// Helper for status badges
function getStatusBadgeUI($status) {
    switch(strtolower($status)) {
        case 'approved': return '<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill"><i class="bi bi-check-circle-fill me-1"></i> Approved</span>';
        case 'pending': return '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-2 rounded-pill"><i class="bi bi-hourglass-split me-1"></i> Pending</span>';
        case 'suspended': return '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-2 rounded-pill"><i class="bi bi-slash-circle-fill me-1"></i> Suspended</span>';
        case 'rejected': return '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-3 py-2 rounded-pill"><i class="bi bi-x-circle-fill me-1"></i> Rejected</span>';
        default: return '<span class="badge bg-light text-dark px-3 py-2 rounded-pill">Unknown</span>';
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Judges | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <style>
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; }
        a, button, .btn, label, .input-group-text, .page-link, select, option { cursor: pointer; }

        body { background-color: #F4F7F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default; }
        .main-content { min-height: 100vh; background-color: #F8F9FA; }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }

        .btn-amber { background-color: #FFBF00; color: #0A192F; border: 2px solid #FFBF00; font-weight: 700; transition: all 0.3s ease; }
        .btn-amber:hover { background-color: #e6ac00; color: #0A192F; border-color: #e6ac00; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

        .btn-squircle { width: 38px; height: 38px; border-radius: 12px !important; display: inline-flex; align-items: center; justify-content: center; padding: 0; transition: all 0.2s ease; border: none; }
        
        .btn-approve { background-color: rgba(25, 135, 84, 0.1); color: #198754; }
        .btn-approve:hover { background-color: #198754; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(25, 135, 84, 0.3); }
        
        .btn-suspend { background-color: rgba(220, 53, 69, 0.1); color: #dc3545; }
        .btn-suspend:hover { background-color: #dc3545; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(220, 53, 69, 0.3); }

        .btn-edit { background-color: rgba(13, 110, 253, 0.1); color: #0d6efd; }
        .btn-edit:hover { background-color: #0d6efd; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(13,110,253,0.3); }
        
        .btn-delete { background-color: rgba(33, 37, 41, 0.1); color: #212529; }
        .btn-delete:hover { background-color: #212529; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(33, 37, 41, 0.3); }

        .modal-content .btn:not(.btn-close) { border-radius: 12px; transition: all 0.3s ease; }
        .modal-content .btn:not(.btn-close):hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0, 0, 0, 0.12); z-index: 1; }
        .modal-content .form-control { border-radius: 12px; }

        .search-wrapper { position: relative; max-width: 350px; }
        .search-wrapper .bi-search { position: absolute; top: 50%; left: 1.2rem; transform: translateY(-50%); color: #6c757d; font-size: 1.1rem; }
        .search-wrapper .form-control { border-radius: 16px; padding-left: 2.8rem; background-color: transparent; border: 1.5px solid #dee2e6; box-shadow: none; transition: all 0.2s ease; }
        .search-wrapper .form-control:focus { border-color: #0A192F; box-shadow: 0 0 0 4px rgba(10, 25, 47, 0.1); }

        .table-custom-header th { background-color: #0A192F !important; color: #FFFFFF !important; font-weight: 600; border-bottom: none; padding: 1rem; }
        .table-hover tbody tr:hover { background-color: #f8fafc; }
        tbody tr { background-color: #ffffff; }
        .table-card { border: none; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.05); overflow: hidden; }

        .modal-header-custom { background-color: #0A192F; color: white; border-bottom: 4px solid #FFBF00; }
        .modal-header-custom .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
        
        .pagination .page-link { color: #0A192F; border: 1px solid #dee2e6; border-radius: 8px; margin: 0 2px; }
        .pagination .page-item.active .page-link { background-color: #0A192F; border-color: #0A192F; color: white; }
    </style>
</head>
<body class="d-flex">

    <?php include '../includes/admin_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom flex-wrap gap-3">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">Evaluator Management</h2>
                <p class="text-muted small mb-0 mt-1"><i class="bi bi-shield-lock-fill text-amber me-1"></i> Pending accounts cannot access the scoring portal until approved.</p>
            </div>
            
            <div class="d-flex align-items-center gap-3">
                <button type="button" class="btn btn-amber px-4 py-2 rounded-pill shadow-sm" data-bs-toggle="modal" data-bs-target="#addJudgeModal">
                    <i class="bi bi-person-badge-fill me-2"></i> Register Judge
                </button>
            </div>
        </div>

        <?php if($success_msg): ?>
            <div id="autoCloseAlert" class="alert alert-success alert-dismissible fade show shadow-sm border-0 d-flex align-items-center mb-4 py-3 px-4 rounded-3" role="alert" style="background-color: #D1E7DD; color: #0F5132; border-left: 5px solid #198754 !important;">
                <i class="bi bi-check-circle-fill me-3 fs-4 text-success"></i>
                <div class="fw-bold fs-6"><?= htmlspecialchars($success_msg) ?></div>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>
        <?php if($error_msg): ?>
            <div id="autoCloseAlertError" class="alert alert-danger alert-dismissible fade show shadow-sm border-0 d-flex align-items-center mb-4 py-3 px-4 rounded-3" role="alert" style="background-color: #F8D7DA; color: #842029; border-left: 5px solid #DC3545 !important;">
                <i class="bi bi-exclamation-triangle-fill me-3 fs-4 text-danger"></i>
                <div class="fw-bold fs-6"><?= htmlspecialchars($error_msg) ?></div>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <div class="card table-card">
            
            <div class="card-header bg-white border-0 pt-4 pb-3 px-4">
                <form method="GET" action="judges.php" id="searchForm" class="m-0">
                    <div class="search-wrapper">
                        <i class="bi bi-search"></i>
                        <input type="text" class="form-control" name="search" id="searchInput" placeholder="Search judges..." value="<?= htmlspecialchars($search) ?>" autocomplete="off">
                    </div>
                </form>
            </div>

            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-custom-header">
                            <tr>
                                <th width="10%">No.</th>
                                <th>Judge Full Name</th>
                                <th>System Username</th>
                                <th class="text-center">Account Status</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white">
                            <?php if (count($judges) > 0): ?>
                                <?php $row_count = $offset + 1; ?>
                                <?php foreach ($judges as $judge): ?>
                                    <tr>
                                        <td class="fw-bold px-3 text-muted">#<?= $row_count++ ?></td>
                                        <td class="fw-bold text-midnight fs-6">
                                            <i class="bi bi-person-circle text-secondary me-2"></i>
                                            <?= htmlspecialchars($judge['full_name']) ?>
                                        </td>
                                        <td><span class="badge bg-light text-dark border p-2">@<?= htmlspecialchars($judge['username']) ?></span></td>
                                        <td class="text-center">
                                            <?= getStatusBadgeUI($judge['approval_status']) ?>
                                        </td>
                                        <td class="text-center">
                                            
                                            <!-- Quick Approve / Suspend Toggles -->
                                            <?php if(strtolower($judge['approval_status']) !== 'approved'): ?>
                                                <form method="POST" class="d-inline" title="Approve Judge">
                                                    <input type="hidden" name="action" value="update_status">
                                                    <input type="hidden" name="target_id" value="<?= $judge['id'] ?>">
                                                    <input type="hidden" name="new_status" value="approved">
                                                    <button type="submit" class="btn btn-squircle btn-approve me-1"><i class="bi bi-check-lg fs-5"></i></button>
                                                </form>
                                            <?php else: ?>
                                                <form method="POST" class="d-inline" title="Suspend Access">
                                                    <input type="hidden" name="action" value="update_status">
                                                    <input type="hidden" name="target_id" value="<?= $judge['id'] ?>">
                                                    <input type="hidden" name="new_status" value="suspended">
                                                    <button type="submit" class="btn btn-squircle btn-suspend me-1" onclick="return confirm('Suspend this account? They will be blocked from logging in.');"><i class="bi bi-slash-circle fs-6"></i></button>
                                                </form>
                                            <?php endif; ?>

                                            <!-- Reset Password Button -->
                                            <button type="button" class="btn btn-squircle btn-edit me-1 reset-pass-btn text-warning" 
                                                data-bs-toggle="modal" data-bs-target="#resetPasswordModal"
                                                data-id="<?= $judge['id'] ?>" 
                                                data-fullname="<?= htmlspecialchars($judge['full_name']) ?>"
                                                data-username="<?= htmlspecialchars($judge['username']) ?>"
                                                title="Reset Password">
                                                <i class="bi bi-key-fill fs-5"></i>
                                            </button>

                                            <!-- Edit Profile Button -->
                                            <button type="button" class="btn btn-squircle btn-edit me-1 edit-btn" 
                                                data-bs-toggle="modal" data-bs-target="#editJudgeModal"
                                                data-id="<?= $judge['id'] ?>" 
                                                data-fullname="<?= htmlspecialchars($judge['full_name']) ?>"
                                                data-username="<?= htmlspecialchars($judge['username']) ?>"
                                                data-status="<?= htmlspecialchars($judge['approval_status']) ?>"
                                                title="Edit Judge Profile">
                                                <i class="bi bi-pencil-square fs-5"></i>
                                            </button>
                                            
                                            <a href="judges.php?delete_id=<?= $judge['id'] ?>" class="btn btn-squircle btn-delete" 
                                               onclick="return confirm('Are you sure you want to permanently delete the account for \'<?= htmlspecialchars(addslashes($judge['full_name'])) ?>\'? All their scoring data may be affected.');" title="Delete Judge">
                                                <i class="bi bi-trash3-fill fs-5"></i>
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr><td colspan="5" class="text-center py-5 text-muted"><i class="bi bi-person-x fs-1 d-block mb-2"></i>No judge accounts found matching your search.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card-footer bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <span class="text-muted small fw-semibold">
                    Showing <?= min(($offset + 1), max(1, $total_judges)) ?> to <?= min(($offset + $limit), $total_judges) ?> of <?= $total_judges ?> entries
                </span>
                <?php if ($total_pages > 1): ?>
                <nav aria-label="Pagination">
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>"><a class="page-link" href="?page=<?= $page - 1 ?>&search=<?= urlencode($search) ?>">Previous</a></li>
                        <?php for($i = 1; $i <= $total_pages; $i++): ?>
                            <li class="page-item <?= ($page == $i) ? 'active' : '' ?>"><a class="page-link" href="?page=<?= $i ?>&search=<?= urlencode($search) ?>"><?= $i ?></a></li>
                        <?php endfor; ?>
                        <li class="page-item <?= ($page >= $total_pages) ? 'disabled' : '' ?>"><a class="page-link" href="?page=<?= $page + 1 ?>&search=<?= urlencode($search) ?>">Next</a></li>
                    </ul>
                </nav>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Modal: Add Judge -->
    <div class="modal fade" id="addJudgeModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-person-badge-fill me-2 text-amber"></i> Register New Judge</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form action="judges.php" method="POST">
                    <input type="hidden" name="action" value="add">
                    <div class="modal-body p-4">
                        
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Judge Full Name</label>
                            <input type="text" class="form-control" name="full_name" placeholder="e.g. Maria Clara" required>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">System Username</label>
                            <input type="text" class="form-control" name="username" placeholder="e.g. mclara2026" required autocomplete="off">
                            <div class="form-text">Used by the judge as their User ID / Username to log into the scoring portal.</div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Assigned Password</label>
                            <div class="input-group">
                                <input type="password" class="form-control" name="password" id="add_judge_password" value="ASTS_JUDGE2026" required minlength="6">
                                <button class="btn btn-outline-secondary toggle-pass-btn" type="button" data-target="add_judge_password">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </div>
                            <div class="form-text">Default is <code>ASTS_JUDGE2026</code>. You can change this to any custom password.</div>
                        </div>

                        <div class="alert alert-light border small text-muted mb-0">
                            <i class="bi bi-info-circle-fill text-success me-1"></i> Accounts created by an Admin are automatically approved and immediately able to log in.
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-outline-secondary fw-semibold" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-midnight fw-semibold" style="background-color: #0A192F; color: white;">Create Account</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal: Edit Judge -->
    <div class="modal fade" id="editJudgeModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-pencil-square me-2 text-amber"></i> Edit Judge Profile</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form action="judges.php" method="POST">
                    <input type="hidden" name="action" value="edit">
                    <input type="hidden" name="judge_id" id="edit_id"> 
                    
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Judge Full Name</label>
                            <input type="text" class="form-control" name="edit_full_name" id="edit_full_name" required>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">System Username</label>
                            <input type="text" class="form-control" name="edit_username" id="edit_username" required>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Account Status</label>
                            <select class="form-select" name="edit_status" id="edit_status">
                                <option value="approved">Approved (Active Access)</option>
                                <option value="pending">Pending Approval</option>
                                <option value="suspended">Suspended</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Change Password</label>
                            <div class="input-group">
                                <input type="password" class="form-control" name="edit_password" id="edit_password" placeholder="Leave blank to keep existing password" minlength="6">
                                <button class="btn btn-outline-secondary toggle-pass-btn" type="button" data-target="edit_password">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </div>
                            <div class="form-text text-amber fw-bold">Leave blank to keep the current password.</div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-outline-secondary fw-semibold" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary fw-semibold">Update Judge</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal: Quick Reset Password -->
    <div class="modal fade" id="resetPasswordModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-midnight text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-key-fill me-2 text-amber"></i> Reset Judge Password</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form action="judges.php" method="POST">
                    <input type="hidden" name="action" value="reset_password">
                    <input type="hidden" name="target_id" id="reset_judge_id">
                    <div class="modal-body p-4">
                        <p class="text-muted small mb-3">
                            Resetting login password for <strong class="text-midnight" id="reset_judge_name">Judge</strong> (<code id="reset_judge_username">username</code>).
                        </p>
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">New Password</label>
                            <div class="input-group">
                                <input type="password" class="form-control" name="reset_password_val" id="reset_password_input" value="ASTS_JUDGE2026" required minlength="6">
                                <button class="btn btn-outline-secondary toggle-pass-btn" type="button" data-target="reset_password_input">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </div>
                            <div class="form-text">Default reset password is <code>ASTS_JUDGE2026</code>. You can customize it above.</div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-outline-secondary fw-semibold" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-warning fw-bold">Confirm Password Reset</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Live Search Feature
            let typingTimer;
            const searchInput = document.getElementById('searchInput');
            const searchForm = document.getElementById('searchForm');
            
            if (searchInput) {
                if (searchInput.value) {
                    searchInput.focus();
                    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
                }

                searchInput.addEventListener('keyup', function() {
                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(() => {
                        searchForm.submit();
                    }, 500); 
                });
            }

            // Populate Edit Modal
            const editButtons = document.querySelectorAll('.edit-btn');
            editButtons.forEach(button => {
                button.addEventListener('click', function() {
                    document.getElementById('edit_id').value = this.getAttribute('data-id');
                    document.getElementById('edit_full_name').value = this.getAttribute('data-fullname');
                    document.getElementById('edit_username').value = this.getAttribute('data-username');
                    const statusVal = (this.getAttribute('data-status') || 'approved').toLowerCase();
                    const statusSelect = document.getElementById('edit_status');
                    if (statusSelect) {
                        statusSelect.value = statusVal;
                    }
                    document.querySelector('input[name="edit_password"]').value = '';
                });
            });

            // Populate Quick Reset Password Modal
            const resetPassButtons = document.querySelectorAll('.reset-pass-btn');
            resetPassButtons.forEach(button => {
                button.addEventListener('click', function() {
                    document.getElementById('reset_judge_id').value = this.getAttribute('data-id');
                    document.getElementById('reset_judge_name').textContent = this.getAttribute('data-fullname');
                    document.getElementById('reset_judge_username').textContent = '@' + this.getAttribute('data-username');
                    document.getElementById('reset_password_input').value = 'ASTS_JUDGE2026';
                });
            });

            // Toggle Password Visibility Handlers
            document.querySelectorAll('.toggle-pass-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const targetId = this.getAttribute('data-target');
                    const input = document.getElementById(targetId);
                    const icon = this.querySelector('i');
                    if (input) {
                        if (input.type === 'password') {
                            input.type = 'text';
                            icon.classList.remove('bi-eye');
                            icon.classList.add('bi-eye-slash');
                        } else {
                            input.type = 'password';
                            icon.classList.remove('bi-eye-slash');
                            icon.classList.add('bi-eye');
                        }
                    }
                });
            });

            // Automatically close alert popups after exactly 3 seconds
            const autoCloseSuccess = document.getElementById('autoCloseAlert');
            if (autoCloseSuccess) {
                setTimeout(function() {
                    const alertInstance = bootstrap.Alert.getOrCreateInstance(autoCloseSuccess);
                    if (alertInstance) alertInstance.close();
                }, 3000);
            }

            const autoCloseError = document.getElementById('autoCloseAlertError');
            if (autoCloseError) {
                setTimeout(function() {
                    const alertInstance = bootstrap.Alert.getOrCreateInstance(autoCloseError);
                    if (alertInstance) alertInstance.close();
                }, 3000);
            }
        });
    </script>
</body>
</html>