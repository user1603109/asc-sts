<?php
session_start();
require_once '../db.php'; 

// Require authentication check in production
// if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') { header("Location: adminlogin.php"); exit; }

$success_msg = '';
$error_msg = '';

// --- HANDLE DATABASE BACKUP GENERATION ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action']) && $_POST['action'] == 'download_backup') {
    try {
        // 1. Get all tables in the database
        $tables = [];
        $stmt = $pdo->query("SHOW TABLES");
        while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
            $tables[] = $row[0];
        }

        // 2. Initialize the SQL Dump String
        $sql_dump = "-- ==========================================================\n";
        $sql_dump .= "-- ASTS (Automated Scoring & Tabulation System) Database Backup\n";
        $sql_dump .= "-- Generated on: " . date('F d, Y \a\t h:i A') . "\n";
        $sql_dump .= "-- Server PHP Version: " . phpversion() . "\n";
        $sql_dump .= "-- ==========================================================\n\n";
        
        // Disable foreign key checks to prevent import errors
        $sql_dump .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        // 3. Loop through tables to get structure and data
        foreach ($tables as $table) {
            // Get Table Structure
            $stmt = $pdo->query("SHOW CREATE TABLE `$table`");
            $create_row = $stmt->fetch(PDO::FETCH_NUM);
            $sql_dump .= "-- Structure for table `$table`\n";
            $sql_dump .= "DROP TABLE IF EXISTS `$table`;\n";
            $sql_dump .= $create_row[1] . ";\n\n";

            // Get Table Data
            $stmt = $pdo->query("SELECT * FROM `$table`");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($rows) > 0) {
                $sql_dump .= "-- Data for table `$table`\n";
                $sql_dump .= "INSERT INTO `$table` VALUES \n";
                
                $values = [];
                foreach ($rows as $row) {
                    $row_vals = [];
                    foreach ($row as $val) {
                        if (is_null($val)) {
                            $row_vals[] = "NULL";
                        } else {
                            // Quote the value safely
                            $row_vals[] = $pdo->quote($val);
                        }
                    }
                    $values[] = "(" . implode(", ", $row_vals) . ")";
                }
                $sql_dump .= implode(",\n", $values) . ";\n\n";
            }
        }
        
        // Re-enable foreign key checks
        $sql_dump .= "SET FOREIGN_KEY_CHECKS=1;\n";

        // 4. Force browser to download the file
        $filename = 'ASTS_Database_Backup_' . date('Ymd_His') . '.sql';
        header('Content-Type: application/sql');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        echo $sql_dump;
        exit;

    } catch (Exception $e) {
        $error_msg = "Failed to generate backup: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Backups | ASTS Apayao State College</title>
    
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

        .card-custom { border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden; background: white; }
        
        .icon-circle { width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1rem; }
        .bg-icon-blue { background-color: rgba(10, 25, 47, 0.1); color: #0A192F; }
        .bg-icon-amber { background-color: rgba(255, 191, 0, 0.15); color: #b38600; }
    </style>
</head>
<body class="d-flex">

    <?php include '../includes/admin_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-end mb-4 pb-3 border-bottom">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">System Backups</h2>
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb mb-0 small">
                        <li class="breadcrumb-item"><a href="dashboard.php" class="text-decoration-none">Dashboard</a></li>
                        <li class="breadcrumb-item active" aria-current="page">Database Management</li>
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
            
            <!-- Generate Backup Card -->
            <div class="col-lg-6">
                <div class="card card-custom h-100 border-top border-4 border-midnight" style="border-color: #0A192F !important;">
                    <div class="card-body p-4 p-md-5 d-flex flex-column align-items-center text-center">
                        <div class="icon-circle bg-icon-blue">
                            <i class="bi bi-cloud-arrow-down-fill"></i>
                        </div>
                        <h4 class="fw-bolder text-midnight mb-2">Export Database</h4>
                        <p class="text-muted mb-4">
                            Securely download a full <code>.sql</code> copy of your database. This includes all events, scoring criteria, registered participants, judge profiles, and submitted scores.
                        </p>
                        
                        <form action="backups.php" method="POST" class="mt-auto w-100">
                            <input type="hidden" name="action" value="download_backup">
                            <button type="submit" class="btn btn-midnight btn-lg w-100 rounded-pill shadow-sm fs-6">
                                <i class="bi bi-download me-2"></i> Generate & Download Backup
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Restore Instructions Card -->
            <div class="col-lg-6">
                <div class="card card-custom h-100 border-top border-4 border-warning">
                    <div class="card-body p-4 p-md-5 d-flex flex-column align-items-center text-center">
                        <div class="icon-circle bg-icon-amber">
                            <i class="bi bi-database-fill-up"></i>
                        </div>
                        <h4 class="fw-bolder text-midnight mb-2">Restore Database</h4>
                        <p class="text-muted mb-4">
                            To ensure absolute data integrity and prevent server timeout errors, importing database files must be handled directly through your server's database manager.
                        </p>
                        
                        <div class="alert alert-light border shadow-sm text-start w-100 mt-auto mb-0 rounded-4">
                            <h6 class="fw-bold text-dark mb-2"><i class="bi bi-info-circle-fill text-amber me-2"></i> How to restore data:</h6>
                            <ol class="small text-muted mb-0 ps-3">
                                <li class="mb-1">Log into your hosting control panel (cPanel, XAMPP, etc.).</li>
                                <li class="mb-1">Open <strong>phpMyAdmin</strong> and select the ASTS database.</li>
                                <li class="mb-1">Click the <strong>Import</strong> tab at the top.</li>
                                <li>Upload the <code>.sql</code> file you previously generated.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>