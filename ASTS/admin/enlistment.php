<?php
session_start();
require_once '../db.php'; 

// --- DYNAMIC DIRECTORY CREATION FOR AVATARS ---
$upload_dir = '../assets/uploads/avatars/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// --- AUTOMATED DATABASE MIGRATIONS ---
try {
    $pdo->query("CREATE TABLE IF NOT EXISTS participants_registry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        course_id INT NULL,
        year_level VARCHAR(50) NULL,
        image_path VARCHAR(255) NULL
    )");
    
    $col_check = $pdo->query("SHOW COLUMNS FROM candidates LIKE 'registry_id'");
    if ($col_check->rowCount() == 0) {
        $pdo->query("ALTER TABLE candidates ADD COLUMN registry_id INT NULL AFTER event_id");
        $pdo->query("ALTER TABLE candidates ADD CONSTRAINT fk_cand_registry FOREIGN KEY (registry_id) REFERENCES participants_registry(id) ON DELETE CASCADE");
        
        $existing = $pdo->query("SELECT DISTINCT name, course_id, year_level, image_path FROM candidates")->fetchAll(PDO::FETCH_ASSOC);
        $ins = $pdo->prepare("INSERT INTO participants_registry (name, course_id, year_level, image_path) VALUES (?, ?, ?, ?)");
        $upd = $pdo->prepare("UPDATE candidates SET registry_id = ? WHERE name = ?");
        foreach($existing as $ex) {
            $ins->execute([$ex['name'], $ex['course_id'], $ex['year_level'], $ex['image_path']]);
            $reg_id = $pdo->lastInsertId();
            $upd->execute([$reg_id, $ex['name']]);
        }
    }

    $pdo->query("CREATE TABLE IF NOT EXISTS organizers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organizer_name VARCHAR(150) NOT NULL UNIQUE
    )");

    $col_check_mode = $pdo->query("SHOW COLUMNS FROM events LIKE 'participation_mode'");
    if ($col_check_mode->rowCount() == 0) {
        $pdo->query("ALTER TABLE events ADD COLUMN participation_mode ENUM('Individual', 'Team') NOT NULL DEFAULT 'Individual' AFTER type");
    }
    
    $col_check_team = $pdo->query("SHOW COLUMNS FROM candidates LIKE 'team_members'");
    if ($col_check_team->rowCount() == 0) {
        $pdo->query("ALTER TABLE candidates ADD COLUMN team_members TEXT NULL AFTER name");
    }

    // New column to track which global participants are inside a team roster
    $col_check_team_ids = $pdo->query("SHOW COLUMNS FROM candidates LIKE 'team_registry_ids'");
    if ($col_check_team_ids->rowCount() == 0) {
        $pdo->query("ALTER TABLE candidates ADD COLUMN team_registry_ids TEXT NULL AFTER team_members");
    }

    // Event Portions / Segments (e.g., Swimwear, Talent, Evening Gown, Q&A)
    $pdo->query("CREATE TABLE IF NOT EXISTS event_portions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        portion_name VARCHAR(100) NOT NULL,
        percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        order_number INT DEFAULT 1,
        status ENUM('Upcoming', 'Ongoing', 'Completed') DEFAULT 'Upcoming',
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )");

    $col_check_portion = $pdo->query("SHOW COLUMNS FROM criteria LIKE 'portion_id'");
    if ($col_check_portion->rowCount() == 0) {
        $pdo->query("ALTER TABLE criteria ADD COLUMN portion_id INT NULL AFTER event_id");
        $pdo->query("ALTER TABLE criteria ADD CONSTRAINT fk_criteria_portion FOREIGN KEY (portion_id) REFERENCES event_portions(id) ON DELETE CASCADE");
    }

    // Departments Table Migration
    $pdo->query("CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_name VARCHAR(150) NOT NULL UNIQUE,
        department_code VARCHAR(50) NULL
    )");

    $col_check_dept = $pdo->query("SHOW COLUMNS FROM events LIKE 'department'");
    if ($col_check_dept->rowCount() == 0) {
        $pdo->query("ALTER TABLE events ADD COLUMN department VARCHAR(150) NULL AFTER organizer");
    }

    $col_check_ay = $pdo->query("SHOW COLUMNS FROM events LIKE 'academic_year'");
    if ($col_check_ay->rowCount() == 0) {
        $pdo->query("ALTER TABLE events ADD COLUMN academic_year VARCHAR(50) NULL AFTER start_date");
    }

    // Courses Table Migration & Default Program Seeding
    $pdo->query("CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_name VARCHAR(150) NOT NULL UNIQUE
    )");

    // System-wide 11 Departments & Courses Seed
    $default_depts = [
        ['Bachelor of Secondary Education', 'BSED'],
        ['Bachelor of Elementary Education', 'BEED'],
        ['Bachelor in Information Technology', 'BSIT'],
        ['Bachelor in Industrial Technology', 'BINDT'],
        ['Bachelor of Technical Teacher Education', 'BTTE'],
        ['Bachelor of Science in Civil Engineering', 'BSCE'],
        ['Bachelor of Science in Hotel & Restaurant Mgmt.', 'BSHRM'],
        ['Bachelor of Science in Agriculture', 'BSA'],
        ['Bachelor of Science in Business Administration', 'BSBA'],
        ['Bachelor of Science in Tourism', 'BST'],
        ['Bachelor of Science in Criminology', 'BSCrim']
    ];

    $ins_dept = $pdo->prepare("INSERT IGNORE INTO departments (department_name, department_code) VALUES (?, ?)");
    $ins_course = $pdo->prepare("INSERT IGNORE INTO courses (course_name) VALUES (?)");
    foreach ($default_depts as $d) {
        $ins_dept->execute([$d[0], $d[1]]);
        $ins_course->execute([$d[0]]);
    }

} catch (PDOException $e) {}

// --- ACTIVE TAB TRACKING ---
$active_tab = $_GET['tab'] ?? 'events';

// --- AUTO-UPDATE EVENT STATUSES ---
date_default_timezone_set('Asia/Manila');
$today_str = date('Y-m-d');
try {
    // Force past events to completed
    $pdo->query("UPDATE events SET status = 'Completed' WHERE end_date < '$today_str'");
    // Keep ongoing/upcoming ONLY IF they haven't been manually marked as completed
    $pdo->query("UPDATE events SET status = 'Ongoing' WHERE status != 'Completed' AND '$today_str' BETWEEN start_date AND end_date");
    $pdo->query("UPDATE events SET status = 'Upcoming' WHERE status != 'Completed' AND start_date > '$today_str'");
} catch (PDOException $e) {}

$success_msg = '';
$error_msg = '';

// --- HELPER FUNCTIONS ---
function formatEventDate($start, $end) {
    if ($start === $end) return date('M d, Y', strtotime($start));
    return date('M d', strtotime($start)) . ' - ' . date('M d, Y', strtotime($end));
}

function getStatusBadge($status) {
    switch ($status) {
        case 'Completed': return '<span class="badge bg-success rounded-pill px-3 py-2">Completed</span>';
        case 'Tabulating': return '<span class="badge bg-warning text-dark rounded-pill px-3 py-2">Tabulating</span>';
        case 'Ongoing': return '<span class="badge bg-info rounded-pill px-3 py-2">Ongoing</span>';
        default: return '<span class="badge bg-secondary rounded-pill px-3 py-2">Upcoming</span>';
    }
}

function resequenceEventCandidates($pdo, $event_id) {
    $stmt = $pdo->prepare("SELECT id FROM candidates WHERE event_id = :event_id ORDER BY order_number ASC, id ASC");
    $stmt->execute(['event_id' => $event_id]);
    $remaining = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $new_order = 1;
    $update_stmt = $pdo->prepare("UPDATE candidates SET order_number = :new_order WHERE id = :id");
    foreach ($remaining as $cand) {
        $update_stmt->execute(['new_order' => $new_order, 'id' => $cand['id']]);
        $new_order++;
    }
}

// --- HELPER FUNCTION: SEED 4 STANDARD PAGEANT PORTIONS & CRITERIA ---
function seedPageantStructure($pdo, $event_id) {
    $segments = [
        [
            'name' => 'Personal Interview',
            'percentage' => 25.00,
            'order' => 1,
            'criteria' => [
                ['name' => 'Poise & Articulation', 'percentage' => 40.00, 'max_score' => 100],
                ['name' => 'Intelligence & Depth of Thought', 'percentage' => 40.00, 'max_score' => 100],
                ['name' => 'Overall Personality & Impact', 'percentage' => 20.00, 'max_score' => 100],
            ]
        ],
        [
            'name' => 'Swimsuit / Fitness',
            'percentage' => 25.00,
            'order' => 2,
            'criteria' => [
                ['name' => 'Stage Presence & Poise', 'percentage' => 40.00, 'max_score' => 100],
                ['name' => 'Physical Fitness & Carriage', 'percentage' => 40.00, 'max_score' => 100],
                ['name' => 'Audience Impact & Projection', 'percentage' => 20.00, 'max_score' => 100],
            ]
        ],
        [
            'name' => 'Evening Gown',
            'percentage' => 25.00,
            'order' => 3,
            'criteria' => [
                ['name' => 'Elegance & Carriage', 'percentage' => 40.00, 'max_score' => 100],
                ['name' => 'Gown Fit & Stage Presentation', 'percentage' => 40.00, 'max_score' => 100],
                ['name' => 'Overall Glamour & Poise', 'percentage' => 20.00, 'max_score' => 100],
            ]
        ],
        [
            'name' => 'Final Q&A',
            'percentage' => 25.00,
            'order' => 4,
            'criteria' => [
                ['name' => 'Clarity & Confidence', 'percentage' => 40.00, 'max_score' => 100],
                ['name' => 'Content & Substance', 'percentage' => 40.00, 'max_score' => 100],
                ['name' => 'Delivery & Wit', 'percentage' => 20.00, 'max_score' => 100],
            ]
        ]
    ];

    $portion_stmt = $pdo->prepare("INSERT INTO event_portions (event_id, portion_name, percentage, order_number, status) VALUES (?, ?, ?, ?, 'Upcoming')");
    $crit_stmt = $pdo->prepare("INSERT INTO criteria (event_id, portion_id, name, max_score, percentage) VALUES (?, ?, ?, ?, ?)");

    foreach ($segments as $seg) {
        $portion_stmt->execute([$event_id, $seg['name'], $seg['percentage'], $seg['order']]);
        $portion_id = $pdo->lastInsertId();

        foreach ($seg['criteria'] as $crit) {
            $crit_stmt->execute([$event_id, $portion_id, $crit['name'], $crit['max_score'], $crit['percentage']]);
        }
    }
}

// --- AJAX ENDPOINT FOR AUTO-NUMBERING CANDIDATES ---
if (isset($_GET['action']) && $_GET['action'] == 'get_next_number' && isset($_GET['event_id'])) {
    header('Content-Type: application/json');
    try {
        $stmt = $pdo->prepare("SELECT MAX(order_number) FROM candidates WHERE event_id = :event_id");
        $stmt->execute(['event_id' => (int)$_GET['event_id']]);
        $max = $stmt->fetchColumn();
        echo json_encode(['next_number' => $max ? $max + 1 : 1]);
    } catch (Exception $e) {
        echo json_encode(['next_number' => 1]);
    }
    exit;
}

// --- AJAX ENDPOINT FOR EVENT PORTIONS / SEGMENTS ---
if (isset($_GET['action']) && $_GET['action'] == 'get_event_portions' && isset($_GET['event_id'])) {
    header('Content-Type: application/json');
    try {
        $ev_id = (int)$_GET['event_id'];
        $stmt = $pdo->prepare("SELECT * FROM event_portions WHERE event_id = ? ORDER BY order_number ASC, id ASC");
        $stmt->execute([$ev_id]);
        $portions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $total_weight = 0;
        foreach($portions as $p) {
            $total_weight += (float)$p['percentage'];
        }
        
        $max_order_stmt = $pdo->prepare("SELECT MAX(order_number) FROM event_portions WHERE event_id = ?");
        $max_order_stmt->execute([$ev_id]);
        $max_order = (int)$max_order_stmt->fetchColumn();

        echo json_encode([
            'success' => true,
            'portions' => $portions,
            'total_weight' => $total_weight,
            'next_order' => $max_order + 1
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'portions' => [], 'total_weight' => 0, 'next_order' => 1]);
    }
    exit;
}

// --- HANDLE 1-CLICK PAGEANT PRESET LOADING VIA GET ---
if (isset($_GET['load_pageant_preset_event_id'])) {
    $target_event_id = (int)$_GET['load_pageant_preset_event_id'];
    try {
        $chk_p = $pdo->prepare("SELECT COUNT(*) FROM event_portions WHERE event_id = ?");
        $chk_p->execute([$target_event_id]);
        if ($chk_p->fetchColumn() == 0) {
            seedPageantStructure($pdo, $target_event_id);
            $_SESSION['success_msg'] = "4 standard pageant portions (Personal Interview, Swimsuit / Fitness, Evening Gown, Final Q&A) and scoring criteria successfully generated!";
        } else {
            $_SESSION['error_msg'] = "Event already has configured segments.";
        }
    } catch (PDOException $e) {
        $_SESSION['error_msg'] = "Error loading pageant preset: " . $e->getMessage();
    }
    header("Location: enlistment.php?tab=events");
    exit;
}

