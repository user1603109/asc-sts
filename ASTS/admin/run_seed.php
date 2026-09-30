<?php
require_once '../db.php';

header('Content-Type: text/plain');
echo "=== ASTS SEEDER DIAGNOSTIC RUNNER ===\n";

try {
    // 1. Departments & Courses
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
    foreach ($official_departments as $d) {
        $ins_dept->execute([$d[0], $d[1]]);
        $ins_course->execute([$d[0]]);
    }
    echo "1. Departments & Courses synced: 11 programs.\n";

    // 2. Judges
    $sample_judges = [
        ['judge_elena', 'Dr. Elena Rostas', 'judge123', 'approved'],
        ['judge_marcus', 'Prof. Marcus Vance', 'judge123', 'approved'],
        ['judge_sophia', 'Atty. Sophia Alcantara', 'judge123', 'approved'],
        ['judge_david', 'Engr. David Corpuz', 'judge123', 'approved'],
        ['judge_jasmine', 'Prof. Jasmine Reyes', 'judge123', 'approved'],
        ['judge_roland', 'Dr. Roland Mendoza', 'judge123', 'pending'],
        ['judge_beatrice', 'Ms. Beatrice Cruz', 'judge123', 'pending']
    ];

    $ins_user = $pdo->prepare("INSERT INTO users (username, password, full_name, role, approval_status) 
                               VALUES (?, ?, ?, 'judge', ?) 
                               ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), approval_status = VALUES(approval_status)");
    foreach ($sample_judges as $j) {
        $ins_user->execute([$j[0], password_hash($j[2], PASSWORD_DEFAULT), $j[1], $j[3]]);
    }
    echo "2. Judges registered: " . count($sample_judges) . "\n";

    $approved_judges = $pdo->query("SELECT id FROM users WHERE role = 'judge' AND approval_status = 'approved'")->fetchAll(PDO::FETCH_COLUMN);
    echo "   Approved judges count: " . count($approved_judges) . "\n";

    // 3. Candidates
    $course_lookup = $pdo->query("SELECT course_name, id FROM courses")->fetchAll(PDO::FETCH_KEY_PAIR);
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
        ['Raymond Torres', 'Bachelor of Technical Teacher Education', '3rd Year']
    ];

    $ins_reg = $pdo->prepare("INSERT INTO participants_registry (name, course_id, year_level) VALUES (?, ?, ?)");
    $registry_map = [];
    foreach ($sample_candidates_roster as $cand) {
        $c_id = $course_lookup[$cand[1]] ?? null;
        $chk = $pdo->prepare("SELECT id FROM participants_registry WHERE name = ?");
        $chk->execute([$cand[0]]);
        $reg_id = $chk->fetchColumn();
        if (!$reg_id) {
            $ins_reg->execute([$cand[0], $c_id, $cand[2]]);
            $reg_id = $pdo->lastInsertId();
        }
        $registry_map[$cand[0]] = ['id' => $reg_id, 'course_id' => $c_id, 'year_level' => $cand[2]];
    }
    echo "3. Participant Registry ready.\n";

    // 4. Sample Events
    $sample_events = [
        [
            'name' => 'Search for Mr. & Ms. ASC 2026',
            'description' => 'The prestigious annual university pageant celebrating leadership, intelligence, and cultural elegance.',
            'type' => 'Pageant',
            'department' => 'Bachelor of Science in Tourism',
            'organizer' => 'Supreme Student Government',
            'start_date' => date('Y-m-d', strtotime('-1 day')),
            'end_date' => date('Y-m-d', strtotime('+1 day')),
            'status' => 'Ongoing',
            'portions' => [
                ['Swimwear & Athletic Wear', 25.0, [['Physical Fitness', 50.0], ['Stage Poise', 50.0]]],
                ['Talent Presentation', 25.0, [['Execution & Mastery', 50.0], ['Creativity', 50.0]]],
                ['Evening Gown & Formal Attire', 25.0, [['Poise & Elegance', 50.0], ['Presentation', 50.0]]],
                ['Question & Answer', 25.0, [['Substance', 60.0], ['Delivery', 40.0]]]
            ]
        ],
        [
            'name' => 'Annual ASC Inter-Collegiate Cultural Festival',
            'description' => 'A vibrant showcase of traditional Northern Philippine folk dances and indigenous music.',
            'type' => 'Cultural',
            'department' => 'Bachelor of Secondary Education',
            'organizer' => 'College of Teacher Education Council',
            'start_date' => date('Y-m-d', strtotime('-3 days')),
            'end_date' => date('Y-m-d', strtotime('-1 day')),
            'status' => 'Tabulating',
            'portions' => [
                ['Folk Dance Championship', 100.0, [['Choreography', 40.0], ['Timing & Rhythm', 40.0], ['Costume & Authenticity', 20.0]]]
            ]
        ],
        [
            'name' => 'ASC Tech Innovators & IT Quiz Bowl',
            'description' => 'Championship collegiate competition covering modern programming, networking, and data structures.',
            'type' => 'Academic',
            'department' => 'Bachelor in Information Technology',
            'organizer' => 'Information Technology Society',
            'start_date' => date('Y-m-d', strtotime('-7 days')),
            'end_date' => date('Y-m-d', strtotime('-5 days')),
            'status' => 'Completed',
            'portions' => [
                ['Rapid Algorithmic Defense', 50.0, [['Algorithm Correctness', 60.0], ['Speed', 40.0]]],
                ['Prototype Showcase', 50.0, [['Innovation', 50.0], ['Technical Design', 50.0]]]
            ]
        ],
        [
            'name' => 'Luminaries Spoken Word & Literary Cup',
            'description' => 'Inter-departmental declamation and creative spoken poetry championship.',
            'type' => 'Literary',
            'department' => 'Bachelor of Elementary Education',
            'organizer' => 'ASC Arts & Letters Guild',
            'start_date' => date('Y-m-d', strtotime('-14 days')),
            'end_date' => date('Y-m-d', strtotime('-12 days')),
            'status' => 'Completed',
            'portions' => [
                ['Original Spoken Word Piece', 100.0, [['Content & Metaphor', 40.0], ['Vocal Delivery', 30.0], ['Stage Composure', 30.0]]]
            ]
        ],
        [
            'name' => 'ASC Intramurals Cheerdance Showcase',
            'description' => 'High-octane athletic cheer routine championship competing for the overall institutional trophy.',
            'type' => 'Sports',
            'department' => 'Bachelor of Science in Criminology',
            'organizer' => 'Physical Education & Athletics Unit',
            'start_date' => date('Y-m-d', strtotime('+3 days')),
            'end_date' => date('Y-m-d', strtotime('+5 days')),
            'status' => 'Upcoming',
            'portions' => [
                ['Routine Gymnastics & Pyramids', 100.0, [['Stunt Difficulty', 50.0], ['Timing & Energy', 50.0]]]
            ]
        ]
    ];

    $ins_ev = $pdo->prepare("INSERT INTO events (name, description, type, department, organizer, academic_year, start_date, end_date, status) 
                            VALUES (?, ?, ?, ?, ?, '2025-2026', ?, ?, ?)");
    $ins_port = $pdo->prepare("INSERT INTO event_portions (event_id, portion_name, percentage, order_number, status) VALUES (?, ?, ?, ?, ?)");
    $ins_crit = $pdo->prepare("INSERT INTO criteria (event_id, portion_id, name, percentage) VALUES (?, ?, ?, ?)");
    $ins_cand = $pdo->prepare("INSERT INTO candidates (event_id, registry_id, name, course_id, year_level, order_number) VALUES (?, ?, ?, ?, ?, ?)");
    $ins_ej = $pdo->prepare("INSERT IGNORE INTO event_judges (event_id, user_id) VALUES (?, ?)");
    $ins_score = $pdo->prepare("INSERT INTO scores (event_id, judge_id, candidate_id, criteria_id, score) VALUES (?, ?, ?, ?, ?) 
                                ON DUPLICATE KEY UPDATE score = VALUES(score)");

    $scores_count = 0;

    foreach ($sample_events as $ev) {
        $ev_stmt = $pdo->prepare("SELECT id FROM events WHERE name = ?");
        $ev_stmt->execute([$ev['name']]);
        $ev_id = $ev_stmt->fetchColumn();

        if (!$ev_id) {
            $ins_ev->execute([$ev['name'], $ev['description'], $ev['type'], $ev['department'], $ev['organizer'], $ev['start_date'], $ev['end_date'], $ev['status']]);
            $ev_id = $pdo->lastInsertId();
        }

        // Portions & Criteria
        $portion_order = 1;
        foreach ($ev['portions'] as $p) {
            $p_stmt = $pdo->prepare("SELECT id FROM event_portions WHERE event_id = ? AND portion_name = ?");
            $p_stmt->execute([$ev_id, $p[0]]);
            $port_id = $p_stmt->fetchColumn();
            if (!$port_id) {
                $ins_port->execute([$ev_id, $p[0], $p[1], $portion_order++, ($ev['status'] == 'Completed' ? 'Completed' : 'Ongoing')]);
                $port_id = $pdo->lastInsertId();
            }

            foreach ($p[2] as $crit) {
                $c_stmt = $pdo->prepare("SELECT id FROM criteria WHERE event_id = ? AND portion_id = ? AND name = ?");
                $c_stmt->execute([$ev_id, $port_id, $crit[0]]);
                if (!$c_stmt->fetchColumn()) {
                    $ins_crit->execute([$ev_id, $port_id, $crit[0], $crit[1]]);
                }
            }
        }

        // Enlist Candidates
        $cand_order = 1;
        $cands_to_add = array_slice($sample_candidates_roster, 0, ($ev['type'] === 'Pageant' ? 8 : 4));
        foreach ($cands_to_add as $c_item) {
            $c_chk = $pdo->prepare("SELECT id FROM candidates WHERE event_id = ? AND name = ?");
            $c_chk->execute([$ev_id, $c_item[0]]);
            if (!$c_chk->fetchColumn()) {
                $reg = $registry_map[$c_item[0]];
                $ins_cand->execute([$ev_id, $reg['id'], $c_item[0], $reg['course_id'], $reg['year_level'], $cand_order++]);
            }
        }

        // Assign Judges & Seed Scores
        $active_judges = array_slice($approved_judges, 0, 3);
        foreach ($active_judges as $j_id) {
            $ins_ej->execute([$ev_id, $j_id]);
        }

        if (in_array($ev['status'], ['Completed', 'Tabulating', 'Ongoing']) && !empty($active_judges)) {
            $event_cands = $pdo->query("SELECT id FROM candidates WHERE event_id = $ev_id")->fetchAll(PDO::FETCH_COLUMN);
            $event_crits = $pdo->query("SELECT id, percentage FROM criteria WHERE event_id = $ev_id")->fetchAll(PDO::FETCH_ASSOC);

            foreach ($event_cands as $cand_id) {
                foreach ($active_judges as $j_id) {
                    foreach ($event_crits as $cr) {
                        $pct_rand = rand(84, 96) / 100.0;
                        $score_val = round($cr['percentage'] * $pct_rand, 2);
                        $ins_score->execute([$ev_id, $j_id, $cand_id, $cr['id'], $score_val]);
                        $scores_count++;
                    }
                }
            }
        }

        echo "   Event processed: {$ev['name']}\n";
    }

    echo "4. Total Scores tabulated: $scores_count\n";
    echo "=== SEEDING COMPLETED SUCCESSFULLY! ===\n";

} catch (Exception $e) {
    echo "ERROR OCCURRED: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
