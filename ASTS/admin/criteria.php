<?php
session_start();
require_once '../db.php'; 

// --- SESSION MESSAGING FOR POST-REDIRECT-GET PATTERN ---
$success_msg = '';
$error_msg = '';

if (isset($_SESSION['success_msg'])) {
    $success_msg = $_SESSION['success_msg'];
    unset($_SESSION['success_msg']);
}
if (isset($_SESSION['error_msg'])) {
    $error_msg = $_SESSION['error_msg'];
    unset($_SESSION['error_msg']);
}

// --- FETCH EVENTS FOR DROPDOWN ---
try {
    $events_stmt = $pdo->query("SELECT id, name FROM events ORDER BY name ASC");
    $events_list = $events_stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $events_list = [];
}

// --- FETCH ALL EVENT PORTIONS ---
try {
    $portions_stmt = $pdo->query("SELECT id, event_id, portion_name, percentage, order_number FROM event_portions ORDER BY event_id, order_number ASC");
    $all_portions = $portions_stmt->fetchAll(PDO::FETCH_ASSOC);
    $event_portions_map = [];
    foreach ($all_portions as $p) {
        $event_portions_map[$p['event_id']][] = $p;
    }
} catch (PDOException $e) {
    $all_portions = [];
    $event_portions_map = [];
}

// --- FETCH RECENTLY CREATED EVENTS FOR QUICK CARDS ---
try {
    $recent_stmt = $pdo->query("SELECT id, name, type, start_date FROM events ORDER BY id DESC LIMIT 4");
    $recent_events = $recent_stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $recent_events = [];
}

// --- FETCH WEIGHTS FOR ALL EVENTS / PORTIONS ---
$weights_stmt = $pdo->query("SELECT event_id, portion_id, SUM(percentage) as total_weight FROM criteria GROUP BY event_id, portion_id");
$event_weights = [];
$portion_weights = [];
while ($row = $weights_stmt->fetch(PDO::FETCH_ASSOC)) {
    if ($row['portion_id']) {
        $portion_weights[$row['portion_id']] = (float)$row['total_weight'];
    } else {
        $event_weights[$row['event_id']] = (float)$row['total_weight'];
    }
}

// --- HANDLE CRUD OPERATIONS (With PRG Pattern) ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action'])) {
    
    // Add Criteria
    if ($_POST['action'] == 'add') {
        $event_id = (int)$_POST['event_id'];
        $portion_id = !empty($_POST['portion_id']) ? (int)$_POST['portion_id'] : null;
        $percentage = (float)$_POST['percentage'];
        
        $current_total = 0;
        if ($portion_id) {
            $current_total = $portion_weights[$portion_id] ?? 0;
        } else {
            $current_total = $event_weights[$event_id] ?? 0;
        }

        if (($current_total + $percentage) > 100) {
            $_SESSION['error_msg'] = "Warning: Adding this criteria ({$percentage}%) exceeds the 100% total weight limit for this " . ($portion_id ? "portion" : "event") . ". Current total is {$current_total}%.";
        } else {
            try {
                $stmt = $pdo->prepare("INSERT INTO criteria (event_id, portion_id, name, max_score, percentage) VALUES (:event_id, :portion_id, :name, :max_score, :percentage)");
                $stmt->execute([
                    'event_id' => $event_id,
                    'portion_id' => $portion_id,
                    'name' => $_POST['criteria_name'],
                    'max_score' => $_POST['max_score'],
                    'percentage' => $percentage
                ]);
                $_SESSION['success_msg'] = "Scoring criteria successfully added!";
            } catch (PDOException $e) {
                $_SESSION['error_msg'] = "Error adding criteria: " . $e->getMessage();
            }
        }
        header("Location: criteria.php?event_filter=" . $event_id . ($portion_id ? "&portion_filter=" . $portion_id : ""));
        exit;
    }
    
    // Edit Criteria
    if ($_POST['action'] == 'edit') {
        $id = (int)$_POST['criteria_id'];
        $event_id = (int)$_POST['edit_event_id'];
        $portion_id = !empty($_POST['edit_portion_id']) ? (int)$_POST['edit_portion_id'] : null;
        $percentage = (float)$_POST['edit_percentage'];
        
        if ($portion_id) {
            $check_stmt = $pdo->prepare("SELECT COALESCE(SUM(percentage), 0) FROM criteria WHERE portion_id = ? AND id != ?");
            $check_stmt->execute([$portion_id, $id]);
        } else {
            $check_stmt = $pdo->prepare("SELECT COALESCE(SUM(percentage), 0) FROM criteria WHERE event_id = ? AND portion_id IS NULL AND id != ?");
            $check_stmt->execute([$event_id, $id]);
        }
        $current_total_without_this = (float)$check_stmt->fetchColumn();

        if (($current_total_without_this + $percentage) > 100) {
            $_SESSION['error_msg'] = "Warning: Updating this criteria exceeds the 100% total weight limit. Adjust other weights first.";
        } else {
            try {
                $stmt = $pdo->prepare("UPDATE criteria SET event_id = :event_id, portion_id = :portion_id, name = :name, max_score = :max_score, percentage = :percentage WHERE id = :id");
                $stmt->execute([
                    'event_id' => $event_id,
                    'portion_id' => $portion_id,
                    'name' => $_POST['edit_name'],
                    'max_score' => $_POST['edit_max_score'],
                    'percentage' => $percentage,
                    'id' => $id
                ]);
                $_SESSION['success_msg'] = "Criteria updated successfully!";
            } catch (PDOException $e) {
                $_SESSION['error_msg'] = "Error updating criteria: " . $e->getMessage();
            }
        }
        header("Location: criteria.php?event_filter=" . $event_id . ($portion_id ? "&portion_filter=" . $portion_id : ""));
        exit;
    }
}