// ==========================================
// HANDLE ALL POST CRUD OPERATIONS
// ==========================================
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action'])) {
    
    // --- EVENT MANAGEMENT ACTIONS ---
    if ($_POST['action'] == 'add_event') {
        $start_date = $_POST['start_date'];
        $end_date = $_POST['end_date'];
        $event_type = $_POST['event_type'] ?? '';
        
        if ($start_date > $today_str) $status = 'Upcoming';
        elseif ($today_str >= $start_date && $today_str <= $end_date) $status = 'Ongoing';
        else $status = 'Completed';

        try {
            $stmt = $pdo->prepare("INSERT INTO events (name, description, type, organizer, department, academic_year, participation_mode, start_date, end_date, status) VALUES (:name, :description, :type, :organizer, :department, :academic_year, :participation_mode, :start_date, :end_date, :status)");
            $stmt->execute([
                'name' => $_POST['event_name'],
                'description' => $_POST['event_description'] ?? null,
                'type' => $event_type,
                'organizer' => $_POST['event_organizer'] ?? null,
                'department' => $_POST['event_department'] ?? null,
                'academic_year' => $_POST['academic_year'] ?? '2027-2028',
                'participation_mode' => $_POST['participation_mode'] ?? 'Individual',
                'start_date' => $start_date,
                'end_date' => $end_date,
                'status' => $status
            ]);
            $new_event_id = $pdo->lastInsertId();

            $is_pageant_type = stripos($event_type, 'pageant') !== false;
            $setup_preset = isset($_POST['setup_pageant_preset']) ? (int)$_POST['setup_pageant_preset'] : ($is_pageant_type ? 1 : 0);

            if ($setup_preset == 1) {
                seedPageantStructure($pdo, $new_event_id);
                $success_msg = "Pageant event successfully created with the 4 standard segments (Personal Interview, Swimsuit / Fitness, Evening Gown, Final Q&A) and scoring criteria initialized!";
            } else {
                $success_msg = "Event successfully created!";
            }
            $active_tab = 'events';
        } catch (PDOException $e) { $error_msg = "Error adding event: " . $e->getMessage(); }
    }
    
    if ($_POST['action'] == 'edit_event') {
        $edit_start = $_POST['edit_start_date'] ?? $today_str;
        $edit_end = $_POST['edit_end_date'] ?? $today_str;
        
        // Fetch current status to ensure we don't accidentally reopen a manually completed event
        $curr_stmt = $pdo->prepare("SELECT status FROM events WHERE id = ?");
        $curr_stmt->execute([$_POST['event_id']]);
        $current_status = $curr_stmt->fetchColumn();
        
        if ($current_status !== 'Completed') {
            if ($edit_start > $today_str) $status = 'Upcoming';
            elseif ($today_str >= $edit_start && $today_str <= $edit_end) $status = 'Ongoing';
            else $status = 'Completed';
        } else {
            $status = 'Completed'; // Keep it completed if it was manually finished
        }

        try {
            $stmt = $pdo->prepare("UPDATE events SET name = :name, description = :description, type = :type, organizer = :organizer, department = :department, academic_year = :academic_year, participation_mode = :participation_mode, start_date = :start_date, end_date = :end_date, status = :status WHERE id = :id");
            $stmt->execute([
                'name' => $_POST['edit_name'] ?? '',
                'description' => $_POST['edit_description'] ?? null,
                'type' => $_POST['edit_type'] ?? '',
                'organizer' => $_POST['edit_organizer'] ?? null,
                'department' => $_POST['edit_department'] ?? null,
                'academic_year' => $_POST['edit_academic_year'] ?? '2027-2028',
                'participation_mode' => $_POST['edit_participation_mode'] ?? 'Individual',
                'start_date' => $edit_start,
                'end_date' => $edit_end,
                'status' => $status,
                'id' => $_POST['event_id'] ?? 0
            ]);
            $success_msg = "Event updated successfully!";
            $active_tab = 'events';
        } catch (PDOException $e) { $error_msg = "Error updating event."; }
    }

    if ($_POST['action'] == 'add_type') {
        try {
            $stmt = $pdo->prepare("INSERT INTO event_types (type_name) VALUES (:type_name)");
            $stmt->execute(['type_name' => trim($_POST['new_type_name'])]);
            $success_msg = "New event type added!";
            $active_tab = 'events';
        } catch (PDOException $e) { $error_msg = "Error adding type."; }
    }

    if ($_POST['action'] == 'edit_type') {
        try {
            $stmt = $pdo->prepare("UPDATE event_types SET type_name = :type_name WHERE id = :id");
            $stmt->execute(['type_name' => trim($_POST['edit_type_name']), 'id' => $_POST['type_id']]);
            $success_msg = "Event type updated!";
            $active_tab = 'events';
        } catch (PDOException $e) { $error_msg = "Error updating type."; }
    }

    if ($_POST['action'] == 'add_organizer') {
        try {
            $stmt = $pdo->prepare("INSERT INTO organizers (organizer_name) VALUES (:name)");
            $stmt->execute(['name' => trim($_POST['new_organizer_name'])]);
            $success_msg = "Organizer added successfully!";
            $active_tab = 'events';
        } catch (PDOException $e) { $error_msg = "Error adding organizer."; }
    }

    if ($_POST['action'] == 'edit_organizer') {
        try {
            $stmt = $pdo->prepare("UPDATE organizers SET organizer_name = :name WHERE id = :id");
            $stmt->execute(['name' => trim($_POST['edit_organizer_name']), 'id' => $_POST['organizer_id']]);
            $success_msg = "Organizer updated successfully!";
            $active_tab = 'events';
        } catch (PDOException $e) { $error_msg = "Error updating organizer."; }
    }

    if ($_POST['action'] == 'add_department') {
        try {
            $stmt = $pdo->prepare("INSERT INTO departments (department_name, department_code) VALUES (:name, :code)");
            $stmt->execute([
                'name' => trim($_POST['new_department_name']),
                'code' => trim($_POST['new_department_code'] ?? '')
            ]);
            $success_msg = "Department added successfully!";
            $active_tab = 'events';
        } catch (PDOException $e) { $error_msg = "Error adding department."; }
    }

    if ($_POST['action'] == 'edit_department') {
        try {
            $stmt = $pdo->prepare("UPDATE departments SET department_name = :name, department_code = :code WHERE id = :id");
            $stmt->execute([
                'name' => trim($_POST['edit_department_name']),
                'code' => trim($_POST['edit_department_code'] ?? ''),
                'id' => $_POST['department_id']
            ]);
            $success_msg = "Department updated successfully!";
            $active_tab = 'events';
        } catch (PDOException $e) { $error_msg = "Error updating department."; }
    }

    // --- EVENT PORTIONS / SEGMENTS ACTIONS ---
    if ($_POST['action'] == 'add_portion') {
        $event_id = (int)$_POST['portion_event_id'];
        $portion_name = trim($_POST['portion_name']);
        $percentage = (float)$_POST['portion_percentage'];
        $order_number = !empty($_POST['portion_order_number']) ? (int)$_POST['portion_order_number'] : 1;
        $status = $_POST['portion_status'] ?? 'Upcoming';

        try {
            // Check total weight
            $chk = $pdo->prepare("SELECT COALESCE(SUM(percentage), 0) FROM event_portions WHERE event_id = ?");
            $chk->execute([$event_id]);
            $curr_total = (float)$chk->fetchColumn();

            if (($curr_total + $percentage) > 100) {
                $error_msg = "Warning: Adding this portion ({$percentage}%) exceeds 100% total weight (current: {$curr_total}%). Please adjust percentages.";
            } else {
                $stmt = $pdo->prepare("INSERT INTO event_portions (event_id, portion_name, percentage, order_number, status) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$event_id, $portion_name, $percentage, $order_number, $status]);
                $success_msg = "Portion/Segment '{$portion_name}' successfully added!";
            }
            $active_tab = 'events';
        } catch (PDOException $e) {
            $error_msg = "Error adding portion: " . $e->getMessage();
        }
    }

    if ($_POST['action'] == 'edit_portion') {
        $portion_id = (int)$_POST['edit_portion_id'];
        $event_id = (int)$_POST['edit_portion_event_id'];
        $portion_name = trim($_POST['edit_portion_name']);
        $percentage = (float)$_POST['edit_portion_percentage'];
        $order_number = (int)$_POST['edit_portion_order_number'];
        $status = $_POST['edit_portion_status'] ?? 'Upcoming';

        try {
            $chk = $pdo->prepare("SELECT COALESCE(SUM(percentage), 0) FROM event_portions WHERE event_id = ? AND id != ?");
            $chk->execute([$event_id, $portion_id]);
            $other_total = (float)$chk->fetchColumn();

            if (($other_total + $percentage) > 100) {
                $error_msg = "Warning: Updating this portion ({$percentage}%) exceeds 100% total weight. Adjust other portions first.";
            } else {
                $stmt = $pdo->prepare("UPDATE event_portions SET portion_name = ?, percentage = ?, order_number = ?, status = ? WHERE id = ?");
                $stmt->execute([$portion_name, $percentage, $order_number, $status, $portion_id]);
                $success_msg = "Portion '{$portion_name}' updated successfully!";
            }
            $active_tab = 'events';
        } catch (PDOException $e) {
            $error_msg = "Error updating portion: " . $e->getMessage();
        }
    }

    if ($_POST['action'] == 'assign_judges') {
        $event_id = $_POST['assign_event_id'];
        $selected_judges = $_POST['judges'] ?? []; 
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("DELETE FROM event_judges WHERE event_id = :event_id");
            $stmt->execute(['event_id' => $event_id]);

            if (!empty($selected_judges)) {
                $insert_stmt = $pdo->prepare("INSERT INTO event_judges (event_id, user_id) VALUES (:event_id, :user_id)");
                foreach ($selected_judges as $jid) {
                    $insert_stmt->execute(['event_id' => $event_id, 'user_id' => $jid]);
                }
            }
            $pdo->commit();
            $success_msg = "Judges successfully assigned!";
            $active_tab = 'events';
        } catch (PDOException $e) {
            $pdo->rollBack();
            $error_msg = "Error assigning judges.";
        }
    }

    // --- ENLIST PARTICIPANTS (INDIVIDUAL ROSTER MANAGEMENT) ---
    if ($_POST['action'] == 'sync_roster') {
        $event_id = $_POST['roster_event_id'];
        $selected_registry_ids = $_POST['registry_ids'] ?? [];
        
        try {
            $current_stmt = $pdo->prepare("SELECT registry_id FROM candidates WHERE event_id = ? AND registry_id IS NOT NULL");
            $current_stmt->execute([$event_id]);
            $current_ids = $current_stmt->fetchAll(PDO::FETCH_COLUMN);
            
            $to_remove = array_diff($current_ids, $selected_registry_ids);
            if (!empty($to_remove)) {
                $in = implode(',', array_fill(0, count($to_remove), '?'));
                $del_stmt = $pdo->prepare("DELETE FROM candidates WHERE event_id = ? AND registry_id IN ($in)");
                $del_stmt->execute(array_merge([$event_id], $to_remove));
            }
            
            $to_add = array_diff($selected_registry_ids, $current_ids);
            if (!empty($to_add)) {
                $max_stmt = $pdo->prepare("SELECT MAX(order_number) FROM candidates WHERE event_id = ?");
                $max_stmt->execute([$event_id]);
                $next_order = (int)$max_stmt->fetchColumn() + 1;
                
                $reg_stmt = $pdo->prepare("SELECT * FROM participants_registry WHERE id = ?");
                $ins_stmt = $pdo->prepare("INSERT INTO candidates (event_id, registry_id, name, course_id, year_level, image_path, order_number) VALUES (?, ?, ?, ?, ?, ?, ?)");
                
                foreach ($to_add as $rid) {
                    $reg_stmt->execute([$rid]);
                    $p = $reg_stmt->fetch(PDO::FETCH_ASSOC);
                    if ($p) {
                        $ins_stmt->execute([$event_id, $p['id'], $p['name'], $p['course_id'], $p['year_level'], $p['image_path'], $next_order]);
                        $next_order++;
                    }
                }
            }
            
            resequenceEventCandidates($pdo, $event_id);
            $success_msg = "Individual roster updated successfully!";
            $active_tab = 'events';
        } catch (PDOException $e) { $error_msg = "Error updating event roster."; }
    }

    // --- ENLIST PARTICIPANTS (TEAM ROSTER MANAGEMENT) ---
    if ($_POST['action'] == 'add_team_roster') {
        $event_id = $_POST['roster_event_id'];
        $team_name = trim($_POST['team_name']);
        $order_number = (int)$_POST['team_entry_number'];
        $member_ids = $_POST['registry_ids'] ?? [];
        
        $member_names = [];
        $members_ids_str = null;
        if (!empty($member_ids)) {
            $in = implode(',', array_fill(0, count($member_ids), '?'));
            $mem_stmt = $pdo->prepare("SELECT name FROM participants_registry WHERE id IN ($in)");
            $mem_stmt->execute($member_ids);
            $member_names = $mem_stmt->fetchAll(PDO::FETCH_COLUMN);
            $members_ids_str = implode(',', $member_ids);
        }
        $members_list = implode(', ', $member_names);
        
        try {
            $stmt = $pdo->prepare("INSERT INTO candidates (event_id, name, team_members, team_registry_ids, order_number) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$event_id, $team_name, $members_list, $members_ids_str, $order_number]);
            $success_msg = "Team successfully added to the roster!";
            $active_tab = 'events';
        } catch (PDOException $e) { $error_msg = "Error adding team."; }
    }

    // --- PARTICIPANT REGISTRY ACTIONS ---
    if ($_POST['action'] == 'add_participant') {
        $image_path = null;
        if (!empty($_POST['cropped_avatar'])) {
            $image_parts = explode(";base64,", $_POST['cropped_avatar']);
            if (count($image_parts) == 2) {
                $image_base64 = base64_decode($image_parts[1]);
                $filename = 'cand_' . time() . '_' . rand(100,999) . '.png';
                file_put_contents($upload_dir . $filename, $image_base64);
                $image_path = $filename;
            }
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO participants_registry (name, course_id, year_level, image_path) VALUES (:name, :course_id, :year_level, :image_path)");
            $stmt->execute([
                'name' => $_POST['participant_name'],
                'course_id' => !empty($_POST['course_id']) ? $_POST['course_id'] : null,
                'year_level' => !empty($_POST['year_level']) ? $_POST['year_level'] : null,
                'image_path' => $image_path
            ]);
            $success_msg = "Participant successfully registered!";
            $active_tab = 'participants';
        } catch (PDOException $e) { $error_msg = "Error registering participant."; }
    }
    
    if ($_POST['action'] == 'edit_participant') {
        $id = $_POST['participant_id'];
        $image_query_part = "";
        $params = [
            'name' => $_POST['edit_name'],
            'course_id' => !empty($_POST['edit_course_id']) ? $_POST['edit_course_id'] : null,
            'year_level' => !empty($_POST['edit_year_level']) ? $_POST['edit_year_level'] : null,
            'id' => $id
        ];

        if (!empty($_POST['edit_cropped_avatar'])) {
            $image_parts = explode(";base64,", $_POST['edit_cropped_avatar']);
            if (count($image_parts) == 2) {
                $image_base64 = base64_decode($image_parts[1]);
                $filename = 'cand_' . time() . '_' . rand(100,999) . '.png';
                file_put_contents($upload_dir . $filename, $image_base64);
                $image_query_part = ", image_path = :image_path";
                $params['image_path'] = $filename;
            }
        }

        try {
            $stmt = $pdo->prepare("UPDATE participants_registry SET name = :name, course_id = :course_id, year_level = :year_level $image_query_part WHERE id = :id");
            $stmt->execute($params);
            
            $sync_stmt = $pdo->prepare("UPDATE candidates SET name = :name, course_id = :course_id, year_level = :year_level $image_query_part WHERE registry_id = :id");
            $sync_stmt->execute($params);

            $success_msg = "Participant profile updated successfully!";
            $active_tab = 'participants';
        } catch (PDOException $e) { $error_msg = "Error updating participant."; }
    }

    if ($_POST['action'] == 'bulk_delete_participants' && !empty($_POST['selected_ids'])) {
        try {
            $inQuery = implode(',', array_fill(0, count($_POST['selected_ids']), '?'));
            $stmt = $pdo->prepare("DELETE FROM participants_registry WHERE id IN ($inQuery)");
            $stmt->execute($_POST['selected_ids']);
            
            $success_msg = count($_POST['selected_ids']) . " participants deleted from the registry.";
            $active_tab = 'participants';
        } catch (PDOException $e) { $error_msg = "Error during bulk deletion."; }
    }

    if ($_POST['action'] == 'import_csv') {
        if (isset($_FILES['csv_file']) && $_FILES['csv_file']['error'] == 0) {
            $file = fopen($_FILES['csv_file']['tmp_name'], 'r');
            fgetcsv($file); 
            $imported_count = 0;
            try {
                $pdo->beginTransaction();
                $stmt = $pdo->prepare("INSERT INTO participants_registry (name) VALUES (:name)");
                while (($row = fgetcsv($file)) !== FALSE) {
                    if (!empty($row[0])) {
                        $stmt->execute(['name' => trim($row[0])]);
                        $imported_count++;
                    }
                }
                $pdo->commit();
                $success_msg = "$imported_count participants imported into the registry!";
                $active_tab = 'participants';
            } catch (PDOException $e) {
                $pdo->rollBack();
                $error_msg = "Database error during import.";
            }
            fclose($file);
        }
    }

    if ($_POST['action'] == 'add_course') {
        try {
            $stmt = $pdo->prepare("INSERT INTO courses (course_name) VALUES (:name)");
            $stmt->execute(['name' => trim($_POST['new_course_name'])]);
            $success_msg = "Course added successfully!";
            $active_tab = 'participants';
        } catch (PDOException $e) { $error_msg = "Error adding course."; }
    }

    if ($_POST['action'] == 'edit_course') {
        try {
            $stmt = $pdo->prepare("UPDATE courses SET course_name = :name WHERE id = :id");
            $stmt->execute(['name' => trim($_POST['edit_course_name']), 'id' => $_POST['course_id']]);
            $success_msg = "Course updated successfully!";
            $active_tab = 'participants';
        } catch (PDOException $e) { $error_msg = "Error updating course."; }
    }
}

