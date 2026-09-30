<?php
session_start();
require_once '../db.php'; 

// For testing purposes, we'll assign a dummy judge ID if not logged in
$judge_id = $_SESSION['user_id'] ?? 1; 

// --- SEARCH AND PAGINATION ---
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$search_param = "%$search%";

$limit = 8; 
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

// Get total records for pagination
$total_stmt = $pdo->prepare("
    SELECT COUNT(*) 
    FROM events e
    JOIN event_judges ej ON e.id = ej.event_id
    WHERE ej.user_id = :judge_id AND (e.name LIKE :search OR e.type LIKE :search)
");
$total_stmt->execute(['judge_id' => $judge_id, 'search' => $search_param]);
$total_events = $total_stmt->fetchColumn();
$total_pages = ceil($total_events / $limit);

// Fetch current page data using start_date and end_date, plus candidate scoring progress
try {
    $stmt = $pdo->prepare("
        SELECT e.id, e.name, e.type, e.start_date, e.end_date, e.status,
               (SELECT COUNT(id) FROM candidates c WHERE c.event_id = e.id) as total_candidates,
               (SELECT COUNT(DISTINCT s.candidate_id) FROM scores s WHERE s.event_id = e.id AND s.judge_id = ej.user_id) as scored_candidates
        FROM events e
        JOIN event_judges ej ON e.id = ej.event_id
        WHERE ej.user_id = :judge_id AND (e.name LIKE :search OR e.type LIKE :search)
        ORDER BY e.start_date DESC 
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindValue(':judge_id', $judge_id, PDO::PARAM_INT);
    $stmt->bindValue(':search', $search_param, PDO::PARAM_STR);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $events = [];
}

// Date Formatting Helper
function formatEventDate($start, $end) {
    if ($start === $end) {
        return date('M d, Y', strtotime($start));
    } else {
        return date('M d', strtotime($start)) . ' - ' . date('M d, Y', strtotime($end));
    }
}

// Helper function for badges
function getJudgeStatusBadge($status) {
    switch ($status) {
        case 'Completed': return '<span class="badge bg-success rounded-pill px-3 py-2">Completed</span>';
        case 'Tabulating': return '<span class="badge bg-warning text-dark rounded-pill px-3 py-2">Tabulating</span>';
        case 'Ongoing': return '<span class="badge bg-danger rounded-pill px-3 py-2 shadow-sm">Live / Ongoing</span>';
        default: return '<span class="badge bg-secondary rounded-pill px-3 py-2">Upcoming</span>';
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>My Events | ASTS Judge Portal</title>
    
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

        .search-wrapper { position: relative; max-width: 350px; }
        .search-wrapper .bi-search { position: absolute; top: 50%; left: 1.2rem; transform: translateY(-50%); color: #6c757d; font-size: 1.1rem; }
        .search-wrapper .form-control { border-radius: 16px; padding-left: 2.8rem; background-color: transparent; border: 1.5px solid #dee2e6; box-shadow: none; transition: all 0.2s ease; }
        .search-wrapper .form-control:focus { border-color: #0A192F; box-shadow: 0 0 0 4px rgba(10, 25, 47, 0.1); }

        .table-custom-header th { background-color: #0A192F !important; color: #FFFFFF !important; font-weight: 600; border-bottom: none; padding: 1rem; }
        .table-hover tbody tr:hover { background-color: rgba(255, 191, 0, 0.05); }
        .table-card { border: none; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.05); overflow: hidden; }
        
        .pagination .page-link { color: #0A192F; border: 1px solid #dee2e6; border-radius: 8px; margin: 0 2px; }
        .pagination .page-item.active .page-link { background-color: #0A192F; border-color: #0A192F; color: white; }

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
            .search-wrapper { max-width: 100% !important; width: 100% !important; }
            .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
    </style>
</head>
<body class="d-flex align-items-start">

    <?php include '../includes/judge_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom flex-wrap gap-3 responsive-stack">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">My Assigned Events</h2>
            </div>
        </div>

        <div class="card table-card">
            
            <div class="card-header bg-white border-0 pt-4 pb-3 px-4 d-flex justify-content-between align-items-center responsive-stack">
                <form method="GET" action="my_events.php" id="searchForm" class="m-0 flex-grow-1 w-100">
                    <div class="search-wrapper">
                        <i class="bi bi-search"></i>
                        <input type="text" class="form-control" name="search" id="searchInput" placeholder="Search events or types..." value="<?= htmlspecialchars($search) ?>" autocomplete="off">
                    </div>
                </form>
            </div>

            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" style="min-width: 800px;">
                        <thead class="table-custom-header">
                            <tr>
                                <th class="ps-4">Name of Event</th>
                                <th>Category / Type</th>
                                <th>Scheduled Date</th>
                                <th>Event Status</th>
                                <th>Progress</th>
                                <th class="text-center pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white">
                            <?php if (count($events) > 0): ?>
                                <?php foreach ($events as $event): 
                                    $is_fully_scored = ($event['total_candidates'] > 0 && $event['total_candidates'] == $event['scored_candidates']);
                                ?>
                                    <tr>
                                        <td class="fw-bold px-4 text-midnight fs-6">
                                            <?= htmlspecialchars($event['name']) ?>
                                        </td>
                                        <td>
                                            <span class="badge bg-light text-dark border p-2">
                                                <i class="bi bi-tag-fill me-1 text-amber"></i> 
                                                <?= htmlspecialchars($event['type']) ?>
                                            </span>
                                        </td>
                                        <td>
                                            <span class="fw-semibold text-muted">
                                                <i class="bi bi-calendar-range me-1"></i><?= formatEventDate($event['start_date'], $event['end_date']) ?>
                                            </span>
                                        </td>
                                        <td>
                                            <?= getJudgeStatusBadge($event['status']) ?>
                                        </td>
                                        <td>
                                            <div class="small fw-bold text-muted">
                                                <i class="bi bi-people-fill me-1 text-amber"></i>
                                                <?= $event['scored_candidates'] ?> / <?= $event['total_candidates'] ?> Scored
                                            </div>
                                        </td>
                                        <td class="text-center pe-4">
                                            <?php if($event['status'] == 'Ongoing'): ?>
                                                <?php if($is_fully_scored): ?>
                                                    <a href="score_entry.php?event_id=<?= $event['id'] ?>" class="btn btn-success fw-bold rounded-pill shadow-sm px-4 text-nowrap">
                                                        <i class="bi bi-check2-all me-2"></i>Scored
                                                    </a>
                                                <?php else: ?>
                                                    <a href="score_entry.php?event_id=<?= $event['id'] ?>" class="btn btn-danger fw-bold rounded-pill shadow-sm px-4 text-nowrap">
                                                        <i class="bi bi-pencil-square me-2"></i>Score Now
                                                    </a>
                                                <?php endif; ?>
                                            <?php elseif($event['status'] == 'Completed'): ?>
                                                <button type="button" class="btn btn-outline-secondary fw-bold rounded-pill px-4 text-nowrap" disabled>
                                                    <i class="bi bi-lock-fill me-1"></i> Locked
                                                </button>
                                            <?php else: ?>
                                                <a href="score_entry.php?event_id=<?= $event['id'] ?>" class="btn btn-outline-midnight fw-bold rounded-pill px-4 text-nowrap" style="color: #0A192F; border-color: #0A192F;">
                                                    <i class="bi bi-eye-fill me-1"></i> Preview
                                                </a>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="6" class="text-center py-5 text-muted">
                                        <i class="bi bi-clipboard-x fs-1 d-block mb-3"></i>
                                        <h5 class="fw-bold text-dark">No Events Found</h5>
                                        <p class="mb-0">You have not been assigned to any events that match your search.</p>
                                    </td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center responsive-stack">
                <span class="text-muted small fw-semibold text-center text-md-start">
                    Showing <?= min(($offset + 1), max(1, $total_events)) ?> to <?= min(($offset + $limit), $total_events) ?> of <?= $total_events ?> events
                </span>
                <?php if ($total_pages > 1): ?>
                <nav aria-label="Events pagination" class="d-flex justify-content-center">
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>">
                            <a class="page-link" href="?page=<?= $page - 1 ?>&search=<?= urlencode($search) ?>">Prev</a>
                        </li>
                        <?php for($i = 1; $i <= $total_pages; $i++): ?>
                            <li class="page-item <?= ($page == $i) ? 'active' : '' ?>">
                                <a class="page-link" href="?page=<?= $i ?>&search=<?= urlencode($search) ?>"><?= $i ?></a>
                            </li>
                        <?php endfor; ?>
                        <li class="page-item <?= ($page >= $total_pages) ? 'disabled' : '' ?>">
                            <a class="page-link" href="?page=<?= $page + 1 ?>&search=<?= urlencode($search) ?>">Next</a>
                        </li>
                    </ul>
                </nav>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
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
        });
    </script>
</body>
</html>