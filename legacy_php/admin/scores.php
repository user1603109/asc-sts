<?php
session_start();
require_once '../db.php'; 

// Directory for candidate avatars
$upload_dir = '../assets/uploads/avatars/';

$success_msg = '';
$error_msg = '';

// --- HANDLE SEARCH, FILTERING, & PAGINATION ---
$limit = 10; 
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$search_param = "%$search%";
$filter_event = isset($_GET['event_filter']) ? $_GET['event_filter'] : '';

$where_clause = "WHERE (c.name LIKE :search OR u.full_name LIKE :search)";
$params = ['search' => $search_param];

if (!empty($filter_event)) {
    $where_clause .= " AND s.event_id = :event_id";
    $params['event_id'] = $filter_event;
}

// Get total grouped records for pagination
$total_sql = "SELECT COUNT(*) FROM (
    SELECT 1 FROM scores s 
    JOIN candidates c ON s.candidate_id = c.id 
    JOIN users u ON s.judge_id = u.id 
    $where_clause 
    GROUP BY s.event_id, s.candidate_id
) as t";

$total_stmt = $pdo->prepare($total_sql);
$total_stmt->execute($params);
$total_scores = $total_stmt->fetchColumn();
$total_pages = ceil($total_scores / $limit);

// Fetch GROUPED data (Aggregating all judges into one row per candidate)
try {
    // Increase group_concat length to prevent truncation of large scoring arrays
    $pdo->query("SET SESSION group_concat_max_len = 100000;");

    $sql = "
        SELECT 
            s.event_id, s.candidate_id,
            e.name AS event_name, 
            c.name AS candidate_name, c.order_number, c.image_path,
            COUNT(DISTINCT s.judge_id) AS judges_count,
            SUM(s.score) AS grand_total_score,
            SUM(cr.max_score) AS grand_total_max,
            GROUP_CONCAT(CONCAT(u.full_name, '||', cr.name, '||', s.score, '||', cr.max_score, '||', COALESCE(ep.portion_name, '')) SEPARATOR '@@') as details
        FROM scores s
        JOIN events e ON s.event_id = e.id
        JOIN users u ON s.judge_id = u.id
        JOIN candidates c ON s.candidate_id = c.id
        JOIN criteria cr ON s.criteria_id = cr.id
        LEFT JOIN event_portions ep ON cr.portion_id = ep.id
        $where_clause
        GROUP BY s.event_id, s.candidate_id, e.name, c.name, c.order_number, c.image_path
        ORDER BY e.name ASC, grand_total_score DESC, c.order_number ASC
        LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $scores_list = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $scores_list = [];
}

