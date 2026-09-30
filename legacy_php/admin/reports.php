<?php
session_start();
require_once '../db.php'; 

// Fetch all events for the filter dropdown (Updated to start_date)
$events_stmt = $pdo->query("SELECT id, name FROM events ORDER BY start_date DESC");
$events_list = $events_stmt->fetchAll(PDO::FETCH_ASSOC);

$selected_event_id = isset($_GET['event_id']) ? $_GET['event_id'] : ($events_list[0]['id'] ?? null);

$rankings = [];
$judge_headers = [];
$audit_log = [];
$event_name = "No Event Selected";
$event_date_formatted = date('F d, Y');

if ($selected_event_id) {
    // Get Event Name & Date (Updated to handle multi-day events)
    $ev_stmt = $pdo->prepare("SELECT name, start_date, end_date FROM events WHERE id = :id");
    $ev_stmt->execute(['id' => $selected_event_id]);
    $event_info = $ev_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($event_info) {
        $event_name = $event_info['name'];
        if ($event_info['start_date'] === $event_info['end_date']) {
            $event_date_formatted = date('F d, Y', strtotime($event_info['start_date']));
        } else {
            $event_date_formatted = date('F d', strtotime($event_info['start_date'])) . ' - ' . date('F d, Y', strtotime($event_info['end_date']));
        }
    }

    // ==========================================
    // 1. MASTER TABULATION & RANKINGS DATA
    // ==========================================
    
    // Fetch Event Portions
    $portions_stmt = $pdo->prepare("SELECT id, portion_name, percentage, order_number FROM event_portions WHERE event_id = :event_id ORDER BY order_number ASC");
    $portions_stmt->execute(['event_id' => $selected_event_id]);
    $event_portions = $portions_stmt->fetchAll(PDO::FETCH_ASSOC);
    $has_portions = !empty($event_portions);

    $crit_stmt = $pdo->prepare("SELECT id, portion_id, name, max_score, percentage FROM criteria WHERE event_id = :event_id");
    $crit_stmt->execute(['event_id' => $selected_event_id]);
    $criteria = $crit_stmt->fetchAll(PDO::FETCH_ASSOC);

    // Updated to fetch course and year level
    $cand_stmt = $pdo->prepare("
        SELECT c.id, c.name, c.order_number, crs.course_name, c.year_level 
        FROM candidates c 
        LEFT JOIN courses crs ON c.course_id = crs.id 
        WHERE c.event_id = :event_id 
        ORDER BY c.order_number ASC
    ");
    $cand_stmt->execute(['event_id' => $selected_event_id]);
    $candidates = $cand_stmt->fetchAll(PDO::FETCH_ASSOC);

    $score_stmt = $pdo->prepare("
        SELECT s.candidate_id, s.judge_id, u.full_name as judge_name, s.criteria_id, s.score 
        FROM scores s
        JOIN users u ON s.judge_id = u.id
        WHERE s.event_id = :event_id
    ");
    $score_stmt->execute(['event_id' => $selected_event_id]);
    $raw_scores = $score_stmt->fetchAll(PDO::FETCH_ASSOC);

    $scores_map = [];
    $unique_judges = [];
    foreach ($raw_scores as $s) {
        $scores_map[$s['candidate_id']][$s['judge_id']][$s['criteria_id']] = $s['score'];
        $unique_judges[$s['judge_id']] = $s['judge_name'];
    }
    
    asort($unique_judges);
    $judge_headers = $unique_judges;
    $total_judges = count($judge_headers);

    foreach ($candidates as $candidate) {
        $cand_id = $candidate['id'];
        $grand_total = 0;
        $judge_totals = []; 
        
        if ($total_judges > 0) {
            $sum_of_judge_totals = 0;
            foreach ($judge_headers as $judge_id => $j_name) {
                $judge_total_for_candidate = 0;

                if ($has_portions) {
                    // Multi-Portion pageant calculation
                    foreach ($event_portions as $portion) {
                        $p_id = $portion['id'];
                        $p_weight = (float)$portion['percentage'];
                        $p_crit = array_filter($criteria, function($c) use ($p_id) { return $c['portion_id'] == $p_id; });

                        $p_sum = 0;
                        foreach ($p_crit as $crit) {
                            $crit_id = $crit['id'];
                            $raw = $scores_map[$cand_id][$judge_id][$crit_id] ?? 0;
                            $max_val = (!empty($crit['max_score']) && (float)$crit['max_score'] > 0) ? (float)$crit['max_score'] : 100.0;
                            $p_sum += ($raw / $max_val) * (float)$crit['percentage'];
                        }
                        $judge_total_for_candidate += ($p_sum * ($p_weight / 100));
                    }
                } else {
                    // Standard criteria calculation
                    foreach ($criteria as $crit) {
                        $crit_id = $crit['id'];
                        $raw = $scores_map[$cand_id][$judge_id][$crit_id] ?? 0;
                        $max_val = (!empty($crit['max_score']) && (float)$crit['max_score'] > 0) ? (float)$crit['max_score'] : 100.0;
                        $weighted_score = ($raw / $max_val) * (float)$crit['percentage'];
                        $judge_total_for_candidate += $weighted_score;
                    }
                }

                $judge_totals[$judge_id] = $judge_total_for_candidate;
                $sum_of_judge_totals += $judge_total_for_candidate;
            }
            $grand_total = $sum_of_judge_totals / $total_judges;
        } else {
            foreach ($judge_headers as $judge_id => $j_name) {
                $judge_totals[$judge_id] = 0;
            }
        }
        $rankings[] = [
            'order' => $candidate['order_number'],
            'name' => $candidate['name'],
            'course' => $candidate['course_name'],
            'year' => $candidate['year_level'],
            'judge_totals' => $judge_totals,
            'final_score' => $grand_total
        ];
    }

    usort($rankings, function($a, $b) {
        return $b['final_score'] <=> $a['final_score']; 
    });

    // ==========================================
    // 2. AUDIT LOG DATA FETCH
    // ==========================================
    $audit_stmt = $pdo->prepare("
        SELECT 
            u.full_name AS judge_name, 
            c.name AS candidate_name, c.order_number,
            SUM(s.score) AS total_score,
            SUM(cr.max_score) AS total_max
        FROM scores s
        JOIN users u ON s.judge_id = u.id
        JOIN candidates c ON s.candidate_id = c.id
        JOIN criteria cr ON s.criteria_id = cr.id
        WHERE s.event_id = :event_id
        GROUP BY s.event_id, s.judge_id, s.candidate_id
        ORDER BY c.order_number ASC, u.full_name ASC
    ");
    $audit_stmt->execute(['event_id' => $selected_event_id]);
    $audit_log = $audit_stmt->fetchAll(PDO::FETCH_ASSOC);
}

// ==========================================
// 3. SYSTEM DIAGNOSTICS & GLOBAL STATS
// ==========================================
$sys_judges_stmt = $pdo->query("SELECT id, full_name, username, approval_status FROM users WHERE role = 'judge' ORDER BY full_name ASC");
$sys_judges = $sys_judges_stmt->fetchAll(PDO::FETCH_ASSOC);

$stat_total_judges = count($sys_judges);
$stat_approved = 0;
$stat_pending = 0;
foreach ($sys_judges as $j) {
    if ($j['approval_status'] == 'approved') $stat_approved++;
    if ($j['approval_status'] == 'pending') $stat_pending++;
}

$stat_events = $pdo->query("SELECT COUNT(*) FROM events")->fetchColumn();
$stat_candidates = $pdo->query("SELECT COUNT(*) FROM candidates")->fetchColumn();

// Helper for judge status badge
function getReportBadge($status) {
    switch(strtolower($status)) {
        case 'approved': 
            return '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-1.5 rounded-pill fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Approved</span>';
        case 'pending': 
            return '<span class="badge bg-warning bg-opacity-25 text-dark border border-warning border-opacity-50 px-3 py-1.5 rounded-pill fw-bold"><i class="bi bi-hourglass-split text-amber me-1"></i>Pending</span>';
        case 'suspended': 
            return '<span class="badge bg-light text-secondary border px-3 py-1.5 rounded-pill fw-semibold">Suspended</span>';
        case 'rejected': 
            return '<span class="badge bg-light text-secondary border px-3 py-1.5 rounded-pill fw-semibold">Rejected</span>';
        default: 
            return '<span class="badge bg-light text-muted border px-3 py-1.5 rounded-pill">Unknown</span>';
    }
}

// Fetch saved default signatory settings
$settings_stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
$sys_settings = $settings_stmt ? $settings_stmt->fetchAll(PDO::FETCH_KEY_PAIR) : [];

$def_tabulator_name = $sys_settings['sig_tabulator_name'] ?? '';
$def_tabulator_title = $sys_settings['sig_tabulator_title'] ?? 'OFFICIAL TABULATOR';
$def_tabulator_sub = $sys_settings['sig_tabulator_sub'] ?? 'ASTS Tabulation Committee';

$def_chairman_name = $sys_settings['sig_chairman_name'] ?? '';
$def_chairman_title = $sys_settings['sig_chairman_title'] ?? 'CHIEF JUDGE / CHAIRMAN';
$def_chairman_sub = $sys_settings['sig_chairman_sub'] ?? 'Executive Committee';

$def_noted_name = $sys_settings['sig_noted_name'] ?? '';
$def_noted_title = $sys_settings['sig_noted_title'] ?? 'College President / Campus Director';
$def_noted_sub = $sys_settings['sig_noted_sub'] ?? 'Apayao State College';
$def_show_noted = !empty($sys_settings['sig_show_noted']);

// ==========================================
// 3.1 DEPARTMENT RANKINGS DATA AGGREGATION
// ==========================================
$ay_stmt = $pdo->query("SELECT DISTINCT academic_year FROM events WHERE academic_year IS NOT NULL AND academic_year != '' ORDER BY academic_year DESC");
$available_ays = $ay_stmt->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('2027-2028', $available_ays)) $available_ays[] = '2027-2028';
if (!in_array('2026-2027', $available_ays)) $available_ays[] = '2026-2027';
$latest_event_ay = $pdo->query("SELECT academic_year FROM events WHERE academic_year IS NOT NULL AND academic_year != '' ORDER BY id DESC LIMIT 1")->fetchColumn();
$default_ay = $latest_event_ay ?: ($available_ays[0] ?? '2025-2026');
$selected_ay = $_GET['academic_year'] ?? $default_ay;
$active_report_tab = $_GET['tab'] ?? 'rankings';

// Filter SQL for events
$ay_condition = "";
$ay_params = [];
if ($selected_ay !== 'all' && !empty($selected_ay)) {
    $ay_condition = " WHERE (e.academic_year = :ay OR (e.academic_year IS NULL AND :ay_fallback = '2026-2027'))";
    $ay_params = ['ay' => $selected_ay, 'ay_fallback' => $selected_ay];
}

// Fetch all registered departments for base dictionary
$dept_meta_stmt = $pdo->query("SELECT department_name, department_code FROM departments ORDER BY department_name ASC");
$all_registered_depts = $dept_meta_stmt->fetchAll(PDO::FETCH_ASSOC);
$dept_code_map = [];
foreach ($all_registered_depts as $rd) {
    $dept_code_map[$rd['department_name']] = $rd['department_code'] ?? '';
}

// Fetch events with candidates count for the selected academic year
$events_for_ay_stmt = $pdo->prepare("
    SELECT e.id, e.name, e.type, e.organizer, COALESCE(e.department, 'Unassigned Department') as department, 
           e.academic_year, e.start_date, e.end_date, e.status, e.participation_mode,
           (SELECT COUNT(*) FROM candidates WHERE event_id = e.id) as candidate_count
    FROM events e
    $ay_condition
    ORDER BY e.start_date DESC
");
$events_for_ay_stmt->execute($ay_params);
$ay_events_list = $events_for_ay_stmt->fetchAll(PDO::FETCH_ASSOC);

// Aggregate metrics by department
$dept_rankings_map = [];
$total_events_overall = count($ay_events_list);
$category_counts = ['Pageant' => 0, 'Cultural' => 0, 'Sports' => 0, 'Academic' => 0, 'Literary' => 0];

// Initialize registered departments
foreach ($all_registered_depts as $rd) {
    $dname = $rd['department_name'];
    $dept_rankings_map[$dname] = [
        'name' => $dname,
        'code' => $rd['department_code'] ?? '',
        'total_events' => 0,
        'completed_events' => 0,
        'ongoing_events' => 0,
        'upcoming_events' => 0,
        'pageant_count' => 0,
        'cultural_count' => 0,
        'sports_count' => 0,
        'academic_count' => 0,
        'literary_count' => 0,
        'total_candidates' => 0,
        'events' => []
    ];
}

// Populate from actual events
foreach ($ay_events_list as $ev) {
    $dname = $ev['department'];
    if (!isset($dept_rankings_map[$dname])) {
        $dept_rankings_map[$dname] = [
            'name' => $dname,
            'code' => $dept_code_map[$dname] ?? '',
            'total_events' => 0,
            'completed_events' => 0,
            'ongoing_events' => 0,
            'upcoming_events' => 0,
            'pageant_count' => 0,
            'cultural_count' => 0,
            'sports_count' => 0,
            'academic_count' => 0,
            'literary_count' => 0,
            'total_candidates' => 0,
            'events' => []
        ];
    }
    
    $dept_rankings_map[$dname]['total_events']++;
    if ($ev['status'] === 'Completed') $dept_rankings_map[$dname]['completed_events']++;
    elseif ($ev['status'] === 'Ongoing') $dept_rankings_map[$dname]['ongoing_events']++;
    else $dept_rankings_map[$dname]['upcoming_events']++;

    $type_lower = ucfirst(strtolower($ev['type']));
    if (isset($category_counts[$type_lower])) {
        $category_counts[$type_lower]++;
    }
    if ($type_lower === 'Pageant') $dept_rankings_map[$dname]['pageant_count']++;
    elseif ($type_lower === 'Cultural') $dept_rankings_map[$dname]['cultural_count']++;
    elseif ($type_lower === 'Sports') $dept_rankings_map[$dname]['sports_count']++;
    elseif ($type_lower === 'Academic') $dept_rankings_map[$dname]['academic_count']++;
    elseif ($type_lower === 'Literary') $dept_rankings_map[$dname]['literary_count']++;

    $dept_rankings_map[$dname]['total_candidates'] += (int)$ev['candidate_count'];
    $dept_rankings_map[$dname]['events'][] = $ev;
}

// Sort by total_events DESC, completed_events DESC, name ASC
$dept_rankings = array_values($dept_rankings_map);
usort($dept_rankings, function($a, $b) {
    if ($b['total_events'] !== $a['total_events']) {
        return $b['total_events'] <=> $a['total_events'];
    }
    if ($b['completed_events'] !== $a['completed_events']) {
        return $b['completed_events'] <=> $a['completed_events'];
    }
    return strcasecmp($a['name'], $b['name']);
});

// Calculate department rankings KPIs
$leading_dept = count($dept_rankings) > 0 && $dept_rankings[0]['total_events'] > 0 ? $dept_rankings[0] : null;
$active_depts_count = count(array_filter($dept_rankings, fn($d) => $d['total_events'] > 0));
arsort($category_counts);
$top_category_name = key($category_counts);
$top_category_count = current($category_counts);

// ==========================================
// 4. SERVER-SIDE TCPDF GENERATION ENGINE
// ==========================================
if (isset($_GET['export_pdf']) || isset($_POST['export_pdf'])) {
    // Suppress PHP 8.2 warnings during TCPDF table calculations
    @error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);
    @ini_set('display_errors', '0');

    require_once '../vendor/autoload.php';

    class ASTS_PDF extends TCPDF {
        public $reportTitle = 'OFFICIAL REPORT';
        public $eventSubtitle = '';
        public $eventDateStr = '';

        public function Header() {
            $this->SetY(8);
            $this->SetFont('helvetica', 'B', 14);
            $this->SetTextColor(10, 25, 47); // Penn Blue
            $this->Cell(0, 5, 'APAYAO STATE COLLEGE', 0, 1, 'C');
            
            $this->SetFont('helvetica', 'B', 9);
            $this->SetTextColor(180, 130, 0); // Gold
            $this->Cell(0, 4, 'AUTOMATED SCORING & TABULATION SYSTEM (ASTS)', 0, 1, 'C');

            $this->SetFont('helvetica', 'B', 11);
            $this->SetTextColor(10, 25, 47);
            $this->Cell(0, 5, $this->reportTitle, 0, 1, 'C');

            if (!empty($this->eventSubtitle)) {
                $this->SetFont('helvetica', '', 8.5);
                $this->SetTextColor(90, 90, 90);
                $sub = 'Event: ' . $this->eventSubtitle;
                if (!empty($this->eventDateStr)) {
                    $sub .= ' | Date: ' . $this->eventDateStr;
                }
                $this->Cell(0, 4, $sub, 0, 1, 'C');
            }

            $this->SetDrawColor(10, 25, 47);
            $this->SetLineWidth(0.6);
            $this->Line(15, $this->GetY() + 1.5, $this->getPageWidth() - 15, $this->GetY() + 1.5);
            $this->SetDrawColor(255, 191, 0);
            $this->SetLineWidth(0.3);
            $this->Line(15, $this->GetY() + 2.5, $this->getPageWidth() - 15, $this->GetY() + 2.5);
            $this->Ln(4);
        }

        public function Footer() {
            $this->SetY(-12);
            $this->SetDrawColor(200, 200, 200);
            $this->SetLineWidth(0.2);
            $this->Line(15, $this->GetY(), $this->getPageWidth() - 15, $this->GetY());
            $this->SetFont('helvetica', 'I', 7.5);
            $this->SetTextColor(120, 120, 120);
            
            $this->Cell(0, 8, 'Generated on ' . date('F d, Y h:i A') . ' | Official Document of Apayao State College ASTS', 0, 0, 'L');
            $this->Cell(0, 8, 'Page ' . $this->getAliasNumPage() . ' of ' . $this->getAliasNbPages(), 0, 0, 'R');
        }
    }

    $export_type = $_REQUEST['export_pdf'];
    $clean_event = preg_replace('/[^A-Za-z0-9_]/', '_', $event_name);

    // Read customizable signatories
    $tabulator_name = isset($_REQUEST['tabulator_name']) ? trim($_REQUEST['tabulator_name']) : $def_tabulator_name;
    $tabulator_title = !empty($_REQUEST['tabulator_title']) ? trim($_REQUEST['tabulator_title']) : $def_tabulator_title;
    $tabulator_sub = !empty($_REQUEST['tabulator_sub']) ? trim($_REQUEST['tabulator_sub']) : $def_tabulator_sub;

    $chairman_name = isset($_REQUEST['chairman_name']) ? trim($_REQUEST['chairman_name']) : $def_chairman_name;
    $chairman_title = !empty($_REQUEST['chairman_title']) ? trim($_REQUEST['chairman_title']) : $def_chairman_title;
    $chairman_sub = !empty($_REQUEST['chairman_sub']) ? trim($_REQUEST['chairman_sub']) : $def_chairman_sub;

    $show_noted = isset($_REQUEST['show_noted']) ? (bool)$_REQUEST['show_noted'] : $def_show_noted;
    $noted_name = isset($_REQUEST['noted_name']) ? trim($_REQUEST['noted_name']) : $def_noted_name;
    $noted_title = !empty($_REQUEST['noted_title']) ? trim($_REQUEST['noted_title']) : $def_noted_title;
    $noted_sub = !empty($_REQUEST['noted_sub']) ? trim($_REQUEST['noted_sub']) : $def_noted_sub;

    // Persist as default if requested
    if (!empty($_REQUEST['save_defaults'])) {
        $to_save = [
            'sig_tabulator_name' => $tabulator_name,
            'sig_tabulator_title' => $tabulator_title,
            'sig_tabulator_sub' => $tabulator_sub,
            'sig_chairman_name' => $chairman_name,
            'sig_chairman_title' => $chairman_title,
            'sig_chairman_sub' => $chairman_sub,
            'sig_noted_name' => $noted_name,
            'sig_noted_title' => $noted_title,
            'sig_noted_sub' => $noted_sub,
            'sig_show_noted' => $show_noted ? '1' : '0'
        ];
        $save_stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (:k, :v) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        foreach ($to_save as $k => $v) {
            $save_stmt->execute(['k' => $k, 'v' => $v]);
        }
    }

    if ($export_type === 'rankings') {
        $pdf = new ASTS_PDF('P', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->reportTitle = 'OFFICIAL EVENT RANKINGS';
        $pdf->eventSubtitle = $event_name;
        $pdf->eventDateStr = $event_date_formatted;
        $pdf->SetMargins(15, 30, 15);
        $pdf->SetAutoPageBreak(TRUE, 15);
        $pdf->AddPage();

        $tbl = '<table cellpadding="5" cellspacing="0" border="1" style="border-collapse:collapse; font-size:9pt; width:100%;">
            <thead>
                <tr style="background-color:#0A192F; color:#FFFFFF; font-weight:bold; text-align:center;">
                    <th width="8%">Rank</th>
                    <th width="12%">Entry #</th>
                    <th width="28%" style="text-align:left;">Participant Name</th>
                    <th width="26%" style="text-align:left;">Department</th>
                    <th width="12%">Year Level</th>
                    <th width="14%">Final Average</th>
                </tr>
            </thead>
            <tbody>';

        if (count($rankings) > 0) {
            $r_num = 1;
            foreach ($rankings as $row) {
                // Rank highlighting: 1st is yellow highlight, 2nd and 3rd are shades of blue, other rankings no color
                if ($r_num == 1) {
                    $bg = '#FFF275'; // Yellow highlight for 1st rank
                    $row_style = 'font-weight:bold; color:#0A192F;';
                } elseif ($r_num == 2) {
                    $bg = '#BFDBFE'; // First shade of blue for 2nd rank
                    $row_style = 'font-weight:bold; color:#0A192F;';
                } elseif ($r_num == 3) {
                    $bg = '#DBEAFE'; // Second lighter shade of blue for 3rd rank
                    $row_style = 'font-weight:bold; color:#0A192F;';
                } else {
                    $bg = '#FFFFFF'; // No color row for other rankings
                    $row_style = 'color:#333333;';
                }

                $dept_str = htmlspecialchars($row['course'] ?? 'Not Assigned');
                $year_str = htmlspecialchars($row['year'] ?: 'N/A');

                $tbl .= '<tr style="background-color:' . $bg . '; text-align:center; ' . $row_style . '">
                    <td width="8%" style="font-weight:bold; font-size:10.5pt;">#' . $r_num . '</td>
                    <td width="12%" style="font-weight:bold; color:#444444;">#' . htmlspecialchars($row['order']) . '</td>
                    <td width="28%" style="text-align:left; font-weight:bold;">' . htmlspecialchars($row['name']) . '</td>
                    <td width="26%" style="text-align:left;">' . $dept_str . '</td>
                    <td width="12%">' . $year_str . '</td>
                    <td width="14%" style="font-weight:bold; font-size:9.5pt;">' . number_format($row['final_score'], 2) . '%</td>
                </tr>';
                $r_num++;
            }
        } else {
            $tbl .= '<tr><td colspan="6" width="100%" style="text-align:center; padding:15px; color:#888;">No ranking data recorded for this event.</td></tr>';
        }
        $tbl .= '</tbody></table>';

        $pdf->writeHTML($tbl, true, false, true, false, '');
        $pdf->Ln(6);

        // Signatures section
        $sig_html = '<table cellpadding="4" cellspacing="0" border="0" style="font-size:9pt; width:100%;">
            <tr>
                <td colspan="3" width="100%" style="font-weight:bold; color:#0A192F; border-bottom:1px solid #CCC;">
                    BOARD OF EVALUATORS &amp; OFFICIAL CERTIFICATION
                </td>
            </tr>';

        $judges_list = array_values($judge_headers);
        for ($i = 0; $i < count($judges_list); $i += 2) {
            $j1 = $judges_list[$i];
            $j2 = isset($judges_list[$i + 1]) ? $judges_list[$i + 1] : null;

            $sig_html .= '<tr>
                <td width="45%" style="text-align:center;"><br><br>
                    ____________________________________<br>
                    <strong>' . htmlspecialchars($j1) . '</strong><br>
                    <span style="font-size:8pt; color:#666;">Official Event Judge</span>
                </td>
                <td width="10%">&nbsp;</td>
                <td width="45%" style="text-align:center;">' . 
                    ($j2 ? '<br><br>____________________________________<br><strong>' . htmlspecialchars($j2) . '</strong><br><span style="font-size:8pt; color:#666;">Official Event Judge</span>' : '&nbsp;') . 
                '</td>
            </tr>';
        }

        // Render customizable Tabulator & Chairman sign-off lines
        $tab_line = '<br><br>____________________________________<br>';
        if (!empty($tabulator_name)) {
            $tab_line .= '<strong style="font-size:9.5pt;">' . htmlspecialchars(strtoupper($tabulator_name)) . '</strong><br>';
        }
        $tab_line .= '<strong>' . htmlspecialchars($tabulator_title) . '</strong><br>';
        if (!empty($tabulator_sub)) {
            $tab_line .= '<span style="font-size:8pt; color:#666;">' . htmlspecialchars($tabulator_sub) . '</span>';
        }

        $chair_line = '<br><br>____________________________________<br>';
        if (!empty($chairman_name)) {
            $chair_line .= '<strong style="font-size:9.5pt;">' . htmlspecialchars(strtoupper($chairman_name)) . '</strong><br>';
        }
        $chair_line .= '<strong>' . htmlspecialchars($chairman_title) . '</strong><br>';
        if (!empty($chairman_sub)) {
            $chair_line .= '<span style="font-size:8pt; color:#666;">' . htmlspecialchars($chairman_sub) . '</span>';
        }

        $sig_html .= '<tr>
                <td width="45%" style="text-align:center;">' . $tab_line . '</td>
                <td width="10%">&nbsp;</td>
                <td width="45%" style="text-align:center;">' . $chair_line . '</td>
            </tr>';

        if ($show_noted && (!empty($noted_name) || !empty($noted_title))) {
            $noted_line = '<br><br><span style="font-size:8pt; color:#555; text-transform:uppercase; letter-spacing:0.5px;">Noted &amp; Approved by:</span><br><br>____________________________________<br>';
            if (!empty($noted_name)) {
                $noted_line .= '<strong style="font-size:9.5pt;">' . htmlspecialchars(strtoupper($noted_name)) . '</strong><br>';
            }
            if (!empty($noted_title)) {
                $noted_line .= '<strong>' . htmlspecialchars($noted_title) . '</strong><br>';
            }
            if (!empty($noted_sub)) {
                $noted_line .= '<span style="font-size:8pt; color:#666;">' . htmlspecialchars($noted_sub) . '</span>';
            }

            $sig_html .= '<tr>
                <td colspan="3" width="100%" style="text-align:center;">' . $noted_line . '</td>
            </tr>';
        }

        $sig_html .= '</table>';

        $pdf->writeHTML($sig_html, true, false, true, false, '');

        while (ob_get_level()) { ob_end_clean(); }
        $pdf->Output("ASTS_Official_Rankings_{$clean_event}.pdf", 'I');
        exit;
    }

    if ($export_type === 'tabulation') {
        $pdf = new ASTS_PDF('L', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->reportTitle = 'MASTER TABULATION MATRIX';
        $pdf->eventSubtitle = $event_name;
        $pdf->eventDateStr = $event_date_formatted;
        $pdf->SetMargins(15, 30, 15);
        $pdf->SetAutoPageBreak(TRUE, 15);
        $pdf->AddPage();

        $num_judges = count($judge_headers);
        $judge_col_width = $num_judges > 0 ? floor(50 / $num_judges) : 20;
        $rem_width = 100 - (6 + 7 + 23 + 14 + ($judge_col_width * $num_judges));
        $name_width = 23 + $rem_width;

        $tbl = '<table cellpadding="4" cellspacing="0" border="1" style="border-collapse:collapse; font-size:8.5pt; width:100%;">
            <thead>
                <tr style="background-color:#0A192F; color:#FFFFFF; font-weight:bold; text-align:center;">
                    <th width="6%">Rank</th>
                    <th width="7%">No.</th>
                    <th width="' . $name_width . '%" style="text-align:left;">Candidate Name</th>';

        foreach ($judge_headers as $j_name) {
            $tbl .= '<th width="' . $judge_col_width . '%">' . htmlspecialchars($j_name) . '</th>';
        }

        $tbl .= '<th width="14%" style="background-color:#FFBF00; color:#0A192F;">Final Score</th>
                </tr>
            </thead>
            <tbody>';

        if (count($rankings) > 0) {
            $r_num = 1;
            foreach ($rankings as $row) {
                if ($r_num == 1) $bg = '#FFF275'; // Yellow highlight
                elseif ($r_num == 2) $bg = '#BFDBFE'; // Shade of blue
                elseif ($r_num == 3) $bg = '#DBEAFE'; // Lighter shade of blue
                else $bg = '#FFFFFF'; // No color row
                $tbl .= '<tr style="background-color:' . $bg . '; text-align:center;">
                    <td width="6%" style="font-weight:bold;">#' . $r_num . '</td>
                    <td width="7%" style="color:#555;">#' . htmlspecialchars($row['order']) . '</td>
                    <td width="' . $name_width . '%" style="text-align:left; font-weight:bold;">' . htmlspecialchars($row['name']) . '</td>';

                foreach ($judge_headers as $judge_id => $j_name) {
                    $score_val = isset($row['judge_totals'][$judge_id]) ? number_format($row['judge_totals'][$judge_id], 2) . '%' : '0.00%';
                    $tbl .= '<td width="' . $judge_col_width . '%">' . $score_val . '</td>';
                }

                $tbl .= '<td width="14%" style="font-weight:bold; color:#0A192F; font-size:9.5pt;">' . number_format($row['final_score'], 2) . '%</td>
                </tr>';
                $r_num++;
            }
        } else {
            $tbl .= '<tr><td colspan="' . ($num_judges + 4) . '" width="100%" style="text-align:center; padding:10px; color:#888;">No tabulation data recorded.</td></tr>';
        }
        $tbl .= '</tbody></table>';

        $pdf->writeHTML($tbl, true, false, true, false, '');
        $pdf->Ln(6);

        // Signatures block
        $sig_html = '<table cellpadding="3" cellspacing="0" border="0" style="font-size:8pt; width:100%;">
            <tr>
                <td colspan="4" width="100%" style="font-weight:bold; color:#0A192F; border-bottom:1px solid #CCC;">
                    ATTESTED BY THE EVALUATION COMMITTEE:
                </td>
            </tr>
            <tr>';

        $j_count = 0;
        foreach ($judge_headers as $j_name) {
            if ($j_count > 0 && $j_count % 4 == 0) {
                $sig_html .= '</tr><tr>';
            }
            $sig_html .= '<td width="25%" style="text-align:center;"><br><br>
                ____________________________<br>
                <strong>' . htmlspecialchars($j_name) . '</strong><br>
                <span style="font-size:7.5pt; color:#666;">Judge</span>
            </td>';
            $j_count++;
        }
        while ($j_count % 4 != 0) {
            $sig_html .= '<td width="25%">&nbsp;</td>';
            $j_count++;
        }
        $sig_html .= '</tr>';

        // Tabulator & Chairman in Tabulation PDF
        $tab_line_l = '<br><br>____________________________________<br>';
        if (!empty($tabulator_name)) {
            $tab_line_l .= '<strong style="font-size:8.5pt;">' . htmlspecialchars(strtoupper($tabulator_name)) . '</strong><br>';
        }
        $tab_line_l .= '<strong>' . htmlspecialchars($tabulator_title) . '</strong><br>';
        if (!empty($tabulator_sub)) {
            $tab_line_l .= '<span style="font-size:7.5pt; color:#666;">' . htmlspecialchars($tabulator_sub) . '</span>';
        }

        $chair_line_l = '<br><br>____________________________________<br>';
        if (!empty($chairman_name)) {
            $chair_line_l .= '<strong style="font-size:8.5pt;">' . htmlspecialchars(strtoupper($chairman_name)) . '</strong><br>';
        }
        $chair_line_l .= '<strong>' . htmlspecialchars($chairman_title) . '</strong><br>';
        if (!empty($chairman_sub)) {
            $chair_line_l .= '<span style="font-size:7.5pt; color:#666;">' . htmlspecialchars($chairman_sub) . '</span>';
        }

        $sig_html .= '<tr>
            <td colspan="2" style="text-align:center;">' . $tab_line_l . '</td>
            <td colspan="2" style="text-align:center;">' . $chair_line_l . '</td>
        </tr>';

        if ($show_noted && (!empty($noted_name) || !empty($noted_title))) {
            $noted_line_l = '<br><br><span style="font-size:7.5pt; color:#555; text-transform:uppercase;">Noted &amp; Approved by:</span><br><br>____________________________________<br>';
            if (!empty($noted_name)) {
                $noted_line_l .= '<strong style="font-size:8.5pt;">' . htmlspecialchars(strtoupper($noted_name)) . '</strong><br>';
            }
            if (!empty($noted_title)) {
                $noted_line_l .= '<strong>' . htmlspecialchars($noted_title) . '</strong><br>';
            }
            if (!empty($noted_sub)) {
                $noted_line_l .= '<span style="font-size:7.5pt; color:#666;">' . htmlspecialchars($noted_sub) . '</span>';
            }

            $sig_html .= '<tr>
                <td colspan="4" style="text-align:center;">' . $noted_line_l . '</td>
            </tr>';
        }

        $sig_html .= '</table>';

        $pdf->writeHTML($sig_html, true, false, true, false, '');

        while (ob_get_level()) { ob_end_clean(); }
        $pdf->Output("ASTS_Master_Tabulation_{$clean_event}.pdf", 'I');
        exit;
    }

    if ($export_type === 'audit') {
        $pdf = new ASTS_PDF('P', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->reportTitle = 'RAW SCORE AUDIT LOG';
        $pdf->eventSubtitle = $event_name;
        $pdf->eventDateStr = $event_date_formatted;
        $pdf->SetMargins(15, 30, 15);
        $pdf->SetAutoPageBreak(TRUE, 15);
        $pdf->AddPage();

        $tbl = '<table cellpadding="5" cellspacing="0" border="1" style="border-collapse:collapse; font-size:9pt; width:100%;">
            <thead>
                <tr style="background-color:#0A192F; color:#FFFFFF; font-weight:bold; text-align:center;">
                    <th width="40%" style="text-align:left;">Candidate Entry</th>
                    <th width="35%" style="text-align:left;">Evaluating Judge</th>
                    <th width="25%">Raw Score / Max</th>
                </tr>
            </thead>
            <tbody>';

        if (count($audit_log) > 0) {
            $i = 0;
            foreach ($audit_log as $log) {
                $bg = ($i % 2 == 0) ? '#F8F9FA' : '#FFFFFF';
                $tbl .= '<tr style="background-color:' . $bg . ';">
                    <td width="40%"><strong>#' . htmlspecialchars($log['order_number']) . ' ' . htmlspecialchars($log['candidate_name']) . '</strong></td>
                    <td width="35%">' . htmlspecialchars($log['judge_name']) . '</td>
                    <td width="25%" style="text-align:center; font-weight:bold; color:#0A192F;">' . number_format($log['total_score'], 2) . ' / ' . number_format($log['total_max'], 0) . '</td>
                </tr>';
                $i++;
            }
        } else {
            $tbl .= '<tr><td colspan="3" width="100%" style="text-align:center; padding:10px; color:#888;">No audit data recorded.</td></tr>';
        }
        $tbl .= '</tbody></table>';

        $pdf->writeHTML($tbl, true, false, true, false, '');

        while (ob_get_level()) { ob_end_clean(); }
        $pdf->Output("ASTS_Score_Audit_{$clean_event}.pdf", 'I');
        exit;
    }

    if ($export_type === 'system') {
        $pdf = new ASTS_PDF('P', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->reportTitle = 'REGISTERED JUDGES & SYSTEM DIRECTORY';
        $pdf->eventSubtitle = 'System Diagnostics Report';
        $pdf->eventDateStr = date('F d, Y');
        $pdf->SetMargins(15, 30, 15);
        $pdf->SetAutoPageBreak(TRUE, 15);
        $pdf->AddPage();

        $metrics = '<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse; font-size:9.5pt; text-align:center; width:100%;">
            <thead>
                <tr style="background-color:#0A192F; color:#FFFFFF; font-weight:bold;">
                    <th width="25%">Total Judges</th>
                    <th width="25%">Approved</th>
                    <th width="25%">Pending</th>
                    <th width="25%">Events Tracked</th>
                </tr>
            </thead>
            <tbody>
                <tr style="background-color:#F8F9FA; font-weight:bold; font-size:12pt; color:#0A192F;">
                    <td width="25%">' . $stat_total_judges . '</td>
                    <td width="25%" style="color:#198754;">' . $stat_approved . '</td>
                    <td width="25%" style="color:#FFC107;">' . $stat_pending . '</td>
                    <td width="25%" style="color:#0D6EFD;">' . $stat_events . '</td>
                </tr>
            </tbody>
        </table>';

        $tbl = '<table cellpadding="5" cellspacing="0" border="1" style="border-collapse:collapse; font-size:9pt; width:100%;">
            <thead>
                <tr style="background-color:#0A192F; color:#FFFFFF; font-weight:bold; text-align:center;">
                    <th width="12%">Sys ID</th>
                    <th width="40%" style="text-align:left;">Judge Full Name</th>
                    <th width="28%" style="text-align:left;">Username</th>
                    <th width="20%">Status</th>
                </tr>
            </thead>
            <tbody>';

        if (count($sys_judges) > 0) {
            $i = 0;
            foreach ($sys_judges as $sj) {
                $bg = ($i % 2 == 0) ? '#F8F9FA' : '#FFFFFF';
                $st = ucfirst(strtolower($sj['approval_status']));
                $tbl .= '<tr style="background-color:' . $bg . ';">
                    <td width="12%" style="text-align:center; font-weight:bold; color:#777;">#' . htmlspecialchars($sj['id']) . '</td>
                    <td width="40%"><strong>' . htmlspecialchars($sj['full_name']) . '</strong></td>
                    <td width="28%">@' . htmlspecialchars($sj['username']) . '</td>
                    <td width="20%" style="text-align:center; font-weight:bold;">' . $st . '</td>
                </tr>';
                $i++;
            }
        } else {
            $tbl .= '<tr><td colspan="4" width="100%" style="text-align:center; padding:10px; color:#888;">No judges registered.</td></tr>';
        }
        $tbl .= '</tbody></table>';

        $pdf->writeHTML($metrics, true, false, true, false, '');
        $pdf->Ln(6);
        $pdf->writeHTML($tbl, true, false, true, false, '');

        while (ob_get_level()) { ob_end_clean(); }
        $pdf->Output("ASTS_Judges_Directory_" . date('Ymd') . ".pdf", 'I');
        exit;
    }

    if ($export_type === 'dept_rankings') {
        $ay_val = isset($_REQUEST['academic_year']) ? $_REQUEST['academic_year'] : $selected_ay;
        $ay_label = ($ay_val === 'all') ? 'All Academic Years' : 'A.Y. ' . $ay_val;
        
        $pdf = new ASTS_PDF('L', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->reportTitle = 'DEPARTMENT RANKINGS & EVENT PRODUCTION REPORT';
        $pdf->eventSubtitle = 'Institutional Department Activity Summary (' . $ay_label . ')';
        $pdf->eventDateStr = date('F d, Y');
        $pdf->SetMargins(15, 30, 15);
        $pdf->SetAutoPageBreak(TRUE, 15);
        $pdf->AddPage();

        // 1. KPI Summary Strip in PDF
        $summary_html = '<table cellpadding="4" cellspacing="0" border="1" style="border-collapse:collapse; width:100%; font-size:9pt; text-align:center; margin-bottom:12px;">
            <tr style="background-color:#0A192F; color:#FFBF00; font-weight:bold;">
                <th width="28%">TOP RANKED DEPARTMENT</th>
                <th width="24%">TOTAL EVENTS CONDUCTED</th>
                <th width="24%">ACTIVE DEPARTMENTS</th>
                <th width="24%">TOP EVENT CATEGORY</th>
            </tr>
            <tr style="background-color:#FFFFFF; color:#0A192F; font-size:10pt; font-weight:bold;">
                <td width="28%">' . htmlspecialchars($leading_dept ? $leading_dept['name'] . ' (' . $leading_dept['total_events'] . ' Events)' : 'None') . '</td>
                <td width="24%">' . $total_events_overall . ' Events</td>
                <td width="24%">' . $active_depts_count . ' Departments</td>
                <td width="24%">' . htmlspecialchars($top_category_name . ' (' . $top_category_count . ')') . '</td>
            </tr>
        </table><br><br>';
        $pdf->writeHTML($summary_html, true, false, true, false, '');

        // 2. Rankings Table
        $tbl = '<table cellpadding="5" cellspacing="0" border="1" style="border-collapse:collapse; font-size:8.5pt; width:100%;">
            <thead>
                <tr style="background-color:#0A192F; color:#FFFFFF; font-weight:bold; text-align:center;">
                    <th width="7%">Rank</th>
                    <th width="33%" style="text-align:left;">Department / Collegiate Unit</th>
                    <th width="14%">Events Created</th>
                    <th width="12%">Status Split</th>
                    <th width="22%">Category Distribution</th>
                    <th width="12%">Share (%)</th>
                </tr>
            </thead>
            <tbody>';

        if (count($dept_rankings) > 0) {
            $r_num = 1;
            foreach ($dept_rankings as $d) {
                if ($d['total_events'] == 0 && $selected_ay !== 'all') continue;
                if ($r_num == 1 && $d['total_events'] > 0) $bg = '#FFF275'; // Yellow highlight
                elseif ($r_num == 2 && $d['total_events'] > 0) $bg = '#BFDBFE'; // Shade of blue
                elseif ($r_num == 3 && $d['total_events'] > 0) $bg = '#DBEAFE'; // Lighter shade of blue
                else $bg = '#FFFFFF'; // No color row

                $code_badge = !empty($d['code']) ? ' [' . htmlspecialchars($d['code']) . ']' : '';
                $status_str = $d['completed_events'] . ' Comp / ' . ($d['ongoing_events'] + $d['upcoming_events']) . ' Act';
                
                $cats = [];
                if ($d['pageant_count'] > 0) $cats[] = 'Pag: ' . $d['pageant_count'];
                if ($d['cultural_count'] > 0) $cats[] = 'Cult: ' . $d['cultural_count'];
                if ($d['sports_count'] > 0) $cats[] = 'Sport: ' . $d['sports_count'];
                if ($d['academic_count'] > 0) $cats[] = 'Acad: ' . $d['academic_count'];
                if ($d['literary_count'] > 0) $cats[] = 'Lit: ' . $d['literary_count'];
                $cat_str = !empty($cats) ? implode(', ', $cats) : '-';

                $pct = $total_events_overall > 0 ? number_format(($d['total_events'] / $total_events_overall) * 100, 1) : 0;

                $tbl .= '<tr style="background-color:' . $bg . '; text-align:center;">
                    <td width="7%" style="font-weight:bold; font-size:10pt;">#' . $r_num . '</td>
                    <td width="33%" style="text-align:left;"><strong>' . htmlspecialchars($d['name']) . '</strong><span style="color:#666; font-size:7.5pt;">' . $code_badge . '</span></td>
                    <td width="14%" style="font-weight:bold; color:#0A192F; font-size:10pt;">' . $d['total_events'] . ' Events</td>
                    <td width="12%" style="font-size:8pt;">' . $status_str . '</td>
                    <td width="22%" style="font-size:7.5pt;">' . htmlspecialchars($cat_str) . '</td>
                    <td width="12%" style="font-weight:bold;">' . $pct . '%</td>
                </tr>';
                $r_num++;
            }
        } else {
            $tbl .= '<tr><td colspan="6" style="text-align:center; padding:15px; color:#888;">No department events recorded for ' . htmlspecialchars($ay_label) . '.</td></tr>';
        }
        $tbl .= '</tbody></table><br><br>';
        $pdf->writeHTML($tbl, true, false, true, false, '');

        // 3. Institutional Signatories
        $sig_html = '<table cellpadding="5" cellspacing="0" border="0" style="width:100%; font-size:9pt; margin-top:20px;">
            <tr>
                <td width="45%" style="text-align:center;">
                    <br><br>____________________________________<br>';
        if (!empty($tabulator_name)) {
            $sig_html .= '<strong style="font-size:9.5pt;">' . htmlspecialchars(strtoupper($tabulator_name)) . '</strong><br>';
        }
        $sig_html .= '<strong>' . htmlspecialchars($tabulator_title) . '</strong><br>';
        if (!empty($tabulator_sub)) {
            $sig_html .= '<span style="font-size:8pt; color:#666;">' . htmlspecialchars($tabulator_sub) . '</span>';
        }
        $sig_html .= '</td>
                <td width="10%">&nbsp;</td>
                <td width="45%" style="text-align:center;">
                    <br><br>____________________________________<br>';
        if (!empty($chairman_name)) {
            $sig_html .= '<strong style="font-size:9.5pt;">' . htmlspecialchars(strtoupper($chairman_name)) . '</strong><br>';
        }
        $sig_html .= '<strong>' . htmlspecialchars($chairman_title) . '</strong><br>';
        if (!empty($chairman_sub)) {
            $sig_html .= '<span style="font-size:8pt; color:#666;">' . htmlspecialchars($chairman_sub) . '</span>';
        }
        $sig_html .= '</td>
            </tr>';

        if ($show_noted && (!empty($noted_name) || !empty($noted_title))) {
            $sig_html .= '<tr>
                <td colspan="3" width="100%" style="text-align:center;">
                    <br><br><span style="font-size:8pt; color:#555; text-transform:uppercase;">Noted &amp; Approved by:</span><br><br>____________________________________<br>';
            if (!empty($noted_name)) {
                $sig_html .= '<strong style="font-size:9.5pt;">' . htmlspecialchars(strtoupper($noted_name)) . '</strong><br>';
            }
            if (!empty($noted_title)) {
                $sig_html .= '<strong>' . htmlspecialchars($noted_title) . '</strong><br>';
            }
            if (!empty($noted_sub)) {
                $sig_html .= '<span style="font-size:8pt; color:#666;">' . htmlspecialchars($noted_sub) . '</span>';
            }
            $sig_html .= '</td></tr>';
        }
        $sig_html .= '</table>';
        $pdf->writeHTML($sig_html, true, false, true, false, '');

        while (ob_get_level()) { ob_end_clean(); }
        $clean_ay = preg_replace('/[^A-Za-z0-9]/', '_', $ay_label);
        $pdf->Output("ASTS_Department_Rankings_{$clean_ay}.pdf", 'I');
        exit;
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Central Reports | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <!-- Required JS Libraries for Excel Exporting -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    
    <style>
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; }
        a, button, .btn, label, .input-group-text, .page-link, select, option, .nav-link { cursor: pointer; }

        body { background-color: #F4F7F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default;}
        .main-content { min-height: 100vh; background-color: #F8F9FA; }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }
        .bg-amber { background-color: #FFBF00 !important; }
        .border-amber { border-color: #FFBF00 !important; }
        .border-midnight { border-color: #0A192F !important; }

        /* Unified Blue & Yellow Gold Theme Buttons */
        .btn-midnight { 
            background-color: #0A192F; 
            color: #FFFFFF; 
            border: 1px solid #0A192F; 
            transition: all 0.2s ease;
        }
        .btn-midnight:hover, .btn-midnight:focus { 
            background-color: #172a45; 
            color: #FFBF00; 
            border-color: #172a45;
        }
        .btn-amber { 
            background-color: #FFBF00; 
            color: #0A192F; 
            border: 1px solid #D97706; 
            font-weight: 700; 
            transition: all 0.2s ease;
        }
        .btn-amber:hover, .btn-amber:focus { 
            background-color: #F59E0B; 
            color: #0A192F; 
            border-color: #B45309;
        }
        .btn-royal { 
            background-color: #2563EB; 
            color: #FFFFFF; 
            border: 1px solid #1D4ED8; 
            font-weight: 600;
            transition: all 0.2s ease;
        }
        .btn-royal:hover, .btn-royal:focus { 
            background-color: #1D4ED8; 
            color: #FFFFFF;
        }
        .btn-outline-midnight { 
            background: transparent; 
            color: #0A192F; 
            border: 1.5px solid #0A192F; 
            font-weight: 600;
            transition: all 0.2s ease;
        }
        .btn-outline-midnight:hover, .btn-outline-midnight:focus { 
            background-color: #0A192F; 
            color: #FFBF00;
        }

        /* Executive Table Header */
        .table-custom-header th { 
            background-color: #0A192F !important; 
            color: #FFFFFF !important; 
            font-weight: 700; 
            font-size: 0.88rem;
            letter-spacing: 0.3px;
            border: 1px solid rgba(255, 255, 255, 0.12) !important; 
            padding: 0.85rem 0.65rem; 
            text-align: center;
            vertical-align: middle;
        }
        .table-hover tbody tr:hover { background-color: rgba(10, 25, 47, 0.04) !important; }
        .table-card { border: none; border-radius: 12px; box-shadow: 0 4px 16px rgba(10, 25, 47, 0.06); overflow: hidden; }
        
        .score-highlight { font-family: 'Segoe UI', monospace; font-size: 1.05rem; font-weight: 800; color: #0A192F; }

        /* Report Preview Row Color Hierarchy: Yellow Gold for 1st, Shades of Blue for 2nd & 3rd, White for others */
        .preview-row-rank-1 { 
            background-color: #FEF9C3 !important; 
            border-left: 4px solid #F59E0B !important;
        }
        .preview-row-rank-2 { 
            background-color: #DBEAFE !important; 
            border-left: 4px solid #2563EB !important;
        }
        .preview-row-rank-3 { 
            background-color: #EFF6FF !important; 
            border-left: 4px solid #60A5FA !important;
        }
        .preview-row-rank-other { 
            background-color: #FFFFFF !important; 
            border-left: 4px solid transparent !important;
        }

        /* Navigation Pills - Sleek Midnight & Amber */
        .nav-pills .nav-link { 
            color: #475569; 
            font-weight: 600; 
            border-radius: 8px; 
            transition: all 0.2s; 
            margin-bottom: 5px;
            background-color: #FFFFFF;
            border: 1px solid #E2E8F0;
        }
        .nav-pills .nav-link:hover { 
            background-color: #EFF6FF; 
            color: #1E40AF; 
            border-color: #BFDBFE;
        }
        .nav-pills .nav-link.active { 
            background-color: #0A192F !important; 
            color: #FFBF00 !important; 
            border-color: #0A192F !important;
            box-shadow: 0 3px 8px rgba(10, 25, 47, 0.2);
        }

        /* Specific styles for PDF rendering */
        .pdf-header { text-align: center; margin-bottom: 2rem; border-bottom: 3px solid #0A192F; padding-bottom: 1rem; }

        /* Rank Badge Styling: Yellow Gold, Royal Blue, Sky Blue, Navy */
        .rank-badge { 
            width: 33px; 
            height: 33px; 
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
            border-radius: 50%; 
            font-weight: 800; 
            font-size: 0.95rem; 
            margin: 0 auto;
        }
        .rank-1 { 
            background: linear-gradient(135deg, #FFD700 0%, #F59E0B 100%); 
            color: #0A192F; 
            border: 1.5px solid #D97706; 
            box-shadow: 0 3px 8px rgba(245, 158, 11, 0.35); 
        }
        .rank-2 { 
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); 
            color: #FFFFFF; 
            border: 1.5px solid #1E40AF; 
            box-shadow: 0 3px 8px rgba(37, 99, 235, 0.3); 
        }
        .rank-3 { 
            background: linear-gradient(135deg, #93C5FD 0%, #60A5FA 100%); 
            color: #0A192F; 
            border: 1.5px solid #3B82F6; 
            box-shadow: 0 3px 8px rgba(96, 165, 250, 0.25); 
        }
        .rank-other { 
            background-color: #0A192F; 
            color: #FFFFFF; 
            border: 1.5px solid #1E293B; 
        }

        /* Cohesive Category Badges in Shades of Blue & Yellow Gold */
        .badge-gold { 
            background-color: #FEF08A; 
            color: #713F12; 
            border: 1px solid #FDE047; 
            font-weight: 600; 
            padding: 4px 8px;
            border-radius: 6px;
        }
        .badge-royal { 
            background-color: #DBEAFE; 
            color: #1E40AF; 
            border: 1px solid #BFDBFE; 
            font-weight: 600; 
            padding: 4px 8px;
            border-radius: 6px;
        }
        .badge-navy { 
            background-color: #0A192F; 
            color: #FFFFFF; 
            border: 1px solid #1E293B; 
            font-weight: 600; 
            padding: 4px 8px;
            border-radius: 6px;
        }
        .badge-cobalt { 
            background-color: #1E3A8A; 
            color: #FFFFFF; 
            border: 1px solid #1E40AF; 
            font-weight: 600; 
            padding: 4px 8px;
            border-radius: 6px;
        }
        .badge-sky { 
            background-color: #E0F2FE; 
            color: #0369A1; 
            border: 1px solid #BAE6FD; 
            font-weight: 600; 
            padding: 4px 8px;
            border-radius: 6px;
        }

        /* Score Pills */
        .score-pill-gold {
            background-color: #FFBF00;
            color: #0A192F;
            font-weight: 800;
            font-size: 0.95rem;
            padding: 4px 12px;
            border-radius: 50rem;
            border: 1px solid #D97706;
            display: inline-block;
            box-shadow: 0 2px 5px rgba(245, 158, 11, 0.25);
        }
        .score-pill-blue {
            background-color: #2563EB;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 0.95rem;
            padding: 4px 12px;
            border-radius: 50rem;
            border: 1px solid #1D4ED8;
            display: inline-block;
            box-shadow: 0 2px 5px rgba(37, 99, 235, 0.25);
        }
        .score-pill-light {
            background-color: #EFF6FF;
            color: #1E40AF;
            font-weight: 800;
            font-size: 0.95rem;
            padding: 4px 12px;
            border-radius: 50rem;
            border: 1px solid #BFDBFE;
            display: inline-block;
        }
        .score-pill-neutral {
            color: #0A192F;
            font-weight: 700;
            font-size: 0.95rem;
            font-family: 'Segoe UI', monospace;
        }

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

        /* Print Media Query */
        @media print {
            .sidebar, .print-hide, .btn, .nav-pills { display: none !important; }
            .main-content { margin: 0 !important; width: 100% !important; background-color: white; padding: 0 !important;}
            .table-card { box-shadow: none; border: 1px solid #000; border-radius: 0; }
            .table-custom-header th { background-color: #f8f9fa !important; color: #000 !important; border: 1px solid #000; }
            td { border: 1px solid #000; }
            body { font-size: 12px; background-color: white;}
            .rank-badge { border: 1px solid #000; background: none; color: #000; box-shadow: none; transform: none;}
        }
    </style>
</head>
<body class="d-flex">

    <div class="print-hide">
        <?php include '../includes/admin_sidebar.php'; ?>
    </div>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <!-- Header & Event Filter -->
        <div class="d-flex justify-content-between align-items-end mb-4 pb-3 border-bottom print-hide flex-wrap gap-3">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">Central Reports Engine</h2>
            </div>
            
            <form action="reports.php" method="GET" class="d-flex align-items-center gap-2 m-0">
                <label class="fw-bold text-midnight small mb-0 text-nowrap">Select Target Event:</label>
                <select name="event_id" class="form-select border-midnight fw-bold shadow-sm" onchange="this.form.submit()" style="border-radius: 8px; min-width: 250px;">
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
            </form>
        </div>

        <!-- Tab Navigation -->
        <ul class="nav nav-pills mb-4 print-hide flex-wrap gap-2" id="reportTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link px-4 <?= ($active_report_tab == 'rankings') ? 'active' : '' ?>" id="rankings-tab" data-bs-toggle="pill" data-bs-target="#rankings" type="button" role="tab">
                    <i class="bi bi-award-fill me-2"></i> Official Rankings
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link px-4 <?= ($active_report_tab == 'dept-rankings') ? 'active' : '' ?>" id="dept-rankings-tab" data-bs-toggle="pill" data-bs-target="#dept-rankings" type="button" role="tab">
                    <i class="bi bi-mortarboard-fill me-2 text-amber"></i> Department Rankings
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link px-4 <?= ($active_report_tab == 'tabulation') ? 'active' : '' ?>" id="tabulation-tab" data-bs-toggle="pill" data-bs-target="#tabulation" type="button" role="tab">
                    <i class="bi bi-file-earmark-spreadsheet-fill me-2"></i> Master Tabulation
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link px-4 <?= ($active_report_tab == 'audit') ? 'active' : '' ?>" id="audit-tab" data-bs-toggle="pill" data-bs-target="#audit" type="button" role="tab">
                    <i class="bi bi-shield-check me-2"></i> Score Audit Log
                </button>
            </li>
            <li class="nav-item ms-lg-auto" role="presentation">
                <button class="nav-link px-4 border <?= ($active_report_tab == 'system') ? 'active' : '' ?>" id="system-tab" data-bs-toggle="pill" data-bs-target="#system" type="button" role="tab">
                    <i class="bi bi-server me-2"></i> System Diagnostics & Judges
                </button>
            </li>
        </ul>

        <div class="tab-content" id="reportTabsContent">
            
            <!-- TAB 1: OFFICIAL RANKINGS -->
            <div class="tab-pane fade <?= ($active_report_tab == 'rankings') ? 'show active' : '' ?>" id="rankings" role="tabpanel">
                <div class="card table-card">
                    <div class="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <h5 class="fw-bold text-midnight mb-0 print-hide">
                            <i class="bi bi-award-fill text-amber me-2"></i> 
                            Official Event Rankings: <?= htmlspecialchars($event_name) ?>
                        </h5>
                        <div class="d-flex gap-2 print-hide">
                            <button type="button" class="btn btn-midnight btn-sm rounded-pill fw-bold shadow-sm px-3 py-1.5" onclick="openSignatoryModal('rankings')">
                                <i class="bi bi-file-earmark-pdf-fill text-amber me-1"></i> PDF Export (TCPDF)
                            </button>
                            <button class="btn btn-amber btn-sm rounded-pill fw-bold shadow-sm px-3 py-1.5" id="exportRankExcelBtn">
                                <i class="bi bi-file-earmark-excel-fill me-1"></i> Excel Export
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-body p-0 bg-white" id="printableRankingsArea">
                        
                        <div id="pdfHeaderRank" class="d-none p-4 pb-0 bg-white">
                            <div class="pdf-header">
                                <h2 class="fw-bolder text-midnight mb-1" style="letter-spacing: 1px;">ASTS | Apayao State College</h2>
                                <h4 class="fw-bold text-secondary mb-3">Official Rankings Report</h4>
                                <h5 class="fw-bold text-dark mb-1"><?= htmlspecialchars($event_name) ?></h5>
                                <p class="text-muted fw-semibold mb-0">Event Date: <?= htmlspecialchars($event_date_formatted) ?></p>
                            </div>
                        </div>

                        <div class="table-responsive p-0">
                            <table class="table table-hover align-middle mb-0 table-bordered" id="rankingsTable">
                                <thead class="table-custom-header">
                                    <tr>
                                        <th width="8%" class="text-center">Rank</th>
                                        <th width="12%" class="text-center">Entry Number</th>
                                        <th class="text-start" width="28%">Participant Name</th>
                                        <th class="text-start" width="25%">Department</th>
                                        <th width="10%" class="text-center">Year Level</th>
                                        <th width="17%" class="text-center">Final Average Percentage</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white text-center">
                                    <?php if (count($rankings) > 0): ?>
                                        <?php 
                                        $current_rank = 1;
                                        foreach ($rankings as $row): 
                                            $rank_class = 'rank-other';
                                            $row_class = 'preview-row-rank-other';
                                            if ($current_rank == 1) {
                                                $rank_class = 'rank-1';
                                                $row_class = 'preview-row-rank-1';
                                            } elseif ($current_rank == 2) {
                                                $rank_class = 'rank-2';
                                                $row_class = 'preview-row-rank-2';
                                            } elseif ($current_rank == 3) {
                                                $rank_class = 'rank-3';
                                                $row_class = 'preview-row-rank-3';
                                            }
                                        ?>
                                            <tr class="<?= $row_class ?>">
                                                <td>
                                                    <div class="rank-badge <?= $rank_class ?>"><?= $current_rank ?></div>
                                                </td>
                                                <td>
                                                    <span class="entry-badge">#<?= htmlspecialchars($row['order']) ?></span>
                                                </td>
                                                <td class="text-start fw-bolder text-midnight fs-6">
                                                    <?= htmlspecialchars($row['name']) ?>
                                                    <?= ($current_rank == 1) ? ' <i class="bi bi-star-fill text-amber ms-1"></i>' : '' ?>
                                                </td>
                                                <td class="text-start fw-semibold text-midnight">
                                                    <?= htmlspecialchars($row['course'] ?? 'Not Assigned') ?>
                                                </td>
                                                <td>
                                                    <span class="badge bg-white text-midnight border border-secondary border-opacity-25 px-2.5 py-1 fw-semibold"><?= htmlspecialchars($row['year'] ?: 'N/A') ?></span>
                                                </td>
                                                <td>
                                                    <?php if ($current_rank == 1): ?>
                                                        <span class="score-pill-gold"><?= number_format($row['final_score'], 2) ?>%</span>
                                                    <?php elseif ($current_rank == 2): ?>
                                                        <span class="score-pill-blue"><?= number_format($row['final_score'], 2) ?>%</span>
                                                    <?php elseif ($current_rank == 3): ?>
                                                        <span class="score-pill-light"><?= number_format($row['final_score'], 2) ?>%</span>
                                                    <?php else: ?>
                                                        <span class="score-pill-neutral"><?= number_format($row['final_score'], 2) ?>%</span>
                                                    <?php endif; ?>
                                                </td>
                                            </tr>
                                        <?php 
                                        $current_rank++;
                                        endforeach; 
                                        ?>
                                    <?php else: ?>
                                        <tr><td colspan="6" class="text-center py-5 text-muted"><i class="bi bi-folder-x fs-1 d-block mb-2"></i>No ranking data available.</td></tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: DEPARTMENT RANKINGS REPORT -->
            <div class="tab-pane fade <?= ($active_report_tab == 'dept-rankings') ? 'show active' : '' ?>" id="dept-rankings" role="tabpanel">
                
                <!-- KPI Performance Metric Row -->
                <div class="row g-4 mb-4">
                    <div class="col-sm-6 col-xl-3">
                        <div class="card border-0 shadow-sm rounded-3 p-3 bg-midnight text-white text-center h-100 position-relative overflow-hidden">
                            <i class="bi bi-trophy-fill position-absolute text-amber" style="font-size: 5rem; right: -10px; bottom: -20px; opacity: 0.15;"></i>
                            <span class="badge bg-amber text-midnight px-3 py-1 rounded-pill fw-bold mx-auto mb-2"><i class="bi bi-award-fill me-1"></i> Rank #1 Leader</span>
                            <h4 class="fw-bolder mb-1 text-truncate px-2" title="<?= htmlspecialchars($leading_dept['name'] ?? 'None') ?>">
                                <?= htmlspecialchars($leading_dept['name'] ?? 'No Events') ?>
                            </h4>
                            <p class="mb-0 text-amber fw-bold small">
                                <?= $leading_dept ? $leading_dept['total_events'] . ' Events Created' : 'No Data' ?>
                            </p>
                        </div>
                    </div>
                    <div class="col-sm-6 col-xl-3">
                        <div class="card border-0 shadow-sm rounded-3 p-3 bg-white text-center border-bottom border-4 border-midnight h-100">
                            <h2 class="fw-bolder text-midnight mb-0 display-6"><?= $total_events_overall ?></h2>
                            <p class="mb-0 text-muted fw-semibold small text-uppercase mt-1">Total Events Conducted</p>
                            <span class="badge bg-light text-midnight border border-secondary border-opacity-25 mx-auto mt-2"><?= ($selected_ay === 'all') ? 'All Years' : 'A.Y. ' . htmlspecialchars($selected_ay) ?></span>
                        </div>
                    </div>
                    <div class="col-sm-6 col-xl-3">
                        <div class="card border-0 shadow-sm rounded-3 p-3 bg-white text-center border-bottom border-4 border-primary h-100">
                            <h2 class="fw-bolder text-midnight mb-0 display-6"><?= $active_depts_count ?></h2>
                            <p class="mb-0 text-muted fw-semibold small text-uppercase mt-1">Active Departments</p>
                            <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 mx-auto mt-2">Participating Units</span>
                        </div>
                    </div>
                    <div class="col-sm-6 col-xl-3">
                        <div class="card border-0 shadow-sm rounded-3 p-3 bg-white text-center border-bottom border-4 border-amber h-100">
                            <h2 class="fw-bolder text-midnight mb-0 display-6"><?= htmlspecialchars($top_category_name ?: 'None') ?></h2>
                            <p class="mb-0 text-muted fw-semibold small text-uppercase mt-1">Top Event Category</p>
                            <span class="badge bg-warning bg-opacity-25 text-dark border border-warning border-opacity-50 mx-auto mt-2"><?= $top_category_count ?> Events Conducted</span>
                        </div>
                    </div>
                </div>

                <!-- Visual Chart Breakdown -->
                <div class="card border-0 shadow-sm rounded-3 mb-4 print-hide">
                    <div class="card-header bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                        <h6 class="fw-bold text-midnight mb-0">
                            <i class="bi bi-bar-chart-fill text-amber me-2"></i> Department Production Comparison (<?= ($selected_ay === 'all') ? 'All Academic Years' : 'A.Y. ' . htmlspecialchars($selected_ay) ?>)
                        </h6>
                    </div>
                    <div class="card-body p-4">
                        <div style="position: relative; height: 260px; width: 100%;">
                            <canvas id="deptRankingsChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Main Ranked Table Card -->
                <div class="card table-card">
                    <div class="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <div>
                            <h5 class="fw-bold text-midnight mb-1 print-hide">
                                <i class="bi bi-mortarboard-fill text-amber me-2"></i> 
                                Department Rankings Report
                            </h5>
                            <div class="text-muted small fw-semibold">
                                Summarizes rankings of all collegiate departments by total events created and conducted
                            </div>
                        </div>

                        <!-- Academic Year Filter & Export Actions -->
                        <div class="d-flex align-items-center gap-2 print-hide flex-wrap">
                            <form action="reports.php" method="GET" class="d-flex align-items-center gap-2 m-0">
                                <input type="hidden" name="tab" value="dept-rankings">
                                <?php if($selected_event_id): ?>
                                    <input type="hidden" name="event_id" value="<?= $selected_event_id ?>">
                                <?php endif; ?>
                                <label class="fw-bold text-midnight small mb-0 text-nowrap"><i class="bi bi-filter me-1 text-amber"></i>Academic Year:</label>
                                <select name="academic_year" class="form-select form-select-sm border-midnight fw-bold shadow-sm" onchange="this.form.submit()" style="border-radius: 8px; min-width: 160px;">
                                    <?php foreach($available_ays as $ay_opt): ?>
                                        <option value="<?= htmlspecialchars($ay_opt) ?>" <?= ($selected_ay == $ay_opt) ? 'selected' : '' ?>>
                                            A.Y. <?= htmlspecialchars($ay_opt) ?>
                                        </option>
                                    <?php endforeach; ?>
                                    <option value="all" <?= ($selected_ay === 'all') ? 'selected' : '' ?>>All Academic Years</option>
                                </select>
                            </form>

                            <button type="button" class="btn btn-midnight btn-sm rounded-pill fw-bold shadow-sm px-3 py-1.5" onclick="openSignatoryModal('dept_rankings')">
                                <i class="bi bi-file-earmark-pdf-fill text-amber me-1"></i> PDF Export (TCPDF)
                            </button>
                            <button class="btn btn-amber btn-sm rounded-pill fw-bold shadow-sm px-3 py-1.5" id="exportDeptExcelBtn">
                                <i class="bi bi-file-earmark-excel-fill me-1"></i> Excel Export
                            </button>
                            <button class="btn btn-outline-midnight btn-sm rounded-pill fw-bold px-3 py-1.5" onclick="window.print()">
                                <i class="bi bi-printer-fill me-1"></i> Print
                            </button>
                        </div>
                    </div>

                    <div class="card-body p-0 bg-white" id="printableDeptArea">
                        
                        <div id="pdfHeaderDept" class="d-none p-4 pb-0 bg-white">
                            <div class="pdf-header text-center">
                                <h2 class="fw-bolder text-midnight mb-1" style="letter-spacing: 1px;">APAYAO STATE COLLEGE</h2>
                                <h4 class="fw-bold text-secondary mb-2">Automated Scoring &amp; Tabulation System (ASTS)</h4>
                                <h5 class="fw-bold text-dark mb-1">DEPARTMENT RANKINGS &amp; EVENT PRODUCTION REPORT</h5>
                                <p class="text-muted fw-semibold mb-0">Academic Year: <?= ($selected_ay === 'all') ? 'All Academic Years' : 'A.Y. ' . htmlspecialchars($selected_ay) ?> | Generated on: <?= date('F d, Y h:i A') ?></p>
                            </div>
                        </div>

                        <div class="table-responsive p-0">
                            <table class="table table-hover align-middle mb-0 table-bordered" id="deptRankingsTable">
                                <thead class="table-custom-header">
                                    <tr>
                                        <th width="8%" class="text-center">Rank</th>
                                        <th width="32%" class="text-start ps-4">Department / Collegiate Unit</th>
                                        <th width="15%" class="text-center">Events Created</th>
                                        <th width="13%" class="text-center">Status Split</th>
                                        <th width="20%" class="text-center">Event Categories</th>
                                        <th width="12%" class="text-center pe-4">Share of Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if(count($dept_rankings) > 0): ?>
                                        <?php 
                                        $cur_rank = 1;
                                        foreach($dept_rankings as $dept): 
                                            // Skip 0 events when filtering by specific A.Y. unless requested
                                            if($dept['total_events'] == 0 && $selected_ay !== 'all') continue;
                                            
                                            $badge_class = 'rank-other';
                                            $dept_row_class = 'preview-row-rank-other';
                                            if ($cur_rank == 1 && $dept['total_events'] > 0) {
                                                $badge_class = 'rank-1';
                                                $dept_row_class = 'preview-row-rank-1';
                                            } elseif ($cur_rank == 2 && $dept['total_events'] > 0) {
                                                $badge_class = 'rank-2';
                                                $dept_row_class = 'preview-row-rank-2';
                                            } elseif ($cur_rank == 3 && $dept['total_events'] > 0) {
                                                $badge_class = 'rank-3';
                                                $dept_row_class = 'preview-row-rank-3';
                                            }

                                            $share_pct = $total_events_overall > 0 ? round(($dept['total_events'] / $total_events_overall) * 100, 1) : 0;
                                        ?>
                                            <tr class="<?= $dept_row_class ?>">
                                                <td class="text-center">
                                                    <span class="rank-badge <?= $badge_class ?>">
                                                        <?= ($dept['total_events'] > 0) ? $cur_rank : '-' ?>
                                                    </span>
                                                </td>
                                                <td class="ps-4">
                                                    <div class="fw-bold text-midnight fs-6"><?= htmlspecialchars($dept['name']) ?></div>
                                                    <div class="d-flex align-items-center gap-2 mt-1">
                                                        <?php if(!empty($dept['code'])): ?>
                                                            <span class="badge bg-midnight text-amber border border-secondary border-opacity-25" style="font-size: 0.72rem;"><?= htmlspecialchars($dept['code']) ?></span>
                                                        <?php endif; ?>
                                                        <span class="text-muted small"><i class="bi bi-people-fill text-secondary me-1"></i><?= $dept['total_candidates'] ?> Participants</span>
                                                        <?php if($dept['total_events'] > 0): ?>
                                                            <button type="button" class="btn btn-link btn-sm p-0 text-primary fw-semibold small text-decoration-none view-dept-events-btn" 
                                                                    data-dept="<?= htmlspecialchars($dept['name']) ?>" 
                                                                    data-events="<?= htmlspecialchars(json_encode($dept['events'])) ?>">
                                                                <i class="bi bi-eye-fill me-1"></i>View Events (<?= $dept['total_events'] ?>)
                                                            </button>
                                                        <?php endif; ?>
                                                    </div>
                                                </td>
                                                <td class="text-center">
                                                    <span class="badge bg-light text-midnight border fs-6 fw-bold px-3 py-2 shadow-sm">
                                                        <i class="bi bi-calendar-check-fill text-amber me-1"></i><?= $dept['total_events'] ?> <?= ($dept['total_events'] == 1) ? 'Event' : 'Events' ?>
                                                    </span>
                                                </td>
                                                <td class="text-center">
                                                    <div class="d-flex flex-column align-items-center gap-1">
                                                        <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 small fw-bold">
                                                            <i class="bi bi-check2-circle me-1"></i><?= $dept['completed_events'] ?> Completed
                                                        </span>
                                                        <?php if(($dept['ongoing_events'] + $dept['upcoming_events']) > 0): ?>
                                                            <span class="badge bg-warning bg-opacity-25 text-dark border border-warning border-opacity-50 px-2.5 py-1 small fw-bold">
                                                                <i class="bi bi-hourglass-split text-amber me-1"></i><?= ($dept['ongoing_events'] + $dept['upcoming_events']) ?> Active / Upcoming
                                                            </span>
                                                        <?php endif; ?>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-wrap justify-content-center gap-1">
                                                        <?php if($dept['pageant_count'] > 0): ?>
                                                            <span class="badge badge-gold"><i class="bi bi-stars me-1 text-dark"></i>Pageant: <?= $dept['pageant_count'] ?></span>
                                                        <?php endif; ?>
                                                        <?php if($dept['cultural_count'] > 0): ?>
                                                            <span class="badge badge-royal"><i class="bi bi-music-note-beamed me-1"></i>Cultural: <?= $dept['cultural_count'] ?></span>
                                                        <?php endif; ?>
                                                        <?php if($dept['sports_count'] > 0): ?>
                                                            <span class="badge badge-navy"><i class="bi bi-trophy-fill text-amber me-1"></i>Sports: <?= $dept['sports_count'] ?></span>
                                                        <?php endif; ?>
                                                        <?php if($dept['academic_count'] > 0): ?>
                                                            <span class="badge badge-cobalt"><i class="bi bi-book-fill me-1"></i>Academic: <?= $dept['academic_count'] ?></span>
                                                        <?php endif; ?>
                                                        <?php if($dept['literary_count'] > 0): ?>
                                                            <span class="badge badge-sky"><i class="bi bi-journal-text me-1"></i>Literary: <?= $dept['literary_count'] ?></span>
                                                        <?php endif; ?>
                                                        <?php if($dept['total_events'] == 0): ?>
                                                            <span class="text-muted small">No active categories</span>
                                                        <?php endif; ?>
                                                    </div>
                                                </td>
                                                <td class="text-center pe-4">
                                                    <div class="fw-bold text-midnight mb-1"><?= $share_pct ?>%</div>
                                                    <div class="progress" style="height: 7px; border-radius: 6px; background-color: #E2E8F0;">
                                                        <div class="progress-bar bg-amber" role="progressbar" style="width: <?= $share_pct ?>%;" aria-valuenow="<?= $share_pct ?>" aria-valuemin="0" aria-valuemax="100"></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        <?php 
                                            if($dept['total_events'] > 0) $cur_rank++;
                                        endforeach; 
                                        ?>
                                    <?php else: ?>
                                        <tr>
                                            <td colspan="6" class="text-center py-5 text-muted">
                                                <i class="bi bi-calendar-x fs-1 d-block mb-2 text-secondary"></i>
                                                No department event records found for <?= ($selected_ay === 'all') ? 'the selected filter' : 'Academic Year ' . htmlspecialchars($selected_ay) ?>.
                                            </td>
                                        </tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: MASTER TABULATION -->
            <div class="tab-pane fade" id="tabulation" role="tabpanel">
                <div class="card table-card">
                    <div class="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <h5 class="fw-bold text-midnight mb-0 print-hide">
                            <i class="bi bi-file-earmark-spreadsheet-fill text-amber me-2"></i> 
                            Detailed Master Tabulation: <?= htmlspecialchars($event_name) ?>
                        </h5>
                        <div class="d-flex gap-2 print-hide">
                            <button type="button" class="btn btn-midnight btn-sm rounded-pill fw-bold shadow-sm px-3 py-1.5" onclick="openSignatoryModal('tabulation')">
                                <i class="bi bi-file-earmark-pdf-fill text-amber me-1"></i> PDF Export (TCPDF)
                            </button>
                            <button class="btn btn-amber btn-sm rounded-pill fw-bold shadow-sm px-3 py-1.5" id="exportTabExcelBtn">
                                <i class="bi bi-file-earmark-excel-fill me-1"></i> Excel Export
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-body p-0 bg-white" id="printableTabulationArea">
                        
                        <div id="pdfHeaderTab" class="d-none p-4 pb-0 bg-white">
                            <div class="pdf-header">
                                <h2 class="fw-bolder text-midnight mb-1" style="letter-spacing: 1px;">ASTS | Apayao State College</h2>
                                <h4 class="fw-bold text-secondary mb-3">Master Tabulation Breakdown</h4>
                                <h5 class="fw-bold text-dark mb-1"><?= htmlspecialchars($event_name) ?></h5>
                                <p class="text-muted fw-semibold mb-0">Event Date: <?= htmlspecialchars($event_date_formatted) ?></p>
                            </div>
                        </div>

                        <div class="table-responsive p-0">
                            <table class="table table-hover align-middle mb-0 table-bordered" id="tabulationTable">
                                <thead class="table-custom-header">
                                    <tr>
                                        <th width="8%">Rank</th>
                                        <th width="7%">No.</th>
                                        <th class="text-start">Candidate</th>
                                        <?php foreach($judge_headers as $j_name): ?>
                                            <th><?= htmlspecialchars($j_name) ?></th>
                                        <?php endforeach; ?>
                                        <th class="bg-amber text-midnight fw-bolder">Final Average</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white text-center">
                                    <?php if (count($rankings) > 0): ?>
                                        <?php 
                                        $current_rank = 1;
                                        foreach ($rankings as $row): 
                                            $tab_badge_class = 'rank-other';
                                            $tab_row_class = 'preview-row-rank-other';
                                            if ($current_rank == 1) {
                                                $tab_badge_class = 'rank-1';
                                                $tab_row_class = 'preview-row-rank-1';
                                            } elseif ($current_rank == 2) {
                                                $tab_badge_class = 'rank-2';
                                                $tab_row_class = 'preview-row-rank-2';
                                            } elseif ($current_rank == 3) {
                                                $tab_badge_class = 'rank-3';
                                                $tab_row_class = 'preview-row-rank-3';
                                            }
                                        ?>
                                            <tr class="<?= $tab_row_class ?>">
                                                <td>
                                                    <div class="rank-badge <?= $tab_badge_class ?>"><?= $current_rank ?></div>
                                                </td>
                                                <td>
                                                    <span class="entry-badge">#<?= htmlspecialchars($row['order']) ?></span>
                                                </td>
                                                <td class="text-start fw-bold text-midnight">
                                                    <?= htmlspecialchars($row['name']) ?>
                                                    <?= ($current_rank == 1) ? ' <i class="bi bi-star-fill text-amber ms-1"></i>' : '' ?>
                                                </td>
                                                
                                                <?php foreach($judge_headers as $judge_id => $j_name): ?>
                                                    <td class="score-highlight text-muted" style="font-size: 0.95rem;">
                                                        <?= number_format($row['judge_totals'][$judge_id], 2) ?>%
                                                    </td>
                                                <?php endforeach; ?>
                                                
                                                <td>
                                                    <?php if ($current_rank == 1): ?>
                                                        <span class="score-pill-gold"><?= number_format($row['final_score'], 2) ?>%</span>
                                                    <?php elseif ($current_rank == 2): ?>
                                                        <span class="score-pill-blue"><?= number_format($row['final_score'], 2) ?>%</span>
                                                    <?php elseif ($current_rank == 3): ?>
                                                        <span class="score-pill-light"><?= number_format($row['final_score'], 2) ?>%</span>
                                                    <?php else: ?>
                                                        <span class="score-pill-neutral"><?= number_format($row['final_score'], 2) ?>%</span>
                                                    <?php endif; ?>
                                                </td>
                                            </tr>
                                        <?php 
                                        $current_rank++;
                                        endforeach; 
                                        ?>
                                    <?php else: ?>
                                        <tr><td colspan="<?= count($judge_headers) + 3 ?>" class="text-center py-5 text-muted"><i class="bi bi-folder-x fs-1 d-block mb-2"></i>No tabulation data available.</td></tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 3: AUDIT LOG -->
            <div class="tab-pane fade" id="audit" role="tabpanel">
                <div class="card table-card">
                    <div class="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <h5 class="fw-bold text-midnight mb-0 print-hide">
                            <i class="bi bi-shield-check text-amber me-2"></i> 
                            Raw Audit Log: <?= htmlspecialchars($event_name) ?>
                        </h5>
                        <div class="d-flex gap-2 print-hide">
                            <a href="reports.php?export_pdf=audit&event_id=<?= $selected_event_id ?>" target="_blank" class="btn btn-midnight btn-sm rounded-pill fw-bold shadow-sm px-3 py-1.5">
                                <i class="bi bi-file-earmark-pdf-fill text-amber me-1"></i> PDF Log (TCPDF)
                            </a>
                            <button class="btn btn-amber btn-sm rounded-pill fw-bold shadow-sm px-3 py-1.5" id="exportAuditExcelBtn">
                                <i class="bi bi-file-earmark-excel-fill me-1"></i> Excel Log
                            </button>
                        </div>
                    </div>

                    <div class="card-body p-0 bg-white" id="printableAuditArea">
                        
                        <div id="pdfHeaderAudit" class="d-none p-4 pb-0 bg-white">
                            <div class="pdf-header">
                                <h2 class="fw-bolder text-midnight mb-1" style="letter-spacing: 1px;">ASTS | Apayao State College</h2>
                                <h4 class="fw-bold text-secondary mb-3">Score Audit Log</h4>
                                <h5 class="fw-bold text-dark mb-1"><?= htmlspecialchars($event_name) ?></h5>
                                <p class="text-muted fw-semibold mb-0">Event Date: <?= htmlspecialchars($event_date_formatted) ?></p>
                            </div>
                        </div>

                        <div class="table-responsive p-0">
                            <table class="table table-hover align-middle mb-0" id="auditTable">
                                <thead class="table-custom-header">
                                    <tr>
                                        <th class="text-start px-4">Candidate Entry</th>
                                        <th class="text-start">Assigned Judge</th>
                                        <th class="text-end px-4">Total Raw Score</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white">
                                    <?php if (count($audit_log) > 0): ?>
                                        <?php foreach ($audit_log as $log): ?>
                                             <tr>
                                                <td class="px-4">
                                                    <span class="entry-badge me-1">#<?= htmlspecialchars($log['order_number']) ?></span>
                                                    <span class="fw-bold text-midnight fs-6"><?= htmlspecialchars($log['candidate_name']) ?></span>
                                                </td>
                                                <td class="small fw-semibold text-midnight">
                                                    <?= htmlspecialchars($log['judge_name']) ?>
                                                </td>
                                                <td class="text-end px-4">
                                                    <span class="score-highlight text-midnight fs-6 fw-bold">
                                                        <?= number_format($log['total_score'], 2) ?> 
                                                    </span>
                                                    <span class="text-muted small">/ <?= number_format($log['total_max'], 0) ?></span>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <tr><td colspan="3" class="text-center py-5 text-muted"><i class="bi bi-journal-x fs-1 d-block mb-2"></i>No scoring data available to audit.</td></tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 4: SYSTEM OVERVIEW & JUDGES -->
            <div class="tab-pane fade" id="system" role="tabpanel">
                
                <div class="row g-4 mb-4">
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm rounded-3 p-3 bg-midnight text-white text-center">
                            <h2 class="fw-bolder mb-0 display-6"><?= $stat_total_judges ?></h2>
                            <p class="mb-0 text-amber fw-semibold small">Registered Judges</p>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm rounded-3 p-3 bg-white text-center border-bottom border-4 border-primary">
                            <h2 class="fw-bolder text-primary mb-0 display-6"><?= $stat_approved ?></h2>
                            <p class="mb-0 text-muted fw-semibold small">Approved Evaluators</p>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm rounded-3 p-3 bg-white text-center border-bottom border-4 border-amber">
                            <h2 class="fw-bolder text-midnight mb-0 display-6"><?= $stat_pending ?></h2>
                            <p class="mb-0 text-muted fw-semibold small">Pending Approvals</p>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm rounded-3 p-3 bg-white text-center border-bottom border-4 border-midnight">
                            <h2 class="fw-bolder text-midnight mb-0 display-6"><?= $stat_events ?></h2>
                            <p class="mb-0 text-muted fw-semibold small">Total Events Tracked</p>
                        </div>
                    </div>
                </div>

                <div class="card table-card">
                    <div class="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <h5 class="fw-bold text-midnight mb-0 print-hide">
                            <i class="bi bi-server text-amber me-2"></i> 
                            System Diagnostics: Judge Registry
                        </h5>
                        <div class="d-flex gap-2 print-hide">
                            <a href="reports.php?export_pdf=system" target="_blank" class="btn btn-midnight btn-sm rounded-pill fw-bold shadow-sm px-3 py-1.5">
                                <i class="bi bi-file-earmark-pdf-fill text-amber me-1"></i> PDF (TCPDF)
                            </a>
                            <button class="btn btn-amber btn-sm rounded-pill fw-bold shadow-sm px-3 py-1.5" id="exportSystemExcelBtn">
                                <i class="bi bi-file-earmark-excel-fill me-1"></i> Excel
                            </button>
                        </div>
                    </div>

                    <div class="card-body p-0 bg-white" id="printableSystemArea">
                        
                        <div id="pdfHeaderSystem" class="d-none p-4 pb-0 bg-white">
                            <div class="pdf-header">
                                <h2 class="fw-bolder text-midnight mb-1" style="letter-spacing: 1px;">ASTS | Apayao State College</h2>
                                <h4 class="fw-bold text-secondary mb-3">System Diagnostics: Judge Registry</h4>
                                <p class="text-muted small mt-2">Generated on: <?= date('F d, Y \a\t h:i A') ?></p>
                            </div>
                        </div>

                        <div class="table-responsive p-0">
                            <table class="table table-hover align-middle mb-0" id="systemTable">
                                <thead class="table-custom-header">
                                    <tr>
                                        <th class="text-center" width="10%">Sys ID</th>
                                        <th class="text-start px-4">Full Name</th>
                                        <th>System Username</th>
                                        <th class="text-center">Account Status</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white">
                                    <?php if (count($sys_judges) > 0): ?>
                                        <?php foreach ($sys_judges as $sj): ?>
                                            <tr>
                                                <td class="text-center">
                                                    <span class="badge bg-midnight bg-opacity-10 text-midnight border border-midnight border-opacity-25 px-2.5 py-1 fw-bold fs-6">#<?= htmlspecialchars($sj['id']) ?></span>
                                                </td>
                                                <td class="px-4 fw-bold text-midnight fs-6">
                                                    <?= htmlspecialchars($sj['full_name']) ?>
                                                </td>
                                                <td class="small fw-semibold text-midnight">
                                                    @<?= htmlspecialchars($sj['username']) ?>
                                                </td>
                                                <td class="text-center fw-bold">
                                                    <?= getReportBadge($sj['approval_status']) ?>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <tr><td colspan="4" class="text-center py-5 text-muted">No judges registered in the system.</td></tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>

    <!-- ========================================== -->
    <!-- CUSTOMIZE SIGNATORIES & PDF EXPORT MODAL   -->
    <!-- ========================================== -->
    <div class="modal fade" id="customizeSignatoriesModal" tabindex="-1" aria-labelledby="customizeSignatoriesModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
                <form action="reports.php" method="GET" target="_blank">
                    <input type="hidden" name="export_pdf" id="modalExportType" value="rankings">
                    <input type="hidden" name="event_id" value="<?= $selected_event_id ?>">
                    <input type="hidden" name="academic_year" value="<?= htmlspecialchars($selected_ay) ?>">

                    <div class="modal-header bg-midnight text-white py-3 px-4">
                        <div class="d-flex align-items-center">
                            <div class="bg-amber text-midnight rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                                <i class="bi bi-pen-fill fs-5"></i>
                            </div>
                            <div>
                                <h5 class="modal-title fw-bold mb-0" id="customizeSignatoriesModalLabel">Customize Report Signatories</h5>
                                <small class="text-white-50">Report: <span id="modalReportLabel" class="text-amber fw-bold">Official Event Rankings</span></small>
                            </div>
                        </div>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>

                    <div class="modal-body p-4 bg-light">
                        <div class="alert alert-info py-2 px-3 small d-flex align-items-center mb-4 rounded-3 border-0 shadow-sm" style="background-color: #E7F1FF; color: #0C4160;">
                            <i class="bi bi-info-circle-fill me-2 fs-5 text-primary"></i>
                            <div>Edit the names, titles, and designation text that appear at the bottom signature section of the PDF.</div>
                        </div>

                        <div class="row g-3">
                            <!-- Left: Official Tabulator -->
                            <div class="col-md-6">
                                <div class="card h-100 border-0 shadow-sm rounded-3 p-3 bg-white">
                                    <div class="d-flex align-items-center mb-3">
                                        <span class="badge bg-midnight text-amber me-2 px-2 py-1"><i class="bi bi-1-circle me-1"></i> Left Signatory</span>
                                        <h6 class="fw-bold text-midnight mb-0">Tabulator / Scorer</h6>
                                    </div>

                                    <div class="mb-2">
                                        <label class="form-label small fw-bold text-muted mb-1">Printed Name (Optional)</label>
                                        <input type="text" name="tabulator_name" class="form-control form-control-sm" placeholder="e.g. JUAN DELA CRUZ" value="<?= htmlspecialchars($def_tabulator_name) ?>">
                                        <div class="form-text" style="font-size: 0.75rem;">Leave empty to show signature line only.</div>
                                    </div>

                                    <div class="mb-2">
                                        <label class="form-label small fw-bold text-muted mb-1">Title / Designation <span class="text-danger">*</span></label>
                                        <input type="text" name="tabulator_title" class="form-control form-control-sm fw-bold" placeholder="e.g. OFFICIAL TABULATOR" value="<?= htmlspecialchars($def_tabulator_title) ?>" required>
                                    </div>

                                    <div>
                                        <label class="form-label small fw-bold text-muted mb-1">Department / Organization</label>
                                        <input type="text" name="tabulator_sub" class="form-control form-control-sm" placeholder="e.g. ASTS Tabulation Committee" value="<?= htmlspecialchars($def_tabulator_sub) ?>">
                                    </div>
                                </div>
                            </div>

                            <!-- Right: Chief Judge / Chairman -->
                            <div class="col-md-6">
                                <div class="card h-100 border-0 shadow-sm rounded-3 p-3 bg-white">
                                    <div class="d-flex align-items-center mb-3">
                                        <span class="badge bg-midnight text-amber me-2 px-2 py-1"><i class="bi bi-2-circle me-1"></i> Right Signatory</span>
                                        <h6 class="fw-bold text-midnight mb-0">Chief Judge / Chairman</h6>
                                    </div>

                                    <div class="mb-2">
                                        <label class="form-label small fw-bold text-muted mb-1">Printed Name (Optional)</label>
                                        <input type="text" name="chairman_name" class="form-control form-control-sm" placeholder="e.g. DR. MARIA SANTOS" value="<?= htmlspecialchars($def_chairman_name) ?>">
                                        <div class="form-text" style="font-size: 0.75rem;">Leave empty to show signature line only.</div>
                                    </div>

                                    <div class="mb-2">
                                        <label class="form-label small fw-bold text-muted mb-1">Title / Designation <span class="text-danger">*</span></label>
                                        <input type="text" name="chairman_title" class="form-control form-control-sm fw-bold" placeholder="e.g. CHIEF JUDGE / CHAIRMAN" value="<?= htmlspecialchars($def_chairman_title) ?>" required>
                                    </div>

                                    <div>
                                        <label class="form-label small fw-bold text-muted mb-1">Department / Organization</label>
                                        <input type="text" name="chairman_sub" class="form-control form-control-sm" placeholder="e.g. Executive Committee" value="<?= htmlspecialchars($def_chairman_sub) ?>">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 3rd Signatory / Noted by Section -->
                        <div class="card border-0 shadow-sm rounded-3 p-3 bg-white mt-3">
                            <div class="form-check form-switch mb-2">
                                <input class="form-check-input" type="checkbox" role="switch" id="showNotedToggle" name="show_noted" value="1" <?= $def_show_noted ? 'checked' : '' ?> onchange="toggleNotedFields(this.checked)">
                                <label class="form-check-label fw-bold text-midnight" for="showNotedToggle">
                                    <i class="bi bi-patch-check-fill text-amber me-1"></i> Include 3rd Approver / Noted by (e.g. College President, Campus Dean)
                                </label>
                            </div>

                            <div id="notedFieldsSection" class="<?= $def_show_noted ? '' : 'd-none' ?> pt-2 border-top mt-2">
                                <div class="row g-2">
                                    <div class="col-md-4">
                                        <label class="form-label small fw-bold text-muted mb-1">Approver Name</label>
                                        <input type="text" name="noted_name" class="form-control form-control-sm" placeholder="e.g. DR. JOHN DOE" value="<?= htmlspecialchars($def_noted_name) ?>">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label small fw-bold text-muted mb-1">Title / Role</label>
                                        <input type="text" name="noted_title" class="form-control form-control-sm" placeholder="e.g. College President" value="<?= htmlspecialchars($def_noted_title) ?>">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label small fw-bold text-muted mb-1">Institution / Subtitle</label>
                                        <input type="text" name="noted_sub" class="form-control form-control-sm" placeholder="e.g. Apayao State College" value="<?= htmlspecialchars($def_noted_sub) ?>">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Save as Default Checkbox -->
                        <div class="mt-3 form-check">
                            <input class="form-check-input" type="checkbox" name="save_defaults" value="1" id="saveDefaultsCheck" checked>
                            <label class="form-check-label small text-muted fw-semibold" for="saveDefaultsCheck">
                                <i class="bi bi-floppy me-1"></i> Save these signatory names and titles as system defaults for future PDF reports
                            </label>
                        </div>
                    </div>

                    <div class="modal-footer bg-white border-top py-3 px-4 d-flex justify-content-between">
                        <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-midnight rounded-pill px-4 fw-bold shadow-sm" onclick="setTimeout(() => { bootstrap.Modal.getInstance(document.getElementById('customizeSignatoriesModal')).hide(); }, 600);">
                            <i class="bi bi-file-earmark-pdf-fill text-amber me-1"></i> Generate &amp; Open PDF
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal: View Department Conducted Events -->
    <div class="modal fade" id="deptEventsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
                <div class="modal-header bg-midnight text-white py-3 px-4">
                    <div class="d-flex align-items-center">
                        <div class="bg-amber text-midnight rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                            <i class="bi bi-mortarboard-fill fs-5"></i>
                        </div>
                        <div>
                            <h5 class="modal-title fw-bold mb-0" id="modalDeptName">Department Events</h5>
                            <small class="text-white-50">Conducted Events Breakdown | <span id="modalDeptCount" class="text-amber fw-bold"></span></small>
                        </div>
                    </div>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="list-group list-group-flush" id="modalDeptEventsList" style="max-height: 400px; overflow-y: auto;">
                        <!-- Dynamically populated -->
                    </div>
                </div>
                <div class="modal-footer bg-light border-0 py-2 px-4">
                    <button type="button" class="btn btn-secondary rounded-pill px-4 btn-sm fw-semibold" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        // --- Helper function for Signatory Modal ---
        function openSignatoryModal(type) {
            document.getElementById('modalExportType').value = type;
            const labels = {
                'rankings': 'Official Event Rankings',
                'tabulation': 'Master Tabulation Breakdown',
                'audit': 'Score Audit Log',
                'system': 'Judges Directory',
                'dept_rankings': 'Department Rankings Report'
            };
            document.getElementById('modalReportLabel').textContent = labels[type] || 'Official Report';
            const modal = new bootstrap.Modal(document.getElementById('customizeSignatoriesModal'));
            modal.show();
        }

        function toggleNotedFields(isChecked) {
            const section = document.getElementById('notedFieldsSection');
            if (isChecked) {
                section.classList.remove('d-none');
            } else {
                section.classList.add('d-none');
            }
        }

        // --- Helper function for Excel Export ---
        function exportExcel(tableId, sheetName, fileName) {
            const table = document.getElementById(tableId);
            const wb = XLSX.utils.table_to_book(table, {sheet: sheetName});
            XLSX.writeFile(wb, fileName);
        }

        const safeEventName = '<?= preg_replace('/[^A-Za-z0-9]/', '_', $event_name) ?>';
        const dateStr = '<?= date('Ymd') ?>';
        const selectedAyStr = '<?= preg_replace('/[^A-Za-z0-9]/', '_', $selected_ay) ?>';

        // --- EXCEL EXPORTS ---
        const exportRankExcelBtn = document.getElementById('exportRankExcelBtn');
        if (exportRankExcelBtn) {
            exportRankExcelBtn.addEventListener('click', () => {
                const rankingsData = <?= json_encode($rankings) ?>;
                const wsData = [
                    ['Rank', 'Entry Number', 'Participant Name', 'Department', 'Year Level', 'Final Average Percentage']
                ];
                rankingsData.forEach((row, idx) => {
                    wsData.push([
                        idx + 1,
                        row.order ? '#' + row.order : '',
                        row.name || '',
                        row.course || 'Not Assigned',
                        row.year || 'N/A',
                        parseFloat(row.final_score).toFixed(2) + '%'
                    ]);
                });
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws['!cols'] = [
                    { wch: 8 },  // Rank
                    { wch: 15 }, // Entry Number
                    { wch: 30 }, // Participant Name
                    { wch: 40 }, // Department
                    { wch: 15 }, // Year Level
                    { wch: 25 }  // Final Average Percentage
                ];
                XLSX.utils.book_append_sheet(wb, ws, 'Official Rankings');
                XLSX.writeFile(wb, `ASTS_Rankings_${safeEventName}.xlsx`);
            });
        }

        const exportDeptExcelBtn = document.getElementById('exportDeptExcelBtn');
        if (exportDeptExcelBtn) {
            exportDeptExcelBtn.addEventListener('click', () => 
                exportExcel('deptRankingsTable', 'Department Rankings', `ASTS_Department_Rankings_AY_${selectedAyStr}.xlsx`));
        }

        const exportTabExcelBtn = document.getElementById('exportTabExcelBtn');
        if (exportTabExcelBtn) {
            exportTabExcelBtn.addEventListener('click', () => 
                exportExcel('tabulationTable', 'Master Tabulation', `ASTS_Tabulation_${safeEventName}.xlsx`));
        }

        const exportAuditExcelBtn = document.getElementById('exportAuditExcelBtn');
        if (exportAuditExcelBtn) {
            exportAuditExcelBtn.addEventListener('click', () => 
                exportExcel('auditTable', 'Audit Log', `ASTS_AuditLog_${safeEventName}.xlsx`));
        }

        const exportSystemExcelBtn = document.getElementById('exportSystemExcelBtn');
        if (exportSystemExcelBtn) {
            exportSystemExcelBtn.addEventListener('click', () => 
                exportExcel('systemTable', 'Registered Judges', `ASTS_JudgesRegistry_${dateStr}.xlsx`));
        }

        // --- DEPARTMENT EVENTS MODAL VIEWER ---
        document.querySelectorAll('.view-dept-events-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const deptName = this.getAttribute('data-dept');
                const events = JSON.parse(this.getAttribute('data-events') || '[]');
                
                document.getElementById('modalDeptName').textContent = deptName;
                document.getElementById('modalDeptCount').textContent = events.length + (events.length === 1 ? ' Event' : ' Events');
                
                const listEl = document.getElementById('modalDeptEventsList');
                listEl.innerHTML = '';
                
                if (events.length > 0) {
                    events.forEach(ev => {
                        let statusBadge = '<span class="badge bg-secondary">Upcoming</span>';
                        if (ev.status === 'Completed') statusBadge = '<span class="badge bg-success">Completed</span>';
                        else if (ev.status === 'Ongoing') statusBadge = '<span class="badge bg-info text-dark">Ongoing</span>';
                        
                        listEl.innerHTML += `
                            <div class="list-group-item d-flex justify-content-between align-items-center p-3">
                                <div>
                                    <div class="fw-bold text-midnight fs-6">${ev.name}</div>
                                    <div class="small text-muted mt-1">
                                        <span class="badge bg-light text-dark border me-1">${ev.type}</span>
                                        <i class="bi bi-calendar-event me-1"></i>${ev.start_date} ${ev.end_date !== ev.start_date ? 'to ' + ev.end_date : ''}
                                        <span class="ms-2"><i class="bi bi-person me-1"></i>Organizer: ${ev.organizer || 'N/A'}</span>
                                    </div>
                                </div>
                                <div class="text-end">
                                    ${statusBadge}
                                    <div class="small text-muted mt-1">${ev.candidate_count || 0} Participants</div>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    listEl.innerHTML = '<div class="text-center py-4 text-muted">No specific events recorded.</div>';
                }
                
                const deptModal = new bootstrap.Modal(document.getElementById('deptEventsModal'));
                deptModal.show();
            });
        });

        // --- CHART.JS: DEPARTMENT RANKINGS BAR CHART ---
        const deptChartCanvas = document.getElementById('deptRankingsChart');
        if (deptChartCanvas) {
            const deptLabels = <?= json_encode(array_map(fn($d) => !empty($d['code']) ? $d['code'] : (strlen($d['name']) > 22 ? substr($d['name'], 0, 20) . '...' : $d['name']), array_filter($dept_rankings, fn($d) => $d['total_events'] > 0))) ?>;
            const deptCounts = <?= json_encode(array_values(array_map(fn($d) => (int)$d['total_events'], array_filter($dept_rankings, fn($d) => $d['total_events'] > 0)))) ?>;
            
            new Chart(deptChartCanvas, {
                type: 'bar',
                data: {
                    labels: deptLabels.length > 0 ? deptLabels : ['No active events'],
                    datasets: [{
                        label: 'Events Conducted',
                        data: deptCounts.length > 0 ? deptCounts : [0],
                        backgroundColor: '#FFBF00',
                        borderColor: '#0A192F',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1, precision: 0 }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.parsed.y + ' event(s) conducted';
                                }
                            }
                        }
                    }
                }
            });
        }
    </script>
</body>
</html>