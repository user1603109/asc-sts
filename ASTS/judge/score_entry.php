<?php
session_start();
require_once '../db.php'; 

// Directory for candidate avatars
$upload_dir = '../assets/uploads/avatars/';

// For testing purposes, assign a dummy judge ID if not logged in
$judge_id = $_SESSION['user_id'] ?? 1; 

// Initialize the error message to prevent undefined variable warnings
$error_msg = '';

// Handle Redirect After Saving
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action']) && $_POST['action'] == 'save_scores') {
    $event_id = $_POST['event_id'];
    $candidate_id = $_POST['candidate_id'];
    $portion_id = !empty($_POST['portion_id']) ? (int)$_POST['portion_id'] : null;
    $scores = $_POST['scores'] ?? []; 

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("
            INSERT INTO scores (event_id, judge_id, candidate_id, criteria_id, score) 
            VALUES (:event_id, :judge_id, :candidate_id, :criteria_id, :score)
            ON DUPLICATE KEY UPDATE score = VALUES(score)
        ");

        foreach ($scores as $crit_id => $score_val) {
            if ($score_val !== '') {
                $stmt->execute([
                    'event_id' => $event_id,
                    'judge_id' => $judge_id,
                    'candidate_id' => $candidate_id,
                    'criteria_id' => $crit_id,
                    'score' => $score_val
                ]);
            }
        }
        $pdo->commit();
        $portion_param = $portion_id ? "&portion_id={$portion_id}" : "";
        header("Location: score_entry.php?event_id={$event_id}&candidate_id={$candidate_id}{$portion_param}&saved=1");
        exit;
    } catch (PDOException $e) {
        $pdo->rollBack();
        $error_msg = "Error saving scores: " . $e->getMessage();
    }
}

$success_msg = isset($_GET['saved']) ? "Scores successfully recorded!" : '';

