<?php
session_start();
require_once '../db.php'; 

// Directory for candidate avatars
$upload_dir = '../assets/uploads/avatars/';

// Fetch all events for the filter dropdown
$events_stmt = $pdo->query("SELECT id, name FROM events ORDER BY start_date DESC");
$events_list = $events_stmt->fetchAll(PDO::FETCH_ASSOC);

// Default to the first event if none is selected
$selected_event_id = isset($_GET['event_id']) ? (int)$_GET['event_id'] : ($events_list[0]['id'] ?? null);
$selected_portion_id = isset($_GET['portion_id']) && $_GET['portion_id'] !== '' ? $_GET['portion_id'] : 'all';

$rankings = [];
$criteria_headers = [];
$event_portions = [];
$event_name = "No Event Selected";
$portion_name = "Overall Grand Tabulation";
$event_meta = [];
$event_ay = '2025-2026';
$event_date_formatted = date('F d, Y');
$judge_names = [];

if ($selected_event_id) {
    // Get Event Details
    $ev_stmt = $pdo->prepare("SELECT name, department, organizer, academic_year, start_date, end_date FROM events WHERE id = :id");
    $ev_stmt->execute(['id' => $selected_event_id]);
    $event_meta = $ev_stmt->fetch(PDO::FETCH_ASSOC);
    if ($event_meta) {
        $event_name = $event_meta['name'];
        $event_ay = !empty($event_meta['academic_year']) ? $event_meta['academic_year'] : '2025-2026';
        if (!empty($event_meta['start_date'])) {
            if ($event_meta['start_date'] === $event_meta['end_date'] || empty($event_meta['end_date'])) {
                $event_date_formatted = date('F d, Y', strtotime($event_meta['start_date']));
            } else {
                $event_date_formatted = date('M d', strtotime($event_meta['start_date'])) . ' - ' . date('M d, Y', strtotime($event_meta['end_date']));
            }
        }
    }

    // 1. Fetch Event Portions
    $portions_stmt = $pdo->prepare("SELECT id, portion_name, percentage, order_number FROM event_portions WHERE event_id = :event_id ORDER BY order_number ASC");
    $portions_stmt->execute(['event_id' => $selected_event_id]);
    $event_portions = $portions_stmt->fetchAll(PDO::FETCH_ASSOC);

    $has_portions = !empty($event_portions);

    // 2. Fetch Criteria for this event
    $crit_stmt = $pdo->prepare("SELECT id, portion_id, name, max_score, percentage FROM criteria WHERE event_id = :event_id");
    $crit_stmt->execute(['event_id' => $selected_event_id]);
    $criteria_headers = $crit_stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Fetch Candidates for this event
    $cand_stmt = $pdo->prepare("
        SELECT c.id, c.name, c.order_number, c.image_path, c.year_level, crs.course_name 
        FROM candidates c
        LEFT JOIN courses crs ON c.course_id = crs.id
        WHERE c.event_id = :event_id
        ORDER BY c.order_number ASC
    ");
    $cand_stmt->execute(['event_id' => $selected_event_id]);
    $candidates = $cand_stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Fetch all scores for this event
    $score_stmt = $pdo->prepare("
        SELECT candidate_id, judge_id, criteria_id, score 
        FROM scores 
        WHERE event_id = :event_id
    ");
    $score_stmt->execute(['event_id' => $selected_event_id]);
    $raw_scores = $score_stmt->fetchAll(PDO::FETCH_ASSOC);

    // Organize scores: $scores_map[candidate_id][judge_id][criteria_id] = score
    $scores_map = [];
    $unique_judges = [];
    foreach ($raw_scores as $s) {
        $scores_map[$s['candidate_id']][$s['judge_id']][$s['criteria_id']] = $s['score'];
        $unique_judges[$s['judge_id']] = true;
    }

    // Fetch Judges for Print Sign-off
    if (!empty($unique_judges)) {
        $in_clause = implode(',', array_map('intval', array_keys($unique_judges)));
        $judge_names = $pdo->query("SELECT id, full_name FROM users WHERE id IN ($in_clause) ORDER BY full_name ASC")->fetchAll(PDO::FETCH_ASSOC);
    }
    if (empty($judge_names) && $selected_event_id) {
        $ej_stmt = $pdo->prepare("SELECT u.id, u.full_name FROM event_judges ej JOIN users u ON ej.user_id = u.id WHERE ej.event_id = :eid ORDER BY u.full_name ASC");
        $ej_stmt->execute(['eid' => $selected_event_id]);
        $judge_names = $ej_stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // 5. Compute Tabulations based on filter: Specific Portion vs Grand Overall
    if ($selected_portion_id !== 'all' && is_numeric($selected_portion_id)) {
        // --- SPECIFIC PORTION RANKING ---
        $portion_id = (int)$selected_portion_id;
        foreach ($event_portions as $p) {
            if ($p['id'] == $portion_id) {
                $portion_name = $p['portion_name'] . " (" . (float)$p['percentage'] . "%)";
                break;
            }
        }

        // Filter criteria to this portion
        $portion_criteria = array_filter($criteria_headers, function($c) use ($portion_id) {
            return $c['portion_id'] == $portion_id;
        });

        foreach ($candidates as $candidate) {
            $cand_id = $candidate['id'];
            $grand_total = 0;
            $scoring_judges_count = 0;

            foreach (array_keys($unique_judges) as $judge_id) {
                $judge_portion_total = 0;
                $has_scored_any = false;

                foreach ($portion_criteria as $crit) {
                    $crit_id = $crit['id'];
                    if (isset($scores_map[$cand_id][$judge_id][$crit_id])) {
                        $raw = (float)$scores_map[$cand_id][$judge_id][$crit_id];
                        $max = $crit['max_score'] > 0 ? $crit['max_score'] : 100.00;
                        $weighted = ($raw / $max) * $crit['percentage'];
                        $judge_portion_total += $weighted;
                        $has_scored_any = true;
                    }
                }
                if ($has_scored_any) {
                    $grand_total += $judge_portion_total;
                    $scoring_judges_count++;
                }
            }

            $final_score = $scoring_judges_count > 0 ? ($grand_total / $scoring_judges_count) : 0;

            $rankings[] = [
                'order' => $candidate['order_number'],
                'name' => $candidate['name'],
                'course' => $candidate['course_name'] ?? 'Not Assigned',
                'year' => $candidate['year_level'] ?? '',
                'avatar' => $candidate['image_path'],
                'final_score' => $final_score,
                'breakdown' => []
            ];
        }

    } else {
        // --- OVERALL GRAND TABULATION ---
        if ($has_portions) {
            // Multi-Portion Event: Tabulate each portion, weight by portion percentage, sum up
            foreach ($candidates as $candidate) {
                $cand_id = $candidate['id'];
                $overall_grand_score = 0;
                $portion_breakdown = [];

                foreach ($event_portions as $portion) {
                    $p_id = $portion['id'];
                    $p_weight = (float)$portion['percentage'];
                    
                    $portion_crit = array_filter($criteria_headers, function($c) use ($p_id) {
                        return $c['portion_id'] == $p_id;
                    });

                    $portion_judge_sum = 0;
                    $p_judges_count = 0;

                    foreach (array_keys($unique_judges) as $judge_id) {
                        $judge_portion_total = 0;
                        $has_scored = false;

                        foreach ($portion_crit as $crit) {
                            $crit_id = $crit['id'];
                            if (isset($scores_map[$cand_id][$judge_id][$crit_id])) {
                                $raw = (float)$scores_map[$cand_id][$judge_id][$crit_id];
                                $max = $crit['max_score'] > 0 ? $crit['max_score'] : 100.00;
                                $weighted = ($raw / $max) * $crit['percentage'];
                                $judge_portion_total += $weighted;
                                $has_scored = true;
                            }
                        }
                        if ($has_scored) {
                            $portion_judge_sum += $judge_portion_total;
                            $p_judges_count++;
                        }
                    }

                    $portion_avg_score = $p_judges_count > 0 ? ($portion_judge_sum / $p_judges_count) : 0;
                    $portion_contrib = ($portion_avg_score * ($p_weight / 100));
                    $overall_grand_score += $portion_contrib;

                    $portion_breakdown[] = [
                        'name' => $portion['portion_name'],
                        'weight' => $p_weight,
                        'score' => $portion_avg_score,
                        'contrib' => $portion_contrib
                    ];
                }

                $rankings[] = [
                    'order' => $candidate['order_number'],
                    'name' => $candidate['name'],
                    'course' => $candidate['course_name'] ?? 'Not Assigned',
                    'year' => $candidate['year_level'] ?? '',
                    'avatar' => $candidate['image_path'],
                    'final_score' => $overall_grand_score,
                    'breakdown' => $portion_breakdown
                ];
            }
        } else {
            // Standard Event without Portions: Simple weighted average
            $total_judges = count($unique_judges);

            foreach ($candidates as $candidate) {
                $cand_id = $candidate['id'];
                $grand_total = 0;
                
                if ($total_judges > 0) {
                    $sum_of_judge_totals = 0;
                    foreach (array_keys($unique_judges) as $judge_id) {
                        $judge_total = 0;
                        foreach ($criteria_headers as $crit) {
                            $crit_id = $crit['id'];
                            $raw = $scores_map[$cand_id][$judge_id][$crit_id] ?? 0;
                            $max = $crit['max_score'] > 0 ? $crit['max_score'] : 100.00;
                            $weighted = ($raw / $max) * $crit['percentage'];
                            $judge_total += $weighted;
                        }
                        $sum_of_judge_totals += $judge_total;
                    }
                    $grand_total = $sum_of_judge_totals / $total_judges;
                }

                $rankings[] = [
                    'order' => $candidate['order_number'],
                    'name' => $candidate['name'],
                    'course' => $candidate['course_name'] ?? 'Not Assigned',
                    'year' => $candidate['year_level'] ?? '',
                    'avatar' => $candidate['image_path'],
                    'final_score' => $grand_total,
                    'breakdown' => []
                ];
            }
        }
    }

    // 6. Sort Array by Final Score (Highest to Lowest)
    usort($rankings, function($a, $b) {
        return $b['final_score'] <=> $a['final_score'];
    });
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Official Tabulation Rankings | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <style>
        /* Global Reset */
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { 
            -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; 
        }
        a, button, .btn, label, .input-group-text, .page-link, select, option { cursor: pointer; }

        body { 
            background-color: #F4F7F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; 
            -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default;
        }
        .main-content { min-height: 100vh; background-color: #F8F9FA; width: calc(100% - 280px); }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }

        .table-custom-header th { 
            background-color: #0A192F !important; 
            color: #FFFFFF !important; 
            font-weight: 600; 
            border-bottom: none; 
            padding: 0.9rem 0.75rem; 
        }
        .table-hover tbody tr:hover { background-color: #f8fafc; }
        .table-card { border: none; border-radius: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.05); overflow: hidden; }
        
        /* Rank Badges on Screen */
        .rank-badge {
            width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;
            border-radius: 50%; font-weight: 900; font-size: 1rem;
        }
        .rank-1 { background: linear-gradient(135deg, #FFD700 0%, #FDB931 100%); color: #0A192F; box-shadow: 0 3px 8px rgba(255, 215, 0, 0.4); }
        .rank-2 { background: linear-gradient(135deg, #93C5FD 0%, #60A5FA 100%); color: #0A192F; }
        .rank-3 { background: linear-gradient(135deg, #BFDBFE 0%, #93C5FD 100%); color: #0A192F; }
        .rank-other { background-color: #0A192F; color: white; }
        
        .score-highlight { font-family: 'Segoe UI', monospace; font-size: 1.15rem; font-weight: 800; color: #0A192F; }

        /* High Contrast Readable Entry Badge */
        .entry-badge {
            background-color: #F1F5F9 !important;
            color: #0A192F !important;
            border: 1.5px solid #0A192F !important;
            font-weight: 800 !important;
            font-size: 0.9rem !important;
            padding: 0.25rem 0.65rem !important;
            border-radius: 6px !important;
            display: inline-block;
            box-shadow: 0 1px 2px rgba(10, 25, 47, 0.08);
            letter-spacing: 0.5px;
        }

        /* PRINT STYLING - High-Standard Columnar Report */
        .print-only { display: none !important; }

        @media print {
            @page { 
                size: portrait; 
                margin: 15mm 12mm 15mm 12mm; 
            }
            body, .main-content { 
                background: #FFFFFF !important; 
                color: #000000 !important; 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                margin: 0 !important; 
                padding: 0 !important; 
                width: 100% !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            .admin-sidebar, .breadcrumb, form, .btn, .d-print-none, .web-only { 
                display: none !important; 
            }
            .print-only { 
                display: block !important; 
            }
            .table-card { 
                border: none !important; 
                box-shadow: none !important; 
                margin: 0 !important;
                padding: 0 !important;
            }
            .card-header {
                display: none !important;
            }
            .table-responsive { 
                overflow: visible !important; 
            }
            .print-table { 
                width: 100% !important; 
                border-collapse: collapse !important; 
                border: 1.5px solid #000000 !important; 
                font-size: 9.5pt !important;
                margin-top: 10px !important;
            }
            .print-table th { 
                background-color: #0A192F !important; 
                color: #FFFFFF !important; 
                font-weight: 700 !important; 
                text-align: center !important; 
                padding: 7px 6px !important;
                border: 1px solid #333333 !important;
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            .print-table td { 
                padding: 7px 6px !important; 
                border: 1px solid #777777 !important; 
                vertical-align: middle !important;
            }
            
            /* Print Highlight Scheme: Yellow for 1st, Shades of Blue for 2nd and 3rd, White for others */
            .print-row-rank-1 { 
                background-color: #FFF275 !important; 
                font-weight: bold !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            .print-row-rank-2 { 
                background-color: #BFDBFE !important; 
                font-weight: bold !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            .print-row-rank-3 { 
                background-color: #DBEAFE !important; 
                font-weight: bold !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            .print-row-rank-other { 
                background-color: #FFFFFF !important; 
            }

            .print-signatures { 
                page-break-inside: avoid !important; 
                margin-top: 35px !important;
            }
        }
    </style>
</head>
<body class="d-flex">

    <?php include '../includes/admin_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-3 p-md-4 p-xl-5">
        
        <!-- Screen-Only Header -->
        <div class="d-flex justify-content-between align-items-end mb-4 pb-3 border-bottom flex-wrap gap-3 d-print-none">
            <div>
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb mb-1 small">
                        <li class="breadcrumb-item"><a href="dashboard.php" class="text-decoration-none text-muted">Dashboard</a></li>
                        <li class="breadcrumb-item active text-midnight fw-bold" aria-current="page">Live Tabulation Rankings</li>
                    </ol>
                </nav>
                <h2 class="fw-bolder text-midnight mb-0">Live Tabulation Rankings</h2>
                <p class="text-muted small mb-0">Official automated standing report with columnar data and instant print formatting.</p>
            </div>
            
            <form action="rankings.php" method="GET" class="d-flex align-items-center gap-2 flex-wrap">
                <div>
                    <label class="fw-bold text-midnight small mb-1 d-block">Select Competition:</label>
                    <select name="event_id" class="form-select border-midnight fw-bold shadow-sm" onchange="this.form.submit()" style="border-radius: 10px; min-width: 220px;">
                        <?php if(empty($events_list)): ?>
                            <option value="">No events available</option>
                        <?php else: ?>
                            <?php foreach($events_list as $ev): ?>
                                <option value="<?= $ev['id'] ?>" <?= ($selected_event_id == $ev['id']) ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($ev['name']) ?>
                                </option>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </select>
                </div>

                <?php if(!empty($event_portions)): ?>
                <div>
                    <label class="fw-bold text-midnight small mb-1 d-block">Segment / Award Scope:</label>
                    <select name="portion_id" class="form-select border-warning fw-bold shadow-sm" onchange="this.form.submit()" style="border-radius: 10px; min-width: 220px;">
                        <option value="all" <?= ($selected_portion_id === 'all') ? 'selected' : '' ?>>🏆 Grand Overall Tabulation</option>
                        <?php foreach($event_portions as $p): ?>
                            <option value="<?= $p['id'] ?>" <?= ($selected_portion_id == $p['id']) ? 'selected' : '' ?>>
                                🏅 <?= htmlspecialchars($p['portion_name']) ?> (<?= (float)$p['percentage'] ?>%)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <?php endif; ?>
            </form>
        </div>

        <!-- PRINT-ONLY INSTITUTIONAL HEADER -->
        <div class="print-only mb-3 text-center">
            <div class="text-uppercase small text-muted fw-bold" style="letter-spacing: 1px;">Republic of the Philippines</div>
            <h2 class="fw-bolder text-midnight mb-0" style="letter-spacing: 0.5px; font-size: 17pt;">APAYAO STATE COLLEGE</h2>
            <div class="small fw-semibold text-muted mb-2">Automated Scoring &amp; Tabulation System (ASTS)</div>
            
            <div class="py-1 px-4 border border-dark d-inline-block rounded-2 fw-bold text-midnight mb-2" style="font-size: 11.5pt; background-color: #f1f5f9;">
                OFFICIAL TABULATION &amp; EVENT RANKINGS REPORT
            </div>
            
            <div class="row text-start small border-top border-bottom border-dark py-2 mt-2" style="font-size: 9pt;">
                <div class="col-8">
                    <strong>Event Title:</strong> <?= htmlspecialchars($event_name) ?><br>
                    <strong>Scope / Category:</strong> <?= htmlspecialchars($portion_name) ?><br>
                    <strong>Hosting Program:</strong> <?= htmlspecialchars($event_meta['department'] ?? 'Collegiate Departments') ?>
                </div>
                <div class="col-4 text-end">
                    <strong>Schedule:</strong> <?= htmlspecialchars($event_date_formatted) ?><br>
                    <strong>Academic Year:</strong> <?= htmlspecialchars($event_ay) ?><br>
                    <strong>Generated:</strong> <?= date('F d, Y h:i A') ?>
                </div>
            </div>
        </div>

        <!-- Main Rankings Table Card -->
        <div class="card table-card">
            
            <!-- Screen Card Header -->
            <div class="card-header bg-white border-bottom p-3 p-md-4 d-flex justify-content-between align-items-center flex-wrap gap-2 d-print-none">
                <div>
                    <h5 class="fw-bold text-midnight mb-1">
                        <i class="bi bi-trophy-fill text-amber me-2"></i> Official Results: <?= htmlspecialchars($event_name) ?>
                    </h5>
                    <div class="small text-muted fw-semibold">
                        <i class="bi bi-diagram-3 me-1"></i> Active Tabulation: <span class="text-midnight fw-bold"><?= htmlspecialchars($portion_name) ?></span>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-midnight text-white btn-sm rounded-pill fw-bold px-3 py-1.5 shadow-sm" onclick="window.print()">
                        <i class="bi bi-printer-fill text-amber me-1.5"></i> Print Official Report
                    </button>
                </div>
            </div>

            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0 print-table table-bordered">
                        <thead class="table-custom-header">
                            <tr>
                                <th class="text-center" width="8%">Rank</th>
                                <th class="text-center" width="10%">Entry #</th>
                                <th class="text-start" width="28%">Participant Name</th>
                                <th class="text-start" width="25%">Department / Program</th>
                                <th class="text-center" width="10%">Year Level</th>
                                <th class="text-center" width="14%">Final Score</th>
                                <th class="text-center" width="15%">Distinction</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white">
                            <?php if (count($rankings) > 0): ?>
                                <?php 
                                $current_rank = 1;
                                foreach ($rankings as $index => $row): 
                                    // Assign classes based on rank
                                    $rank_class = 'rank-other';
                                    $print_row_class = 'print-row-rank-other';
                                    $award = 'Finalist';

                                    if ($current_rank == 1) {
                                        $rank_class = 'rank-1';
                                        $print_row_class = 'print-row-rank-1';
                                        $award = 'Champion';
                                    } elseif ($current_rank == 2) {
                                        $rank_class = 'rank-2';
                                        $print_row_class = 'print-row-rank-2';
                                        $award = '1st Runner Up';
                                    } elseif ($current_rank == 3) {
                                        $rank_class = 'rank-3';
                                        $print_row_class = 'print-row-rank-3';
                                        $award = '2nd Runner Up';
                                    } elseif ($current_rank == 4) {
                                        $award = '3rd Runner Up';
                                    } elseif ($current_rank == 5) {
                                        $award = '4th Runner Up';
                                    }
                                ?>
                                    <tr class="<?= $print_row_class ?>">
                                        <td class="text-center py-2.5">
                                            <span class="rank-badge <?= $rank_class ?> d-print-none">
                                                <?= $current_rank ?>
                                            </span>
                                            <strong class="d-none d-print-inline fs-6">#<?= $current_rank ?></strong>
                                        </td>
                                        <td class="text-center">
                                            <span class="entry-badge d-print-none">#<?= htmlspecialchars($row['order']) ?></span>
                                            <strong class="d-none d-print-inline">#<?= htmlspecialchars($row['order']) ?></strong>
                                        </td>
                                        <td class="py-2.5 text-start">
                                            <div class="d-flex align-items-center gap-2">
                                                <?php if (!empty($row['avatar'])): ?>
                                                    <img src="<?= $upload_dir . htmlspecialchars($row['avatar']) ?>" alt="Avatar" class="rounded-circle shadow-sm d-print-none" style="width: 36px; height: 36px; object-fit: cover; border: 2px solid <?= ($current_rank == 1) ? '#FFD700' : '#dee2e6' ?>;">
                                                <?php else: ?>
                                                    <i class="bi bi-person-circle text-muted d-print-none" style="font-size: 2.2rem; line-height: 1;"></i>
                                                <?php endif; ?>
                                                <div>
                                                    <span class="fw-bolder text-midnight fs-6 d-block lh-sm">
                                                        <?= htmlspecialchars($row['name']) ?>
                                                        <?php if($current_rank == 1): ?>
                                                            <i class="bi bi-star-fill text-amber ms-1 fs-6 d-print-none"></i>
                                                        <?php endif; ?>
                                                    </span>
                                                    <?php if (!empty($row['breakdown'])): ?>
                                                        <div class="d-flex gap-1 flex-wrap mt-1 d-print-none">
                                                            <?php foreach($row['breakdown'] as $pb): ?>
                                                                <span class="badge bg-light text-dark border" style="font-size: 0.7rem; padding: 2px 5px;">
                                                                    <?= htmlspecialchars($pb['name']) ?>: <strong><?= number_format($pb['score'], 1) ?>%</strong>
                                                                </span>
                                                            <?php endforeach; ?>
                                                        </div>
                                                    <?php endif; ?>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="text-start">
                                            <span class="fw-semibold text-midnight small">
                                                <?= htmlspecialchars($row['course'] ?? 'Not Assigned') ?>
                                            </span>
                                        </td>
                                        <td class="text-center">
                                            <span class="badge bg-light text-secondary border px-2 py-1 small d-print-none">
                                                <?= htmlspecialchars($row['year'] ?: 'N/A') ?>
                                            </span>
                                            <span class="d-none d-print-inline small">
                                                <?= htmlspecialchars($row['year'] ?: 'N/A') ?>
                                            </span>
                                        </td>
                                        <td class="text-center">
                                            <span class="score-highlight <?= ($current_rank == 1) ? 'text-success' : '' ?>" style="font-size: 1.15rem;">
                                                <?= number_format($row['final_score'], 2) ?>%
                                            </span>
                                        </td>
                                        <td class="text-center">
                                            <?php if ($current_rank == 1): ?>
                                                <span class="badge bg-warning text-dark px-2.5 py-1 rounded-pill fw-bold">🏆 <?= $award ?></span>
                                            <?php elseif ($current_rank <= 3): ?>
                                                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 rounded-pill fw-bold"><?= $award ?></span>
                                            <?php else: ?>
                                                <span class="badge bg-light text-muted border px-2.5 py-1 rounded-pill"><?= $award ?></span>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php 
                                $current_rank++;
                                endforeach; 
                                ?>
                            <?php else: ?>
                                <tr><td colspan="7" class="text-center py-5 text-muted"><i class="bi bi-bar-chart-x fs-1 d-block mb-2"></i>No data available to tabulate for this event yet.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- PRINT-ONLY OFFICIAL SIGNATURES SECTION -->
        <div class="print-signatures print-only mt-5 pt-3">
            <div class="fw-bold small text-uppercase text-muted border-bottom border-dark pb-1 mb-4" style="letter-spacing: 0.5px;">
                Board of Official Evaluators &amp; Tabulators Certification
            </div>
            
            <div class="row text-center">
                <?php if (!empty($judge_names)): ?>
                    <?php foreach ($judge_names as $jg): ?>
                        <div class="col-4 mb-4">
                            <div class="border-bottom border-dark mx-auto" style="width: 80%;"></div>
                            <strong class="d-block mt-1 small"><?= htmlspecialchars(strtoupper($jg['full_name'])) ?></strong>
                            <span class="text-muted" style="font-size: 7.5pt;">Official Event Judge</span>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="col-4 mb-4">
                        <div class="border-bottom border-dark mx-auto" style="width: 80%;"></div>
                        <strong class="d-block mt-1 small">OFFICIAL EVENT JUDGE</strong>
                        <span class="text-muted" style="font-size: 7.5pt;">Board of Evaluators</span>
                    </div>
                    <div class="col-4 mb-4">
                        <div class="border-bottom border-dark mx-auto" style="width: 80%;"></div>
                        <strong class="d-block mt-1 small">OFFICIAL EVENT JUDGE</strong>
                        <span class="text-muted" style="font-size: 7.5pt;">Board of Evaluators</span>
                    </div>
                    <div class="col-4 mb-4">
                        <div class="border-bottom border-dark mx-auto" style="width: 80%;"></div>
                        <strong class="d-block mt-1 small">OFFICIAL EVENT JUDGE</strong>
                        <span class="text-muted" style="font-size: 7.5pt;">Board of Evaluators</span>
                    </div>
                <?php endif; ?>
            </div>

            <div class="row mt-4 pt-2 text-center">
                <div class="col-6">
                    <div class="border-bottom border-dark mx-auto" style="width: 70%;"></div>
                    <strong class="d-block mt-1 small">HEAD TABULATOR</strong>
                    <span class="text-muted" style="font-size: 7.5pt;">ASTS Tabulation Committee</span>
                </div>
                <div class="col-6">
                    <div class="border-bottom border-dark mx-auto" style="width: 70%;"></div>
                    <strong class="d-block mt-1 small">COMMITTEE CHAIRPERSON</strong>
                    <span class="text-muted" style="font-size: 7.5pt;">Overall Event Director</span>
                </div>
            </div>

            <div class="text-center text-muted small mt-4 pt-3 border-top" style="font-size: 7.5pt;">
                &copy; <?= date('Y') ?> Apayao State College &bull; Automated Scoring &amp; Tabulation System (ASTS) &bull; Verified Tabulation Certificate
            </div>
        </div>

    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>