// --- HANDLE DELETION (With PRG Pattern) ---
if (isset($_GET['delete_id'])) {
    try {
        $stmt = $pdo->prepare("DELETE FROM criteria WHERE id = :id");
        $stmt->execute(['id' => $_GET['delete_id']]);
        $_SESSION['success_msg'] = "Criteria deleted successfully!";
    } catch (PDOException $e) {
        $_SESSION['error_msg'] = "Error deleting criteria: " . $e->getMessage();
    }
    
    $filter_param = isset($_GET['event_filter']) ? "?event_filter=" . $_GET['event_filter'] : '';
    if (isset($_GET['portion_filter']) && !empty($_GET['portion_filter'])) {
        $filter_param .= "&portion_filter=" . $_GET['portion_filter'];
    }
    header("Location: criteria.php" . $filter_param);
    exit;
}

// --- HANDLE FILTERING, TABULATION & PAGINATION ---
$limit = 7; 
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

$filter_event = isset($_GET['event_filter']) ? $_GET['event_filter'] : '';
$filter_portion = isset($_GET['portion_filter']) ? $_GET['portion_filter'] : '';
$where_clauses = [];
$params = [];

if (!empty($filter_event)) {
    $where_clauses[] = "c.event_id = :event_id";
    $params['event_id'] = $filter_event;
}
if (!empty($filter_portion)) {
    $where_clauses[] = "c.portion_id = :portion_id";
    $params['portion_id'] = $filter_portion;
}

$where_clause = !empty($where_clauses) ? "WHERE " . implode(" AND ", $where_clauses) : "";

// Compute validator targets
$total_weight = 0;
if (!empty($filter_portion)) {
    $total_weight = $portion_weights[$filter_portion] ?? 0;
} elseif (!empty($filter_event)) {
    $total_weight = $event_weights[$filter_event] ?? 0;
}
$is_filtered_full = (!empty($filter_event) && $total_weight >= 100);

// Get total records for pagination
$total_sql = "SELECT COUNT(*) FROM criteria c $where_clause";
$total_stmt = $pdo->prepare($total_sql);
$total_stmt->execute($params);
$total_criteria = $total_stmt->fetchColumn();
$total_pages = ceil($total_criteria / $limit);