// Fetch ALL events assigned to this judge so the "Preview" button works
$events_stmt = $pdo->prepare("
    SELECT e.id, e.name, e.status 
    FROM events e
    JOIN event_judges ej ON e.id = ej.event_id
    WHERE ej.user_id = :judge_id
    ORDER BY e.start_date DESC
");
$events_stmt->execute(['judge_id' => $judge_id]);
$assigned_events = $events_stmt->fetchAll(PDO::FETCH_ASSOC);

// Get Selected Event & Candidate
$selected_event_id = isset($_GET['event_id']) ? (int)$_GET['event_id'] : (count($assigned_events) > 0 ? $assigned_events[0]['id'] : null);
$selected_candidate_id = isset($_GET['candidate_id']) ? (int)$_GET['candidate_id'] : null;

// Determine the active status of the selected event to control locking
$current_event_status = '';
foreach ($assigned_events as $ev) {
    if ($ev['id'] == $selected_event_id) {
        $current_event_status = $ev['status'];
        break;
    }
}
$is_locked = ($current_event_status === 'Upcoming' || $current_event_status === 'Completed');

$event_portions = [];
$selected_portion_id = null;
$active_portion_name = "";
$active_portion_weight = 0;

$candidates = [];
$criteria = [];
$existing_scores = [];
$scored_candidates = [];

if ($selected_event_id) {
    // 1. Fetch event portions if defined (e.g. Pageant portions)
    $portions_stmt = $pdo->prepare("SELECT id, portion_name, percentage, order_number, status FROM event_portions WHERE event_id = :event_id ORDER BY order_number ASC, id ASC");
    $portions_stmt->execute(['event_id' => $selected_event_id]);
    $event_portions = $portions_stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($event_portions)) {
        if (isset($_GET['portion_id']) && is_numeric($_GET['portion_id'])) {
            $selected_portion_id = (int)$_GET['portion_id'];
        } else {
            $selected_portion_id = (int)$event_portions[0]['id'];
        }
        
        foreach ($event_portions as $p) {
            if ($p['id'] == $selected_portion_id) {
                $active_portion_name = $p['portion_name'];
                $active_portion_weight = (float)$p['percentage'];
                break;
            }
        }
    }

    // 2. Fetch Candidates for the selected event
    $cand_stmt = $pdo->prepare("
        SELECT c.id, c.name, c.order_number, c.image_path, c.year_level, crs.course_name 
        FROM candidates c
        LEFT JOIN courses crs ON c.course_id = crs.id
        WHERE c.event_id = :event_id 
        ORDER BY c.order_number ASC
    ");
    $cand_stmt->execute(['event_id' => $selected_event_id]);
    $candidates = $cand_stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Fetch Criteria for the selected event & portion
    if ($selected_portion_id) {
        $crit_stmt = $pdo->prepare("SELECT id, name, max_score, percentage FROM criteria WHERE event_id = :event_id AND portion_id = :portion_id ORDER BY id ASC");
        $crit_stmt->execute(['event_id' => $selected_event_id, 'portion_id' => $selected_portion_id]);
    } else {
        $crit_stmt = $pdo->prepare("SELECT id, name, max_score, percentage FROM criteria WHERE event_id = :event_id AND (portion_id IS NULL OR portion_id = 0) ORDER BY id ASC");
        $crit_stmt->execute(['event_id' => $selected_event_id]);
    }
    $criteria = $crit_stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Fetch array of Candidate IDs that THIS judge has already scored for THIS portion/event
    if ($selected_portion_id) {
        $scored_stmt = $pdo->prepare("
            SELECT DISTINCT s.candidate_id 
            FROM scores s 
            JOIN criteria c ON s.criteria_id = c.id 
            WHERE s.event_id = :event_id AND s.judge_id = :judge_id AND c.portion_id = :portion_id
        ");
        $scored_stmt->execute(['event_id' => $selected_event_id, 'judge_id' => $judge_id, 'portion_id' => $selected_portion_id]);
    } else {
        $scored_stmt = $pdo->prepare("
            SELECT DISTINCT s.candidate_id 
            FROM scores s 
            JOIN criteria c ON s.criteria_id = c.id 
            WHERE s.event_id = :event_id AND s.judge_id = :judge_id AND (c.portion_id IS NULL OR c.portion_id = 0)
        ");
        $scored_stmt->execute(['event_id' => $selected_event_id, 'judge_id' => $judge_id]);
    }
    $scored_candidates = $scored_stmt->fetchAll(PDO::FETCH_COLUMN);

    // 5. If a candidate is selected, fetch the judge's existing scores for them
    if ($selected_candidate_id) {
        $score_stmt = $pdo->prepare("SELECT criteria_id, score FROM scores WHERE event_id = :event_id AND judge_id = :judge_id AND candidate_id = :candidate_id");
        $score_stmt->execute([
            'event_id' => $selected_event_id,
            'judge_id' => $judge_id,
            'candidate_id' => $selected_candidate_id
        ]);
        while ($row = $score_stmt->fetch(PDO::FETCH_ASSOC)) {
            $existing_scores[$row['criteria_id']] = $row['score'];
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Score Entry | ASTS Judge Portal</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <style>
        /* Global Reset */
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; }
        a, button, .btn, label, .input-group-text, .candidate-card, .page-link, select, option { cursor: pointer; }

        body { background-color: #F4F7F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default; }
        .main-content { min-height: 100vh; background-color: #F8F9FA; width: calc(100% - 280px); transition: all 0.3s ease; }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }

        .btn-amber { background-color: #FFBF00; color: #0A192F; border: 2px solid #FFBF00; font-weight: 700; transition: all 0.3s ease; }
        .btn-amber:hover { background-color: #e6ac00; color: #0A192F; border-color: #e6ac00; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

        .candidate-card { border: 1px solid #dee2e6; border-radius: 12px; transition: all 0.2s ease; cursor: pointer; text-decoration: none; color: inherit; display: block; position: relative;}
        .candidate-card:hover { border-color: #0A192F; background-color: rgba(10, 25, 47, 0.02); }
        .candidate-card.active { border-color: #FFBF00; background-color: #FFBF00; color: #0A192F !important; box-shadow: 0 5px 15px rgba(255,191,0,0.3); }
        .candidate-card.active .text-muted { color: rgba(10,25,47,0.7) !important; }
        
        .score-input { border-radius: 10px; border: 2px solid #dee2e6; font-size: 1.25rem; font-weight: bold; text-align: center; }
        .score-input:focus { border-color: #0A192F; box-shadow: 0 0 0 0.25rem rgba(10, 25, 47, 0.1); }
        .score-input:disabled { background-color: #e9ecef; opacity: 1; cursor: not-allowed; }
        
        .criteria-row { border-bottom: 1px dashed #dee2e6; padding: 1rem 0; }
        .criteria-row:last-child { border-bottom: none; }

        .scored-check { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); font-size: 1.2rem; color: #198754; }
        .candidate-avatar { width: 45px; height: 45px; object-fit: cover; border: 2px solid #dee2e6; background-color: #fff; }
        .candidate-card.active .candidate-avatar { border-color: #0A192F; } 

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
            .responsive-stack select { width: 100% !important; }
        }
    </style>
</head>
<body class="d-flex align-items-start">

    <?php include '../includes/judge_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-end mb-4 pb-3 border-bottom responsive-stack">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">Score Entry</h2>
            </div>
            
            <form action="score_entry.php" method="GET" class="d-flex align-items-center gap-2 m-0 w-100">
                <label class="fw-bold text-midnight small mb-0 text-nowrap d-none d-md-block">Select Event:</label>
                <select name="event_id" class="form-select form-select-sm border-midnight" onchange="this.form.submit()" style="border-radius: 8px; min-width: 200px;">
                    <option value="" disabled <?= !$selected_event_id ? 'selected' : '' ?>>-- Choose Event --</option>
                    <?php foreach($assigned_events as $ev): ?>
                        <option value="<?= $ev['id'] ?>" <?= ($selected_event_id == $ev['id']) ? 'selected' : '' ?>>
                            <?= htmlspecialchars($ev['name']) ?> 
                            <?= $ev['status'] == 'Ongoing' ? '(Live)' : ($ev['status'] == 'Upcoming' ? '(Upcoming)' : '') ?>
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

        <?php if (!$selected_event_id): ?>
            <div class="card border-0 shadow-sm rounded-4 text-center py-5">
                <div class="card-body">
                    <i class="bi bi-calendar2-x fs-1 text-muted mb-3 d-block"></i>
                    <h5 class="fw-bold text-midnight">No Event Selected</h5>
                    <p class="text-muted">Please select an event from the dropdown above to begin.</p>
                </div>
            </div>
        <?php else: ?>
            
            <!-- Event Portions / Rounds Navigation (If Multi-Portion Event) -->
            <?php if (!empty($event_portions)): ?>
                <div class="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                        <span class="small fw-bold text-midnight text-uppercase">
                            <i class="bi bi-diagram-3-fill text-amber me-1"></i> Event Portions / Segments
                        </span>
                        <span class="small text-muted fw-semibold">Select a portion below to enter evaluation scores</span>
                    </div>
                    <div class="d-flex gap-2 flex-wrap">
                        <?php foreach ($event_portions as $port): 
                            $is_active_p = ($selected_portion_id == $port['id']);
                        ?>
                            <a href="score_entry.php?event_id=<?= $selected_event_id ?>&portion_id=<?= $port['id'] ?><?= $selected_candidate_id ? '&candidate_id=' . $selected_candidate_id : '' ?>" 
                               class="btn btn-sm <?= $is_active_p ? 'btn-amber fw-bold shadow-sm' : 'btn-outline-midnight' ?>" 
                               style="border-radius: 10px; padding: 0.5rem 1.1rem;">
                                <?= htmlspecialchars($port['portion_name']) ?>
                                <span class="badge <?= $is_active_p ? 'bg-midnight text-white' : 'bg-light text-dark border' ?> ms-1">
                                    <?= number_format((float)$port['percentage'], 0) ?>%
                                </span>
                            </a>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>

            <div class="row g-4">
                
                <!-- Candidates Column -->
                <div class="col-lg-4 col-xl-4">
                    <div class="card border-0 shadow-sm rounded-4 h-100">
                        <div class="card-header bg-midnight text-white border-0 pt-4 pb-3 px-4 rounded-top-4 d-flex justify-content-between align-items-center">
                            <h6 class="fw-bold mb-0"><i class="bi bi-people-fill text-amber me-2"></i>Candidates</h6>
                            <?php if(!empty($active_portion_name)): ?>
                                <span class="badge bg-warning text-dark small" style="font-size: 0.7rem;"><?= htmlspecialchars($active_portion_name) ?></span>
                            <?php endif; ?>
                        </div>
                        <div class="card-body p-3" style="max-height: 70vh; overflow-y: auto;">
                            <?php if (count($candidates) > 0): ?>
                                <div class="d-flex flex-column gap-2">
                                    <?php foreach ($candidates as $cand): 
                                        $is_scored = in_array($cand['id'], $scored_candidates);
                                    ?>
                                        <a href="score_entry.php?event_id=<?= $selected_event_id ?>&candidate_id=<?= $cand['id'] ?><?= $selected_portion_id ? '&portion_id=' . $selected_portion_id : '' ?>" class="candidate-card p-3 <?= ($selected_candidate_id == $cand['id']) ? 'active' : '' ?>">
                                            <div class="d-flex align-items-center pe-4">
                                                
                                                <?php if (!empty($cand['image_path'])): ?>
                                                    <img src="<?= $upload_dir . htmlspecialchars($cand['image_path']) ?>" alt="Avatar" class="candidate-avatar rounded-circle me-3">
                                                <?php else: ?>
                                                    <span class="badge <?= ($selected_candidate_id == $cand['id']) ? 'bg-midnight text-white' : 'bg-light text-dark border' ?> rounded-circle p-2 me-3" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                                                        <?= htmlspecialchars($cand['order_number']) ?>
                                                    </span>
                                                <?php endif; ?>

                                                <div>
                                                    <div class="fw-bold m-0" style="font-size: 0.95rem;">
                                                        <?= htmlspecialchars($cand['name']) ?>
                                                    </div>
                                                    <div class="small <?= ($selected_candidate_id == $cand['id']) ? 'text-midnight opacity-75' : 'text-muted' ?>" style="font-size: 0.75rem;">
                                                        Entry #<?= htmlspecialchars($cand['order_number']) ?>
                                                    </div>
                                                </div>
                                            </div>
                                            <?php if($is_scored): ?>
                                                <i class="bi bi-check-circle-fill scored-check <?= ($selected_candidate_id == $cand['id']) ? 'text-midnight' : '' ?>" title="Scored for <?= htmlspecialchars($active_portion_name ?: 'this event') ?>"></i>
                                            <?php endif; ?>
                                        </a>
                                    <?php endforeach; ?>
                                </div>
                            <?php else: ?>
                                <p class="text-muted text-center mt-3 small">No candidates found for this event.</p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <!-- Scoring Column -->
                <div class="col-lg-8 col-xl-8">
                    <div class="card border-0 shadow-sm rounded-4 h-100">
                        <?php if (!$selected_candidate_id): ?>
                            <div class="card-body d-flex flex-column align-items-center justify-content-center py-5">
                                <i class="bi bi-person-bounding-box text-muted mb-3" style="font-size: 3rem;"></i>
                                <h5 class="fw-bold text-midnight">Select a Candidate</h5>
                                <p class="text-muted text-center">Choose a candidate from the list to enter scores.</p>
                            </div>
                        <?php else: ?>
                            <?php
                                $c_name = "Candidate";
                                $c_num = "";
                                $c_course = "";
                                $c_year = "";
                                $c_avatar = "";

                                foreach($candidates as $c) {
                                    if($c['id'] == $selected_candidate_id) {
                                        $c_name = $c['name'];
                                        $c_num = $c['order_number'];
                                        $c_course = $c['course_name'] ?? 'Not Assigned';
                                        $c_year = $c['year_level'] ?? 'N/A';
                                        $c_avatar = $c['image_path'];
                                        break;
                                    }
                                }
                            ?>
                            
                            <div class="card-header bg-white border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                                <div class="d-flex align-items-center gap-3">
                                    <?php if (!empty($c_avatar)): ?>
                                        <img src="<?= $upload_dir . htmlspecialchars($c_avatar) ?>" alt="Avatar" class="rounded-circle shadow-sm" style="width: 65px; height: 65px; object-fit: cover; border: 2px solid #0A192F;">
                                    <?php else: ?>
                                        <i class="bi bi-person-circle text-muted" style="font-size: 4rem; line-height: 1;"></i>
                                    <?php endif; ?>
                                    <div>
                                        <span class="badge bg-midnight rounded-pill px-3 py-1 mb-1">Entry #<?= htmlspecialchars($c_num) ?></span>
                                        <h4 class="fw-bolder text-midnight mb-1"><?= htmlspecialchars($c_name) ?></h4>
                                        <div class="small fw-semibold text-muted">
                                            <?= htmlspecialchars($c_course) ?> - <?= htmlspecialchars($c_year) ?>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-end">
                                    <h5 class="fw-bold text-muted mb-0 d-none d-md-block">Score Sheet</h5>
                                    <?php if (!empty($active_portion_name)): ?>
                                        <span class="badge bg-warning text-dark border mt-1">
                                            <i class="bi bi-diagram-3-fill me-1"></i><?= htmlspecialchars($active_portion_name) ?> (<?= number_format($active_portion_weight, 0) ?>%)
                                        </span>
                                    <?php endif; ?>
                                </div>
                            </div>
                            
                            <div class="card-body p-4 p-md-5">
                                
                                <?php if ($current_event_status === 'Upcoming'): ?>
                                    <div class="alert alert-info border-info text-center fw-semibold mb-4 shadow-sm">
                                        <i class="bi bi-info-circle-fill me-2"></i> Scoring is locked until this event officially begins.
                                    </div>
                                <?php elseif ($current_event_status === 'Completed'): ?>
                                    <div class="alert alert-secondary text-center fw-semibold mb-4 shadow-sm">
                                        <i class="bi bi-lock-fill me-2"></i> This event has concluded. Scores are locked and read-only.
                                    </div>
                                <?php endif; ?>

                                <?php if(empty($criteria)): ?>
                                    <div class="alert alert-warning text-center fw-semibold">
                                        <i class="bi bi-exclamation-triangle-fill me-2"></i> 
                                        <?= !empty($active_portion_name) ? "No criteria have been defined for the '{$active_portion_name}' portion yet." : "No criteria have been defined for this event yet." ?>
                                    </div>
                                    
                                <?php elseif(!empty($existing_scores) && !isset($_GET['edit']) && !$is_locked): ?>
                                    <div class="text-center py-5">
                                        <i class="bi bi-shield-check text-success mb-3" style="font-size: 4rem; display: block;"></i>
                                        <h4 class="fw-bolder text-midnight">Scores Locked & Recorded</h4>
                                        <p class="text-muted mb-4">You have successfully submitted your evaluation for <?= htmlspecialchars($c_name) ?><?= !empty($active_portion_name) ? " in the <strong>" . htmlspecialchars($active_portion_name) . "</strong> portion" : "" ?>.</p>
                                        
                                        <a href="score_entry.php?event_id=<?= $selected_event_id ?>&candidate_id=<?= $selected_candidate_id ?><?= $selected_portion_id ? '&portion_id=' . $selected_portion_id : '' ?>&edit=true" class="btn btn-outline-midnight rounded-pill px-4 fw-bold w-100 w-md-auto">
                                            <i class="bi bi-pencil-square me-2"></i> View / Modify Scores
                                        </a>
                                    </div>
                                    
                                <?php else: ?>
                                    <form action="score_entry.php" method="POST">
                                        <input type="hidden" name="action" value="save_scores">
                                        <input type="hidden" name="event_id" value="<?= $selected_event_id ?>">
                                        <input type="hidden" name="candidate_id" value="<?= $selected_candidate_id ?>">
                                        <?php if($selected_portion_id): ?>
                                            <input type="hidden" name="portion_id" value="<?= $selected_portion_id ?>">
                                        <?php endif; ?>

                                        <?php foreach ($criteria as $crit): 
                                            $val = $existing_scores[$crit['id']] ?? '';
                                        ?>
                                            <div class="criteria-row d-flex flex-wrap justify-content-between align-items-center gap-3">
                                                <div class="flex-grow-1 w-100 w-md-auto">
                                                    <h6 class="fw-bold text-midnight mb-1"><?= htmlspecialchars($crit['name']) ?></h6>
                                                    <span class="badge bg-light text-dark border"><i class="bi bi-percent text-amber me-1"></i>Weight: <?= number_format($crit['percentage'], 0) ?>%</span>
                                                </div>
                                                <div class="d-flex align-items-center gap-2 w-100 w-md-auto justify-content-end">
                                                    <input type="number" name="scores[<?= $crit['id'] ?>]" class="form-control score-input" style="width: 120px;" 
                                                           min="0" max="<?= $crit['max_score'] ?>" step="0.01" value="<?= htmlspecialchars($val) ?>" 
                                                           required <?= $is_locked ? 'disabled' : '' ?>>
                                                    <span class="text-muted fw-bold">/ <?= number_format($crit['max_score'], 0) ?></span>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>

                                        <?php if(!$is_locked): ?>
                                            <div class="mt-5 text-end border-top pt-4 d-flex flex-column flex-md-row justify-content-end gap-2">
                                                <?php if(!empty($existing_scores)): ?>
                                                    <a href="score_entry.php?event_id=<?= $selected_event_id ?>&candidate_id=<?= $selected_candidate_id ?><?= $selected_portion_id ? '&portion_id=' . $selected_portion_id : '' ?>" class="btn btn-outline-secondary rounded-pill px-4 fw-semibold">Cancel Edit</a>
                                                    <button type="submit" class="btn btn-amber rounded-pill px-5 py-3 fs-5 shadow-sm">
                                                        <i class="bi bi-arrow-clockwise me-2"></i> Update Scores
                                                    </button>
                                                <?php else: ?>
                                                    <button type="submit" class="btn btn-amber rounded-pill px-5 py-3 fs-5 shadow-sm w-100 w-md-auto">
                                                        <i class="bi bi-cloud-check-fill me-2"></i> Submit Scores
                                                    </button>
                                                <?php endif; ?>
                                            </div>
                                        <?php endif; ?>
                                    </form>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

            </div>
        <?php endif; ?>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>