<?php
session_start();
require_once '../db.php';
// Require authentication check in production
// if (!isset($_SESSION['admin_logged_in'])) { header("Location: adminlogin.php"); exit; }

// --- Handle Judge Approvals & Rejections ---
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['approve_judge'])) {
        $stmt = $pdo->prepare("UPDATE users SET approval_status = 'approved' WHERE id = :id AND role = 'judge'");
        $stmt->execute(['id' => $_POST['judge_id']]);
    } elseif (isset($_POST['reject_judge'])) {
        $stmt = $pdo->prepare("UPDATE users SET approval_status = 'rejected' WHERE id = :id AND role = 'judge'");
        $stmt->execute(['id' => $_POST['judge_id']]);
    }
    // Prevent form resubmission
    header("Location: dashboard.php");
    exit;
}

// --- Fetch Real-Time Dashboard Statistics ---
$total_events = (int)($pdo->query("SELECT COUNT(*) FROM events")->fetchColumn() ?: 0);
$total_participants = (int)($pdo->query("SELECT COUNT(*) FROM candidates")->fetchColumn() ?: 0);
$active_events = (int)($pdo->query("SELECT COUNT(*) FROM events WHERE status IN ('Ongoing', 'Tabulating')")->fetchColumn() ?: 0);
$completed_events = (int)($pdo->query("SELECT COUNT(*) FROM events WHERE status = 'Completed'")->fetchColumn() ?: 0);
$total_scores = (int)($pdo->query("SELECT COUNT(*) FROM scores")->fetchColumn() ?: 0);
$total_judges = (int)($pdo->query("SELECT COUNT(*) FROM users WHERE role = 'judge' AND approval_status = 'approved'")->fetchColumn() ?: 0);
$pending_count = (int)($pdo->query("SELECT COUNT(*) FROM users WHERE role = 'judge' AND approval_status = 'pending'")->fetchColumn() ?: 0);
$total_departments = (int)($pdo->query("SELECT COUNT(*) FROM departments")->fetchColumn() ?: 0);