// ==========================================
// HANDLE GET REQUESTS (Deletions & Status Override)
// ==========================================
if (isset($_GET['mark_completed_id'])) {
    try {
        $stmt = $pdo->prepare("UPDATE events SET status = 'Completed' WHERE id = :id");
        $stmt->execute(['id' => $_GET['mark_completed_id']]);
        $success_msg = "Event manually marked as Completed!";
        $active_tab = 'events';
    } catch (PDOException $e) { $error_msg = "Error marking event as completed."; }
}

if (isset($_GET['delete_event_id'])) {
    try {
        $stmt = $pdo->prepare("DELETE FROM events WHERE id = :id");
        $stmt->execute(['id' => $_GET['delete_event_id']]);
        $success_msg = "Event deleted successfully!";
        $active_tab = 'events';
    } catch (PDOException $e) { $error_msg = "Error deleting event."; }
}

if (isset($_GET['delete_type_id'])) {
    try {
        $stmt = $pdo->prepare("DELETE FROM event_types WHERE id = :id");
        $stmt->execute(['id' => $_GET['delete_type_id']]);
        $success_msg = "Event type deleted successfully!";
        $active_tab = 'events';
    } catch (PDOException $e) { $error_msg = "Error deleting type."; }
}

if (isset($_GET['delete_organizer_id'])) {
    try {
        $stmt = $pdo->prepare("DELETE FROM organizers WHERE id = :id");
        $stmt->execute(['id' => $_GET['delete_organizer_id']]);
        $success_msg = "Organizer deleted successfully!";
        $active_tab = 'events';
    } catch (PDOException $e) { $error_msg = "Error deleting organizer."; }
}

if (isset($_GET['delete_department_id'])) {
    try {
        $stmt = $pdo->prepare("DELETE FROM departments WHERE id = :id");
        $stmt->execute(['id' => $_GET['delete_department_id']]);
        $success_msg = "Department deleted successfully!";
        $active_tab = 'events';
    } catch (PDOException $e) { $error_msg = "Error deleting department."; }
}

if (isset($_GET['delete_portion_id'])) {
    try {
        $stmt = $pdo->prepare("DELETE FROM event_portions WHERE id = :id");
        $stmt->execute(['id' => $_GET['delete_portion_id']]);
        $success_msg = "Portion/Segment deleted successfully!";
        $active_tab = 'events';
    } catch (PDOException $e) { $error_msg = "Error deleting portion."; }
}

if (isset($_GET['delete_roster_id'])) {
    try {
        $stmt = $pdo->prepare("SELECT event_id FROM candidates WHERE id = ?");
        $stmt->execute([$_GET['delete_roster_id']]);
        $ev_id = $stmt->fetchColumn();

        $pdo->prepare("DELETE FROM candidates WHERE id = ?")->execute([$_GET['delete_roster_id']]);
        if ($ev_id) resequenceEventCandidates($pdo, $ev_id);
        $success_msg = "Entry removed from event roster!";
        $active_tab = 'events';
    } catch (PDOException $e) { $error_msg = "Error removing roster entry."; }
}

if (isset($_GET['delete_participant_id'])) {
    try {
        $stmt = $pdo->prepare("DELETE FROM participants_registry WHERE id = :id");
        $stmt->execute(['id' => $_GET['delete_participant_id']]);
        $success_msg = "Participant removed from the system!";
        $active_tab = 'participants';
    } catch (PDOException $e) { $error_msg = "Error deleting participant."; }
}

if (isset($_GET['delete_course_id'])) {
    try {
        $stmt = $pdo->prepare("DELETE FROM courses WHERE id = :id");
        $stmt->execute(['id' => $_GET['delete_course_id']]);
        $success_msg = "Course deleted successfully!";
        $active_tab = 'participants';
    } catch (PDOException $e) { $error_msg = "Error deleting course. It may be assigned to candidates."; }
}

// ==========================================
// FETCH GLOBALS FOR DROPDOWNS & MODALS
// ==========================================
$type_stmt = $pdo->query("SELECT * FROM event_types ORDER BY type_name ASC");
$event_types = $type_stmt->fetchAll(PDO::FETCH_ASSOC);

$org_stmt = $pdo->query("SELECT * FROM organizers ORDER BY organizer_name ASC");
$organizers_list = $org_stmt->fetchAll(PDO::FETCH_ASSOC);

$dept_stmt = $pdo->query("SELECT * FROM departments ORDER BY department_name ASC");
$departments_list = $dept_stmt->fetchAll(PDO::FETCH_ASSOC);

$judges_stmt = $pdo->query("SELECT id, full_name, username FROM users WHERE role = 'judge' AND approval_status = 'approved' ORDER BY full_name ASC");
$all_judges = $judges_stmt->fetchAll(PDO::FETCH_ASSOC);

$courses_stmt = $pdo->query("SELECT id, course_name FROM courses ORDER BY course_name ASC");
$courses_list = $courses_stmt->fetchAll(PDO::FETCH_ASSOC);

$all_registry_stmt = $pdo->query("SELECT id, name FROM participants_registry ORDER BY name ASC");
$all_registry_participants = $all_registry_stmt->fetchAll(PDO::FETCH_ASSOC);

// ==========================================
// SEARCH & PAGINATION FOR EVENT TAB
// ==========================================
$search_e = isset($_GET['search_e']) ? trim($_GET['search_e']) : '';
$search_param_e = "%$search_e%";
$limit_e = 5; 
$page_e = isset($_GET['page_e']) && is_numeric($_GET['page_e']) ? (int)$_GET['page_e'] : 1;
$offset_e = ($page_e - 1) * $limit_e;

$total_stmt_e = $pdo->prepare("SELECT COUNT(*) FROM events WHERE name LIKE :search OR type LIKE :search");
$total_stmt_e->execute(['search' => $search_param_e]);
$total_events = $total_stmt_e->fetchColumn();
$total_pages_e = ceil($total_events / $limit_e);

