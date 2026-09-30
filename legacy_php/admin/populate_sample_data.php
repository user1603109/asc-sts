<?php
session_start();
require_once '../db.php';

$message = '';
$message_type = '';
$stats_seeded = [];
$existing_scores_count = 0;
try {
    $existing_scores_count = (int)($pdo->query("SELECT COUNT(*) FROM scores")->fetchColumn() ?: 0);
} catch (PDOException $e) {}

$is_triggered = ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'populate') 
    || (isset($_GET['action']) && $_GET['action'] === 'populate') 
    || ($existing_scores_count === 0);

if ($is_triggered) {
    $mode = $_POST['mode'] ?? $_GET['mode'] ?? 'smart_sync'; // 'smart_sync' or 'fresh_reset'

    try {
        // DDL and table initialization

        if ($mode === 'fresh_reset') {
            // Optional complete refresh of sample tables
            $pdo->query("SET FOREIGN_KEY_CHECKS = 0");
            $pdo->query("TRUNCATE TABLE scores");
            $pdo->query("TRUNCATE TABLE candidates");
            $pdo->query("TRUNCATE TABLE criteria");
            $pdo->query("TRUNCATE TABLE event_portions");
            $pdo->query("TRUNCATE TABLE events");
            $pdo->query("TRUNCATE TABLE participants_registry");
            // Remove sample judges only, preserve any existing admins
            $pdo->query("DELETE FROM users WHERE role = 'judge' AND username LIKE 'judge_%'");
            $pdo->query("SET FOREIGN_KEY_CHECKS = 1");
        }

        // 1. Ensure Table Schemas Exist
        $pdo->query("CREATE TABLE IF NOT EXISTS departments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            department_name VARCHAR(150) NOT NULL UNIQUE,
            department_code VARCHAR(50) NULL
        )");

        $pdo->query("CREATE TABLE IF NOT EXISTS courses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_name VARCHAR(150) NOT NULL UNIQUE
        )");

        $pdo->query("CREATE TABLE IF NOT EXISTS participants_registry (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            course_id INT NULL,
            year_level VARCHAR(50) NULL,
            image_path VARCHAR(255) NULL
        )");

        $pdo->query("CREATE TABLE IF NOT EXISTS event_portions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_id INT NOT NULL,
            portion_name VARCHAR(100) NOT NULL,
            percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            order_number INT DEFAULT 1,
            status ENUM('Upcoming', 'Ongoing', 'Completed') DEFAULT 'Upcoming',
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )");

        // 2. SEED THE 11 OFFICIAL DEPARTMENTS & COURSES
        $official_departments = [
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
        $dept_count = 0;
        foreach ($official_departments as $d) {
            $ins_dept->execute([$d[0], $d[1]]);
            $ins_course->execute([$d[0]]);
            $dept_count++;
        }
        $stats_seeded['departments'] = $dept_count;

        // Fetch Department & Course Lookups
        $course_lookup = $pdo->query("SELECT course_name, id FROM courses")->fetchAll(PDO::FETCH_KEY_PAIR);

        // 3. SEED REALISTIC JUDGES / EVALUATORS
        $sample_judges = [
            ['judge_elena', 'Dr. Elena Rostas', 'judge123', 'approved'],
            ['judge_marcus', 'Prof. Marcus Vance', 'judge123', 'approved'],
            ['judge_sophia', 'Atty. Sophia Alcantara', 'judge123', 'approved'],
            ['judge_david', 'Engr. David Corpuz', 'judge123', 'approved'],
            ['judge_jasmine', 'Prof. Jasmine Reyes', 'judge123', 'approved'],
            ['judge_roland', 'Dr. Roland Mendoza', 'judge123', 'pending'], // 1 pending for approval demo
            ['judge_beatrice', 'Ms. Beatrice Cruz', 'judge123', 'pending']  // 1 pending for approval demo
        ];

        $ins_user = $pdo->prepare("INSERT INTO users (username, password, full_name, role, approval_status) 
                                   VALUES (?, ?, ?, 'judge', ?) 
                                   ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), approval_status = VALUES(approval_status)");
        $judge_ids = [];
        foreach ($sample_judges as $j) {
            $hashed = password_hash($j[2], PASSWORD_DEFAULT);
            $ins_user->execute([$j[0], $hashed, $j[1], $j[3]]);
            // Get user ID
            $stmt = $pdo->prepare("SELECT id, approval_status FROM users WHERE username = ?");
            $stmt->execute([$j[0]]);
            $u = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($u['approval_status'] === 'approved') {
                $judge_ids[] = $u['id'];
            }
        }
        $stats_seeded['judges'] = count($sample_judges);

        // 4. SEED REALISTIC SAMPLE EVENTS
        $sample_events = [
            [
                'name' => 'Search for Mr. & Ms. ASC 2026',
                'description' => 'The prestigious annual university pageant celebrating leadership, intelligence, and cultural elegance across all collegiate departments.',
                'type' => 'Pageant',
                'department' => 'Bachelor of Science in Tourism',
                'organizer' => 'Supreme Student Government & Tourism Dept.',
                'academic_year' => '2025-2026',
                'start_date' => date('Y-m-d', strtotime('-1 day')),
                'end_date' => date('Y-m-d', strtotime('+1 day')),
                'status' => 'Ongoing',
                'portions' => [
                    [
                        'name' => 'Swimwear & Athletic Wear',
                        'pct' => 25.0,
                        'criteria' => [
                            ['Physical Fitness & Proportion', 40.0],
                            ['Stage Poise & Bearing', 40.0],
                            ['Audience Impact', 20.0]
                        ]
                    ],
                    [
                        'name' => 'Talent Competition',
                        'pct' => 25.0,
                        'criteria' => [
                            ['Execution & Mastery', 50.0],
                            ['Creativity & Originality', 30.0],
                            ['Stage Projection', 20.0]
                        ]
                    ],
                    [
                        'name' => 'Evening Gown & Formal Attire',
                        'pct' => 25.0,
                        'criteria' => [
                            ['Poise & Elegance', 45.0],
                            ['Suitability & Fit', 35.0],
                            ['Overall Stage Presence', 20.0]
                        ]
                    ],
                    [
                        'name' => 'Final Question & Answer',
                        'pct' => 25.0,
                        'criteria' => [
                            ['Substance & Relevance', 50.0],
                            ['Spontaneity & Articulation', 35.0],
                            ['Wit & Stage Composure', 15.0]
                        ]
                    ]
                ]
            ],
            [
                'name' => 'Annual ASC Inter-Collegiate Cultural Festival',
                'description' => 'A vibrant showcase of traditional Northern Philippine folk dances, indigenous music, and cultural heritage.',
                'type' => 'Cultural',
                'department' => 'Bachelor of Secondary Education',
                'organizer' => 'College of Teacher Education Council',
                'academic_year' => '2025-2026',
                'start_date' => date('Y-m-d', strtotime('-3 days')),
                'end_date' => date('Y-m-d', strtotime('-1 day')),
                'status' => 'Tabulating',
                'portions' => [
                    [
                        'name' => 'Traditional Cordillera Folk Dance',
                        'pct' => 100.0,
                        'criteria' => [
                            ['Choreography & Authenticity', 35.0],
                            ['Rhythm & Synchronization', 30.0],
                            ['Traditional Attire & Instruments', 20.0],
                            ['Overall Performance Impact', 15.0]
                        ]
                    ]
                ]
            ],
            [
                'name' => 'ASC Tech Innovators & IT Quiz Bowl',
                'description' => 'Championship collegiate competition covering modern programming, networking, data structures, and ethical computing.',
                'type' => 'Academic',
                'department' => 'Bachelor in Information Technology',
                'organizer' => 'Information Technology Society (ITS)',
                'academic_year' => '2025-2026',
                'start_date' => date('Y-m-d', strtotime('-7 days')),
                'end_date' => date('Y-m-d', strtotime('-5 days')),
                'status' => 'Completed',
                'portions' => [
                    [
                        'name' => 'Rapid Algorithmic Round',
                        'pct' => 50.0,
                        'criteria' => [
                            ['Algorithm Correctness', 60.0],
                            ['Execution Speed & Efficiency', 40.0]
                        ]
                    ],
                    [
                        'name' => 'System Prototype Defense',
                        'pct' => 50.0,
                        'criteria' => [
                            ['Innovation & Utility', 40.0],
                            ['Technical Architecture', 40.0],
                            ['Oral Presentation', 20.0]
                        ]
                    ]
                ]
            ],
            [
                'name' => 'Luminaries Spoken Word & Literary Cup',
                'description' => 'Inter-departmental declamation and creative spoken poetry championship focusing on cultural storytelling.',
                'type' => 'Literary',
                'department' => 'Bachelor of Elementary Education',
                'organizer' => 'ASC Arts & Letters Guild',
                'academic_year' => '2025-2026',
                'start_date' => date('Y-m-d', strtotime('-14 days')),
                'end_date' => date('Y-m-d', strtotime('-12 days')),
                'status' => 'Completed',
                'portions' => [
                    [
                        'name' => 'Original Spoken Word Piece',
                        'pct' => 100.0,
                        'criteria' => [
                            ['Content, Metaphor & Theme', 40.0],
                            ['Vocal Delivery & Intonation', 30.0],
                            ['Stage Presence & Poise', 30.0]
                        ]
                    ]
                ]
            ],
            [
                'name' => 'ASC Intramurals Cheerdance Showcase',
                'description' => 'High-octane athletic cheer routine championship competing for the overall institutional trophy.',
                'type' => 'Sports',
                'department' => 'Bachelor of Science in Criminology',
                'organizer' => 'Physical Education & Athletics Unit',
                'academic_year' => '2025-2026',
                'start_date' => date('Y-m-d', strtotime('+3 days')),
                'end_date' => date('Y-m-d', strtotime('+5 days')),
                'status' => 'Ongoing',
                'portions' => [
                    [
                        'name' => 'Routine Gymnastics & Pyramids',
                        'pct' => 100.0,
                        'criteria' => [
                            ['Stunt Difficulty & Safety', 40.0],
                            ['Timing & Synchronization', 35.0],
                            ['Energy & Audience Impact', 25.0]
                        ]
                    ]
                ]
            ]
        ];

        // 5. SAMPLE CANDIDATES / PARTICIPANTS ACROSS DEPARTMENTS
        $sample_candidates_roster = [
            ['Julianne Vance', 'Bachelor in Information Technology', '3rd Year'],
            ['Christian Bautista', 'Bachelor of Science in Civil Engineering', '4th Year'],
            ['Sophia Mae Perez', 'Bachelor of Science in Hotel & Restaurant Mgmt.', '2nd Year'],
            ['Kenneth Alcantara', 'Bachelor of Science in Criminology', '3rd Year'],
            ['Maricar Dela Cruz', 'Bachelor of Secondary Education', '3rd Year'],
            ['Jeric Hernandez', 'Bachelor of Science in Agriculture', '2nd Year'],
            ['Nicole Santos', 'Bachelor of Science in Tourism', '3rd Year'],
            ['Adrian Reyes', 'Bachelor of Science in Business Administration', '4th Year'],
            ['Patrick Gomez', 'Bachelor in Industrial Technology', '2nd Year'],
            ['Alyssa Villanueva', 'Bachelor of Elementary Education', '1st Year'],
            ['Raymond Torres', 'Bachelor of Technical Teacher Education', '3rd Year'],
            ['Hannah Grace Morales', 'Bachelor in Information Technology', '2nd Year'],
            ['Gabriel Fontanilla', 'Bachelor of Science in Civil Engineering', '3rd Year'],
            ['Erika Jane Pasion', 'Bachelor of Science in Tourism', '2nd Year'],
            ['Mark Anthony Balisi', 'Bachelor of Science in Criminology', '4th Year'],
            ['Clarisse Anne Ramos', 'Bachelor of Science in Business Administration', '3rd Year']
        ];

        // Register global participants
        $ins_reg = $pdo->prepare("INSERT INTO participants_registry (name, course_id, year_level) VALUES (?, ?, ?)");
        $registry_map = [];
        foreach ($sample_candidates_roster as $cand) {
            $c_id = $course_lookup[$cand[1]] ?? null;
            // Check if already in registry
            $chk = $pdo->prepare("SELECT id FROM participants_registry WHERE name = ?");
            $chk->execute([$cand[0]]);
            $reg_id = $chk->fetchColumn();
            if (!$reg_id) {
                $ins_reg->execute([$cand[0], $c_id, $cand[2]]);
                $reg_id = $pdo->lastInsertId();
            }
            $registry_map[$cand[0]] = [
                'id' => $reg_id,
                'course_id' => $c_id,
                'year_level' => $cand[2]
            ];
        }

        $ins_event = $pdo->prepare("INSERT INTO events (name, description, type, department, organizer, academic_year, start_date, end_date, status) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $ins_portion = $pdo->prepare("INSERT INTO event_portions (event_id, portion_name, percentage, order_number, status) VALUES (?, ?, ?, ?, ?)");
        $ins_crit = $pdo->prepare("INSERT INTO criteria (event_id, portion_id, name, percentage, max_score) VALUES (?, ?, ?, ?, 100.00)");
        $ins_cand = $pdo->prepare("INSERT INTO candidates (event_id, registry_id, name, course_id, year_level, order_number) VALUES (?, ?, ?, ?, ?, ?)");
        $ins_event_judge = $pdo->prepare("INSERT IGNORE INTO event_judges (event_id, user_id) VALUES (?, ?)");
        $ins_score = $pdo->prepare("INSERT INTO scores (event_id, judge_id, candidate_id, criteria_id, score) VALUES (?, ?, ?, ?, ?) 
                                    ON DUPLICATE KEY UPDATE score = VALUES(score)");

        $events_added = 0;
        $candidates_enlisted = 0;
        $scores_recorded = 0;

        foreach ($sample_events as $ev) {
            // Check if event already exists
            $ev_check = $pdo->prepare("SELECT id FROM events WHERE name = ?");
            $ev_check->execute([$ev['name']]);
            $existing_ev_id = $ev_check->fetchColumn();

            if ($existing_ev_id) {
                $event_id = $existing_ev_id;
                $pdo->prepare("UPDATE events SET status = ? WHERE id = ?")->execute([$ev['status'], $event_id]);
                $pdo->prepare("UPDATE criteria SET max_score = 100.00 WHERE event_id = ? AND (max_score IS NULL OR max_score <= 0)")->execute([$event_id]);
            } else {
                $ins_event->execute([
                    $ev['name'],
                    $ev['description'],
                    $ev['type'],
                    $ev['department'],
                    $ev['organizer'],
                    $ev['academic_year'],
                    $ev['start_date'],
                    $ev['end_date'],
                    $ev['status']
                ]);
                $event_id = $pdo->lastInsertId();
                $events_added++;
            }

            // Insert Portions & Criteria
            $portion_ids = [];
            $portion_order = 1;
            foreach ($ev['portions'] as $p) {
                // Check if portion exists
                $chk_p = $pdo->prepare("SELECT id FROM event_portions WHERE event_id = ? AND portion_name = ?");
                $chk_p->execute([$event_id, $p['name']]);
                $port_id = $chk_p->fetchColumn();

                if (!$port_id) {
                    $ins_portion->execute([
                        $event_id,
                        $p['name'],
                        $p['pct'],
                        $portion_order++,
                        $ev['status'] === 'Completed' ? 'Completed' : 'Ongoing'
                    ]);
                    $port_id = $pdo->lastInsertId();
                }

                $criteria_records = [];
                foreach ($p['criteria'] as $c) {
                    $chk_c = $pdo->prepare("SELECT id FROM criteria WHERE event_id = ? AND portion_id = ? AND name = ?");
                    $chk_c->execute([$event_id, $port_id, $c[0]]);
                    $crit_id = $chk_c->fetchColumn();
                    if (!$crit_id) {
                        $ins_crit->execute([$event_id, $port_id, $c[0], $c[1]]);
                        $crit_id = $pdo->lastInsertId();
                    }
                    $criteria_records[] = [
                        'id' => $crit_id,
                        'max_pct' => $c[1]
                    ];
                }

                $portion_ids[] = [
                    'id' => $port_id,
                    'name' => $p['name'],
                    'criteria' => $criteria_records
                ];
            }

            // Enlist Candidates for this Event (Pick 6 to 10 candidates per event)
            $cand_slice = array_slice($sample_candidates_roster, 0, ($ev['type'] === 'Pageant' ? 10 : 6));
            $enlisted_candidates = [];
            $order_num = 1;

            foreach ($cand_slice as $cand_data) {
                $cand_name = $cand_data[0];
                $meta = $registry_map[$cand_name];

                $chk_cand = $pdo->prepare("SELECT id FROM candidates WHERE event_id = ? AND name = ?");
                $chk_cand->execute([$event_id, $cand_name]);
                $c_entry_id = $chk_cand->fetchColumn();

                if (!$c_entry_id) {
                    $ins_cand->execute([
                        $event_id,
                        $meta['id'],
                        $cand_name,
                        $meta['course_id'],
                        $meta['year_level'],
                        $order_num++
                    ]);
                    $c_entry_id = $pdo->lastInsertId();
                    $candidates_enlisted++;
                }

                $enlisted_candidates[] = $c_entry_id;
            }

            // Assign Judges & Generate Tabulated Scores for Completed, Tabulating, or Ongoing events
            if (in_array($ev['status'], ['Completed', 'Tabulating', 'Ongoing'])) {
                $all_approved_judges = $pdo->query("SELECT id FROM users WHERE role = 'judge' AND approval_status = 'approved'")->fetchAll(PDO::FETCH_COLUMN);
                $active_event_judges = array_slice($all_approved_judges, 0, 4);

                foreach ($active_event_judges as $j_id) {
                    $ins_event_judge->execute([$event_id, $j_id]);
                }

                $ev_candidates = $pdo->query("SELECT id FROM candidates WHERE event_id = $event_id ORDER BY order_number ASC")->fetchAll(PDO::FETCH_COLUMN);
                $ev_portions = $pdo->query("SELECT id FROM event_portions WHERE event_id = $event_id")->fetchAll(PDO::FETCH_COLUMN);

                foreach ($ev_portions as $p_id) {
                    $crit_stmt = $pdo->prepare("SELECT id, percentage FROM criteria WHERE event_id = ? AND portion_id = ?");
                    $crit_stmt->execute([$event_id, $p_id]);
                    $crit_list = $crit_stmt->fetchAll(PDO::FETCH_ASSOC);

                    foreach ($ev_candidates as $cand_idx => $c_id) {
                        // Spread candidates so rank 1 achieves ~93%, rank 2 ~91%, rank 3 ~89%, etc.
                        $cand_base = 93.0 - ($cand_idx * 1.8);

                        foreach ($active_event_judges as $j_idx => $j_id) {
                            $judge_variance = (($j_idx % 3) - 1) * 0.8;

                            foreach ($crit_list as $crit_row) {
                                $noise = (rand(-10, 10) / 10.0);
                                // Realistic raw score out of 100 entered by judge
                                $score_val = min(98.50, max(75.00, round($cand_base + $judge_variance + $noise, 2)));

                                try {
                                    $ins_score->execute([
                                        $event_id,
                                        $j_id,
                                        $c_id,
                                        $crit_row['id'],
                                        $score_val
                                    ]);
                                    $scores_recorded++;
                                } catch (PDOException $e) {}
                            }
                        }
                    }
                }
            }
        }

        $stats_seeded['events'] = count($sample_events);
        $stats_seeded['candidates'] = count($sample_candidates_roster);
        $stats_seeded['scores'] = $scores_recorded;

        $message = "Sample data populated successfully! The system now contains all 11 official collegiate departments, realistic competitions, certified judges, candidates, and $scores_recorded live tabulated ballots.";
        $message_type = 'success';

    } catch (Exception $e) {
        $message = "Error during population: " . $e->getMessage();
        $message_type = 'danger';
    }
}

// Current System Counters
$count_depts = $pdo->query("SELECT COUNT(*) FROM departments")->fetchColumn() ?: 0;
$count_courses = $pdo->query("SELECT COUNT(*) FROM courses")->fetchColumn() ?: 0;
$count_events = $pdo->query("SELECT COUNT(*) FROM events")->fetchColumn() ?: 0;
$count_candidates = $pdo->query("SELECT COUNT(*) FROM candidates")->fetchColumn() ?: 0;
$count_judges = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'judge'")->fetchColumn() ?: 0;
$count_scores = $pdo->query("SELECT COUNT(*) FROM scores")->fetchColumn() ?: 0;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sample Data Seeder | ASTS Administration</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">

    <style>
        body { background-color: #F8FAFC; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .main-content { min-height: 100vh; width: calc(100% - 280px); }
        .text-midnight { color: #0A192F !important; }
        .bg-midnight { background-color: #0A192F !important; }
        .text-amber { color: #FFBF00 !important; }

        .feature-card {
            border: 1px solid #E2E8F0;
            border-radius: 16px;
            background: #ffffff;
            transition: all 0.2s ease;
        }
        .feature-card:hover {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
        }

        .stat-badge-box {
            padding: 1rem 1.25rem;
            border-radius: 12px;
            background-color: #F1F5F9;
            text-align: center;
        }

        .btn-seeder-action {
            background: linear-gradient(135deg, #0A192F 0%, #1e3a5f 100%);
            color: #ffffff;
            font-weight: 700;
            border: none;
            padding: 0.9rem 2rem;
            border-radius: 12px;
            transition: all 0.25s ease;
            box-shadow: 0 4px 14px rgba(10, 25, 47, 0.25);
        }
        .btn-seeder-action:hover {
            background: linear-gradient(135deg, #FFBF00 0%, #ff9800 100%);
            color: #0A192F;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 191, 0, 0.4);
        }
    </style>
</head>
<body class="d-flex">

    <?php include '../includes/admin_sidebar.php'; ?>

    <div class="main-content flex-grow-1 p-4 p-md-5">
        
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
            <div>
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb mb-1 small">
                        <li class="breadcrumb-item"><a href="dashboard.php" class="text-decoration-none text-muted">Dashboard</a></li>
                        <li class="breadcrumb-item active text-midnight fw-bold" aria-current="page">Sample Data Generator</li>
                    </ol>
                </nav>
                <h2 class="fw-bolder text-midnight mb-1">Populate Real Sample Data</h2>
                <p class="text-muted mb-0 small">Instantly populate comprehensive demonstration datasets across all 11 collegiate programs.</p>
            </div>
            <div>
                <a href="dashboard.php" class="btn btn-outline-dark rounded-pill px-3 py-1.5 fw-semibold small">
                    <i class="bi bi-arrow-left me-1"></i> Back to Dashboard
                </a>
            </div>
        </div>

        <?php if ($message): ?>
            <div class="alert alert-<?= $message_type ?> alert-dismissible fade show rounded-3 shadow-sm border-0 mb-4" role="alert">
                <div class="d-flex align-items-center">
                    <i class="bi <?= $message_type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger' ?> fs-4 me-3"></i>
                    <div>
                        <strong><?= $message_type === 'success' ? 'Success!' : 'Notice' ?></strong> <?= htmlspecialchars($message) ?>
                    </div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <!-- Current Database Statistics Overview -->
        <div class="row g-3 mb-4">
            <div class="col-6 col-md-4 col-lg-2">
                <div class="stat-badge-box">
                    <span class="text-muted small d-block">Departments</span>
                    <h3 class="fw-bolder text-midnight mb-0"><?= $count_depts ?></h3>
                </div>
            </div>
            <div class="col-6 col-md-4 col-lg-2">
                <div class="stat-badge-box">
                    <span class="text-muted small d-block">Academic Courses</span>
                    <h3 class="fw-bolder text-midnight mb-0"><?= $count_courses ?></h3>
                </div>
            </div>
            <div class="col-6 col-md-4 col-lg-2">
                <div class="stat-badge-box">
                    <span class="text-muted small d-block">Total Events</span>
                    <h3 class="fw-bolder text-midnight mb-0"><?= $count_events ?></h3>
                </div>
            </div>
            <div class="col-6 col-md-4 col-lg-2">
                <div class="stat-badge-box">
                    <span class="text-muted small d-block">Candidates</span>
                    <h3 class="fw-bolder text-midnight mb-0"><?= $count_candidates ?></h3>
                </div>
            </div>
            <div class="col-6 col-md-4 col-lg-2">
                <div class="stat-badge-box">
                    <span class="text-muted small d-block">Judges</span>
                    <h3 class="fw-bolder text-midnight mb-0"><?= $count_judges ?></h3>
                </div>
            </div>
            <div class="col-6 col-md-4 col-lg-2">
                <div class="stat-badge-box">
                    <span class="text-muted small d-block">Tabulated Scores</span>
                    <h3 class="fw-bolder text-midnight mb-0"><?= $count_scores ?></h3>
                </div>
            </div>
        </div>

        <!-- Seeder Control Card -->
        <div class="row g-4">
            <div class="col-lg-7">
                <div class="feature-card p-4 p-md-5 h-100">
                    <div class="d-flex align-items-center gap-3 mb-4">
                        <div class="rounded-4 bg-midnight text-amber p-3 d-flex align-items-center justify-content-center">
                            <i class="bi bi-database-fill-gear fs-2"></i>
                        </div>
                        <div>
                            <h4 class="fw-bold text-midnight mb-1">Populate Demonstration Datasets</h4>
                            <p class="text-muted small mb-0">Generates real-world university competitions, candidates, portions, and tabulated scorecards.</p>
                        </div>
                    </div>

                    <form method="POST">
                        <input type="hidden" name="action" value="populate">

                        <div class="mb-4">
                            <label class="form-label fw-bold text-midnight small">Select Seeding Strategy</label>
                            
                            <div class="form-check p-3 rounded-3 border mb-2 bg-light">
                                <input class="form-check-input ms-0 me-3" type="radio" name="mode" id="mode_smart" value="smart_sync" checked>
                                <label class="form-check-label" for="mode_smart">
                                    <strong class="text-midnight d-block">Smart Sync & Supplement (Recommended)</strong>
                                    <span class="text-muted small">Adds any missing departments, standard sample events, certified judges, and realistic candidate scores without deleting your custom data.</span>
                                </label>
                            </div>

                            <div class="form-check p-3 rounded-3 border bg-light">
                                <input class="form-check-input ms-0 me-3" type="radio" name="mode" id="mode_reset" value="fresh_reset">
                                <label class="form-check-label" for="mode_reset">
                                    <strong class="text-danger d-block"><i class="bi bi-arrow-counterclockwise me-1"></i> Fresh Demonstration Reset</strong>
                                    <span class="text-muted small">Clears existing sample events/candidates and inserts a pristine demonstration suite with fully populated analytics.</span>
                                </label>
                            </div>
                        </div>

                        <div class="d-grid gap-2">
                            <button type="submit" class="btn btn-seeder-action d-flex align-items-center justify-content-center gap-2" onclick="return confirm('Ready to populate sample data into the system?');">
                                <i class="bi bi-play-circle-fill fs-5 text-amber"></i>
                                <span>Execute Data Population</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- What Will Be Added Summary -->
            <div class="col-lg-5">
                <div class="feature-card p-4 h-100">
                    <h5 class="fw-bold text-midnight mb-3"><i class="bi bi-card-checklist text-amber me-2"></i> Included Datasets</h5>
                    
                    <ul class="list-group list-group-flush small">
                        <li class="list-group-item px-0 py-2.5">
                            <i class="bi bi-mortarboard-fill text-success me-2"></i>
                            <strong>11 Official Collegiate Departments:</strong>
                            <div class="text-muted ps-4 mt-1">BSED, BEED, BSIT, BINDT, BTTE, BSCE, BSHRM, BSA, BSBA, BST, BSCrim synced to both departments and courses.</div>
                        </li>
                        <li class="list-group-item px-0 py-2.5">
                            <i class="bi bi-trophy-fill text-warning me-2"></i>
                            <strong>5 Realistic Multi-Category Events:</strong>
                            <div class="text-muted ps-4 mt-1">Pageant (Mr. & Ms. ASC 2026), Cultural Dance, IT Quiz Bowl, Cheerdance, and Spoken Word Cup.</div>
                        </li>
                        <li class="list-group-item px-0 py-2.5">
                            <i class="bi bi-pie-chart-fill text-primary me-2"></i>
                            <strong>Weighted Segments & Criteria:</strong>
                            <div class="text-muted ps-4 mt-1">Portions summing to 100% with criteria percentages for Swimwear, Talent, Evening Gown, and Q&A.</div>
                        </li>
                        <li class="list-group-item px-0 py-2.5">
                            <i class="bi bi-person-badge-fill text-info me-2"></i>
                            <strong>6 Authenticated Evaluator Accounts:</strong>
                            <div class="text-muted ps-4 mt-1">Pre-configured judges with password <code>judge123</code> (Dr. Elena, Prof. Marcus, Atty. Sophia, Engr. David, etc.) with 1 pending for approval testing.</div>
                        </li>
                        <li class="list-group-item px-0 py-2.5">
                            <i class="bi bi-clipboard2-check-fill text-indigo me-2"></i>
                            <strong>Live Tabulated Scores:</strong>
                            <div class="text-muted ps-4 mt-1">Generates ballots for instant dashboard analytics, rankings charts, and central reports.</div>
                        </li>
                    </ul>

                    <div class="mt-4 pt-3 border-top d-flex gap-2">
                        <a href="reports.php" class="btn btn-sm btn-outline-secondary w-50 py-2">
                            <i class="bi bi-file-earmark-bar-graph me-1"></i> View Reports
                        </a>
                        <a href="judges.php" class="btn btn-sm btn-outline-secondary w-50 py-2">
                            <i class="bi bi-people me-1"></i> View Judges
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-5 text-center text-muted small">
            <p>&copy; <?= date('Y') ?> Apayao State College &bull; Automated Scoring & Tabulation System</p>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
