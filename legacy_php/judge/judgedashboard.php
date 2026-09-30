<?php
session_start();
require_once '../db.php'; 

// For testing purposes, we'll assign a dummy judge ID if not logged in
$judge_id = $_SESSION['user_id'] ?? 1; 
$judge_name = $_SESSION['full_name'] ?? 'Evaluator';

// 1. Fetch Total Assigned Events
$stmt_total = $pdo->prepare("SELECT COUNT(*) FROM event_judges WHERE user_id = :judge_id");
$stmt_total->execute(['judge_id' => $judge_id]);
$total_assigned = $stmt_total->fetchColumn();

// 2. Fetch Active Events Assigned to this Judge
$stmt_events = $pdo->prepare("
    SELECT e.id, e.name, e.type, e.start_date, e.end_date, e.status 
    FROM events e
    JOIN event_judges ej ON e.id = ej.event_id
    WHERE ej.user_id = :judge_id AND e.status != 'Completed'
    ORDER BY e.start_date ASC
    LIMIT 5
");
$stmt_events->execute(['judge_id' => $judge_id]);
$active_events = $stmt_events->fetchAll(PDO::FETCH_ASSOC);

function formatEventDate($start, $end) {
    if ($start === $end) return date('M d, Y', strtotime($start));
    return date('M d', strtotime($start)) . ' - ' . date('M d, Y', strtotime($end));
}

function getJudgeStatusBadge($status) {
    switch ($status) {
        case 'Completed': return '<span class="badge bg-success rounded-pill px-3 py-2">Completed</span>';
        case 'Tabulating': return '<span class="badge bg-warning text-dark rounded-pill px-3 py-2">Tabulating</span>';
        case 'Ongoing': return '<span class="badge bg-info rounded-pill px-3 py-2">Ongoing</span>';
        default: return '<span class="badge bg-secondary rounded-pill px-3 py-2">Upcoming</span>';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Judge Dashboard | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <style>
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; }
        a, button, .btn, label, .input-group-text, .page-link, select, option { cursor: pointer; }

        body { background-color: #F4F7F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default; }
        
        .main-content { min-height: 100vh; background-color: #F8F9FA; width: calc(100% - 280px); transition: all 0.3s ease; }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }
        .bg-amber { background-color: #FFBF00 !important; }

        .btn-squircle { width: 38px; height: 38px; border-radius: 12px !important; display: inline-flex; align-items: center; justify-content: center; padding: 0; transition: all 0.2s ease; border: none; }
        .btn-edit { background-color: rgba(13, 110, 253, 0.1); color: #0d6efd; }
        .btn-edit:hover { background-color: #0d6efd; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(13,110,253,0.3); }

        .stat-card { border: none; border-radius: 12px; transition: transform 0.3s ease, box-shadow 0.3s ease; overflow: hidden; position: relative; }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 12px 20px rgba(0,0,0,0.15); }
        .stat-icon { font-size: 4rem; position: absolute; right: -10px; bottom: -15px; transform: rotate(-10deg); line-height: 1; }

        .card-navy { background: linear-gradient(135deg, #0A192F 0%, #1b3869 100%); color: #FFFFFF; }
        .card-navy .stat-icon { color: #FFFFFF; opacity: 0.1; }
        .card-navy .card-subtitle { color: rgba(255, 255, 255, 0.7) !important; }
        
        .card-amber { background: linear-gradient(135deg, #FFBF00 0%, #ff9100 100%); color: #0A192F; }
        .card-amber .stat-icon { color: #0A192F; opacity: 0.15; }
        .card-amber .card-subtitle { color: rgba(10, 25, 47, 0.7) !important; }
        
        .card-teal { background: linear-gradient(135deg, #00695c 0%, #26a69a 100%); color: #FFFFFF; }
        .card-teal .stat-icon { color: #FFFFFF; opacity: 0.15; }
        .card-teal .card-subtitle { color: rgba(255, 255, 255, 0.7) !important; }

        .table-custom-header th { background-color: #0A192F !important; color: #FFFFFF !important; font-weight: 600; border-bottom: none; padding: 1rem; }
        .table-hover tbody tr:hover { background-color: rgba(255, 191, 0, 0.05); }
        .table-card { border: none; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.05); overflow: hidden; }

        .activity-feed { border-left: 2px solid #e9ecef; padding-left: 15px; margin-left: 10px; }
        .activity-item { position: relative; margin-bottom: 1.5rem; }
        .activity-item::before { content: ''; position: absolute; left: -21px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background-color: #FFBF00; border: 2px solid #fff; }
        .activity-time { font-size: 0.75rem; color: #6c757d; font-weight: 600; }

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
            .mobile-center { text-align: center !important; justify-content: center !important; width: 100%; }
            .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
    </style>
</head>
<body class="d-flex align-items-start">

    <?php include '../includes/judge_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom responsive-stack">
            <div class="mobile-center text-md-start">
                <h2 class="fw-bolder text-midnight mb-0">Welcome, <?= htmlspecialchars($judge_name) ?>!</h2>
                <p class="text-muted mb-0">ASTS Judge Evaluation Portal</p>
            </div>
            <div class="text-end bg-white px-4 py-2 rounded shadow-sm border mobile-center">
                <div class="fw-bold text-midnight fs-5" id="liveTime">00:00:00 AM</div>
                <div class="small fw-semibold text-muted" id="liveDate">Loading Date...</div>
            </div>
        </div>

        <div class="row g-4 mb-5">
            <div class="col-sm-12 col-xl-4">
                <div class="card stat-card card-navy h-100 p-3 shadow-sm">
                    <div class="card-body">
                        <h6 class="card-subtitle fw-bold text-uppercase mb-2">My Assigned Events</h6>
                        <h2 class="fw-bolder mb-0 display-6"><?= $total_assigned ?></h2>
                        <i class="bi bi-calendar-check stat-icon"></i>
                    </div>
                </div>
            </div>
            <div class="col-sm-12 col-xl-4">
                <div class="card stat-card card-amber h-100 p-3 shadow-sm">
                    <div class="card-body">
                        <h6 class="card-subtitle fw-bold text-uppercase mb-2">Pending Scores</h6>
                        <h2 class="fw-bolder mb-0 display-6 text-midnight">Active</h2>
                        <i class="bi bi-pencil-square stat-icon"></i>
                    </div>
                </div>
            </div>
            <div class="col-sm-12 col-xl-4">
                <div class="card stat-card card-teal h-100 p-3 shadow-sm">
                    <div class="card-body">
                        <h6 class="card-subtitle fw-bold text-uppercase mb-2">Profile Status</h6>
                        <h2 class="fw-bolder mb-0 display-6">Verified</h2>
                        <i class="bi bi-shield-check stat-icon"></i>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-4">
            
            <div class="col-lg-8">
                <div class="card border-0 shadow-sm rounded-3 h-100 table-card">
                    <div class="card-header bg-white border-0 pt-4 pb-0 px-4">
                        <h5 class="fw-bold text-midnight mb-0"><i class="bi bi-list-task text-amber me-2"></i> My Upcoming & Ongoing Events</h5>
                    </div>
                    <div class="card-body p-4">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle" style="min-width: 500px;">
                                <thead class="table-custom-header">
                                    <tr>
                                        <th class="rounded-start">Event Name</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th class="text-center rounded-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white">
                                    <?php if (count($active_events) > 0): ?>
                                        <?php foreach ($active_events as $event): ?>
                                            <tr>
                                                <td class="fw-bold text-midnight"><?= htmlspecialchars($event['name']) ?></td>
                                                <td><small class="text-muted fw-semibold"><i class="bi bi-calendar-range me-1"></i><?= formatEventDate($event['start_date'], $event['end_date']) ?></small></td>
                                                <td><?= getJudgeStatusBadge($event['status']) ?></td>
                                                <td class="text-center">
                                                    <?php if($event['status'] == 'Ongoing'): ?>
                                                        <a href="score_entry.php?event_id=<?= $event['id'] ?>" class="btn btn-sm btn-danger fw-bold shadow-sm rounded-pill px-3 py-1 text-nowrap">
                                                            <i class="bi bi-pencil-fill me-1"></i> Score Now
                                                        </a>
                                                    <?php else: ?>
                                                        <a href="my_events.php" class="btn btn-squircle btn-edit" title="View Event Details">
                                                            <i class="bi bi-eye-fill fs-5"></i>
                                                        </a>
                                                    <?php endif; ?>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <tr>
                                            <td colspan="4" class="text-center py-5 text-muted">
                                                <i class="bi bi-calendar-x fs-1 d-block mb-2"></i>
                                                You currently have no upcoming or ongoing events assigned to you.
                                            </td>
                                        </tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                        <div class="text-end mt-2">
                            <a href="my_events.php" class="text-decoration-none text-midnight fw-bold small">View All My Events &rarr;</a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <div class="card border-0 shadow-sm rounded-3 h-100">
                    <div class="card-header bg-white border-0 pt-4 pb-0 px-4">
                        <h5 class="fw-bold text-midnight mb-0"><i class="bi bi-bell text-amber me-2"></i> Notifications</h5>
                    </div>
                    <div class="card-body p-4">
                        <div class="activity-feed mt-2">
                            
                            <div class="activity-item">
                                <div class="activity-time">Welcome</div>
                                <div class="small fw-semibold text-dark">You successfully logged into the ASTS Judge Portal.</div>
                            </div>
                            
                            <div class="activity-item">
                                <div class="activity-time">System Note</div>
                                <div class="small fw-semibold text-dark">Please ensure you verify the candidate numbers before submitting your final scores.</div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

        </div>
        
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        function updateDateTime() {
            const now = new Date();
            const timeOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
            const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = now.toLocaleDateString('en-US', dateOptions);
            
            document.getElementById('liveTime').textContent = formattedTime;
            document.getElementById('liveDate').textContent = formattedDate;
        }
        updateDateTime();
        setInterval(updateDateTime, 1000);
    </script>
</body>
</html>