// --- Fetch Recent Events Data ---
$recent_events = $pdo->query("SELECT id, name, type, department, start_date, end_date, status FROM events ORDER BY id DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);

// --- Fetch Pending Judge Registrations ---
$pending_judges = $pdo->query("SELECT id, full_name, username FROM users WHERE role = 'judge' AND approval_status = 'pending' ORDER BY id ASC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);

// --- Chart 1: Event Status Breakdown ---
$status_query = $pdo->query("SELECT status, COUNT(*) as count FROM events GROUP BY status");
$status_data = ['Upcoming' => 0, 'Ongoing' => 0, 'Tabulating' => 0, 'Completed' => 0];
while ($row = $status_query->fetch(PDO::FETCH_ASSOC)) {
    if (array_key_exists($row['status'], $status_data)) {
        $status_data[$row['status']] = (int)$row['count'];
    }
}

// --- Chart 1: Event Participation Density (Top Events by Contenders) ---
$part_query = $pdo->query("
    SELECT 
        e.id, 
        e.name, 
        e.type, 
        e.department,
        e.participation_mode,
        e.status,
        COUNT(c.id) as count 
    FROM events e 
    LEFT JOIN candidates c ON e.id = c.event_id 
    GROUP BY e.id 
    ORDER BY count DESC, e.id DESC 
    LIMIT 6
");
$chart_event_names = [];
$chart_event_fullnames = [];
$chart_part_counts = [];
$chart_event_types = [];
$chart_event_depts = [];
$chart_event_modes = [];
$total_density_candidates = 0;

while ($row = $part_query->fetch(PDO::FETCH_ASSOC)) {
    $full = $row['name'];
    $short = strlen($full) > 22 ? substr($full, 0, 22) . '...' : $full;
    $chart_event_names[] = $short;
    $chart_event_fullnames[] = $full;
    $cnt = (int)$row['count'];
    $chart_part_counts[] = $cnt;
    $chart_event_types[] = $row['type'] ?? 'General';
    $chart_event_depts[] = $row['department'] ?? 'Campus Wide';
    $chart_event_modes[] = $row['participation_mode'] ?? 'Individual';
    $total_density_candidates += $cnt;
}

// --- Chart 3: Department Engagement (11 Official Programs) ---
$dept_stats_query = $pdo->query("
    SELECT 
        d.department_name,
        d.department_code,
        COUNT(DISTINCT c.id) as candidate_count,
        COUNT(DISTINCT e.id) as event_count
    FROM departments d
    LEFT JOIN courses crs ON crs.course_name = d.department_name
    LEFT JOIN candidates c ON c.course_id = crs.id
    LEFT JOIN events e ON e.department = d.department_name
    GROUP BY d.id
    ORDER BY d.department_name ASC
");
$chart_dept_labels = [];
$chart_dept_candidates = [];
$chart_dept_events = [];
while ($row = $dept_stats_query->fetch(PDO::FETCH_ASSOC)) {
    $label = !empty($row['department_code']) ? $row['department_code'] : (strlen($row['department_name']) > 14 ? substr($row['department_name'], 0, 14) . '..' : $row['department_name']);
    $chart_dept_labels[] = $label;
    $chart_dept_candidates[] = (int)$row['candidate_count'];
    $chart_dept_events[] = (int)$row['event_count'];
}

// --- Chart 4: Event Category Breakdown ---
$types_query = $pdo->query("SELECT type, COUNT(*) as count FROM events GROUP BY type ORDER BY count DESC");
$chart_type_labels = [];
$chart_type_counts = [];
while ($row = $types_query->fetch(PDO::FETCH_ASSOC)) {
    $label = !empty($row['type']) ? $row['type'] : 'General';
    $chart_type_labels[] = $label;
    $chart_type_counts[] = (int)$row['count'];
}
if (empty($chart_type_labels)) {
    $chart_type_labels = ['Pageant', 'Cultural', 'Academic', 'Sports', 'Literary'];
    $chart_type_counts = [0, 0, 0, 0, 0];
}

// --- Date Formatting Helper ---
function formatEventDate($start, $end) {
    if (!$start) return 'N/A';
    if ($start === $end || !$end) {
        return date('M d, Y', strtotime($start));
    } else {
        return date('M d', strtotime($start)) . ' - ' . date('M d, Y', strtotime($end));
    }
}

function getStatusBadge($status) {
    switch ($status) {
        case 'Completed': return '<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-1 fw-bold"><i class="bi bi-check-circle-fill me-1"></i> Completed</span>';
        case 'Tabulating': return '<span class="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-50 rounded-pill px-3 py-1 fw-bold"><i class="bi bi-calculator-fill me-1 text-warning"></i> Tabulating</span>';
        case 'Ongoing': return '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill px-3 py-1 fw-bold"><i class="bi bi-broadcast me-1"></i> Ongoing</span>';
        default: return '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill px-3 py-1 fw-bold"><i class="bi bi-hourglass-split me-1"></i> Upcoming</span>';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <!-- Chart.js for Data Visualization -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <style>
        /* Global Reset */
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; }
        a, button, .btn, label, .input-group-text, canvas { cursor: pointer; }

        body { background-color: #F1F5F9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default; }
        .main-content { min-height: 100vh; background-color: #F8FAFC; width: calc(100% - 280px); }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }

        /* Modern Elevated Stats Cards */
        .stat-card-modern {
            position: relative;
            border: none;
            border-radius: 16px;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
            color: #ffffff;
            padding: 1.35rem 1.4rem;
            min-height: 145px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .stat-card-modern:hover {
            transform: translateY(-5px);
            box-shadow: 0 16px 28px rgba(0, 0, 0, 0.12);
        }
        
        .stat-watermark {
            position: absolute;
            right: -12px;
            bottom: -15px;
            font-size: 4.8rem;
            opacity: 0.13;
            transform: rotate(-8deg);
            line-height: 1;
            pointer-events: none;
            transition: transform 0.3s ease;
        }
        .stat-card-modern:hover .stat-watermark {
            transform: rotate(0deg) scale(1.08);
            opacity: 0.18;
        }

        .stat-icon-badge {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(8px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        /* Unified Color Palette: Curated Shades of Blue & Yellow Gold */
        .card-grad-midnight {
            background: linear-gradient(135deg, #0A192F 0%, #172D4D 100%);
            border: 1px solid rgba(255, 191, 0, 0.25);
            box-shadow: 0 4px 14px rgba(10, 25, 47, 0.15);
        }
        .card-grad-royal {
            background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 4px 14px rgba(30, 58, 138, 0.2);
        }
        .card-grad-sapphire {
            background: linear-gradient(135deg, #0F2744 0%, #1D4ED8 100%);
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 4px 14px rgba(15, 39, 68, 0.2);
        }
        .card-grad-azure {
            background: linear-gradient(135deg, #0369A1 0%, #0284C7 100%);
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 4px 14px rgba(3, 105, 161, 0.2);
        }
        .card-grad-gold {
            background: linear-gradient(135deg, #FFBF00 0%, #D97706 100%);
            color: #0A192F !important;
            border: 1px solid rgba(255, 255, 255, 0.35);
            box-shadow: 0 4px 16px rgba(255, 191, 0, 0.28);
        }
        .card-grad-navy-amber {
            background: linear-gradient(135deg, #0A192F 0%, #1E293B 100%);
            border: 1.5px solid #FFBF00 !important;
            box-shadow: 0 4px 16px rgba(255, 191, 0, 0.2);
        }
        .card-grad-steel-blue {
            background: linear-gradient(135deg, #1E293B 0%, #1E3A5F 100%);
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 4px 14px rgba(30, 41, 59, 0.2);
        }
        .card-grad-cobalt {
            background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 4px 14px rgba(30, 64, 175, 0.2);
        }

        /* High-Contrast Typography & Component Styles */
        .stat-card-title {
            color: #E2E8F0;
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        }
        .card-grad-gold .stat-card-title {
            color: #0A192F !important;
            text-shadow: none;
            opacity: 0.9;
        }

        .stat-card-number {
            font-size: 2.15rem;
            font-weight: 800;
            line-height: 1.1;
            color: #FFFFFF;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
        }
        .card-grad-gold .stat-card-number {
            color: #0A192F !important;
            text-shadow: none;
        }

        .stat-card-subtitle {
            color: #F1F5F9;
            font-size: 0.82rem;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        .card-grad-gold .stat-card-subtitle {
            color: #0A192F !important;
            text-shadow: none;
            opacity: 0.9;
        }

        .stat-card-link {
            color: #FFFFFF;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.8rem;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 12px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.25);
            transition: all 0.2s ease;
        }
        .stat-card-link:hover {
            color: #0A192F !important;
            background-color: #FFBF00 !important;
            border-color: #FFBF00 !important;
            transform: translateX(3px);
            box-shadow: 0 2px 8px rgba(255, 191, 0, 0.4);
        }
        .card-grad-gold .stat-card-link {
            color: #0A192F !important;
            background: rgba(10, 25, 47, 0.12);
            border: 1px solid rgba(10, 25, 47, 0.2);
        }
        .card-grad-gold .stat-card-link:hover {
            color: #FFFFFF !important;
            background: #0A192F !important;
            border-color: #0A192F !important;
        }

        .card-grad-gold .stat-icon-badge {
            background: rgba(10, 25, 47, 0.14) !important;
            border-color: rgba(10, 25, 47, 0.25) !important;
            color: #0A192F !important;
        }

        .pulse-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #FFBF00;
            box-shadow: 0 0 0 rgba(255, 191, 0, 0.7);
            animation: pulse-gold 1.6s infinite;
        }
        @keyframes pulse-gold {
            0% { box-shadow: 0 0 0 0 rgba(255, 191, 0, 0.7); }
            70% { box-shadow: 0 0 0 8px rgba(255, 191, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 191, 0, 0); }
        }

        /* Glass / Elevated Widget Cards */
        .analytics-card {
            background: #ffffff;
            border: 1px solid #E2E8F0;
            border-radius: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
            transition: box-shadow 0.2s ease;
        }
        .analytics-card:hover {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
        }

        .table-custom-header th { 
            background-color: #0A192F !important; 
            color: #FFFFFF !important; 
            font-weight: 600; 
            border-bottom: none; 
            padding: 0.9rem 1rem;
        }

        .pending-item { 
            border-left: 4px solid #FFBF00; 
            background-color: #ffffff; 
            padding: 12px 14px; 
            border-radius: 10px; 
            border: 1px solid #E2E8F0;
            border-left: 4px solid #FFBF00;
            box-shadow: 0 2px 4px rgba(0,0,0,0.03); 
            margin-bottom: 0.85rem; 
            transition: all 0.2s ease; 
        }
        .pending-item:hover { 
            transform: translateX(4px); 
            box-shadow: 0 4px 10px rgba(0,0,0,0.06);
        }

        .chart-container-lg { position: relative; height: 310px; width: 100%; }
        .chart-container-sm { position: relative; height: 230px; width: 100%; }

        .quick-action-btn { transition: all 0.25s ease; border: 1.5px solid transparent; border-radius: 10px; }
        .quick-action-btn:hover { 
            border-color: #FFBF00 !important; 
            background-color: #FFBF00 !important; 
            color: #0A192F !important; 
            transform: translateY(-2px); 
            box-shadow: 0 4px 12px rgba(255, 191, 0, 0.35); 
        }
        .quick-action-btn:hover i { color: #0A192F !important; }

        .btn-seeder {
            background: linear-gradient(135deg, #FFBF00 0%, #ff9800 100%);
            color: #0A192F;
            font-weight: 700;
            border: none;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(255, 191, 0, 0.3);
            transition: all 0.25s ease;
        }
        .btn-seeder:hover {
            background: linear-gradient(135deg, #e6ac00 0%, #f57c00 100%);
            color: #0A192F;
            transform: translateY(-2px);
            box-shadow: 0 6px 18px rgba(255, 191, 0, 0.45);
        }
    </style>
</head>
<body class="d-flex align-items-start">

    <?php include '../includes/admin_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-3 p-md-4 p-xl-5">
        
        <!-- Header Section -->
        <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
            <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="badge bg-midnight text-white px-2.5 py-1 rounded-pill small fw-semibold">
                        <i class="bi bi-shield-check text-amber me-1"></i> Admin Operations
                    </span>
                </div>
                <h2 class="fw-bolder text-midnight mb-1 tracking-tight">ASTS Tabulation Intelligence</h2>
                <p class="text-muted mb-0 small">Apayao State College - Luna & Conner Campuses Integrated System</p>
            </div>

            <div class="d-flex align-items-center gap-2">
                <div class="bg-white px-3 py-2 rounded-3 shadow-sm border text-end">
                    <div class="fw-bold text-midnight fs-6" id="liveTime">00:00:00 AM</div>
                    <div class="small fw-semibold text-muted" id="liveDate">Loading Date...</div>
                </div>
            </div>
        </div>

        <!-- 8 Stat Cards in Grid (2 Rows of 4 on Desktop) -->
        <div class="row g-3 mb-4">
            
            <!-- Card 1: Total Events -->
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card-modern card-grad-midnight">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="stat-card-title">Total Competitions</span>
                            <h2 class="stat-card-number mb-0 mt-1"><?= number_format($total_events) ?></h2>
                        </div>
                        <div class="stat-icon-badge text-amber">
                            <i class="bi bi-calendar2-range-fill"></i>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between small mt-3 pt-2 border-top border-white border-opacity-15">
                        <span class="stat-card-subtitle"><i class="bi bi-grid-fill me-1 text-amber"></i> All Categories</span>
                        <a href="enlistment.php?tab=events" class="stat-card-link">View &rarr;</a>
                    </div>
                    <i class="bi bi-calendar-event stat-watermark"></i>
                </div>
            </div>

            <!-- Card 2: Active / Live Events -->
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card-modern card-grad-royal">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="stat-card-title">Live & Tabulating</span>
                            <h2 class="stat-card-number mb-0 mt-1"><?= number_format($active_events) ?></h2>
                        </div>
                        <div class="stat-icon-badge text-amber">
                            <i class="bi bi-broadcast"></i>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between small mt-3 pt-2 border-top border-white border-opacity-15">
                        <span class="stat-card-subtitle"><span class="pulse-dot me-1"></span> Real-Time Live</span>
                        <a href="enlistment.php?tab=events" class="stat-card-link">Monitor &rarr;</a>
                    </div>
                    <i class="bi bi-activity stat-watermark"></i>
                </div>
            </div>

            <!-- Card 3: Total Candidates -->
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card-modern card-grad-sapphire">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="stat-card-title">Enlisted Contenders</span>
                            <h2 class="stat-card-number mb-0 mt-1"><?= number_format($total_participants) ?></h2>
                        </div>
                        <div class="stat-icon-badge text-amber">
                            <i class="bi bi-people-fill"></i>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between small mt-3 pt-2 border-top border-white border-opacity-15">
                        <span class="stat-card-subtitle"><i class="bi bi-check2-circle me-1 text-amber"></i> Candidate Registry</span>
                        <a href="enlistment.php?tab=participants" class="stat-card-link">Roster &rarr;</a>
                    </div>
                    <i class="bi bi-person-badge stat-watermark"></i>
                </div>
            </div>

            <!-- Card 4: Tabulated Scores -->
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card-modern card-grad-azure">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="stat-card-title">Tabulated Scores</span>
                            <h2 class="stat-card-number mb-0 mt-1"><?= number_format($total_scores) ?></h2>
                        </div>
                        <div class="stat-icon-badge text-amber">
                            <i class="bi bi-clipboard2-check-fill"></i>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between small mt-3 pt-2 border-top border-white border-opacity-15">
                        <span class="stat-card-subtitle"><i class="bi bi-calculator me-1 text-amber"></i> Verified Judgments</span>
                        <a href="reports.php" class="stat-card-link">Audit &rarr;</a>
                    </div>
                    <i class="bi bi-award-fill stat-watermark"></i>
                </div>
            </div>

            <!-- Card 5: Approved Judges -->
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card-modern card-grad-gold">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="stat-card-title">Approved Evaluators</span>
                            <h2 class="stat-card-number mb-0 mt-1"><?= number_format($total_judges) ?></h2>
                        </div>
                        <div class="stat-icon-badge">
                            <i class="bi bi-person-check-fill text-midnight"></i>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between small mt-3 pt-2 border-top border-dark border-opacity-10">
                        <span class="stat-card-subtitle"><i class="bi bi-shield-lock-fill me-1 text-midnight"></i> Accredited Roster</span>
                        <a href="judges.php" class="stat-card-link">Manage &rarr;</a>
                    </div>
                    <i class="bi bi-patch-check-fill stat-watermark" style="color: #0A192F; opacity: 0.12;"></i>
                </div>
            </div>

            <!-- Card 6: Pending Registrations -->
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card-modern card-grad-navy-amber">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="stat-card-title">Pending Approvals</span>
                            <h2 class="stat-card-number mb-0 mt-1 text-amber"><?= number_format($pending_count) ?></h2>
                        </div>
                        <div class="stat-icon-badge text-amber">
                            <i class="bi bi-person-exclamation"></i>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between small mt-3 pt-2 border-top border-white border-opacity-15">
                        <span class="stat-card-subtitle text-amber"><i class="bi bi-hourglass-split me-1"></i> Awaiting Verification</span>
                        <a href="judges.php" class="stat-card-link">Review &rarr;</a>
                    </div>
                    <i class="bi bi-shield-slash stat-watermark"></i>
                </div>
            </div>

            <!-- Card 7: Completed Events -->
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card-modern card-grad-steel-blue">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="stat-card-title">Concluded Events</span>
                            <h2 class="stat-card-number mb-0 mt-1"><?= number_format($completed_events) ?></h2>
                        </div>
                        <div class="stat-icon-badge text-amber">
                            <i class="bi bi-trophy-fill"></i>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between small mt-3 pt-2 border-top border-white border-opacity-15">
                        <span class="stat-card-subtitle"><i class="bi bi-flag-fill me-1 text-amber"></i> Certified & Finalized</span>
                        <a href="reports.php" class="stat-card-link">Certificates &rarr;</a>
                    </div>
                    <i class="bi bi-award stat-watermark"></i>
                </div>
            </div>

            <!-- Card 8: Official Academic Programs -->
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card-modern card-grad-cobalt">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="stat-card-title">Collegiate Programs</span>
                            <h2 class="stat-card-number mb-0 mt-1"><?= number_format($total_departments) ?></h2>
                        </div>
                        <div class="stat-icon-badge text-amber">
                            <i class="bi bi-mortarboard-fill"></i>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between small mt-3 pt-2 border-top border-white border-opacity-15">
                        <span class="stat-card-subtitle"><i class="bi bi-buildings-fill me-1 text-amber"></i> Active Colleges</span>
                        <a href="enlistment.php?tab=events" class="stat-card-link">Departments &rarr;</a>
                    </div>
                    <i class="bi bi-mortarboard stat-watermark"></i>
                </div>
            </div>

        </div>

        <!-- Analytical Charts Row 1: Event Distribution & Status -->
        <div class="row g-4 mb-4">
            
            <!-- Bar Chart: Top Events by Participation -->
            <div class="col-lg-8">
                <div class="analytics-card h-100 p-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h5 class="fw-bold text-midnight mb-1"><i class="bi bi-bar-chart-steps text-amber me-2"></i> Event Participation Density</h5>
                            <p class="text-muted small mb-0">Contender volume & turnout across top competitive events</p>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-light text-midnight border px-2.5 py-1.5 fw-bold small">
                                <i class="bi bi-people-fill text-primary me-1"></i> <?= $total_density_candidates ?> Contenders
                            </span>
                            <span class="badge bg-midnight text-white px-2.5 py-1.5 fw-semibold small">Top 6</span>
                        </div>
                    </div>
                    <div class="chart-container-lg">
                        <canvas id="participantsChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Doughnut Chart: Lifecycle Status -->
            <div class="col-lg-4">
                <div class="analytics-card h-100 p-4 d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="fw-bold text-midnight mb-0"><i class="bi bi-pie-chart-fill text-primary me-2"></i> Event Lifecycle</h5>
                            <span class="badge bg-light text-muted border px-2 py-1 small">Current Status</span>
                        </div>
                        <p class="text-muted small mb-3">Proportion of events by operational stage</p>
                    </div>
                    <div class="d-flex justify-content-center align-items-center my-2">
                        <div style="position: relative; height: 210px; width: 210px;">
                            <canvas id="statusChart"></canvas>
                        </div>
                    </div>
                    <div class="pt-3 border-top mt-2">
                        <div class="row text-center g-2 small">
                            <div class="col-6">
                                <span class="text-muted d-block">In Progress</span>
                                <strong class="text-primary"><?= $status_data['Ongoing'] + $status_data['Tabulating'] ?> Events</strong>
                            </div>
                            <div class="col-6">
                                <span class="text-muted d-block">Concluded</span>
                                <strong class="text-success"><?= $status_data['Completed'] ?> Events</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Analytical Charts Row 2: Department Engagement & Event Categories -->
        <div class="row g-4 mb-4">
            
            <!-- Horizontal / Grouped Bar Chart: Department Engagement -->
            <div class="col-lg-7">
                <div class="analytics-card h-100 p-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <h5 class="fw-bold text-midnight mb-1"><i class="bi bi-mortarboard-fill text-success me-2"></i> Department Engagement Distribution</h5>
                            <p class="text-muted small mb-0">Contenders & hosted competitions across the 11 collegiate programs</p>
                        </div>
                        <a href="reports.php?tab=dept-rankings" class="btn btn-sm btn-outline-dark rounded-pill px-3 py-1 fw-semibold small">
                            Rankings &rarr;
                        </a>
                    </div>
                    <div class="chart-container-lg">
                        <canvas id="deptChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Event Category Breakdown & Quick Actions -->
            <div class="col-lg-5">
                <div class="analytics-card h-100 p-4 d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="fw-bold text-midnight mb-1"><i class="bi bi-tags-fill text-warning me-2"></i> Event Category Mix</h5>
                            <span class="badge bg-light text-dark border px-2 py-1 small">Categorization</span>
                        </div>
                        <p class="text-muted small mb-3">Breakdown by academic, pageant, cultural, athletic & literary cups</p>
                    </div>

                    <div class="d-flex justify-content-center align-items-center my-1">
                        <div style="position: relative; height: 190px; width: 190px;">
                            <canvas id="typeChart"></canvas>
                        </div>
                    </div>

                    <!-- Compact Quick Launch Actions -->
                    <div class="mt-3 pt-3 border-top">
                        <div class="row g-2">
                            <div class="col-6">
                                <a href="enlistment.php?tab=events&open=addEvent" class="btn btn-outline-secondary btn-sm w-100 text-start py-2 px-2.5 rounded-3 d-flex align-items-center gap-2">
                                    <i class="bi bi-calendar-plus text-primary fs-6"></i>
                                    <span class="small fw-semibold text-truncate">Create Event</span>
                                </a>
                            </div>
                            <div class="col-6">
                                <a href="enlistment.php?tab=participants&open=addParticipant" class="btn btn-outline-secondary btn-sm w-100 text-start py-2 px-2.5 rounded-3 d-flex align-items-center gap-2">
                                    <i class="bi bi-person-plus text-success fs-6"></i>
                                    <span class="small fw-semibold text-truncate">Add Candidate</span>
                                </a>
                            </div>
                            <div class="col-6">
                                <a href="judges.php" class="btn btn-outline-secondary btn-sm w-100 text-start py-2 px-2.5 rounded-3 d-flex align-items-center gap-2">
                                    <i class="bi bi-person-badge text-warning fs-6"></i>
                                    <span class="small fw-semibold text-truncate">Manage Judges</span>
                                </a>
                            </div>
                            <div class="col-6">
                                <a href="reports.php" class="btn btn-outline-secondary btn-sm w-100 text-start py-2 px-2.5 rounded-3 d-flex align-items-center gap-2">
                                    <i class="bi bi-file-earmark-bar-graph text-info fs-6"></i>
                                    <span class="small fw-semibold text-truncate">View Reports</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Tables Row: Recent Events & Pending Judges -->
        <div class="row g-4">
            
            <!-- Real-Time Recent Events -->
            <div class="col-lg-8">
                <div class="analytics-card h-100 p-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h5 class="fw-bold text-midnight mb-1"><i class="bi bi-table text-amber me-2"></i> Recent Event Activity</h5>
                            <p class="text-muted small mb-0">Latest competitions registered in the tabulator</p>
                        </div>
                        <a href="enlistment.php?tab=events" class="btn btn-sm btn-outline-dark rounded-pill px-3 py-1 fw-semibold small">
                            All Events &rarr;
                        </a>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-custom-header">
                                <tr>
                                    <th class="rounded-start">Event Name</th>
                                    <th>Category</th>
                                    <th>Department</th>
                                    <th>Schedule</th>
                                    <th class="rounded-end text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if(count($recent_events) > 0): ?>
                                    <?php foreach($recent_events as $event): ?>
                                        <tr style="background-color: #ffffff;">
                                            <td class="fw-semibold text-midnight py-3">
                                                <i class="bi bi-trophy-fill text-warning me-2"></i>
                                                <?= htmlspecialchars($event['name']) ?>
                                            </td>
                                            <td>
                                                <span class="badge bg-light text-dark border px-2.5 py-1 rounded-pill small">
                                                    <?= htmlspecialchars($event['type']) ?>
                                                </span>
                                            </td>
                                            <td>
                                                <span class="text-muted small fw-medium">
                                                    <?= !empty($event['department']) ? htmlspecialchars($event['department']) : 'All Programs' ?>
                                                </span>
                                            </td>
                                            <td class="text-muted small fw-semibold">
                                                <?= formatEventDate($event['start_date'], $event['end_date']) ?>
                                            </td>
                                            <td class="text-center">
                                                <?= getStatusBadge($event['status']) ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <tr><td colspan="5" class="text-center py-4 text-muted">No events recorded yet. Click 'Create Event' to get started.</td></tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Real-Time Interactive Judge Approvals -->
            <div class="col-lg-4">
                <div class="analytics-card h-100 p-4" style="background-color: #FAFBFD;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold text-midnight mb-0"><i class="bi bi-person-lines-fill text-amber me-2"></i> Pending Evaluators</h5>
                        <span class="badge bg-warning bg-opacity-20 text-dark border border-warning border-opacity-50 px-2 py-1 small fw-bold">
                            <?= $pending_count ?> Waiting
                        </span>
                    </div>
                    <p class="text-muted small mb-3">Evaluators awaiting system accreditation</p>
                    
                    <div style="max-height: 330px; overflow-y: auto;">
                        <?php if(count($pending_judges) > 0): ?>
                            <?php foreach($pending_judges as $p_judge): ?>
                                <div class="pending-item">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="fw-bold text-midnight fs-6"><?= htmlspecialchars($p_judge['full_name']) ?></div>
                                            <div class="text-muted small">@<?= htmlspecialchars($p_judge['username']) ?></div>
                                        </div>
                                        <div class="d-flex gap-1">
                                            <form method="POST" class="d-inline">
                                                <input type="hidden" name="judge_id" value="<?= $p_judge['id'] ?>">
                                                <button type="submit" name="approve_judge" class="btn btn-success btn-sm rounded-pill px-2.5 py-1" title="Approve">
                                                    <i class="bi bi-check-lg"></i>
                                                </button>
                                            </form>
                                            <form method="POST" class="d-inline" onsubmit="return confirm('Reject this evaluator registration?');">
                                                <input type="hidden" name="judge_id" value="<?= $p_judge['id'] ?>">
                                                <button type="submit" name="reject_judge" class="btn btn-outline-danger btn-sm rounded-pill px-2.5 py-1" title="Reject">
                                                    <i class="bi bi-x-lg"></i>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <div class="text-center py-5 text-muted">
                                <i class="bi bi-shield-check display-6 text-success d-block mb-2"></i>
                                <span class="fw-semibold">All evaluators verified!</span>
                                <p class="small text-muted mb-0">No registrations currently awaiting approval.</p>
                            </div>
                        <?php endif; ?>
                    </div>
                    
                    <div class="pt-3 border-top mt-3 text-center">
                        <a href="judges.php" class="text-decoration-none text-midnight fw-bold small">
                            Open Full Judge Directory &rarr;
                        </a>
                    </div>
                </div>
            </div>

        </div>
        
        <div class="mt-5 pb-4 text-center text-muted small">
            <p class="mb-0">&copy; <?= date('Y') ?> Apayao State College &bull; Automated Scoring & Tabulation System (ASTS)</p>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        // --- Live Clock Logic ---
        function updateDateTime() {
            const now = new Date();
            const timeOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
            const dateOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            document.getElementById('liveTime').textContent = now.toLocaleTimeString('en-US', timeOptions);
            document.getElementById('liveDate').textContent = now.toLocaleDateString('en-US', dateOptions);
        }
        updateDateTime();
        setInterval(updateDateTime, 1000);

        // Chart.js Global Settings
        Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        Chart.defaults.color = '#64748B';

        // 1. Participant Density (Horizontal Floating Gradient Bar Chart)
        const ctxBar = document.getElementById('participantsChart').getContext('2d');
        const barGradient = ctxBar.createLinearGradient(0, 0, 500, 0);
        barGradient.addColorStop(0, '#0A192F');       // Midnight Navy
        barGradient.addColorStop(0.65, '#1E40AF');    // Royal Blue
        barGradient.addColorStop(1, '#3B82F6');       // Electric Azure

        const hoverBarGradient = ctxBar.createLinearGradient(0, 0, 500, 0);
        hoverBarGradient.addColorStop(0, '#D97706');  // Deep Amber
        hoverBarGradient.addColorStop(1, '#FFBF00');  // Yellow Gold

        const densityFullNames = <?= json_encode($chart_event_fullnames) ?>;
        const densityTypes = <?= json_encode($chart_event_types) ?>;
        const densityDepts = <?= json_encode($chart_event_depts) ?>;
        const densityModes = <?= json_encode($chart_event_modes) ?>;

        new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: <?= json_encode($chart_event_names) ?>,
                datasets: [{
                    label: 'Enlisted Contenders',
                    data: <?= json_encode($chart_part_counts) ?>,
                    backgroundColor: barGradient,
                    hoverBackgroundColor: hoverBarGradient,
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    categoryPercentage: 0.85
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0A192F',
                        titleColor: '#FFBF00',
                        titleFont: { size: 13, weight: 'bold' },
                        bodyColor: '#FFFFFF',
                        bodyFont: { size: 12 },
                        borderColor: 'rgba(255, 191, 0, 0.4)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(items) {
                                const idx = items[0].dataIndex;
                                return densityFullNames[idx] || items[0].label;
                            },
                            label: function(context) {
                                return ' Contenders Enlisted: ' + context.parsed.x;
                            },
                            afterLabel: function(context) {
                                const idx = context.dataIndex;
                                return [
                                    ' Program: ' + (densityDepts[idx] || 'All Campus'),
                                    ' Category: ' + (densityTypes[idx] || 'General') + ' (' + (densityModes[idx] || 'Individual') + ')'
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { 
                            precision: 0,
                            color: '#64748B',
                            font: { weight: '600' }
                        },
                        grid: { color: '#F1F5F9' },
                        title: {
                            display: true,
                            text: 'Enlisted Contenders',
                            color: '#94A3B8',
                            font: { size: 11, weight: '600' }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: '#0A192F',
                            font: { weight: 'bold', size: 12 }
                        }
                    }
                }
            }
        });

        // 2. Event Status (Doughnut Chart)
        const ctxDoughnut = document.getElementById('statusChart').getContext('2d');
        new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: ['Upcoming', 'Ongoing', 'Tabulating', 'Completed'],
                datasets: [{
                    data: [
                        <?= $status_data['Upcoming'] ?>, 
                        <?= $status_data['Ongoing'] ?>, 
                        <?= $status_data['Tabulating'] ?>, 
                        <?= $status_data['Completed'] ?>
                    ],
                    backgroundColor: [
                        '#94A3B8', // Upcoming - slate gray
                        '#0EA5E9', // Ongoing - electric sky blue
                        '#F59E0B', // Tabulating - amber gold
                        '#10B981'  // Completed - emerald green
                    ],
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 10, font: { size: 11, weight: '600' }, padding: 12 }
                    },
                    tooltip: {
                        backgroundColor: '#0A192F',
                        padding: 8
                    }
                }
            }
        });

        // 3. Department Engagement Chart (Grouped Bar Chart across 11 official programs)
        const ctxDept = document.getElementById('deptChart').getContext('2d');
        new Chart(ctxDept, {
            type: 'bar',
            data: {
                labels: <?= json_encode($chart_dept_labels) ?>,
                datasets: [
                    {
                        label: 'Candidates Representing',
                        data: <?= json_encode($chart_dept_candidates) ?>,
                        backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald Green
                        borderRadius: 6,
                        barPercentage: 0.7
                    },
                    {
                        label: 'Hosted Events',
                        data: <?= json_encode($chart_dept_events) ?>,
                        backgroundColor: 'rgba(79, 70, 229, 0.85)', // Indigo
                        borderRadius: 6,
                        barPercentage: 0.7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, font: { size: 12, weight: '600' } }
                    },
                    tooltip: {
                        backgroundColor: '#0A192F',
                        padding: 10,
                        titleFont: { weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: '#F1F5F9' }
                    }
                }
            }
        });

        // 4. Event Category Breakdown (Polar Area / Doughnut Chart)
        const ctxType = document.getElementById('typeChart').getContext('2d');
        new Chart(ctxType, {
            type: 'doughnut',
            data: {
                labels: <?= json_encode($chart_type_labels) ?>,
                datasets: [{
                    data: <?= json_encode($chart_type_counts) ?>,
                    backgroundColor: [
                        '#8B5CF6', // Purple
                        '#EC4899', // Pink
                        '#3B82F6', // Blue
                        '#10B981', // Emerald
                        '#F59E0B', // Amber
                        '#06B6D4'  // Cyan
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 10, font: { size: 10, weight: '600' }, padding: 8 }
                    },
                    tooltip: {
                        backgroundColor: '#0A192F',
                        padding: 8
                    }
                }
            }
        });
    </script>
</body>
</html>