// We fetch team_registry_ids directly in the GROUP_CONCAT now to identify grouped participants
$stmt_e = $pdo->prepare("
    SELECT e.*, 
           (SELECT GROUP_CONCAT(user_id) FROM event_judges WHERE event_id = e.id) as assigned_judges_ids,
           (SELECT GROUP_CONCAT(u.full_name SEPARATOR '||') FROM event_judges ej JOIN users u ON ej.user_id = u.id WHERE ej.event_id = e.id) as assigned_judges_names,
           (SELECT GROUP_CONCAT(CONCAT(id, '::', name, '::', order_number, '::', IFNULL(team_members, ''), '::', IFNULL(registry_id, ''), '::', IFNULL(team_registry_ids, '')) ORDER BY order_number ASC SEPARATOR '||') FROM candidates WHERE event_id = e.id) as assigned_candidates_data,
           (SELECT GROUP_CONCAT(CONCAT(id, '::', portion_name, '::', percentage, '::', order_number, '::', status) ORDER BY order_number ASC SEPARATOR '||') FROM event_portions WHERE event_id = e.id) as portions_data,
           (SELECT COUNT(*) FROM event_portions WHERE event_id = e.id) as portions_count,
           (SELECT COALESCE(SUM(percentage), 0) FROM event_portions WHERE event_id = e.id) as portions_total_weight
    FROM events e 
    WHERE e.name LIKE :search OR e.type LIKE :search 
    ORDER BY e.start_date DESC 
    LIMIT :limit OFFSET :offset
");
$stmt_e->bindValue(':search', $search_param_e, PDO::PARAM_STR);
$stmt_e->bindValue(':limit', $limit_e, PDO::PARAM_INT);
$stmt_e->bindValue(':offset', $offset_e, PDO::PARAM_INT);
$stmt_e->execute();
$events = $stmt_e->fetchAll(PDO::FETCH_ASSOC);

// ==========================================
// SEARCH & PAGINATION FOR PARTICIPANT REGISTRY TAB
// ==========================================
$search_p = isset($_GET['search_p']) ? trim($_GET['search_p']) : '';
$search_param_p = "%$search_p%";
$limit_p = 7; 
$page_p = isset($_GET['page_p']) && is_numeric($_GET['page_p']) ? (int)$_GET['page_p'] : 1;
$offset_p = ($page_p - 1) * $limit_p;

$total_stmt_p = $pdo->prepare("
    SELECT COUNT(*) FROM participants_registry pr 
    LEFT JOIN courses crs ON pr.course_id = crs.id
    WHERE pr.name LIKE :search OR crs.course_name LIKE :search
");
$total_stmt_p->execute(['search' => $search_param_p]);
$total_participants = $total_stmt_p->fetchColumn();
$total_pages_p = ceil($total_participants / $limit_p);

$stmt_p = $pdo->prepare("
    SELECT pr.*, crs.course_name 
    FROM participants_registry pr 
    LEFT JOIN courses crs ON pr.course_id = crs.id
    WHERE pr.name LIKE :search OR crs.course_name LIKE :search
    ORDER BY pr.name ASC 
    LIMIT :limit OFFSET :offset
");
$stmt_p->bindValue(':search', $search_param_p, PDO::PARAM_STR);
$stmt_p->bindValue(':limit', $limit_p, PDO::PARAM_INT);
$stmt_p->bindValue(':offset', $offset_p, PDO::PARAM_INT);
$stmt_p->execute();
$participants = $stmt_p->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enlistment | ASTS Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" rel="stylesheet">
    
    <style>
        * { -webkit-tap-highlight-color: transparent !important; }
        :focus { outline: none !important; }
        input, textarea, select, .form-control { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; cursor: text; }
        a, button, .btn, label, .input-group-text, .event-shortcut-card, .page-link, select, option { cursor: pointer; }

        body { background-color: #F4F7F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: default; }
        .main-content { min-height: 100vh; background-color: #F8F9FA; }

        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }

        .btn-amber { background-color: #FFBF00; color: #0A192F; border: 2px solid #FFBF00; font-weight: 700; transition: all 0.3s ease; }
        .btn-amber:hover { background-color: #e6ac00; color: #0A192F; border-color: #e6ac00; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .btn-outline-midnight { color: #0A192F; border: 2px solid #0A192F; font-weight: 600; transition: all 0.3s ease; }
        .btn-outline-midnight:hover { background-color: #0A192F; color: white; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

        .btn-squircle { width: 38px; height: 38px; border-radius: 12px !important; display: inline-flex; align-items: center; justify-content: center; padding: 0; transition: all 0.2s ease; border: none; }
        .btn-assign { background-color: rgba(10, 25, 47, 0.1); color: #0A192F; }
        .btn-assign:hover { background-color: #0A192F; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(10, 25, 47, 0.3); }
        .btn-portions { background-color: rgba(255, 191, 0, 0.18); color: #996e00; }
        .btn-portions:hover { background-color: #FFBF00; color: #0A192F !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(255, 191, 0, 0.4); }
        .btn-edit { background-color: rgba(13, 110, 253, 0.1); color: #0d6efd; }
        .btn-edit:hover { background-color: #0d6efd; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(13,110,253,0.3); }
        .btn-delete { background-color: rgba(220, 53, 69, 0.1); color: #dc3545; }
        .btn-delete:hover { background-color: #dc3545; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(220,53,69,0.3); }
        
        .btn-complete { background-color: rgba(25, 135, 84, 0.1); color: #198754; }
        .btn-complete:hover { background-color: #198754; color: white !important; transform: scale(1.08); box-shadow: 0 4px 10px rgba(25,135,84,0.3); }

        .modal-content .btn:not(.btn-close) { border-radius: 12px; transition: all 0.3s ease; }
        .modal-content .form-control, .modal-content .form-select { border-radius: 12px; }
        
        .search-wrapper { position: relative; max-width: 350px; }
        .search-wrapper .bi-search { position: absolute; top: 50%; left: 1.2rem; transform: translateY(-50%); color: #6c757d; font-size: 1.1rem; }
        .search-wrapper .form-control { border-radius: 16px; padding-left: 2.8rem; background-color: transparent; border: 1.5px solid #dee2e6; box-shadow: none; transition: all 0.2s ease; }
        .search-wrapper .form-control:focus { border-color: #0A192F; box-shadow: 0 0 0 4px rgba(10, 25, 47, 0.1); }

        .table-custom-header th { background-color: #0A192F !important; color: #FFFFFF !important; font-weight: 600; border-bottom: none; padding: 1rem; }
        .table-hover tbody tr:hover { background-color: rgba(255, 191, 0, 0.05); }
        .table-card { border: none; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.05); overflow: hidden; }

        .modal-header-custom { background-color: #0A192F; color: white; border-bottom: 4px solid #FFBF00; }
        .modal-header-custom .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
        
        .pagination .page-link { color: #0A192F; border: 1px solid #dee2e6; border-radius: 8px; margin: 0 2px; }
        .pagination .page-item.active .page-link { background-color: #0A192F; border-color: #0A192F; color: white; }

        .event-row { transition: background-color 0.2s ease; cursor: pointer; }
        .event-row:hover { background-color: rgba(255, 191, 0, 0.08) !important; }

        .avatar-img { width: 45px; height: 45px; object-fit: cover; border-radius: 50%; border: 2px solid #dee2e6; background-color: #fff;}
        .avatar-icon { font-size: 2.5rem; color: #adb5bd; line-height: 1; }
        
        .form-check-input { cursor: pointer; width: 1.2rem; height: 1.2rem; margin-top: 0.15rem; }
        .form-check-input:checked { background-color: #0A192F; border-color: #0A192F; }
        .form-check-input:disabled { cursor: not-allowed; }

        .cropper-view-box, .cropper-face { border-radius: 50%; } 
        .crop-container { width: 100%; max-height: 350px; display: none; margin-top: 1rem; border: 2px dashed #dee2e6; padding: 10px; border-radius: 12px; background-color: #f8f9fa;}
        .crop-container img { max-width: 100%; display: block; }
        
        .view-avatar { width: 100px; height: 100px; object-fit: cover; border-radius: 50%; border: 3px solid #0A192F; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

        .nav-pills .nav-link { color: #6c757d; font-weight: 600; border-radius: 8px; transition: all 0.2s; margin-bottom: 5px;}
        .nav-pills .nav-link.active { background-color: #0A192F; color: #FFBF00; }
        
        .participant-checkbox-item { cursor: pointer; transition: background-color 0.2s ease; }
        .participant-checkbox-item:hover { background-color: rgba(255, 191, 0, 0.05); }
    </style>
</head>
<body class="d-flex">

    <?php include '../includes/admin_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom flex-wrap gap-3">
            <div>
                <h2 class="fw-bolder text-midnight mb-0">Enlistment Module</h2>
                <p class="text-muted small mb-0 mt-1">Manage all your events and participant registries centrally.</p>
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

        <!-- ENLISTMENT TAB NAVIGATION -->
        <ul class="nav nav-pills mb-4 flex-wrap gap-2" id="enlistmentTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link px-4 <?= $active_tab == 'events' ? 'active' : '' ?>" id="events-tab" data-bs-toggle="pill" data-bs-target="#events_pane" type="button" role="tab" onclick="updateUrlTab('events')">
                    <i class="bi bi-calendar-event me-2"></i> Event Management
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link px-4 <?= $active_tab == 'participants' ? 'active' : '' ?>" id="participants-tab" data-bs-toggle="pill" data-bs-target="#participants_pane" type="button" role="tab" onclick="updateUrlTab('participants')">
                    <i class="bi bi-people me-2"></i> Participant Registry
                </button>
            </li>
        </ul>

        <div class="tab-content" id="enlistmentTabsContent">
            
            <!-- ============================================== -->
            <!-- TAB 1: EVENT MANAGEMENT -->
            <!-- ============================================== -->
            <div class="tab-pane fade <?= $active_tab == 'events' ? 'show active' : '' ?>" id="events_pane" role="tabpanel">
                <div class="card table-card">
                    <div class="card-header bg-white border-0 pt-4 pb-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <form method="GET" action="enlistment.php" id="searchEventForm" class="m-0">
                            <input type="hidden" name="tab" value="events">
                            <div class="search-wrapper">
                                <i class="bi bi-search"></i>
                                <input type="text" class="form-control" name="search_e" id="searchEventInput" placeholder="Search events..." value="<?= htmlspecialchars($search_e) ?>" autocomplete="off">
                            </div>
                        </form>
                        <div class="d-flex align-items-center gap-2">
                            <button type="button" class="btn btn-outline-midnight px-3 py-2 rounded-pill shadow-sm fw-bold small" data-bs-toggle="modal" data-bs-target="#unifiedRegistriesModal">
                                <i class="bi bi-sliders me-1 text-amber"></i> Manage Registries
                            </button>
                            <button type="button" class="btn btn-amber px-3 py-2 rounded-pill shadow-sm fw-bold small" data-bs-toggle="modal" data-bs-target="#addEventModal">
                                <i class="bi bi-plus-circle-fill me-1"></i> Add Event
                            </button>
                        </div>
                    </div>

                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table align-middle mb-0">
                                <thead class="table-custom-header">
                                    <tr>
                                        <th class="ps-4">Name of Event</th>
                                        <th>Event Type</th>
                                        <th>Date Schedule</th>
                                        <th>Status</th>
                                        <th class="text-center pe-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white">
                                    <?php if (count($events) > 0): ?>
                                        <?php foreach ($events as $event): ?>
                                            <tr class="event-row"
                                                data-id="<?= $event['id'] ?>"
                                                data-name="<?= htmlspecialchars($event['name']) ?>"
                                                data-desc="<?= htmlspecialchars($event['description'] ?? 'No description provided.') ?>"
                                                data-type="<?= htmlspecialchars($event['type']) ?>"
                                                data-organizer="<?= htmlspecialchars($event['organizer'] ?? 'Not Assigned') ?>"
                                                data-department="<?= htmlspecialchars($event['department'] ?? 'Not Assigned') ?>"
                                                data-academicyear="<?= htmlspecialchars($event['academic_year'] ?? '') ?>"
                                                data-mode="<?= htmlspecialchars($event['participation_mode'] ?? 'Individual') ?>"
                                                data-startdate="<?= $event['start_date'] ?>"
                                                data-enddate="<?= $event['end_date'] ?>"
                                                data-daterange="<?= formatEventDate($event['start_date'], $event['end_date']) ?>"
                                                data-judgesnames="<?= htmlspecialchars($event['assigned_judges_names'] ?? '') ?>"
                                                data-candidatesdata="<?= htmlspecialchars($event['assigned_candidates_data'] ?? '') ?>"
                                                data-portionsdata="<?= htmlspecialchars($event['portions_data'] ?? '') ?>"
                                                data-portionscount="<?= (int)($event['portions_count'] ?? 0) ?>"
                                                data-portionstotalweight="<?= (float)($event['portions_total_weight'] ?? 0) ?>"
                                                title="Click to view event details and manage roster">
                                                
                                                <td class="fw-bold ps-4 text-midnight fs-6">
                                                    <?= htmlspecialchars($event['name']) ?>
                                                    <?php if($event['participation_mode'] == 'Team'): ?>
                                                        <span class="badge bg-secondary ms-1 small" style="font-size: 0.65rem;">Group / Team</span>
                                                    <?php endif; ?>
                                                    <?php if(!empty($event['portions_count']) && $event['portions_count'] > 0): ?>
                                                        <span class="badge bg-warning text-dark border ms-1 small" style="font-size: 0.68rem;">
                                                            <i class="bi bi-diagram-3-fill me-1"></i><?= $event['portions_count'] ?> Portions (<?= number_format((float)$event['portions_total_weight'], 0) ?>%)
                                                        </span>
                                                    <?php endif; ?>
                                                    <?php if(!empty($event['department']) && $event['department'] !== 'Not Assigned'): ?>
                                                        <div class="small text-muted fw-normal mt-1"><i class="bi bi-mortarboard me-1 text-amber"></i><?= htmlspecialchars($event['department']) ?> <?= !empty($event['academic_year']) ? '<span class="badge bg-light text-secondary border ms-1">A.Y. ' . htmlspecialchars($event['academic_year']) . '</span>' : '' ?></div>
                                                    <?php endif; ?>
                                                </td>
                                                <td><span class="badge bg-light text-dark border"><?= htmlspecialchars($event['type']) ?></span></td>
                                                <td><i class="bi bi-calendar-range text-muted me-1"></i> <?= formatEventDate($event['start_date'], $event['end_date']) ?></td>
                                                <td><?= getStatusBadge($event['status']) ?></td>
                                                
                                                <td class="text-center pe-4 action-cell" onclick="event.stopPropagation();">
                                                    
                                                    <?php if($event['status'] !== 'Completed'): ?>
                                                        <a href="enlistment.php?tab=events&mark_completed_id=<?= $event['id'] ?>" class="btn btn-squircle btn-complete me-1" 
                                                           onclick="return confirm('Manually mark this event as Completed? This will lock scoring and finalize the results.');" title="Mark as Completed">
                                                            <i class="bi bi-check-circle-fill fs-5"></i>
                                                        </a>
                                                    <?php else: ?>
                                                        <button type="button" class="btn btn-squircle me-1" style="background-color: rgba(108, 117, 125, 0.1); color: #6c757d; cursor: not-allowed;" title="Event is Completed" disabled>
                                                            <i class="bi bi-check-circle-fill fs-5"></i>
                                                        </button>
                                                    <?php endif; ?>

                                                    <button type="button" class="btn btn-squircle btn-portions me-1 manage-portions-btn" 
                                                        data-id="<?= $event['id'] ?>" 
                                                        data-name="<?= htmlspecialchars($event['name']) ?>"
                                                        title="Manage Portions / Segments (<?= (int)$event['portions_count'] ?> configured)">
                                                        <i class="bi bi-diagram-3-fill fs-5"></i>
                                                    </button>

                                                    <button type="button" class="btn btn-squircle btn-assign me-1 assign-btn" 
                                                        data-bs-toggle="modal" data-bs-target="#assignJudgesModal"
                                                        data-id="<?= $event['id'] ?>" 
                                                        data-name="<?= htmlspecialchars($event['name']) ?>"
                                                        data-judges="<?= htmlspecialchars($event['assigned_judges_ids'] ?? '') ?>"
                                                        title="Assign Judges">
                                                        <i class="bi bi-person-lines-fill fs-5"></i>
                                                    </button>
                                                    
                                                    <button type="button" class="btn btn-squircle btn-edit me-1 edit-event-btn" 
                                                        data-bs-toggle="modal" data-bs-target="#editEventModal"
                                                        data-id="<?= $event['id'] ?>" data-name="<?= htmlspecialchars($event['name']) ?>"
                                                        data-desc="<?= htmlspecialchars($event['description'] ?? '') ?>"
                                                        data-type="<?= htmlspecialchars($event['type']) ?>" 
                                                        data-organizer="<?= htmlspecialchars($event['organizer'] ?? '') ?>"
                                                        data-department="<?= htmlspecialchars($event['department'] ?? '') ?>"
                                                        data-academicyear="<?= htmlspecialchars($event['academic_year'] ?? '') ?>"
                                                        data-mode="<?= htmlspecialchars($event['participation_mode'] ?? 'Individual') ?>"
                                                        data-startdate="<?= $event['start_date'] ?>"
                                                        data-enddate="<?= $event['end_date'] ?>"
                                                        title="Edit Event">
                                                        <i class="bi bi-pencil-square fs-5"></i>
                                                    </button>
                                                    
                                                    <a href="enlistment.php?tab=events&delete_event_id=<?= $event['id'] ?>" class="btn btn-squircle btn-delete" 
                                                        onclick="return confirm('Are you sure you want to permanently delete \'<?= htmlspecialchars(addslashes($event['name'])) ?>\'?');" title="Delete Event">
                                                        <i class="bi bi-trash3-fill fs-5"></i>
                                                    </a>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <tr><td colspan="5" class="text-center py-4 text-muted">No events found matching your search.</td></tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                        <span class="text-muted small fw-semibold">
                            Showing <?= min(($offset_e + 1), max(1, $total_events)) ?> to <?= min(($offset_e + $limit_e), $total_events) ?> of <?= $total_events ?> events
                        </span>
                        <?php if ($total_pages_e > 1): ?>
                        <nav aria-label="Events pagination">
                            <ul class="pagination pagination-sm mb-0">
                                <li class="page-item <?= ($page_e <= 1) ? 'disabled' : '' ?>"><a class="page-link" href="?tab=events&page_e=<?= $page_e - 1 ?>&search_e=<?= urlencode($search_e) ?>">Previous</a></li>
                                <?php for($i = 1; $i <= $total_pages_e; $i++): ?>
                                    <li class="page-item <?= ($page_e == $i) ? 'active' : '' ?>"><a class="page-link" href="?tab=events&page_e=<?= $i ?>&search_e=<?= urlencode($search_e) ?>"><?= $i ?></a></li>
                                <?php endfor; ?>
                                <li class="page-item <?= ($page_e >= $total_pages_e) ? 'disabled' : '' ?>"><a class="page-link" href="?tab=events&page_e=<?= $page_e + 1 ?>&search_e=<?= urlencode($search_e) ?>">Next</a></li>
                            </ul>
                        </nav>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- ============================================== -->
            <!-- TAB 2: PARTICIPANT REGISTRY -->
            <!-- ============================================== -->
            <div class="tab-pane fade <?= $active_tab == 'participants' ? 'show active' : '' ?>" id="participants_pane" role="tabpanel">

                <div class="card table-card">
                    <div class="card-header bg-white border-0 pt-4 pb-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <form method="GET" action="enlistment.php" id="searchParticipantForm" class="m-0">
                            <input type="hidden" name="tab" value="participants">
                            <div class="search-wrapper">
                                <i class="bi bi-search"></i>
                                <input type="text" class="form-control" name="search_p" id="searchParticipantInput" placeholder="Search registry..." value="<?= htmlspecialchars($search_p) ?>" autocomplete="off">
                            </div>
                        </form>

                        <div id="bulkActionContainer" style="display: none;">
                            <form action="enlistment.php?tab=participants" method="POST" id="bulkDeleteForm" onsubmit="return confirm('Are you sure you want to delete all selected participants from the registry? They will be removed from all associated events.');">
                                <input type="hidden" name="action" value="bulk_delete_participants">
                                <div id="bulkInputs"></div>
                                <button type="submit" class="btn btn-danger fw-bold rounded-pill shadow-sm px-4">
                                    <i class="bi bi-trash3-fill me-2"></i> Delete (<span id="bulkCount">0</span>)
                                </button>
                            </form>
                        </div>

                        <div class="d-flex align-items-center gap-2">
                            <button type="button" class="btn btn-outline-midnight px-3 py-2 rounded-pill shadow-sm fw-bold small" data-bs-toggle="modal" data-bs-target="#importCSVModal">
                                <i class="bi bi-filetype-csv me-1 text-success"></i> Bulk Import
                            </button>
                            <button type="button" class="btn btn-amber px-4 py-2 rounded-pill shadow-sm fw-bold small" data-bs-toggle="modal" data-bs-target="#addParticipantModal">
                                <i class="bi bi-person-plus-fill me-2"></i> Register Participant
                            </button>
                        </div>
                    </div>

                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-custom-header">
                                    <tr>
                                        <th width="5%" class="text-center ps-4">
                                            <input class="form-check-input" type="checkbox" id="selectAllCheckbox">
                                        </th>
                                        <th width="10%">Avatar</th>
                                        <th>Participant Name</th>
                                        <th>Course & Year</th>
                                        <th class="text-center pe-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white">
                                    <?php if (count($participants) > 0): ?>
                                        <?php foreach ($participants as $participant): ?>
                                            <tr>
                                                <td class="text-center ps-4">
                                                    <input class="form-check-input row-checkbox" type="checkbox" value="<?= $participant['id'] ?>">
                                                </td>
                                                <td>
                                                    <?php if (!empty($participant['image_path'])): ?>
                                                        <img src="<?= $upload_dir . htmlspecialchars($participant['image_path']) ?>" alt="Avatar" class="avatar-img shadow-sm">
                                                    <?php else: ?>
                                                        <i class="bi bi-person-circle avatar-icon"></i>
                                                    <?php endif; ?>
                                                </td>
                                                <td class="fw-bold px-3 fs-5 text-midnight">
                                                    <?= htmlspecialchars($participant['name']) ?>
                                                </td>
                                                <td>
                                                    <span class="d-block fw-semibold text-midnight"><?= htmlspecialchars($participant['course_name'] ?? 'Not Assigned') ?></span>
                                                    <span class="small text-muted"><?= htmlspecialchars($participant['year_level'] ?? '') ?></span>
                                                </td>
                                                <td class="text-center pe-4 action-cell">
                                                    <button type="button" class="btn btn-squircle btn-edit me-1 edit-participant-btn" 
                                                        data-bs-toggle="modal" data-bs-target="#editParticipantModal"
                                                        data-id="<?= $participant['id'] ?>" 
                                                        data-name="<?= htmlspecialchars($participant['name']) ?>"
                                                        data-courseid="<?= $participant['course_id'] ?>"
                                                        data-yearlevel="<?= htmlspecialchars($participant['year_level']) ?>"
                                                        title="Edit Participant Profile">
                                                        <i class="bi bi-pencil-square fs-5"></i>
                                                    </button>
                                                    <a href="enlistment.php?tab=participants&delete_participant_id=<?= $participant['id'] ?>" class="btn btn-squircle btn-delete" 
                                                       onclick="return confirm('Are you sure you want to permanently delete \'<?= htmlspecialchars(addslashes($participant['name'])) ?>\' from the registry? They will be removed from all past and current events.');" title="Delete from Registry">
                                                        <i class="bi bi-trash3-fill fs-5"></i>
                                                    </a>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <tr><td colspan="5" class="text-center py-5 text-muted"><i class="bi bi-people fs-1 d-block mb-2"></i>No participants found in the registry.</td></tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                        <span class="text-muted small fw-semibold">
                            Showing <?= min(($offset_p + 1), max(1, $total_participants)) ?> to <?= min(($offset_p + $limit_p), $total_participants) ?> of <?= $total_participants ?> entries
                        </span>
                        <?php if ($total_pages_p > 1): ?>
                        <nav aria-label="Pagination">
                            <ul class="pagination pagination-sm mb-0">
                                <li class="page-item <?= ($page_p <= 1) ? 'disabled' : '' ?>"><a class="page-link" href="?tab=participants&page_p=<?= $page_p - 1 ?>&search_p=<?= urlencode($search_p) ?>">Previous</a></li>
                                <?php for($i = 1; $i <= $total_pages_p; $i++): ?>
                                    <li class="page-item <?= ($page_p == $i) ? 'active' : '' ?>"><a class="page-link" href="?tab=participants&page_p=<?= $i ?>&search_p=<?= urlencode($search_p) ?>"><?= $i ?></a></li>
                                <?php endfor; ?>
                                <li class="page-item <?= ($page_p >= $total_pages_p) ? 'disabled' : '' ?>"><a class="page-link" href="?tab=participants&page_p=<?= $page_p + 1 ?>&search_p=<?= urlencode($search_p) ?>">Next</a></li>
                            </ul>
                        </nav>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

        </div> <!-- End Tab Content -->
    </div> <!-- End Main Content -->

    <!-- ============================================== -->
    <!-- MODALS: EVENT MANAGEMENT -->
    <!-- ============================================== -->
    <div class="modal fade" id="addEventModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-calendar-plus me-2 text-amber"></i> Create Event</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=events" method="POST">
                    <input type="hidden" name="action" value="add_event">
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Name of Event</label>
                            <input type="text" class="form-control" name="event_name" placeholder="e.g. Mr. & Ms. ASC Pageant 2026" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Event Description</label>
                            <textarea class="form-control" name="event_description" rows="2" placeholder="Brief background or theme..."></textarea>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Department / College</label>
                                <select class="form-select" name="event_department" required>
                                    <option value="" selected disabled>Select Department...</option>
                                    <?php foreach($departments_list as $dept): ?>
                                        <option value="<?= htmlspecialchars($dept['department_name']) ?>">
                                            <?= htmlspecialchars($dept['department_name']) ?><?= !empty($dept['department_code']) ? ' (' . htmlspecialchars($dept['department_code']) . ')' : '' ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Academic Year</label>
                                <input type="text" class="form-control" name="academic_year" placeholder="e.g. 2027-2028" value="2027-2028" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Event Type</label>
                                <select class="form-select" name="event_type" id="add_event_type_select" required>
                                    <option value="" selected disabled>Select Type...</option>
                                    <?php foreach($event_types as $type): ?>
                                        <option value="<?= htmlspecialchars($type['type_name']) ?>"><?= htmlspecialchars($type['type_name']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Organizer</label>
                                <select class="form-select" name="event_organizer" required>
                                    <option value="" selected disabled>Select Organizer...</option>
                                    <?php foreach($organizers_list as $org): ?>
                                        <option value="<?= htmlspecialchars($org['organizer_name']) ?>"><?= htmlspecialchars($org['organizer_name']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Mode</label>
                                <select class="form-select" name="participation_mode" required>
                                    <option value="Individual" selected>Individual</option>
                                    <option value="Team">Team / Group</option>
                                </select>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Start Date</label>
                                <input type="date" class="form-control" name="start_date" required>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label fw-semibold text-midnight small">End Date</label>
                                <input type="date" class="form-control" name="end_date" required>
                            </div>
                        </div>

                        <!-- AUTOMATIC PAGEANT SEGMENTS & CRITERIA INITIALIZER PANEL -->
                        <div id="pageant_template_section" class="mt-3 p-3 rounded-3 border" style="background-color: #F8F9FA; display: none;">
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <h6 class="fw-bold text-midnight mb-0">
                                    <i class="bi bi-stars text-amber me-1"></i> Standard Pageant 4-Segment Scoring Preset
                                </h6>
                                <span class="badge bg-warning text-dark border fw-bold">Auto-Configured (100%)</span>
                            </div>
                            <p class="small text-muted mb-3">
                                When creating a Pageant event, the system will automatically initialize the <strong>4 core segments</strong> with their tailored scoring criteria:
                            </p>

                            <div class="row g-2 mb-3">
                                <div class="col-md-6">
                                    <div class="card h-100 border-0 shadow-sm p-2 bg-white">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="fw-bold text-midnight small"><i class="bi bi-chat-quote-fill text-primary me-1"></i> 1. Personal Interview</span>
                                            <span class="badge bg-light text-dark border">25%</span>
                                        </div>
                                        <ul class="list-unstyled small text-muted mb-0 ps-2" style="font-size: 0.78rem;">
                                            <li>• Poise & Articulation (40%)</li>
                                            <li>• Intelligence & Depth of Thought (40%)</li>
                                            <li>• Overall Personality & Impact (20%)</li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card h-100 border-0 shadow-sm p-2 bg-white">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="fw-bold text-midnight small"><i class="bi bi-person-walking text-info me-1"></i> 2. Swimsuit / Fitness</span>
                                            <span class="badge bg-light text-dark border">25%</span>
                                        </div>
                                        <ul class="list-unstyled small text-muted mb-0 ps-2" style="font-size: 0.78rem;">
                                            <li>• Stage Presence & Poise (40%)</li>
                                            <li>• Physical Fitness & Carriage (40%)</li>
                                            <li>• Audience Impact & Projection (20%)</li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card h-100 border-0 shadow-sm p-2 bg-white">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="fw-bold text-midnight small"><i class="bi bi-award-fill text-warning me-1"></i> 3. Evening Gown</span>
                                            <span class="badge bg-light text-dark border">25%</span>
                                        </div>
                                        <ul class="list-unstyled small text-muted mb-0 ps-2" style="font-size: 0.78rem;">
                                            <li>• Elegance & Carriage (40%)</li>
                                            <li>• Gown Fit & Stage Presentation (40%)</li>
                                            <li>• Overall Glamour & Poise (20%)</li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card h-100 border-0 shadow-sm p-2 bg-white">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="fw-bold text-midnight small"><i class="bi bi-mic-fill text-danger me-1"></i> 4. Final Q&A</span>
                                            <span class="badge bg-light text-dark border">25%</span>
                                        </div>
                                        <ul class="list-unstyled small text-muted mb-0 ps-2" style="font-size: 0.78rem;">
                                            <li>• Clarity & Confidence (40%)</li>
                                            <li>• Content & Substance (40%)</li>
                                            <li>• Delivery & Wit (20%)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" name="setup_pageant_preset" value="1" id="setup_pageant_preset_cb" checked>
                                <label class="form-check-label fw-bold text-midnight small" for="setup_pageant_preset_cb">
                                    Automatically generate these 4 segments & their criteria upon creating this event
                                </label>
                            </div>
                        </div>

                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-outline-secondary fw-semibold" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-midnight fw-semibold" style="background-color: #0A192F; color: white;">Save & Create Event</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="editEventModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-pencil-square me-2 text-amber"></i> Edit Event</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=events" method="POST">
                    <input type="hidden" name="action" value="edit_event">
                    <input type="hidden" name="event_id" id="edit_event_id_field"> 
                    <div class="modal-body p-4">
                        <div class="mb-3"><label class="form-label fw-semibold text-midnight small">Name of Event</label><input type="text" class="form-control" name="edit_name" id="edit_event_name" required></div>
                        <div class="mb-3"><label class="form-label fw-semibold text-midnight small">Description</label><textarea class="form-control" name="edit_description" id="edit_event_description" rows="2"></textarea></div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Department / College</label>
                                <select class="form-select" name="edit_department" id="edit_event_department" required>
                                    <option value="" disabled>Select Department...</option>
                                    <?php foreach($departments_list as $dept): ?>
                                        <option value="<?= htmlspecialchars($dept['department_name']) ?>">
                                            <?= htmlspecialchars($dept['department_name']) ?><?= !empty($dept['department_code']) ? ' (' . htmlspecialchars($dept['department_code']) . ')' : '' ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Academic Year</label>
                                <input type="text" class="form-control" name="edit_academic_year" id="edit_event_academic_year" placeholder="e.g. 2027-2028" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Event Type</label>
                                <select class="form-select" name="edit_type" id="edit_event_type" required>
                                    <?php foreach($event_types as $type): ?><option value="<?= htmlspecialchars($type['type_name']) ?>"><?= htmlspecialchars($type['type_name']) ?></option><?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Organizer</label>
                                <select class="form-select" name="edit_organizer" id="edit_event_organizer" required>
                                    <?php foreach($organizers_list as $org): ?><option value="<?= htmlspecialchars($org['organizer_name']) ?>"><?= htmlspecialchars($org['organizer_name']) ?></option><?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Mode</label>
                                <select class="form-select" name="edit_participation_mode" id="edit_event_participation_mode" required>
                                    <option value="Individual">Individual</option>
                                    <option value="Team">Team / Group</option>
                                </select>
                            </div>
                            <div class="col-md-4 mb-3"><label class="form-label fw-semibold text-midnight small">Start Date</label><input type="date" class="form-control" name="edit_start_date" id="edit_event_start_date" required></div>
                            <div class="col-md-4 mb-3"><label class="form-label fw-semibold text-midnight small">End Date</label><input type="date" class="form-control" name="edit_end_date" id="edit_event_end_date" required></div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0"><button type="submit" class="btn btn-primary fw-semibold">Update Event</button></div>
                </form>
            </div>
        </div>
    </div>

    <!-- ============================================== -->
    <!-- UNIFIED MODAL: ALL REGISTRIES MANAGEMENT       -->
    <!-- (Event Types, Organizers, Departments)        -->
    <!-- ============================================== -->
    <div class="modal fade" id="unifiedRegistriesModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <div>
                        <h5 class="modal-title fw-bold mb-0">
                            <i class="bi bi-sliders me-2 text-amber"></i> System Registries & Categories
                        </h5>
                        <p class="text-white-50 small mb-0 mt-1">Manage Event Types, Host Organizers, and Academic Departments in one centralized place</p>
                    </div>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <!-- Nav Tabs Pills -->
                    <ul class="nav nav-pills nav-fill mb-4 p-1 bg-light rounded-pill border" id="registriesTab" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active rounded-pill fw-bold small py-2 d-flex align-items-center justify-content-center gap-2" id="reg-types-tab" data-bs-toggle="pill" data-bs-target="#reg-types-pane" type="button" role="tab">
                                <i class="bi bi-tags-fill text-amber"></i>
                                <span>Event Types</span>
                                <span class="badge bg-white text-midnight border shadow-sm ms-1"><?= count($event_types) ?></span>
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link rounded-pill fw-bold small py-2 d-flex align-items-center justify-content-center gap-2" id="reg-orgs-tab" data-bs-toggle="pill" data-bs-target="#reg-orgs-pane" type="button" role="tab">
                                <i class="bi bi-person-lines-fill text-amber"></i>
                                <span>Organizers</span>
                                <span class="badge bg-white text-midnight border shadow-sm ms-1"><?= count($organizers_list) ?></span>
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link rounded-pill fw-bold small py-2 d-flex align-items-center justify-content-center gap-2" id="reg-depts-tab" data-bs-toggle="pill" data-bs-target="#reg-depts-pane" type="button" role="tab">
                                <i class="bi bi-mortarboard-fill text-amber"></i>
                                <span>Departments / Colleges</span>
                                <span class="badge bg-white text-midnight border shadow-sm ms-1"><?= count($departments_list) ?></span>
                            </button>
                        </li>
                    </ul>

                    <!-- Tab Content -->
                    <div class="tab-content" id="registriesTabContent">
                        
                        <!-- TAB 1: EVENT TYPES -->
                        <div class="tab-pane fade show active" id="reg-types-pane" role="tabpanel">
                            <div class="card border-0 bg-light p-3 rounded-3 mb-3">
                                <form action="enlistment.php?tab=events" method="POST">
                                    <input type="hidden" name="action" value="add_type">
                                    <label class="form-label small fw-semibold text-midnight mb-1">Add New Event Classification / Type</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" name="new_type_name" placeholder="e.g. Pageant, Academic Quiz, Sports Tournament" required>
                                        <button class="btn btn-midnight fw-bold px-3" style="background-color: #0A192F; color: white;" type="submit">
                                            <i class="bi bi-plus-lg me-1"></i> Add Type
                                        </button>
                                    </div>
                                </form>
                            </div>
                            
                            <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                                <h6 class="fw-bold text-midnight small text-uppercase mb-0">Registered Event Types</h6>
                                <span class="text-muted small">Total: <?= count($event_types) ?></span>
                            </div>

                            <div class="table-responsive rounded-3 border bg-white" style="max-height: 280px; overflow-y: auto;">
                                <table class="table align-middle mb-0 table-hover">
                                    <thead class="table-light">
                                        <tr class="small text-muted">
                                            <th class="ps-3" width="10%">#</th>
                                            <th>Event Type Name</th>
                                            <th class="text-center pe-3" width="130">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php if(count($event_types) > 0): ?>
                                            <?php $t_idx = 1; foreach ($event_types as $type): ?>
                                                <tr>
                                                    <td class="ps-3 text-muted small fw-semibold"><?= $t_idx++ ?></td>
                                                    <td class="fw-semibold text-midnight">
                                                        <i class="bi bi-tag-fill text-amber me-2"></i><?= htmlspecialchars($type['type_name']) ?>
                                                    </td>
                                                    <td class="text-center pe-3">
                                                        <button type="button" class="btn btn-sm text-primary edit-type-btn" 
                                                            data-bs-toggle="modal" data-bs-target="#editTypeModal" 
                                                            data-typeid="<?= $type['id'] ?>" 
                                                            data-typename="<?= htmlspecialchars($type['type_name']) ?>" 
                                                            title="Edit Type">
                                                            <i class="bi bi-pencil-square fs-6"></i>
                                                        </button>
                                                        <a href="enlistment.php?tab=events&delete_type_id=<?= $type['id'] ?>" class="btn btn-sm text-danger" 
                                                            onclick="return confirm('Delete event type \'<?= htmlspecialchars(addslashes($type['type_name'])) ?>\'?');" 
                                                            title="Delete Type">
                                                            <i class="bi bi-trash3-fill fs-6"></i>
                                                        </a>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        <?php else: ?>
                                            <tr><td colspan="3" class="text-center py-4 text-muted">No event types registered yet.</td></tr>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- TAB 2: ORGANIZERS -->
                        <div class="tab-pane fade" id="reg-orgs-pane" role="tabpanel">
                            <div class="card border-0 bg-light p-3 rounded-3 mb-3">
                                <form action="enlistment.php?tab=events" method="POST">
                                    <input type="hidden" name="action" value="add_organizer">
                                    <label class="form-label small fw-semibold text-midnight mb-1">Add New Event Organizer / Host Body</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" name="new_organizer_name" placeholder="e.g. Supreme Student Council (SSC), College Dept" required>
                                        <button class="btn btn-midnight fw-bold px-3" style="background-color: #0A192F; color: white;" type="submit">
                                            <i class="bi bi-plus-lg me-1"></i> Add Organizer
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                                <h6 class="fw-bold text-midnight small text-uppercase mb-0">Registered Organizers</h6>
                                <span class="text-muted small">Total: <?= count($organizers_list) ?></span>
                            </div>

                            <div class="table-responsive rounded-3 border bg-white" style="max-height: 280px; overflow-y: auto;">
                                <table class="table align-middle mb-0 table-hover">
                                    <thead class="table-light">
                                        <tr class="small text-muted">
                                            <th class="ps-3" width="10%">#</th>
                                            <th>Organizer Name</th>
                                            <th class="text-center pe-3" width="130">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php if(count($organizers_list) > 0): ?>
                                            <?php $o_idx = 1; foreach ($organizers_list as $org): ?>
                                                <tr>
                                                    <td class="ps-3 text-muted small fw-semibold"><?= $o_idx++ ?></td>
                                                    <td class="fw-semibold text-midnight">
                                                        <i class="bi bi-building text-primary me-2"></i><?= htmlspecialchars($org['organizer_name']) ?>
                                                    </td>
                                                    <td class="text-center pe-3">
                                                        <button type="button" class="btn btn-sm text-primary edit-organizer-btn" 
                                                            data-bs-toggle="modal" data-bs-target="#editOrganizerModal" 
                                                            data-orgid="<?= $org['id'] ?>" 
                                                            data-orgname="<?= htmlspecialchars($org['organizer_name']) ?>" 
                                                            title="Edit Organizer">
                                                            <i class="bi bi-pencil-square fs-6"></i>
                                                        </button>
                                                        <a href="enlistment.php?tab=events&delete_organizer_id=<?= $org['id'] ?>" class="btn btn-sm text-danger" 
                                                            onclick="return confirm('Delete organizer \'<?= htmlspecialchars(addslashes($org['organizer_name'])) ?>\'?');" 
                                                            title="Delete Organizer">
                                                            <i class="bi bi-trash3-fill fs-6"></i>
                                                        </a>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        <?php else: ?>
                                            <tr><td colspan="3" class="text-center py-4 text-muted">No organizers registered yet.</td></tr>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- TAB 3: DEPARTMENTS -->
                        <div class="tab-pane fade" id="reg-depts-pane" role="tabpanel">
                            <div class="card border-0 bg-light p-3 rounded-3 mb-3">
                                <form action="enlistment.php?tab=events" method="POST">
                                    <input type="hidden" name="action" value="add_department">
                                    <label class="form-label small fw-semibold text-midnight mb-1">Add New Academic Department / College</label>
                                    <div class="row g-2">
                                        <div class="col-md-7">
                                            <input type="text" class="form-control" name="new_department_name" placeholder="Department / Program Name" required>
                                        </div>
                                        <div class="col-md-5">
                                            <div class="input-group">
                                                <input type="text" class="form-control" name="new_department_code" placeholder="Code (e.g. BSIT)">
                                                <button class="btn btn-midnight fw-bold px-3" style="background-color: #0A192F; color: white;" type="submit">
                                                    <i class="bi bi-plus-lg me-1"></i> Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                                <h6 class="fw-bold text-midnight small text-uppercase mb-0">Registered Departments & Programs</h6>
                                <span class="text-muted small">Total: <?= count($departments_list) ?></span>
                            </div>

                            <div class="table-responsive rounded-3 border bg-white" style="max-height: 280px; overflow-y: auto;">
                                <table class="table align-middle mb-0 table-hover">
                                    <thead class="table-light">
                                        <tr class="small text-muted">
                                            <th class="ps-3" width="8%">#</th>
                                            <th>Department / College Name</th>
                                            <th width="110">Code</th>
                                            <th class="text-center pe-3" width="130">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php if(count($departments_list) > 0): ?>
                                            <?php $d_idx = 1; foreach ($departments_list as $dept): ?>
                                                <tr>
                                                    <td class="ps-3 text-muted small fw-semibold"><?= $d_idx++ ?></td>
                                                    <td class="fw-semibold text-midnight">
                                                        <i class="bi bi-mortarboard-fill text-success me-2"></i><?= htmlspecialchars($dept['department_name']) ?>
                                                    </td>
                                                    <td>
                                                        <?php if(!empty($dept['department_code'])): ?>
                                                            <span class="badge bg-light text-midnight border fw-bold"><?= htmlspecialchars($dept['department_code']) ?></span>
                                                        <?php else: ?>
                                                            <span class="text-muted small">-</span>
                                                        <?php endif; ?>
                                                    </td>
                                                    <td class="text-center pe-3">
                                                        <button type="button" class="btn btn-sm text-primary edit-department-btn" 
                                                            data-bs-toggle="modal" data-bs-target="#editDepartmentModal" 
                                                            data-deptid="<?= $dept['id'] ?>" 
                                                            data-deptname="<?= htmlspecialchars($dept['department_name']) ?>" 
                                                            data-deptcode="<?= htmlspecialchars($dept['department_code'] ?? '') ?>" 
                                                            title="Edit Department">
                                                            <i class="bi bi-pencil-square fs-6"></i>
                                                        </button>
                                                        <a href="enlistment.php?tab=events&delete_department_id=<?= $dept['id'] ?>" class="btn btn-sm text-danger" 
                                                            onclick="return confirm('Delete department \'<?= htmlspecialchars(addslashes($dept['department_name'])) ?>\'?');" 
                                                            title="Delete Department">
                                                            <i class="bi bi-trash3-fill fs-6"></i>
                                                        </a>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        <?php else: ?>
                                            <tr><td colspan="4" class="text-center py-4 text-muted">No departments registered yet.</td></tr>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
                <div class="modal-footer bg-light border-0">
                    <button type="button" class="btn btn-outline-secondary fw-semibold px-4" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Event Type Modal -->
    <div class="modal fade" id="editTypeModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-light">
                    <h6 class="modal-title fw-bold text-midnight"><i class="bi bi-pencil-square text-amber me-1"></i> Edit Event Type</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=events" method="POST">
                    <input type="hidden" name="action" value="edit_type">
                    <input type="hidden" name="type_id" id="edit_type_id_input">
                    <div class="modal-body p-3">
                        <label class="form-label small fw-semibold text-midnight mb-1">Type Name</label>
                        <input type="text" class="form-control" name="edit_type_name" id="edit_type_name_input" required>
                    </div>
                    <div class="modal-footer p-2 border-0">
                        <button type="submit" class="btn btn-primary w-100 fw-bold">Update Type</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Edit Organizer Modal -->
    <div class="modal fade" id="editOrganizerModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-light">
                    <h6 class="modal-title fw-bold text-midnight"><i class="bi bi-pencil-square text-amber me-1"></i> Edit Organizer</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=events" method="POST">
                    <input type="hidden" name="action" value="edit_organizer">
                    <input type="hidden" name="organizer_id" id="edit_organizer_id_input">
                    <div class="modal-body p-3">
                        <label class="form-label small fw-semibold text-midnight mb-1">Organizer Name</label>
                        <input type="text" class="form-control" name="edit_organizer_name" id="edit_organizer_name_input" required>
                    </div>
                    <div class="modal-footer p-2 border-0">
                        <button type="submit" class="btn btn-primary w-100 fw-bold">Update Organizer</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Edit Department Modal -->
    <div class="modal fade" id="editDepartmentModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-light">
                    <h6 class="modal-title fw-bold text-midnight"><i class="bi bi-pencil-square text-amber me-1"></i> Edit Department</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=events" method="POST">
                    <input type="hidden" name="action" value="edit_department">
                    <input type="hidden" name="department_id" id="edit_dept_id_input">
                    <div class="modal-body p-3">
                        <div class="mb-3">
                            <label class="form-label small fw-semibold text-midnight">Department Name</label>
                            <input type="text" class="form-control" name="edit_department_name" id="edit_dept_name_input" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-semibold text-midnight">Department Code / Abbreviation</label>
                            <input type="text" class="form-control" name="edit_department_code" id="edit_dept_code_input">
                        </div>
                    </div>
                    <div class="modal-footer p-2 border-0">
                        <button type="submit" class="btn btn-primary w-100 fw-bold">Update Department</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal: Manage Event Portions / Segments -->
    <div class="modal fade" id="managePortionsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-diagram-3-fill me-2 text-amber"></i> Manage Event Portions & Segments</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <div class="mb-4 pb-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div>
                            <span class="text-muted small fw-semibold text-uppercase">Event</span>
                            <h4 class="fw-bolder text-midnight mb-0" id="portions_event_name_display">Event Name</h4>
                        </div>
                        <div class="text-end">
                            <span class="small fw-bold text-midnight d-block">Configured Weight</span>
                            <span class="badge fs-6 rounded-pill bg-light text-dark border" id="portions_total_weight_badge">0% / 100%</span>
                        </div>
                    </div>

                    <!-- Progress Bar for Total Weight -->
                    <div class="progress mb-4" style="height: 10px; border-radius: 6px;">
                        <div class="progress-bar bg-warning text-dark fw-bold" id="portions_weight_progressbar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>

                    <!-- Add Portion Form -->
                    <div class="card border-0 bg-light rounded-3 p-3 mb-4 shadow-sm">
                        <h6 class="fw-bold text-midnight mb-2"><i class="bi bi-plus-circle-fill text-amber me-1"></i> Add New Portion / Segment</h6>
                        <p class="text-muted small mb-3">Define segments like <em>Swimwear</em>, <em>Talent Competition</em>, <em>Evening Gown</em>, or <em>Q&A Portion</em>.</p>
                        <form action="enlistment.php?tab=events" method="POST" id="addPortionForm">
                            <input type="hidden" name="action" value="add_portion">
                            <input type="hidden" name="portion_event_id" id="portion_event_id_input">
                            <div class="row g-2 align-items-end">
                                <div class="col-md-5">
                                    <label class="form-label small fw-semibold text-midnight mb-1">Portion Name</label>
                                    <input type="text" class="form-control form-control-sm" name="portion_name" placeholder="e.g. Swimwear, Talent, Evening Gown" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small fw-semibold text-midnight mb-1">Weight (%)</label>
                                    <input type="number" class="form-control form-control-sm" name="portion_percentage" placeholder="e.g. 25" min="1" max="100" step="0.01" required>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label small fw-semibold text-midnight mb-1">Order #</label>
                                    <input type="number" class="form-control form-control-sm" name="portion_order_number" id="portion_order_number_input" min="1" value="1" required>
                                </div>
                                <div class="col-md-2">
                                    <button type="submit" class="btn btn-midnight btn-sm w-100 fw-bold" style="background-color: #0A192F; color: white;">
                                        <i class="bi bi-plus-lg me-1"></i> Add
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- Existing Portions List Table -->
                    <h6 class="fw-bold text-midnight mb-2">Configured Portions / Rounds</h6>
                    <div class="table-responsive bg-white rounded-3 border">
                        <table class="table align-middle mb-0">
                            <thead class="table-light">
                                <tr class="small text-muted text-uppercase">
                                    <th width="10%" class="ps-3">Order</th>
                                    <th>Portion / Segment Name</th>
                                    <th width="18%">Weight</th>
                                    <th width="20%">Status</th>
                                    <th width="18%" class="text-center pe-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="portions_table_body">
                                <tr><td colspan="5" class="text-center py-3 text-muted">Loading portions...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer bg-light border-0">
                    <button type="button" class="btn btn-outline-secondary fw-semibold" data-bs-dismiss="modal">Close</button>
                    <a href="criteria.php" id="portions_goto_criteria_btn" class="btn btn-amber fw-bold"><i class="bi bi-ui-checks-grid me-1"></i> Configure Criteria</a>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal: Edit Portion -->
    <div class="modal fade" id="editPortionModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-midnight text-white">
                    <h6 class="modal-title fw-bold"><i class="bi bi-pencil-square me-2 text-amber"></i> Edit Portion / Segment</h6>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=events" method="POST">
                    <input type="hidden" name="action" value="edit_portion">
                    <input type="hidden" name="edit_portion_id" id="edit_portion_id_field">
                    <input type="hidden" name="edit_portion_event_id" id="edit_portion_event_id_field">
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Portion / Segment Name</label>
                            <input type="text" class="form-control" name="edit_portion_name" id="edit_portion_name_field" required>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Weight Percentage (%)</label>
                                <input type="number" class="form-control" name="edit_portion_percentage" id="edit_portion_percentage_field" min="1" max="100" step="0.01" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-semibold text-midnight small">Order Sequence</label>
                                <input type="number" class="form-control" name="edit_portion_order_number" id="edit_portion_order_number_field" min="1" required>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-semibold text-midnight small">Portion Status</label>
                            <select class="form-select" name="edit_portion_status" id="edit_portion_status_field">
                                <option value="Upcoming">Upcoming</option>
                                <option value="Ongoing">Ongoing (Live for scoring)</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-outline-secondary fw-semibold" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary fw-semibold">Update Portion</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="assignJudgesModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-person-lines-fill me-2 text-amber"></i> Assign Judges</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=events" method="POST">
                    <input type="hidden" name="action" value="assign_judges">
                    <input type="hidden" name="assign_event_id" id="assign_event_id">
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <h6 class="fw-bolder text-midnight fs-5 mb-0" id="assign_event_name_display">Event Name</h6>
                        </div>
                        <div class="list-group shadow-sm" style="max-height: 300px; overflow-y: auto;">
                            <?php foreach($all_judges as $judge): ?>
                                <label class="list-group-item d-flex gap-3 align-items-center p-3 border-0 border-bottom">
                                    <input class="form-check-input flex-shrink-0 fs-5 judge-checkbox" type="checkbox" name="judges[]" value="<?= $judge['id'] ?>">
                                    <span class="pt-1"><strong class="text-midnight"><?= htmlspecialchars($judge['full_name']) ?></strong></span>
                                </label>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0"><button type="submit" class="btn btn-primary fw-semibold">Save Assignments</button></div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal: View Event Details -->
    <div class="modal fade" id="viewEventModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-info-circle-fill me-2 text-amber"></i> Event Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4 p-md-5">
                    <div class="mb-4 text-center">
                        <span class="badge bg-light text-dark border mb-2" id="view_event_type"></span>
                        <h3 class="fw-bolder text-midnight mb-2" id="view_event_name"></h3>
                        <div class="d-flex justify-content-center gap-3 flex-wrap">
                            <span class="text-muted small fw-semibold"><i class="bi bi-calendar-range me-1 text-amber"></i> <span id="view_event_date"></span></span>
                            <span class="text-muted small fw-semibold"><i class="bi bi-mortarboard me-1 text-amber"></i> <span id="view_event_dept"></span></span>
                            <span class="text-muted small fw-semibold"><i class="bi bi-person-lines-fill me-1 text-amber"></i> <span id="view_event_org"></span></span>
                            <span class="text-muted small fw-semibold"><i class="bi bi-calendar3 me-1 text-amber"></i> A.Y. <span id="view_event_ay"></span></span>
                        </div>
                    </div>

                    <!-- Portions / Segments Section in View Modal -->
                    <div class="mb-4 bg-light p-3 rounded-3 border" id="view_event_portions_section">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="fw-bold text-midnight mb-0"><i class="bi bi-diagram-3-fill text-amber me-2"></i>Event Portions / Segments</h6>
                            <button type="button" class="btn btn-sm btn-outline-midnight fw-bold py-1 px-3" id="openManagePortionsFromViewBtn">
                                <i class="bi bi-gear-fill me-1"></i> Manage Portions
                            </button>
                        </div>
                        <ul class="list-group list-group-flush mb-0" id="view_assigned_portions_list"></ul>
                    </div>

                    <div class="row g-4">
                        <div class="col-md-6">
                            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                                <h6 class="fw-bold text-midnight mb-0">Event Roster</h6>
                                <button type="button" class="btn btn-sm btn-amber fw-bold py-1 px-3" id="openAssignParticipantsBtn">
                                    <i class="bi bi-people-fill me-1"></i> Enlist Participants
                                </button>
                            </div>
                            <ul class="list-group list-group-flush mb-3" id="view_assigned_candidates_list"></ul>
                        </div>
                        <div class="col-md-6">
                            <h6 class="fw-bold text-midnight mb-3 border-bottom pb-2">Assigned Evaluators</h6>
                            <ul class="list-group list-group-flush mb-3" id="view_assigned_judges_list"></ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal: Enlist / Assign Participants (DYNAMIC MODE) -->
    <div class="modal fade" id="assignParticipantsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-midnight text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-people-fill me-2 text-amber"></i> Enlist Participants</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=events" method="POST">
                    <input type="hidden" name="action" id="roster_action_input" value="sync_roster">
                    <input type="hidden" name="roster_event_id" id="roster_event_id">
                    
                    <div class="modal-body p-4 bg-light">
                        <div class="mb-4 text-center border-bottom pb-3">
                            <span class="text-muted small fw-semibold text-uppercase">Target Event</span>
                            <h5 class="fw-bolder text-midnight mb-0 mt-1" id="roster_event_name_display">Event Name</h5>
                        </div>

                        <!-- INDIVIDUAL MODE UI -->
                        <div id="individual_desc" class="mb-3">
                            <p class="text-muted small mb-0"><i class="bi bi-info-circle me-1"></i> Check the boxes next to the participants you want to officially enlist into this event.</p>
                        </div>
                        
                        <!-- TEAM MODE UI -->
                        <div id="team_roster_section" class="d-none mb-4">
                            <div class="bg-white p-3 rounded-3 shadow-sm border mb-3">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold text-midnight small">Team / Group Name</label>
                                    <input type="text" id="team_name_input" name="team_name" class="form-control" placeholder="e.g. IT Dance Troupe">
                                </div>
                                <div>
                                    <label class="form-label fw-semibold text-midnight small">Entry Number</label>
                                    <input type="number" id="team_entry_number" name="team_entry_number" class="form-control">
                                </div>
                            </div>
                            <p id="team_desc_text" class="text-muted small mb-0"><i class="bi bi-info-circle me-1"></i> Check the boxes below to group participants into this specific team entry. Participants already assigned to another team in this event are disabled.</p>
                        </div>
                        
                        <!-- SHARED REGISTRY LIST -->
                        <div class="list-group shadow-sm bg-white" style="max-height: 250px; overflow-y: auto; border-radius: 12px; border: 1px solid #dee2e6;">
                            <?php if(count($all_registry_participants) > 0): ?>
                                <?php foreach($all_registry_participants as $rp): ?>
                                    <label class="list-group-item d-flex gap-3 align-items-center p-3 border-0 border-bottom participant-checkbox-item">
                                        <input class="form-check-input flex-shrink-0 fs-5 registry-checkbox" type="checkbox" name="registry_ids[]" value="<?= $rp['id'] ?>">
                                        <span class="pt-1"><strong class="text-midnight"><?= htmlspecialchars($rp['name']) ?></strong></span>
                                    </label>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <div class="text-center text-muted p-4">
                                    <i class="bi bi-person-x fs-1 d-block mb-2"></i>
                                    No participants found in the registry.
                                </div>
                            <?php endif; ?>
                        </div>

                    </div>
                    <div class="modal-footer bg-white border-top">
                        <button type="button" class="btn btn-outline-secondary fw-semibold" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-amber fw-bold shadow-sm">Save Roster</button>
                    </div>
                </form>
            </div>
        </div>
    </div>


    <!-- ============================================== -->
    <!-- MODALS: PARTICIPANT REGISTRY -->
    <!-- ============================================== -->
    <div class="modal fade" id="addParticipantModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-person-plus-fill me-2 text-amber"></i> Register Participant</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=participants" method="POST" id="addParticipantForm">
                    <input type="hidden" name="action" value="add_participant">
                    <div class="modal-body p-4">
                        <div class="mb-3"><label class="form-label fw-semibold text-midnight small">Participant Full Name</label><input type="text" class="form-control" name="participant_name" required></div>
                        <div class="row">
                            <div class="col-md-7 mb-3"><label class="form-label fw-semibold text-midnight small">Course</label>
                                <div class="input-group">
                                    <select class="form-select" name="course_id" required><option value="" selected disabled>Select Course...</option><?php foreach($courses_list as $c): ?><option value="<?= $c['id'] ?>"><?= htmlspecialchars($c['course_name']) ?></option><?php endforeach; ?></select>
                                    <button type="button" class="btn btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#manageCoursesModal"><i class="bi bi-gear-fill"></i></button>
                                </div>
                            </div>
                            <div class="col-md-5 mb-3"><label class="form-label fw-semibold text-midnight small">Year Level</label><select class="form-select" name="year_level" required><option value="First Year Level">First Year</option><option value="Second Year Level">Second Year</option><option value="Third Year Level">Third Year</option><option value="Fourth Year Level">Fourth Year</option></select></div>
                        </div>
                        <div class="mb-3 border-top pt-3"><label class="form-label fw-semibold text-midnight small">Upload Photo (Optional)</label><input type="file" class="form-control" id="addAvatarInput" accept="image/jpeg, image/png"><input type="hidden" name="cropped_avatar" id="addCroppedInput"></div>
                        <div class="crop-container" id="addCropContainer">
                            <p class="small text-muted fw-semibold mb-2"><i class="bi bi-crop me-1"></i> Adjust face inside circle:</p>
                            <div><img id="addCropImage" src=""></div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0"><button type="submit" class="btn btn-midnight fw-semibold" style="background-color: #0A192F; color: white;">Save to Registry</button></div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="editParticipantModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header modal-header-custom">
                    <h5 class="modal-title fw-bold"><i class="bi bi-pencil-square me-2 text-amber"></i> Edit Participant Profile</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=participants" method="POST" id="editParticipantForm">
                    <input type="hidden" name="action" value="edit_participant">
                    <input type="hidden" name="participant_id" id="edit_part_id"> 
                    <div class="modal-body p-4">
                        <div class="mb-3"><label class="form-label fw-semibold text-midnight small">Participant Full Name</label><input type="text" class="form-control" name="edit_name" id="edit_part_name" required></div>
                        <div class="row">
                            <div class="col-md-7 mb-3"><label class="form-label fw-semibold text-midnight small">Course</label><select class="form-select" name="edit_course_id" id="edit_part_course_id" required><?php foreach($courses_list as $c): ?><option value="<?= $c['id'] ?>"><?= htmlspecialchars($c['course_name']) ?></option><?php endforeach; ?></select></div>
                            <div class="col-md-5 mb-3"><label class="form-label fw-semibold text-midnight small">Year Level</label><select class="form-select" name="edit_year_level" id="edit_part_year_level" required><option value="First Year Level">First Year</option><option value="Second Year Level">Second Year</option><option value="Third Year Level">Third Year</option><option value="Fourth Year Level">Fourth Year</option></select></div>
                        </div>
                        <div class="mb-3 border-top pt-3"><label class="form-label fw-semibold text-midnight small">Update Photo (Optional)</label><input type="file" class="form-control" id="editAvatarInput" accept="image/jpeg, image/png"><input type="hidden" name="edit_cropped_avatar" id="editCroppedInput"></div>
                        <div class="crop-container" id="editCropContainer">
                            <p class="small text-muted fw-semibold mb-2"><i class="bi bi-crop me-1"></i> Adjust face inside circle:</p>
                            <div><img id="editCropImage" src=""></div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0"><button type="submit" class="btn btn-primary fw-semibold">Update Profile</button></div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="importCSVModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-midnight text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-filetype-csv me-2 text-success"></i> Bulk Import to Registry</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form action="enlistment.php?tab=participants" method="POST" enctype="multipart/form-data">
                    <input type="hidden" name="action" value="import_csv">
                    <div class="modal-body p-4">
                        <div class="mb-3"><label class="form-label fw-semibold small">Upload CSV File</label><input class="form-control" type="file" name="csv_file" accept=".csv" required></div>
                        <div class="alert alert-light border small text-muted mb-0"><h6 class="fw-bold text-dark mb-1">Formatting Rules:</h6>Your CSV must have one single column containing the <strong>Participant Names</strong> with a header row.</div>
                    </div>
                    <div class="modal-footer bg-light border-0"><button type="submit" class="btn btn-success fw-bold"><i class="bi bi-upload me-1"></i> Import Registry</button></div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="manageCoursesModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold text-midnight">Manage Courses</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <form action="enlistment.php?tab=participants" method="POST" class="mb-4">
                        <input type="hidden" name="action" value="add_course">
                        <div class="input-group"><input type="text" class="form-control" name="new_course_name" placeholder="New Course..." required><button class="btn btn-success fw-bold" type="submit">Add</button></div>
                    </form>
                    <ul class="list-group">
                        <?php foreach ($courses_list as $c): ?>
                            <li class="list-group-item d-flex justify-content-between px-2 py-1">
                                <span class="fw-semibold text-midnight small mt-1"><?= htmlspecialchars($c['course_name']) ?></span>
                                <a href="enlistment.php?tab=participants&delete_course_id=<?= $c['id'] ?>" class="btn btn-sm text-danger" onclick="return confirm('Delete?');"><i class="bi bi-trash"></i></a>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- Required Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js"></script>
    
    <script>
        // Update URL to preserve tabs on reload
        function updateUrlTab(tabName) {
            const url = new URL(window.location);
            url.searchParams.set('tab', tabName);
            window.history.pushState({}, '', url);
        }

        document.addEventListener('DOMContentLoaded', function() {
            
            // --- Live Search ---
            let typingTimer;
            const searchInputE = document.getElementById('searchEventInput');
            const searchFormE = document.getElementById('searchEventForm');
            if (searchInputE) {
                if (searchInputE.value) { searchInputE.focus(); searchInputE.setSelectionRange(searchInputE.value.length, searchInputE.value.length); }
                searchInputE.addEventListener('keyup', function() {
                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(() => { searchFormE.submit(); }, 500); 
                });
            }

            const searchInputP = document.getElementById('searchParticipantInput');
            const searchFormP = document.getElementById('searchParticipantForm');
            if (searchInputP) {
                if (searchInputP.value) { searchInputP.focus(); searchInputP.setSelectionRange(searchInputP.value.length, searchInputP.value.length); }
                searchInputP.addEventListener('keyup', function() {
                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(() => { searchFormP.submit(); }, 500); 
                });
            }

            // --- Clickable Row Logic for View Events (Opens Event Details and Roster) ---
            const viewEventModalElement = document.getElementById('viewEventModal');
            const viewEventModal = new bootstrap.Modal(viewEventModalElement);
            const assignParticipantsModal = new bootstrap.Modal(document.getElementById('assignParticipantsModal'));
            const managePortionsModal = new bootstrap.Modal(document.getElementById('managePortionsModal'));
            const editPortionModal = new bootstrap.Modal(document.getElementById('editPortionModal'));
            
            // Global storage for dynamic modes
            let currentViewedEventId = null;
            let currentViewedEventName = null;
            let currentViewedEventMode = null;
            let currentAssignedRegistryIds = [];

            // Function to load and render portions into managePortionsModal
            function loadEventPortions(eventId, eventName) {
                document.getElementById('portion_event_id_input').value = eventId;
                document.getElementById('portions_event_name_display').textContent = eventName;
                document.getElementById('portions_goto_criteria_btn').href = `criteria.php?event_filter=${eventId}`;
                
                const tableBody = document.getElementById('portions_table_body');
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading portions...</td></tr>';
                
                fetch(`enlistment.php?action=get_event_portions&event_id=${eventId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            const totalW = data.total_weight || 0;
                            const badge = document.getElementById('portions_total_weight_badge');
                            const bar = document.getElementById('portions_weight_progressbar');
                            
                            badge.textContent = `${totalW}% / 100%`;
                            if (totalW === 100) {
                                badge.className = 'badge fs-6 rounded-pill bg-success text-white';
                                bar.className = 'progress-bar bg-success';
                            } else if (totalW > 100) {
                                badge.className = 'badge fs-6 rounded-pill bg-danger text-white';
                                bar.className = 'progress-bar bg-danger';
                            } else {
                                badge.className = 'badge fs-6 rounded-pill bg-warning text-dark';
                                bar.className = 'progress-bar bg-warning text-dark';
                            }
                            bar.style.width = `${Math.min(100, totalW)}%`;
                            document.getElementById('portion_order_number_input').value = data.next_order || 1;

                            if (data.portions && data.portions.length > 0) {
                                tableBody.innerHTML = '';
                                data.portions.forEach(p => {
                                    let statusBadge = '<span class="badge bg-secondary">Upcoming</span>';
                                    if (p.status === 'Ongoing') statusBadge = '<span class="badge bg-info text-dark">Live</span>';
                                    if (p.status === 'Completed') statusBadge = '<span class="badge bg-success">Completed</span>';

                                    tableBody.innerHTML += `
                                        <tr>
                                            <td class="ps-3 fw-bold text-muted">#${p.order_number}</td>
                                            <td class="fw-bold text-midnight">${escapeHtml(p.portion_name)}</td>
                                            <td><span class="badge bg-light text-dark border fw-bold">${parseFloat(p.percentage)}%</span></td>
                                            <td>${statusBadge}</td>
                                            <td class="text-center pe-3">
                                                <button type="button" class="btn btn-sm text-primary edit-portion-inline-btn" 
                                                    data-id="${p.id}" data-eventid="${eventId}" data-name="${escapeHtml(p.portion_name)}" 
                                                    data-percentage="${p.percentage}" data-order="${p.order_number}" data-status="${p.status}">
                                                    <i class="bi bi-pencil-square fs-6"></i>
                                                </button>
                                                <a href="enlistment.php?tab=events&delete_portion_id=${p.id}" class="btn btn-sm text-danger" 
                                                    onclick="return confirm('Delete portion \\'${escapeHtml(p.portion_name)}\\'? Criteria attached to this portion will also be affected.');">
                                                    <i class="bi bi-trash3-fill fs-6"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    `;
                                });

                                // Wire up edit buttons
                                document.querySelectorAll('.edit-portion-inline-btn').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        document.getElementById('edit_portion_id_field').value = this.getAttribute('data-id');
                                        document.getElementById('edit_portion_event_id_field').value = this.getAttribute('data-eventid');
                                        document.getElementById('edit_portion_name_field').value = this.getAttribute('data-name');
                                        document.getElementById('edit_portion_percentage_field').value = this.getAttribute('data-percentage');
                                        document.getElementById('edit_portion_order_number_field').value = this.getAttribute('data-order');
                                        document.getElementById('edit_portion_status_field').value = this.getAttribute('data-status');
                                        managePortionsModal.hide();
                                        editPortionModal.show();
                                    });
                                });

                            } else {
                                tableBody.innerHTML = `
                                    <tr>
                                        <td colspan="5" class="text-center py-4 text-muted">
                                            <div class="p-4 bg-light rounded-3">
                                                <i class="bi bi-diagram-3 fs-2 d-block mb-2 text-midnight"></i>
                                                <h6 class="fw-bold text-midnight mb-1">No Portions Defined Yet</h6>
                                                <p class="small text-muted mb-3">Define custom segments using the form above, or initialize the standard 4-portion Pageant scoring setup with 1 click:</p>
                                                <a href="enlistment.php?tab=events&load_pageant_preset_event_id=${eventId}" class="btn btn-amber btn-sm fw-bold px-4 py-2 rounded-pill shadow-sm" onclick="return confirm('Initialize this event with 4 standard segments (Personal Interview, Swimsuit / Fitness, Evening Gown, Final Q&A) and scoring criteria?');">
                                                    <i class="bi bi-stars me-1"></i> ⚡ Auto-Generate 4 Pageant Segments & Criteria
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }
                        }
                    })
                    .catch(() => {
                        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-danger">Error loading portions.</td></tr>';
                    });
            }

            function escapeHtml(text) {
                const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
                return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
            }

            // Pageant Template section toggle in Create Event Modal
            const addEventTypeSelect = document.getElementById('add_event_type_select');
            const pageantTemplateSection = document.getElementById('pageant_template_section');
            const setupPageantPresetCb = document.getElementById('setup_pageant_preset_cb');

            if (addEventTypeSelect && pageantTemplateSection) {
                addEventTypeSelect.addEventListener('change', function() {
                    const selectedVal = (this.value || '').toLowerCase();
                    if (selectedVal.includes('pageant')) {
                        pageantTemplateSection.style.display = 'block';
                        if (setupPageantPresetCb) setupPageantPresetCb.checked = true;
                    } else {
                        pageantTemplateSection.style.display = 'none';
                        if (setupPageantPresetCb) setupPageantPresetCb.checked = false;
                    }
                });
            }

            // Click listener for .manage-portions-btn on Event rows
            document.querySelectorAll('.manage-portions-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const eventId = this.getAttribute('data-id');
                    const eventName = this.getAttribute('data-name');
                    loadEventPortions(eventId, eventName);
                    managePortionsModal.show();
                });
            });

            // "Manage Portions" button inside View Event Details modal
            document.getElementById('openManagePortionsFromViewBtn').addEventListener('click', function() {
                viewEventModal.hide();
                loadEventPortions(currentViewedEventId, currentViewedEventName);
                managePortionsModal.show();
            });

            document.querySelectorAll('.event-row').forEach(row => {
                row.addEventListener('click', function(e) {
                    if (e.target.closest('.action-cell')) return;
                    
                    currentViewedEventId = this.getAttribute('data-id');
                    currentViewedEventName = this.getAttribute('data-name');
                    currentViewedEventMode = this.getAttribute('data-mode'); // Individual or Team
                    
                    document.getElementById('view_event_name').textContent = currentViewedEventName;
                    document.getElementById('view_event_type').textContent = this.getAttribute('data-type');
                    document.getElementById('view_event_date').textContent = this.getAttribute('data-daterange');
                    document.getElementById('view_event_org').textContent = this.getAttribute('data-organizer') || 'Not Assigned';
                    document.getElementById('view_event_dept').textContent = this.getAttribute('data-department') || 'Not Assigned';
                    document.getElementById('view_event_ay').textContent = this.getAttribute('data-academicyear') || '2027-2028';
                    
                    // Populate Portions in View Modal
                    const portionsList = document.getElementById('view_assigned_portions_list');
                    portionsList.innerHTML = '';
                    const portionsRaw = this.getAttribute('data-portionsdata');
                    if (portionsRaw) {
                        portionsRaw.split('||').forEach(pData => {
                            const pParts = pData.split('::');
                            if (pParts.length >= 5) {
                                const pName = pParts[1];
                                const pPct = parseFloat(pParts[2]);
                                const pOrder = pParts[3];
                                const pStatus = pParts[4];
                                let statusCls = 'bg-secondary';
                                if (pStatus === 'Ongoing') statusCls = 'bg-info text-dark';
                                if (pStatus === 'Completed') statusCls = 'bg-success';
                                
                                portionsList.innerHTML += `
                                    <li class="list-group-item px-0 py-2 border-0 small d-flex justify-content-between align-items-center">
                                        <span><i class="bi bi-tag-fill text-amber me-2"></i><strong>${escapeHtml(pName)}</strong> <span class="text-muted">(${pPct}%)</span></span>
                                        <span class="badge ${statusCls}">${pStatus}</span>
                                    </li>
                                `;
                            }
                        });
                    } else {
                        portionsList.innerHTML = '<li class="list-group-item px-0 text-muted small">No specific portions defined (Scores are directly evaluated on event criteria).</li>';
                    }

                    // Populate Judges
                    const judgesList = document.getElementById('view_assigned_judges_list');
                    judgesList.innerHTML = ''; 
                    const judgesRaw = this.getAttribute('data-judgesnames');
                    if (judgesRaw) {
                        judgesRaw.split('||').forEach(jn => {
                            judgesList.innerHTML += `<li class="list-group-item px-0 py-2 border-0 small fw-semibold"><i class="bi bi-person-check-fill text-success me-2"></i> ${jn}</li>`;
                        });
                    } else { judgesList.innerHTML = '<li class="list-group-item px-0 text-muted">No evaluators assigned yet.</li>'; }

                    // Populate Roster
                    const candList = document.getElementById('view_assigned_candidates_list');
                    candList.innerHTML = ''; 
                    currentAssignedRegistryIds = [];
                    
                    const candRaw = this.getAttribute('data-candidatesdata');
                    if (candRaw) {
                        // parses GROUP_CONCAT formatting: id::name::order_number::team_members::registry_id::team_registry_ids
                        candRaw.split('||').forEach(cData => {
                            const parts = cData.split('::');
                            if(parts.length >= 3) {
                                const rosterId = parts[0];
                                const candName = parts[1];
                                const orderNum = parts[2];
                                const teamMembers = parts[3] ? `<div class="small text-muted mt-1"><i class="bi bi-people me-1"></i>Members: ${parts[3]}</div>` : '';
                                
                                // Only individuals use registry_id pre-checks
                                if(parts[4]) currentAssignedRegistryIds.push(parts[4]);

                                // Team members registry_ids
                                if(parts[5]) {
                                    parts[5].split(',').forEach(id => currentAssignedRegistryIds.push(id));
                                }
                                
                                candList.innerHTML += `<li class="list-group-item px-3 py-2 border-0 small fw-semibold d-flex justify-content-between align-items-center border-bottom">
                                    <div>
                                        <span><i class="bi bi-person-fill text-amber me-2"></i> ${candName}</span>
                                        ${teamMembers}
                                    </div>
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="badge bg-light text-dark border">Entry #${orderNum}</span>
                                        <a href="enlistment.php?tab=events&delete_roster_id=${rosterId}" class="btn btn-sm text-danger p-0 px-1" onclick="return confirm('Remove this entry from the event roster?');" title="Remove Entry"><i class="bi bi-x-circle-fill fs-5"></i></a>
                                    </div>
                                </li>`;
                            }
                        });
                    } else { candList.innerHTML = '<li class="list-group-item px-0 text-muted">No entries enlisted in this event yet.</li>'; }

                    viewEventModal.show();
                });
            });

            // Handling the "Enlist Participants" button inside the Event Details Modal
            document.getElementById('openAssignParticipantsBtn').addEventListener('click', function() {
                viewEventModal.hide();
                
                document.getElementById('roster_event_id').value = currentViewedEventId;
                document.getElementById('roster_event_name_display').textContent = currentViewedEventName;
                
                if (currentViewedEventMode === 'Team') {
                    // Show Team Registration Form
                    document.getElementById('individual_desc').classList.add('d-none');
                    document.getElementById('team_roster_section').classList.remove('d-none');
                    document.getElementById('roster_action_input').value = 'add_team_roster';
                    document.getElementById('team_name_input').setAttribute('required', 'required');
                    
                    // Uncheck all boxes for new team, disable if already enlisted in another team
                    document.querySelectorAll('.registry-checkbox').forEach(cb => {
                        cb.checked = false;
                        if (currentAssignedRegistryIds.includes(cb.value)) {
                            cb.disabled = true;
                            cb.closest('.participant-checkbox-item').classList.add('opacity-50', 'bg-light');
                        } else {
                            cb.disabled = false;
                            cb.closest('.participant-checkbox-item').classList.remove('opacity-50', 'bg-light');
                        }
                    });
                    
                    // Fetch auto-increment number for the new team
                    fetch(`enlistment.php?action=get_next_number&event_id=${currentViewedEventId}`)
                        .then(res => res.json())
                        .then(data => { document.getElementById('team_entry_number').value = data.next_number; });

                } else {
                    // Show Individual Checklist
                    document.getElementById('team_roster_section').classList.add('d-none');
                    document.getElementById('individual_desc').classList.remove('d-none');
                    document.getElementById('roster_action_input').value = 'sync_roster';
                    document.getElementById('team_name_input').removeAttribute('required');
                    
                    // Pre-check registry boxes based on current roster, enable all
                    document.querySelectorAll('.registry-checkbox').forEach(cb => {
                        cb.checked = currentAssignedRegistryIds.includes(cb.value);
                        cb.disabled = false;
                        cb.closest('.participant-checkbox-item').classList.remove('opacity-50', 'bg-light');
                    });
                }
                
                assignParticipantsModal.show();
            });

            // --- Populate Modals (Events) ---
            document.querySelectorAll('.assign-btn').forEach(button => {
                button.addEventListener('click', function() {
                    document.querySelectorAll('.judge-checkbox').forEach(cb => cb.checked = false);
                    document.getElementById('assign_event_id').value = this.getAttribute('data-id');
                    document.getElementById('assign_event_name_display').textContent = this.getAttribute('data-name');
                    const assignedJudgesRaw = this.getAttribute('data-judges');
                    if (assignedJudgesRaw) {
                        assignedJudgesRaw.split(',').forEach(judgeId => {
                            const cb = document.querySelector(`.judge-checkbox[value="${judgeId}"]`);
                            if (cb) cb.checked = true;
                        });
                    }
                });
            });

            document.querySelectorAll('.edit-event-btn').forEach(button => {
                button.addEventListener('click', function() {
                    document.getElementById('edit_event_id_field').value = this.getAttribute('data-id');
                    document.getElementById('edit_event_name').value = this.getAttribute('data-name');
                    document.getElementById('edit_event_description').value = this.getAttribute('data-desc');
                    document.getElementById('edit_event_type').value = this.getAttribute('data-type');
                    document.getElementById('edit_event_organizer').value = this.getAttribute('data-organizer');
                    document.getElementById('edit_event_department').value = this.getAttribute('data-department') || '';
                    document.getElementById('edit_event_academic_year').value = this.getAttribute('data-academicyear') || '2027-2028';
                    document.getElementById('edit_event_participation_mode').value = this.getAttribute('data-mode');
                    document.getElementById('edit_event_start_date').value = this.getAttribute('data-startdate');
                    document.getElementById('edit_event_end_date').value = this.getAttribute('data-enddate');
                });
            });

            document.querySelectorAll('.edit-type-btn').forEach(button => {
                button.addEventListener('click', function() {
                    document.getElementById('edit_type_id_input').value = this.getAttribute('data-typeid');
                    document.getElementById('edit_type_name_input').value = this.getAttribute('data-typename');
                });
            });

            document.querySelectorAll('.edit-department-btn').forEach(button => {
                button.addEventListener('click', function() {
                    document.getElementById('edit_dept_id_input').value = this.getAttribute('data-deptid');
                    document.getElementById('edit_dept_name_input').value = this.getAttribute('data-deptname');
                    document.getElementById('edit_dept_code_input').value = this.getAttribute('data-deptcode');
                });
            });

            document.querySelectorAll('.edit-organizer-btn').forEach(button => {
                button.addEventListener('click', function() {
                    document.getElementById('edit_organizer_id_input').value = this.getAttribute('data-orgid');
                    document.getElementById('edit_organizer_name_input').value = this.getAttribute('data-orgname');
                });
            });

            // --- Checkbox Batch Actions (Participants Registry) ---
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            const rowCheckboxes = document.querySelectorAll('.row-checkbox');
            const bulkActionContainer = document.getElementById('bulkActionContainer');
            const bulkInputs = document.getElementById('bulkInputs');
            const bulkCountDisplay = document.getElementById('bulkCount');

            function toggleBulkActions() {
                const checkedBoxes = Array.from(rowCheckboxes).filter(cb => cb.checked);
                if (checkedBoxes.length > 0) {
                    bulkActionContainer.style.display = 'block';
                    bulkCountDisplay.textContent = checkedBoxes.length;
                    bulkInputs.innerHTML = '';
                    checkedBoxes.forEach(cb => {
                        const input = document.createElement('input');
                        input.type = 'hidden'; input.name = 'selected_ids[]'; input.value = cb.value;
                        bulkInputs.appendChild(input);
                    });
                } else { bulkActionContainer.style.display = 'none'; }
            }

            if(selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', function() {
                    rowCheckboxes.forEach(cb => cb.checked = this.checked);
                    toggleBulkActions();
                });
            }
            rowCheckboxes.forEach(cb => cb.addEventListener('change', toggleBulkActions));

            // --- Populate Modals (Participants Registry) ---
            document.querySelectorAll('.edit-participant-btn').forEach(button => {
                button.addEventListener('click', function() {
                    document.getElementById('edit_part_id').value = this.getAttribute('data-id');
                    document.getElementById('edit_part_name').value = this.getAttribute('data-name');
                    document.getElementById('edit_part_course_id').value = this.getAttribute('data-courseid');
                    document.getElementById('edit_part_year_level').value = this.getAttribute('data-yearlevel');
                });
            });

            // --- CROPPER.JS IMPLEMENTATION ---
            function initCropper(inputId, imageId, containerId, hiddenInputId, formId) {
                let cropper;
                const input = document.getElementById(inputId);
                const image = document.getElementById(imageId);
                const container = document.getElementById(containerId);
                const hiddenInput = document.getElementById(hiddenInputId);
                const form = document.getElementById(formId);

                input.addEventListener('change', function(e) {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                        const file = files[0];
                        container.style.display = 'block';
                        if (cropper) { cropper.destroy(); }
                        const reader = new FileReader();
                        reader.onload = function(event) {
                            image.src = event.target.result;
                            cropper = new Cropper(image, { aspectRatio: 1, viewMode: 1, dragMode: 'move', autoCropArea: 0.9, guides: false, center: false, highlight: false, cropBoxMovable: false, cropBoxResizable: false, toggleDragModeOnDblclick: false });
                        };
                        reader.readAsDataURL(file);
                    }
                });

                form.addEventListener('submit', function(e) {
                    if (cropper) {
                        e.preventDefault(); 
                        const canvas = cropper.getCroppedCanvas({ width: 250, height: 250 });
                        hiddenInput.value = canvas.toDataURL('image/png');
                        cropper.destroy();
                        form.submit();
                    }
                });
            }

            initCropper('addAvatarInput', 'addCropImage', 'addCropContainer', 'addCroppedInput', 'addParticipantForm');
            initCropper('editAvatarInput', 'editCropImage', 'editCropContainer', 'editCroppedInput', 'editParticipantForm');

            // --- AUTO-OPEN MODAL BASED ON URL QUERY (Quick Actions from Dashboard) ---
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('open') === 'addEvent') {
                const addEventModalEl = document.getElementById('addEventModal');
                if (addEventModalEl) {
                    const addEventModal = new bootstrap.Modal(addEventModalEl);
                    addEventModal.show();
                }
            } else if (urlParams.get('open') === 'addParticipant') {
                const addPartModalEl = document.getElementById('addParticipantModal');
                if (addPartModalEl) {
                    const addPartModal = new bootstrap.Modal(addPartModalEl);
                    addPartModal.show();
                }
            }
        });
    </script>
</body>
</html>