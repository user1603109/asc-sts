<?php
session_start();
require_once '../db.php'; 

// Fetch the 50 most recent scoring actions across the system
try {
    $sql = "
        SELECT 
            s.id AS ref_id,
            u.full_name AS judge_name,
            c.name AS candidate_name,
            cr.name AS criteria_name,
            e.name AS event_name,
            s.score
        FROM scores s
        JOIN users u ON s.judge_id = u.id
        JOIN candidates c ON s.candidate_id = c.id
        JOIN criteria cr ON s.criteria_id = cr.id
        JOIN events e ON s.event_id = e.id
        ORDER BY s.id DESC
        LIMIT 50
    ";
    $stmt = $pdo->query($sql);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $logs = [];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Logs | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <style>
        /* Global Reset for Tap Highlights and Outlines */
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; }
        a, button, .btn, label, .input-group-text, .page-link, select, option { cursor: pointer; }

        body { background-color: #F4F7F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default;}
        .main-content { min-height: 100vh; background-color: #F8F9FA; }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }

        .log-card { border: none; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.05); overflow: hidden; background: white; }
        .log-item { border-bottom: 1px solid #f0f0f0; padding: 1rem 1.5rem; transition: background-color 0.2s ease; }
        .log-item:hover { background-color: rgba(255, 191, 0, 0.05); }
        .log-item:last-child { border-bottom: none; }
        
        .log-icon { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: rgba(10, 25, 47, 0.05); color: #0A192F; font-size: 1.2rem; }
    </style>
</head>
<body class="d-flex">

    <?php include '../includes/admin_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-end mb-4 pb-3 border-bottom">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">System Activity Logs</h2>
                <p class="text-muted small mb-0 mt-1">Tracking the 50 most recent scoring events.</p>
            </div>
            <a href="dashboard.php" class="btn btn-outline-secondary btn-sm rounded-pill fw-bold px-3">
                <i class="bi bi-arrow-left me-1"></i> Back to Dashboard
            </a>
        </div>

        <div class="card log-card">
            <div class="card-header bg-midnight text-white border-0 pt-3 pb-2 px-4">
                <h6 class="fw-bold mb-0"><i class="bi bi-clock-history text-amber me-2"></i> Recent Score Submissions</h6>
            </div>
            <div class="card-body p-0">
                <?php if (count($logs) > 0): ?>
                    <?php foreach ($logs as $log): ?>
                        <div class="log-item d-flex align-items-center gap-3">
                            <div class="log-icon flex-shrink-0">
                                <i class="bi bi-clipboard-check"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="fw-bold text-midnight mb-1">Score Submitted by <?= htmlspecialchars($log['judge_name']) ?></h6>
                                <p class="text-muted small mb-0">
                                    Awarded a raw score of <span class="fw-bold text-success"><?= htmlspecialchars($log['score']) ?></span> to 
                                    <span class="fw-bold text-dark"><?= htmlspecialchars($log['candidate_name']) ?></span> for 
                                    <span class="fst-italic">"<?= htmlspecialchars($log['criteria_name']) ?>"</span>.
                                </p>
                            </div>
                            <div class="text-end flex-shrink-0 text-muted small">
                                <span class="badge bg-light text-dark border d-block mb-1"><?= htmlspecialchars($log['event_name']) ?></span>
                                Ref ID: #<?= $log['ref_id'] ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="text-center py-5 text-muted">
                        <i class="bi bi-journal-x fs-1 d-block mb-3"></i>
                        <h5 class="fw-bold">No Activity Recorded</h5>
                        <p>When judges begin submitting scores, their actions will appear here.</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>

    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>