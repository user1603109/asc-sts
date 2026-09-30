<?php
session_start();
require_once '../db.php'; 

// Directory for candidate avatars
$upload_dir = '../assets/uploads/avatars/';

// For testing purposes, we'll assign a dummy judge ID if not logged in
$judge_id = $_SESSION['user_id'] ?? 1; 

// --- SEARCH AND PAGINATION ---
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$search_param = "%$search%";

$limit = 6; 
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

// Get total records for pagination (Only 'Completed' events for this judge)
$total_stmt = $pdo->prepare("
    SELECT COUNT(*) 
    FROM events e
    JOIN event_judges ej ON e.id = ej.event_id
    WHERE ej.user_id = :judge_id 
      AND e.status = 'Completed' 
      AND (e.name LIKE :search OR e.type LIKE :search)
");
$total_stmt->execute(['judge_id' => $judge_id, 'search' => $search_param]);
$total_events = $total_stmt->fetchColumn();
$total_pages = ceil($total_events / $limit);

// Fetch current page data
try {
    $stmt = $pdo->prepare("
        SELECT e.* 
        FROM events e
        JOIN event_judges ej ON e.id = ej.event_id
        WHERE ej.user_id = :judge_id 
          AND e.status = 'Completed' 
          AND (e.name LIKE :search OR e.type LIKE :search)
        ORDER BY e.end_date DESC 
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

// --- DYNAMIC TABULATION LOGIC ---
foreach ($events as &$event) {
    $event_id = $event['id'];
    
    $crit_stmt = $pdo->prepare("SELECT id, max_score, percentage FROM criteria WHERE event_id = ?");
    $crit_stmt->execute([$event_id]);
    $criteria = $crit_stmt->fetchAll(PDO::FETCH_ASSOC);

    $cand_stmt = $pdo->prepare("SELECT id, name, order_number, image_path, team_members FROM candidates WHERE event_id = ?");
    $cand_stmt->execute([$event_id]);
    $candidates = $cand_stmt->fetchAll(PDO::FETCH_ASSOC);

    $score_stmt = $pdo->prepare("SELECT candidate_id, judge_id, criteria_id, score FROM scores WHERE event_id = ?");
    $score_stmt->execute([$event_id]);
    $raw_scores = $score_stmt->fetchAll(PDO::FETCH_ASSOC);

    $scores_map = [];
    $unique_judges = [];
    foreach ($raw_scores as $s) {
        $scores_map[$s['candidate_id']][$s['judge_id']][$s['criteria_id']] = $s['score'];
        $unique_judges[$s['judge_id']] = true;
    }
    
    $total_judges = count($unique_judges);
    $rankings = [];

    foreach ($candidates as $cand) {
        $grand_total = 0;
        if ($total_judges > 0) {
            $sum_of_judge_totals = 0;
            foreach (array_keys($unique_judges) as $jid) {
                $judge_total_for_candidate = 0;
                foreach ($criteria as $crit) {
                    $raw = $scores_map[$cand['id']][$jid][$crit['id']] ?? 0;
                    if ($crit['max_score'] > 0) {
                        $judge_total_for_candidate += ($raw / $crit['max_score']) * $crit['percentage'];
                    }
                }
                $sum_of_judge_totals += $judge_total_for_candidate;
            }
            $grand_total = $sum_of_judge_totals / $total_judges;
        }

        $rankings[] = [
            'order' => $cand['order_number'],
            'name' => $cand['name'],
            'team_members' => $cand['team_members'],
            'avatar' => $cand['image_path'],
            'final_score' => $grand_total
        ];
    }

    usort($rankings, function($a, $b) {
        return $b['final_score'] <=> $a['final_score'];
    });
    
    $event['results'] = $rankings;
}
unset($event);

function formatEventDate($start, $end) {
    if ($start === $end) {
        return date('M d, Y', strtotime($start));
    } else {
        return date('M d', strtotime($start)) . ' - ' . date('M d, Y', strtotime($end));
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>My Event History | ASTS Judge Portal</title>
    
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
        .bg-amber { background-color: #FFBF00 !important; }

        .search-wrapper { position: relative; max-width: 350px; }
        .search-wrapper .bi-search { position: absolute; top: 50%; left: 1.2rem; transform: translateY(-50%); color: #6c757d; font-size: 1.1rem; }
        .search-wrapper .form-control { border-radius: 16px; padding-left: 2.8rem; background-color: white; border: 1.5px solid #dee2e6; box-shadow: none; transition: all 0.2s ease; }
        .search-wrapper .form-control:focus { border-color: #0A192F; box-shadow: 0 0 0 4px rgba(10, 25, 47, 0.1); }

        .history-card { border: none; border-radius: 16px; box-shadow: 0 8px 20px rgba(0,0,0,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease; overflow: hidden; background: white;}
        .history-card:hover { transform: translateY(-5px); box-shadow: 0 12px 25px rgba(0,0,0,0.08); }
        .history-card-header { border-bottom: 2px solid rgba(255,191,0,0.2); }

        .btn-outline-midnight { color: #0A192F; border: 2px solid #0A192F; font-weight: 600; transition: all 0.3s ease; }
        .btn-outline-midnight:hover { background-color: #0A192F; color: white; }

        .modal-header-custom { background-color: #0A192F; color: white; border-bottom: 4px solid #FFBF00; }
        .modal-header-custom .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }

        .pagination .page-link { color: #0A192F; border: 1px solid #dee2e6; border-radius: 8px; margin: 0 2px; }
        .pagination .page-item.active .page-link { background-color: #0A192F; border-color: #0A192F; color: white; }

        /* Rank Badge Styling */
        .rank-badge { width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 900; font-size: 1rem; margin: 0 auto;}
        .rank-1 { background: linear-gradient(135deg, #FFD700 0%, #FDB931 100%); color: #0A192F; box-shadow: 0 4px 10px rgba(255, 215, 0, 0.4); transform: scale(1.1); }
        .rank-2 { background: linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%); color: #0A192F; }
        .rank-3 { background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%); color: white; }
        .rank-other { background-color: #0A192F; color: white; }
        
        .score-highlight { font-family: 'Segoe UI', monospace; font-size: 1.25rem; font-weight: 800; color: #0A192F; letter-spacing: -0.5px; }

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
        
        <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom responsive-stack">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">My Event History</h2>
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb mb-0 small">
                        <li class="breadcrumb-item"><a href="judgedashboard.php" class="text-decoration-none">Dashboard</a></li>
                        <li class="breadcrumb-item active" aria-current="page">Event History</li>
                    </ol>
                </nav>
            </div>
            
            <form method="GET" action="history.php" id="searchForm" class="m-0 w-100">
                <div class="search-wrapper w-100">
                    <i class="bi bi-search"></i>
                    <input type="text" class="form-control" name="search" id="searchInput" placeholder="Search past events..." value="<?= htmlspecialchars($search) ?>" autocomplete="off">
                </div>
            </form>
        </div>

        <div class="row g-4">
            <?php if (count($events) > 0): ?>
                <?php foreach ($events as $event): ?>
                    <div class="col-md-6 col-xl-4">
                        <div class="history-card h-100 d-flex flex-column">
                            <div class="history-card-header p-4 bg-light text-center">
                                <span class="badge bg-midnight rounded-pill px-3 py-1 mb-2"><?= htmlspecialchars($event['type']) ?></span>
                                <h4 class="fw-bolder text-midnight mb-0 text-truncate" title="<?= htmlspecialchars($event['name']) ?>">
                                    <?= htmlspecialchars($event['name']) ?>
                                </h4>
                            </div>
                            <div class="card-body p-4 d-flex flex-column">
                                
                                <div class="mb-3 d-flex align-items-center text-muted">
                                    <i class="bi bi-calendar-check text-amber fs-5 me-3"></i>
                                    <div>
                                        <small class="d-block fw-semibold text-uppercase" style="font-size: 0.7rem;">Concluded On</small>
                                        <span class="fw-bold text-dark"><?= formatEventDate($event['start_date'], $event['end_date']) ?></span>
                                    </div>
                                </div>
                                
                                <div class="mb-3 d-flex align-items-center text-muted">
                                    <i class="bi bi-building text-amber fs-5 me-3"></i>
                                    <div class="text-truncate">
                                        <small class="d-block fw-semibold text-uppercase" style="font-size: 0.7rem;">Organized By</small>
                                        <span class="fw-bold text-dark text-truncate d-block"><?= htmlspecialchars($event['organizer'] ?? 'Not Assigned') ?></span>
                                    </div>
                                </div>

                                <div class="mb-4 d-flex align-items-center text-muted">
                                    <i class="bi <?= ($event['participation_mode'] == 'Team') ? 'bi-people-fill' : 'bi-person-fill' ?> text-amber fs-5 me-3"></i>
                                    <div>
                                        <small class="d-block fw-semibold text-uppercase" style="font-size: 0.7rem;">Mode</small>
                                        <span class="fw-bold text-dark"><?= htmlspecialchars($event['participation_mode'] ?? 'Individual') ?></span>
                                    </div>
                                </div>

                                <button type="button" class="btn btn-outline-midnight rounded-pill fw-bold mt-auto w-100 py-2" 
                                        data-bs-toggle="modal" data-bs-target="#resultsModal<?= $event['id'] ?>">
                                    <i class="bi bi-trophy-fill me-2 text-amber"></i> View Results
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Modal for this Event's Results -->
                    <div class="modal fade" id="resultsModal<?= $event['id'] ?>" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-xl modal-dialog-centered">
                            <div class="modal-content border-0 shadow-lg">
                                <div class="modal-header modal-header-custom p-4">
                                    <div>
                                        <h4 class="modal-title fw-bolder mb-1"><i class="bi bi-award-fill me-2 text-amber"></i> <?= htmlspecialchars($event['name']) ?></h4>
                                        <span class="text-white-50 small fw-semibold"><i class="bi bi-calendar-check me-1"></i> Final Tabulated Results</span>
                                    </div>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-hover align-middle mb-0" style="min-width: 600px;">
                                            <thead class="bg-light">
                                                <tr>
                                                    <th class="text-center py-3 text-muted" width="10%">Rank</th>
                                                    <th class="text-center py-3 text-muted" width="10%">Entry</th>
                                                    <th class="py-3 text-muted">Participant / Team</th>
                                                    <th class="text-end pe-5 py-3 text-muted">Final Score</th>
                                                </tr>
                                            </thead>
                                            <tbody class="bg-white text-center">
                                                <?php if (count($event['results']) > 0): ?>
                                                    <?php 
                                                    $current_rank = 1;
                                                    foreach ($event['results'] as $row): 
                                                        $rank_class = 'rank-other';
                                                        if ($current_rank == 1) $rank_class = 'rank-1';
                                                        elseif ($current_rank == 2) $rank_class = 'rank-2';
                                                        elseif ($current_rank == 3) $rank_class = 'rank-3';
                                                    ?>
                                                        <tr>
                                                            <td class="py-3">
                                                                <div class="rank-badge <?= $rank_class ?>"><?= $current_rank ?></div>
                                                            </td>
                                                            <td><span class="text-muted fw-bold">#<?= $row['order'] ?></span></td>
                                                            <td class="text-start py-3">
                                                                <div class="d-flex align-items-center gap-3">
                                                                    <?php if (!empty($row['avatar'])): ?>
                                                                        <img src="<?= $upload_dir . htmlspecialchars($row['avatar']) ?>" alt="Avatar" class="rounded-circle shadow-sm" style="width: 45px; height: 45px; object-fit: cover; border: 2px solid <?= ($current_rank == 1) ? '#FFD700' : '#dee2e6' ?>;">
                                                                    <?php else: ?>
                                                                        <i class="bi <?= ($event['participation_mode'] == 'Team') ? 'bi-people-fill' : 'bi-person-circle' ?> text-muted" style="font-size: 2.5rem; line-height: 1;"></i>
                                                                    <?php endif; ?>
                                                                    <div>
                                                                        <span class="fw-bolder text-midnight fs-5 d-block lh-1 mb-1">
                                                                            <?= htmlspecialchars($row['name']) ?>
                                                                            <?= ($current_rank == 1) ? ' <i class="bi bi-star-fill text-amber ms-1 fs-6"></i>' : '' ?>
                                                                        </span>
                                                                        <?php if(!empty($row['team_members'])): ?>
                                                                            <span class="small text-muted fw-semibold">
                                                                                <i class="bi bi-person-lines-fill me-1"></i><?= htmlspecialchars($row['team_members']) ?>
                                                                            </span>
                                                                        <?php endif; ?>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td class="text-end pe-5 score-highlight <?= ($current_rank == 1) ? 'text-success' : '' ?>">
                                                                <?= number_format($row['final_score'], 2) ?>%
                                                            </td>
                                                        </tr>
                                                    <?php 
                                                    $current_rank++;
                                                    endforeach; 
                                                    ?>
                                                <?php else: ?>
                                                    <tr><td colspan="4" class="text-center py-5 text-muted"><i class="bi bi-folder-x fs-1 d-block mb-2"></i>Results are empty or were not recorded.</td></tr>
                                                <?php endif; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div class="modal-footer bg-light border-0">
                                    <button type="button" class="btn btn-midnight fw-semibold px-4 w-100" data-bs-dismiss="modal">Close Results</button>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="col-12">
                    <div class="card border-0 shadow-sm rounded-4 text-center py-5 mt-4">
                        <div class="card-body">
                            <i class="bi bi-clock-history fs-1 text-muted mb-3 d-block"></i>
                            <h5 class="fw-bold text-midnight">No Event History</h5>
                            <p class="text-muted">You have no completed events in your history yet.</p>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
        </div>
        
        <!-- Pagination -->
        <?php if ($total_pages > 1): ?>
        <div class="mt-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <span class="text-muted small fw-semibold text-center text-md-start">
                Showing <?= min(($offset + 1), max(1, $total_events)) ?> to <?= min(($offset + $limit), $total_events) ?> of <?= $total_events ?> past events
            </span>
            <nav aria-label="History pagination">
                <ul class="pagination pagination-sm mb-0 shadow-sm">
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
        </div>
        <?php endif; ?>

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