// Fetch current page data 
try {
    $sql = "
        SELECT c.*, e.name AS event_name, ep.portion_name, ep.percentage AS portion_weight 
        FROM criteria c 
        LEFT JOIN events e ON c.event_id = e.id 
        LEFT JOIN event_portions ep ON c.portion_id = ep.id
        $where_clause
        ORDER BY e.name ASC, ep.order_number ASC, c.id ASC 
        LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $criteria_list = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $criteria_list = [];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Criteria | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <style>
        /* Global Reset for Tap Highlights and Outlines */
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { 
            -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; 
        }
        a, button, .btn, label, .input-group-text, .event-shortcut-card, .page-link, select, option { cursor: pointer; }

        body { 
            background-color: #F4F7F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; 
            -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default;
        }
        .main-content { min-height: 100vh; background-color: #F8F9FA; }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }

        .btn-amber { background-color: #FFBF00; color: #0A192F; border: 2px solid #FFBF00; font-weight: 700; transition: all 0.3s ease; }
        .btn-amber:hover { background-color: #e6ac00; color: #0A192F; border-color: #e6ac00; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .btn-amber:disabled { background-color: #e0e0e0; border-color: #e0e0e0; color: #9e9e9e; cursor: not-allowed; box-shadow: none; transform: none; }
        
        .btn-outline-midnight { color: #0A192F; border: 1px solid #0A192F; transition: all 0.2s ease; }
        .btn-outline-midnight:hover { background-color: #0A192F; color: white; }

        /* Unified Squircle Action Buttons */
        .btn-squircle { width: 38px; height: 38px; border-radius: 12px !important; display: inline-flex; align-items: center; justify-content: center; padding: 0; transition: all 0.2s ease; border: none; }
        .btn-edit { background-color: rgba(13, 110, 253, 0.1); color: #0d6efd; }
        .btn-edit:hover { background-color: #0d6efd; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(13,110,253,0.3); }
        .btn-delete { background-color: rgba(220, 53, 69, 0.1); color: #dc3545; }
        .btn-delete:hover { background-color: #dc3545; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(220,53,69,0.3); }

        /* Modal Overrides */
        .modal-content .btn:not(.btn-close) { border-radius: 12px; transition: all 0.3s ease; }
        .modal-content .btn:not(.btn-close):not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0, 0, 0, 0.12); z-index: 1; }
        .modal-content .form-control, .modal-content .form-select { border-radius: 12px; }

        .table-custom-header th { background-color: #0A192F !important; color: #FFFFFF !important; font-weight: 600; border-bottom: none; padding: 1rem; }
        .table-hover tbody tr:hover { background-color: rgba(255, 191, 0, 0.05); }
        .table-card { border: none; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.05); overflow: hidden; }

        .modal-header-custom { background-color: #0A192F; color: white; border-bottom: 4px solid #FFBF00; }
        .modal-header-custom .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
        
        .pagination .page-link { color: #0A192F; border: 1px solid #dee2e6; border-radius: 8px; margin: 0 2px; }
        .pagination .page-item.active .page-link { background-color: #0A192F; border-color: #0A192F; color: white; }
        
        /* Event Shortcut Cards */
        .event-shortcut-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .event-shortcut-card:hover { transform: translateY(-4px); box-shadow: 0 8px 15px rgba(0,0,0,0.1) !important; }
    </style>
</head>
<body class="d-flex">

    <?php include '../includes/admin_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-end mb-4 pb-3 border-bottom">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">Criteria Management</h2>
            </div>
            
            <div class="d-flex gap-2 align-items-center flex-wrap">
                <!-- Event & Portion Filter Form -->
                <form action="criteria.php" method="GET" class="d-flex align-items-center gap-2 m-0 flex-wrap">
                    <label class="fw-bold text-midnight small mb-0 text-nowrap">Filter Event:</label>
                    <select name="event_filter" class="form-select form-select-sm border-midnight" onchange="this.form.submit()" style="border-radius: 8px; min-width: 180px;">
                        <option value="">-- View All Events --</option>
                        <?php foreach($events_list as $ev): ?>
                            <option value="<?= $ev['id'] ?>" <?= ($filter_event == $ev['id']) ? 'selected' : '' ?>>
                                <?= htmlspecialchars($ev['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>

                    <?php if (!empty($filter_event) && !empty($event_portions_map[$filter_event])): ?>
                        <select name="portion_filter" class="form-select form-select-sm border-warning fw-semibold" onchange="this.form.submit()" style="border-radius: 8px; min-width: 160px;">
                            <option value="">-- All Portions --</option>
                            <?php foreach($event_portions_map[$filter_event] as $prt): ?>
                                <option value="<?= $prt['id'] ?>" <?= ($filter_portion == $prt['id']) ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($prt['portion_name']) ?> (<?= number_format((float)$prt['percentage'], 0) ?>%)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    <?php endif; ?>
                </form>

                <button type="button" class="btn btn-amber px-4 py-2 rounded-pill text-nowrap" 
                        data-bs-toggle="modal" data-bs-target="#addCriteriaModal" 
                        <?= $is_filtered_full ? 'disabled title="Criteria weight is already at 100%"' : '' ?>>
                    <i class="bi bi-ui-checks-grid me-2"></i> Add Criteria
                </button>
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

        <!-- Recently Created Events Fast-Track UI -->
        <?php if(!empty($recent_events)): ?>
        <div class="mb-4">
            <h6 class="fw-bold text-midnight mb-3"><i class="bi bi-stars text-amber me-2"></i>Recently Created Events Setup</h6>
            <div class="row g-3">
                <?php foreach($recent_events as $re): 
                    $ev_weight = $event_weights[$re['id']] ?? 0;
                    $has_portions = !empty($event_portions_map[$re['id']]);
                    $is_full = $ev_weight >= 100;
                ?>
                <div class="col-md-6 col-lg-3">
                    <div class="card border-0 shadow-sm h-100 event-shortcut-card" style="border-radius: 12px; border-left: 4px solid <?= $is_full ? '#198754' : '#FFBF00' ?> !important;">
                        <div class="card-body p-3 d-flex flex-column">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="badge bg-light text-dark border"><?= htmlspecialchars($re['type']) ?></span>
                                <?php if($has_portions): ?>
                                    <span class="badge bg-warning text-dark border small" style="font-size: 0.65rem;"><i class="bi bi-diagram-3-fill me-1"></i>Multi-Portion</span>
                                <?php endif; ?>
                            </div>
                            <h6 class="fw-bold text-midnight text-truncate mb-1" title="<?= htmlspecialchars($re['name']) ?>">
                                <?= htmlspecialchars($re['name']) ?>
                            </h6>
                            <small class="text-muted mt-auto mb-3"><i class="bi bi-calendar3 me-1"></i><?= date('M d, Y', strtotime($re['start_date'])) ?></small>
                            
                            <div class="d-flex gap-2 mt-auto">
                                <a href="criteria.php?event_filter=<?= $re['id'] ?>" class="btn btn-sm btn-outline-midnight flex-grow-1 fw-semibold" style="border-radius: 8px;">View Setup</a>
                                <button type="button" class="btn btn-sm btn-amber quick-add-btn fw-bold" 
                                    data-bs-toggle="modal" data-bs-target="#addCriteriaModal" 
                                    data-eventid="<?= $re['id'] ?>" style="border-radius: 8px;" 
                                    title="<?= $is_full ? '100% Reached' : 'Quick Add Criteria' ?>" 
                                    <?= $is_full ? 'disabled' : '' ?>>
                                    <i class="bi bi-plus-lg"></i> Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>

        <!-- Weight Validator UI -->
        <?php if(!empty($filter_event)): ?>
            <div class="card mb-4 border-0 shadow-sm" style="border-radius: 12px;">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-midnight fs-5">
                            <i class="bi bi-speedometer text-amber me-2"></i>
                            <?= !empty($filter_portion) ? 'Portion Criteria Weight' : 'Total Criteria Weight' ?>
                        </span>
                        <span class="fw-bolder fs-4 <?= $total_weight == 100 ? 'text-success' : ($total_weight > 100 ? 'text-danger' : 'text-warning') ?>">
                            <?= number_format($total_weight, 2) ?>% / 100%
                        </span>
                    </div>
                    <div class="progress shadow-sm" style="height: 14px; border-radius: 10px; background-color: #e9ecef;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated <?= $total_weight == 100 ? 'bg-success' : ($total_weight > 100 ? 'bg-danger' : 'bg-warning') ?>" 
                             role="progressbar" 
                             style="width: <?= min($total_weight, 100) ?>%;" 
                             aria-valuenow="<?= $total_weight ?>" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                    
                    <?php if($total_weight < 100): ?>
                        <small class="text-warning text-dark mt-2 d-block fw-semibold"><i class="bi bi-info-circle-fill me-1"></i> Incomplete: You need <?= number_format(100 - $total_weight, 2) ?>% more to finalize this <?= !empty($filter_portion) ? "portion's" : "event's" ?> scoring system.</small>
                    <?php elseif($total_weight > 100): ?>
                        <small class="text-danger mt-2 d-block fw-bold"><i class="bi bi-exclamation-triangle-fill me-1"></i> Error: Weight exceeds 100%. Calculations will be incorrect unless adjusted.</small>
                    <?php else: ?>
                        <small class="text-success mt-2 d-block fw-bold"><i class="bi bi-check-circle-fill me-1"></i> Perfect! Criteria weights are balanced and ready for tabulation.</small>
                    <?php endif; ?>
                </div>
            </div>
        <?php endif; ?>

        <div class="card table-card">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-custom-header">
                            <tr>
                                <th>Criteria Description</th>
                                <th>Assigned Event & Portion</th>
                                <th class="text-center">Max Score</th>
                                <th class="text-center">Weight (%)</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white">
                            <?php if (count($criteria_list) > 0): ?>
                                <?php foreach ($criteria_list as $crit): ?>
                                    <tr>
                                        <td class="fw-bold px-3 text-midnight fs-6">
                                            <?= htmlspecialchars($crit['name']) ?>
                                        </td>
                                        <td>
                                            <span class="badge bg-light text-dark border p-2">
                                                <i class="bi bi-calendar-event me-1 text-amber"></i> 
                                                <?= htmlspecialchars($crit['event_name'] ?? 'Unassigned Event') ?>
                                            </span>
                                            <?php if(!empty($crit['portion_name'])): ?>
                                                <span class="badge bg-warning text-dark border p-2 ms-1">
                                                    <i class="bi bi-diagram-3-fill me-1"></i> 
                                                    <?= htmlspecialchars($crit['portion_name']) ?> (<?= number_format((float)$crit['portion_weight'], 0) ?>%)
                                                </span>
                                            <?php endif; ?>
                                        </td>
                                        <td class="text-center fw-semibold text-muted">
                                            <?= htmlspecialchars(number_format((float)$crit['max_score'], 0)) ?> pts
                                        </td>
                                        <td class="text-center">
                                            <span class="badge bg-midnight rounded-pill px-3 py-2 fs-6">
                                                <?= htmlspecialchars(number_format((float)$crit['percentage'], 0)) ?>%
                                            </span>
                                        </td>
                                        <td class="text-center">
                                            <button type="button" class="btn btn-squircle btn-edit me-2 edit-btn" 
                                                data-bs-toggle="modal" data-bs-target="#editCriteriaModal"
                                                data-id="<?= $crit['id'] ?>" 
                                                data-name="<?= htmlspecialchars($crit['name']) ?>"
                                                data-eventid="<?= $crit['event_id'] ?>" 
                                                data-portionid="<?= $crit['portion_id'] ?? '' ?>"
                                                data-max="<?= $crit['max_score'] ?>"
                                                data-pct="<?= $crit['percentage'] ?>"
                                                title="Edit Criteria">
                                                <i class="bi bi-pencil-square fs-5"></i>
                                            </button>
                                            <a href="criteria.php?delete_id=<?= $crit['id'] ?>&event_filter=<?= $filter_event ?>&portion_filter=<?= $filter_portion ?>" class="btn btn-squircle btn-delete" 
                                               onclick="return confirm('Are you sure you want to remove this criteria? Existing scores tied to it will be affected.');" title="Delete Criteria">
                                                <i class="bi bi-trash3-fill fs-5"></i>
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr><td colspan="5" class="text-center py-5 text-muted"><i class="bi bi-ui-checks fs-1 d-block mb-2"></i>No criteria found. Click 'Add Criteria' to define scoring metrics.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card-footer bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <span class="text-muted small fw-semibold">
                    Showing <?= min(($offset + 1), max(1, $total_criteria)) ?> to <?= min(($offset + $limit), $total_criteria) ?> of <?= $total_criteria ?> entries
                </span>
                <?php if ($total_pages > 1): ?>
                <nav aria-label="Pagination">
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>"><a class="page-link" href="?page=<?= $page - 1 ?>&event_filter=<?= $filter_event ?>&portion_filter=<?= $filter_portion ?>">Previous</a></li>
                        <?php for($i = 1; $i <= $total_pages; $i++): ?>
                            <li class="page-item <?= ($page == $i) ? 'active' : '' ?>"><a class="page-link" href="?page=<?= $i ?>&event_filter=<?= $filter_event ?>&portion_filter=<?= $filter_portion ?>"><?= $i ?></a></li>
                        <?php endfor; ?>
                        <li class="page-item <?= ($page >= $total_pages) ? 'disabled' : '' ?>"><a class="page-link" href="?page=<?= $page + 1 ?>&event_filter=<?= $filter_event ?>&portion_filter=<?= $filter_portion ?>">Next</a></li>
                    </ul>
                </nav>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- MAIN MODALS -->
    
    <!-- Shared Datalist for Percentage Selection -->
    <datalist id="percentageOptions">
        <option value="5"></option>
        <option value="10"></option>
        <option value="15"></option>
        <option value="20"></option>
        <option value="25"></option>
        <option value="30"></option>
        <option value="35"></option>
        <option value="40"></option>
        <option value="45"></option>
        <option value="50"></option>
        <option value="60"></option>
        <option value="70"></option>
        <option value="80"></option>
        <option value="90"></option>
        <option value="100"></option>
    </datalist>

    <!-- Modal 1: Add Criteria -->
    <div class="modal fade" id="addCriteriaModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-plus-circle-fill me-2"></i> Define Scoring Criteria</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form action="criteria.php" method="POST">
                    <input type="hidden" name="action" value="add">
                    <div class="modal-body p-4">
                        
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Assign to Event</label>
                            <select class="form-select" name="event_id" id="add_event_dropdown" required>
                                <option value="" selected disabled>Select an active event...</option>
                                <?php foreach($events_list as $event): 
                                    $ev_weight = $event_weights[$event['id']] ?? 0;
                                    $has_p = !empty($event_portions_map[$event['id']]);
                                    $label = htmlspecialchars($event['name']) . ($has_p ? ' (Multi-Portion Pageant)' : " ({$ev_weight}% configured)");
                                    $sel = ($filter_event == $event['id']) ? 'selected' : '';
                                ?>
                                    <option value="<?= $event['id'] ?>" <?= $sel ?>><?= $label ?></option>
                                <?php endforeach; ?>
                            </select>
                            <?php if(empty($events_list)): ?>
                                <small class="text-danger mt-1 d-block"><i class="bi bi-exclamation-circle me-1"></i>You must create an Event first.</small>
                            <?php endif; ?>
                        </div>

                        <!-- Portion Dropdown (Shown when Event has Portions) -->
                        <div class="mb-3" id="add_portion_group" style="display: none;">
                            <label class="form-label fw-semibold text-midnight small"><i class="bi bi-diagram-3-fill text-amber me-1"></i>Assign to Portion / Segment</label>
                            <select class="form-select border-warning" name="portion_id" id="add_portion_dropdown">
                                <option value="">-- Direct Event Criterion (No Portion) --</option>
                            </select>
                            <div class="form-text">Select which segment (e.g. Swimwear, Talent, Evening Gown) this criterion belongs to.</div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Criteria Description / Name</label>
                            <input type="text" class="form-control" name="criteria_name" placeholder="e.g. Stage Presence, Creativity, Poise, etc." required>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Max Possible Score</label>
                                <input type="number" class="form-control" name="max_score" value="100" min="1" step="0.01" required>
                                <div class="form-text">Highest score a judge can give.</div>
                            </div>
                            
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Weight Percentage (%)</label>
                                <input type="number" class="form-control" name="percentage" list="percentageOptions" placeholder="e.g. 25" min="1" max="100" step="0.01" required>
                                <div class="form-text">Select or type value. Max is 100%.</div>
                            </div>
                        </div>

                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-outline-secondary fw-semibold" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-midnight fw-semibold" style="background-color: #0A192F; color: white;" <?= empty($events_list) ? 'disabled' : '' ?>>Save Criteria</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal 2: Edit Criteria -->
    <div class="modal fade" id="editCriteriaModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-pencil-square me-2"></i> Edit Scoring Criteria</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form action="criteria.php" method="POST">
                    <input type="hidden" name="action" value="edit">
                    <input type="hidden" name="criteria_id" id="edit_id"> 
                    
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Assign to Event</label>
                            <select class="form-select" name="edit_event_id" id="edit_event_id" required>
                                <?php foreach($events_list as $event): ?>
                                    <option value="<?= $event['id'] ?>"><?= htmlspecialchars($event['name']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <!-- Portion Dropdown (Edit Mode) -->
                        <div class="mb-3" id="edit_portion_group" style="display: none;">
                            <label class="form-label fw-semibold text-midnight small"><i class="bi bi-diagram-3-fill text-amber me-1"></i>Assign to Portion / Segment</label>
                            <select class="form-select border-warning" name="edit_portion_id" id="edit_portion_dropdown">
                                <option value="">-- Direct Event Criterion (No Portion) --</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Criteria Description / Name</label>
                            <input type="text" class="form-control" name="edit_name" id="edit_name" required>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Max Possible Score</label>
                                <input type="number" class="form-control" name="edit_max_score" id="edit_max_score" min="1" step="0.01" required>
                            </div>
                            
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Weight Percentage (%)</label>
                                <input type="number" class="form-control" name="edit_percentage" id="edit_percentage" list="percentageOptions" min="1" max="100" step="0.01" required>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-outline-secondary fw-semibold" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary fw-semibold">Update Criteria</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        const eventPortionsMap = <?= json_encode($event_portions_map) ?>;

        function updateAddPortionsDropdown(eventId) {
            const container = document.getElementById('add_portion_group');
            const dropdown = document.getElementById('add_portion_dropdown');
            dropdown.innerHTML = '<option value="">-- Direct Event Criterion (No Portion) --</option>';

            if (eventId && eventPortionsMap[eventId] && eventPortionsMap[eventId].length > 0) {
                eventPortionsMap[eventId].forEach(p => {
                    dropdown.innerHTML += `<option value="${p.id}">${escapeHtml(p.portion_name)} (${parseFloat(p.percentage)}%)</option>`;
                });
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }

        function updateEditPortionsDropdown(eventId, selectedPortionId) {
            const container = document.getElementById('edit_portion_group');
            const dropdown = document.getElementById('edit_portion_dropdown');
            dropdown.innerHTML = '<option value="">-- Direct Event Criterion (No Portion) --</option>';

            if (eventId && eventPortionsMap[eventId] && eventPortionsMap[eventId].length > 0) {
                eventPortionsMap[eventId].forEach(p => {
                    const sel = (selectedPortionId && selectedPortionId == p.id) ? 'selected' : '';
                    dropdown.innerHTML += `<option value="${p.id}" ${sel}>${escapeHtml(p.portion_name)} (${parseFloat(p.percentage)}%)</option>`;
                });
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }

        function escapeHtml(text) {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
            return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Event change listener in Add Modal
            const addEventSelect = document.getElementById('add_event_dropdown');
            if (addEventSelect) {
                addEventSelect.addEventListener('change', function() {
                    updateAddPortionsDropdown(this.value);
                });
                if (addEventSelect.value) {
                    updateAddPortionsDropdown(addEventSelect.value);
                }
            }

            // Event change listener in Edit Modal
            const editEventSelect = document.getElementById('edit_event_id');
            if (editEventSelect) {
                editEventSelect.addEventListener('change', function() {
                    updateEditPortionsDropdown(this.value, null);
                });
            }

            // Populate Edit Modal
            const editButtons = document.querySelectorAll('.edit-btn');
            editButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const eventId = this.getAttribute('data-eventid');
                    const portionId = this.getAttribute('data-portionid');
                    
                    document.getElementById('edit_id').value = this.getAttribute('data-id');
                    document.getElementById('edit_name').value = this.getAttribute('data-name');
                    document.getElementById('edit_event_id').value = eventId;
                    document.getElementById('edit_max_score').value = this.getAttribute('data-max');
                    document.getElementById('edit_percentage').value = this.getAttribute('data-pct');

                    updateEditPortionsDropdown(eventId, portionId);
                });
            });

            // Handle Quick-Add Shortcut Buttons
            const quickAddBtns = document.querySelectorAll('.quick-add-btn');
            quickAddBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const eventId = this.getAttribute('data-eventid');
                    const dropdown = document.getElementById('add_event_dropdown');
                    if(dropdown) {
                        dropdown.value = eventId; // Pre-select the event in the modal
                        updateAddPortionsDropdown(eventId);
                    }
                });
            });
        });
    </script>
</body>
</html>