// Fetch events for the filter dropdown
$events_filter_stmt = $pdo->query("SELECT id, name FROM events ORDER BY name ASC");
$events_dropdown = $events_filter_stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Score Audit | ASTS Apayao State College</title>
    
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

        .search-wrapper { position: relative; max-width: 300px; }
        .search-wrapper .bi-search { position: absolute; top: 50%; left: 1.2rem; transform: translateY(-50%); color: #6c757d; font-size: 1.1rem; }
        .search-wrapper .form-control { border-radius: 12px; padding-left: 2.8rem; background-color: #fff; border: 1.5px solid #dee2e6; box-shadow: none; transition: all 0.2s ease; }
        .search-wrapper .form-control:focus { border-color: #0A192F; box-shadow: 0 0 0 4px rgba(10, 25, 47, 0.1); }

        .table-custom-header th { background-color: #0A192F !important; color: #FFFFFF !important; font-weight: 600; border-bottom: none; padding: 1rem; }
        .table-card { border: none; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.05); overflow: hidden; }
        
        .score-row { transition: background-color 0.2s ease; cursor: pointer; }
        .score-row:hover { background-color: rgba(255, 191, 0, 0.08) !important; }

        .score-display { font-family: 'Segoe UI', monospace; font-size: 1.25rem; letter-spacing: -0.5px; }
        .progress { border-radius: 6px; background-color: #e9ecef; }

        .modal-header-custom { background-color: #0A192F; color: white; border-bottom: 4px solid #FFBF00; }
        .modal-header-custom .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
        
        .pagination .page-link { color: #0A192F; border: 1px solid #dee2e6; border-radius: 8px; margin: 0 2px; }
        .pagination .page-item.active .page-link { background-color: #0A192F; border-color: #0A192F; color: white; }
        
        .accordion-button:not(.collapsed) { background-color: rgba(255, 191, 0, 0.1); color: #0A192F; box-shadow: inset 0 -1px 0 rgba(0,0,0,.125); }
        .accordion-button:focus { box-shadow: none; border-color: rgba(0,0,0,.125); }
    </style>
</head>
<body class="d-flex">

    <?php include '../includes/admin_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom flex-wrap gap-3">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">Score Audit Log</h2>
                <p class="text-muted small mb-0 mt-1"><i class="bi bi-shield-lock-fill text-success me-1"></i> Scores are strictly read-only and automatically aggregated for total integrity.</p>
            </div>
            
            <form action="scores.php" method="GET" class="d-flex align-items-center gap-2">
                <select name="event_filter" class="form-select border-midnight fw-semibold shadow-sm" onchange="this.form.submit()" style="border-radius: 12px; min-width: 280px;">
                    <option value="">-- View All Events --</option>
                    <?php foreach($events_dropdown as $ev): ?>
                        <option value="<?= $ev['id'] ?>" <?= ($filter_event == $ev['id']) ? 'selected' : '' ?>>
                            <?= htmlspecialchars($ev['name']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </form>
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

        <div class="card table-card">
            
            <div class="card-header bg-white border-bottom pt-4 pb-3 px-4">
                <form method="GET" action="scores.php" id="filterForm" class="m-0">
                    <input type="hidden" name="event_filter" value="<?= htmlspecialchars($filter_event) ?>">
                    <div class="search-wrapper">
                        <i class="bi bi-search"></i>
                        <input type="text" class="form-control" name="search" id="searchInput" placeholder="Search candidate or judge..." value="<?= htmlspecialchars($search) ?>" autocomplete="off">
                    </div>
                </form>
            </div>

            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table align-middle mb-0" id="auditTable">
                        <thead class="table-custom-header">
                            <tr>
                                <th class="ps-4">Candidate Profile</th>
                                <th>Assigned Event</th>
                                <th>Evaluation Status</th>
                                <th class="text-end pe-4">Aggregated Score</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white">
                            <?php if (count($scores_list) > 0): ?>
                                <?php foreach ($scores_list as $row): ?>
                                    <tr class="score-row" 
                                        data-candname="<?= htmlspecialchars($row['candidate_name']) ?>"
                                        data-candentry="<?= htmlspecialchars($row['order_number']) ?>"
                                        data-candavatar="<?= !empty($row['image_path']) ? $upload_dir . htmlspecialchars($row['image_path']) : '' ?>"
                                        data-details="<?= htmlspecialchars($row['details']) ?>"
                                        title="Click to view full judge breakdown">
                                        
                                        <td class="ps-4">
                                            <div class="d-flex align-items-center gap-3">
                                                <?php if (!empty($row['image_path'])): ?>
                                                    <img src="<?= $upload_dir . htmlspecialchars($row['image_path']) ?>" alt="Avatar" class="rounded-circle shadow-sm" style="width: 45px; height: 45px; object-fit: cover; border: 2px solid #dee2e6;">
                                                <?php else: ?>
                                                    <i class="bi bi-person-circle text-muted" style="font-size: 2.8rem; line-height: 1;"></i>
                                                <?php endif; ?>
                                                <div>
                                                    <span class="fw-bold text-midnight fs-6 d-block lh-1 mb-1"><?= htmlspecialchars($row['candidate_name']) ?></span>
                                                    <span class="badge bg-midnight rounded-pill" style="font-size: 0.7rem;">Entry #<?= $row['order_number'] ?></span>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="small fw-semibold text-muted">
                                            <?= htmlspecialchars($row['event_name']) ?>
                                        </td>
                                        <td class="small fw-semibold">
                                            <span class="badge bg-light text-dark border px-2 py-1">
                                                <i class="bi bi-people-fill text-amber me-1"></i> Evaluated by <?= $row['judges_count'] ?> Judge(s)
                                            </span>
                                        </td>
                                        <td class="text-end pe-4" style="min-width: 150px;">
                                            <?php 
                                                $pct = ($row['grand_total_score'] / max(1, $row['grand_total_max'])) * 100;
                                                $score_color = ($pct >= 90) ? 'text-success' : (($pct < 75) ? 'text-danger' : 'text-midnight');
                                                $bg_color = ($pct >= 90) ? 'bg-success' : (($pct < 75) ? 'bg-danger' : 'bg-midnight');
                                            ?>
                                            <div class="d-flex flex-column align-items-end">
                                                <div>
                                                    <span class="score-display fw-bolder <?= $score_color ?>">
                                                        <?= number_format($row['grand_total_score'], 2) ?> 
                                                    </span>
                                                    <span class="text-muted small fw-semibold">/ <?= number_format($row['grand_total_max'], 0) ?></span>
                                                </div>
                                                <div class="progress w-100 mt-1 shadow-sm" style="height: 6px; max-width: 110px;">
                                                    <div class="progress-bar <?= $bg_color ?>" role="progressbar" style="width: <?= $pct ?>%;"></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr><td colspan="4" class="text-center py-5 text-muted"><i class="bi bi-clipboard-x fs-1 d-block mb-2"></i>No scores have been submitted yet for this selection.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                <span class="text-muted small fw-semibold">
                    Showing <?= min(($offset + 1), max(1, $total_scores)) ?> to <?= min(($offset + $limit), $total_scores) ?> of <?= $total_scores ?> evaluated candidates
                </span>
                <?php if ($total_pages > 1): ?>
                <nav aria-label="Pagination">
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>">
                            <a class="page-link" href="?page=<?= $page - 1 ?>&event_filter=<?= $filter_event ?>&search=<?= urlencode($search) ?>">Previous</a>
                        </li>
                        <?php for($i = 1; $i <= $total_pages; $i++): ?>
                            <li class="page-item <?= ($page == $i) ? 'active' : '' ?>">
                                <a class="page-link" href="?page=<?= $i ?>&event_filter=<?= $filter_event ?>&search=<?= urlencode($search) ?>"><?= $i ?></a>
                            </li>
                        <?php endfor; ?>
                        <li class="page-item <?= ($page >= $total_pages) ? 'disabled' : '' ?>">
                            <a class="page-link" href="?page=<?= $page + 1 ?>&event_filter=<?= $filter_event ?>&search=<?= urlencode($search) ?>">Next</a>
                        </li>
                    </ul>
                </nav>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Modal: View Detailed Scores -->
    <div class="modal fade" id="viewScoreDetailsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom p-3">
                    <h5 class="modal-title fw-bold"><i class="bi bi-card-checklist me-2 text-amber"></i> Aggregated Score Breakdown</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4 bg-light">
                    
                    <div class="d-flex align-items-center gap-3 mb-4 bg-white p-3 rounded-4 shadow-sm border">
                        <img id="view_avatar" src="" alt="Avatar" class="rounded-circle shadow-sm d-none" style="width: 65px; height: 65px; object-fit: cover; border: 2px solid #0A192F;">
                        <span id="view_avatar_placeholder" class="badge bg-light text-dark border rounded-circle shadow-sm d-none" style="width: 65px; height: 65px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"></span>
                        
                        <div>
                            <h4 class="fw-bolder text-midnight mb-1" id="view_cand_name">Candidate Name</h4>
                            <span class="text-muted small fw-semibold">Detailed Evaluation by Panel</span>
                        </div>
                    </div>
                    
                    <div id="detailed_scores_container">
                        <!-- Populated dynamically by JS -->
                    </div>
                </div>
                <div class="modal-footer bg-white border-top p-3">
                    <button type="button" class="btn btn-midnight fw-semibold px-4 w-100" data-bs-dismiss="modal">Close Menu</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            
            // Search Debounce Logic
            let typingTimer;
            const searchInput = document.getElementById('searchInput');
            const filterForm = document.getElementById('filterForm');
            
            if (searchInput) {
                if (searchInput.value) {
                    searchInput.focus();
                    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
                }
                searchInput.addEventListener('keyup', function() {
                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(() => { filterForm.submit(); }, 500); 
                });
            }

            // Handle View Details Modal Population via Clickable Row
            const viewModal = new bootstrap.Modal(document.getElementById('viewScoreDetailsModal'));
            const scoreRows = document.querySelectorAll('.score-row');
            
            scoreRows.forEach(row => {
                row.addEventListener('click', function() {
                    const candName = this.getAttribute('data-candname');
                    const candEntry = this.getAttribute('data-candentry');
                    const candAvatar = this.getAttribute('data-candavatar');
                    const detailsRaw = this.getAttribute('data-details');
                    
                    document.getElementById('view_cand_name').textContent = candName;
                    
                    // Handle Avatar Display
                    const imgEl = document.getElementById('view_avatar');
                    const placeholderEl = document.getElementById('view_avatar_placeholder');
                    
                    if (candAvatar) {
                        imgEl.src = candAvatar;
                        imgEl.classList.remove('d-none');
                        placeholderEl.classList.add('d-none');
                    } else {
                        placeholderEl.textContent = '#' + candEntry;
                        placeholderEl.classList.remove('d-none');
                        imgEl.classList.add('d-none');
                    }
                    
                    const container = document.getElementById('detailed_scores_container');
                    container.innerHTML = '';
                    
                    if (detailsRaw) {
                        // Parse the raw GROUP_CONCAT data
                        const detailsArray = detailsRaw.split('@@');
                        const judgesData = {};
                        
                        detailsArray.forEach(detail => {
                            const parts = detail.split('||'); 
                            // parts = [JudgeName, CritName, Score, MaxScore, PortionName]
                            const judgeName = parts[0];
                            const critName = parts[1];
                            const score = parseFloat(parts[2]);
                            const max = parseFloat(parts[3]);
                            const portionName = parts[4] || '';
                            
                            if (!judgesData[judgeName]) {
                                judgesData[judgeName] = { criteria: [], totalScore: 0, totalMax: 0 };
                            }
                            judgesData[judgeName].criteria.push({ critName, score, max, portionName });
                            judgesData[judgeName].totalScore += score;
                            judgesData[judgeName].totalMax += max;
                        });

                        // Build the Accordion UI for each Judge
                        let html = '<div class="accordion shadow-sm" id="judgeAccordion">';
                        let index = 0;
                        
                        for (const [judge, data] of Object.entries(judgesData)) {
                            const pct = (data.totalScore / Math.max(1, data.totalMax)) * 100;
                            const scoreColor = pct >= 90 ? 'text-success' : (pct < 75 ? 'text-danger' : 'text-midnight');
                            const isExpanded = index === 0 ? 'show' : '';
                            const isCollapsedBtn = index === 0 ? '' : 'collapsed';
                            
                            html += `
                            <div class="accordion-item border-0 mb-3 rounded-4 overflow-hidden shadow-sm">
                                <h2 class="accordion-header" id="heading${index}">
                                    <button class="accordion-button ${isCollapsedBtn} bg-white fw-bold text-midnight px-4 py-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                                        <div class="d-flex justify-content-between align-items-center w-100 pe-3">
                                            <span><i class="bi bi-person-badge-fill text-amber me-2"></i> ${judge}</span>
                                            <span class="${scoreColor} fs-5 score-display">${data.totalScore.toFixed(2)} <small class="text-muted fs-6 fw-semibold">/ ${data.totalMax.toFixed(0)}</small></span>
                                        </div>
                                    </button>
                                </h2>
                                <div id="collapse${index}" class="accordion-collapse collapse ${isExpanded}" data-bs-parent="#judgeAccordion">
                                    <div class="accordion-body p-0 bg-white">
                                        <ul class="list-group list-group-flush border-top">`;
                                        
                            data.criteria.forEach(c => {
                                const portionBadge = c.portionName ? `<span class="badge bg-warning text-dark border ms-2 small"><i class="bi bi-diagram-3-fill me-1"></i>${c.portionName}</span>` : '';
                                html += `
                                            <li class="list-group-item d-flex justify-content-between align-items-center px-4 py-3 border-bottom-0">
                                                <span class="fw-semibold text-muted small">${c.critName} ${portionBadge}</span>
                                                <span class="fw-bolder text-midnight score-display" style="font-size: 1.1rem;">${c.score.toFixed(2)} <span class="text-muted small fw-semibold" style="font-size: 0.85rem;">/ ${c.max.toFixed(0)}</span></span>
                                            </li>`;
                            });
                            
                            html += `
                                        </ul>
                                    </div>
                                </div>
                            </div>`;
                            index++;
                        }
                        html += '</div>';
                        container.innerHTML = html;
                    }

                    viewModal.show();
                });
            });
        });
    </script>
</body>
</html>